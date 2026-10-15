/**
 * Bolna voice: lookup caller + save profile + nearby leads during a live call.
 */
import { prisma } from "@/lib/prisma";
import {
  canonicalIndiaPhone,
  ensureCanonicalPhoneOnUser,
  findPrimaryUserForWhatsApp,
  waPlaceholderEmail,
} from "@/lib/india-phone";
import { resolveLocationCoordinates } from "@/lib/geocoding";
import { haversineDistanceKm } from "@/lib/haversine";
import { validateAndAlignSubjects, validateAndCleanLocality } from "@/lib/whatsapp-bot/subject-rules";
import { extractAllGrades, isClassCompatible, isSubjectCompatible } from "@/lib/whatsapp-bot/leads-helper";
import {
  extractPublicLocality,
  formatLeadBudget,
  isTill8thClass,
  leadSubjectsForClass,
  normalizeCanonicalClassLevel,
} from "@/lib/lead-utils";
import { MAX_OFFLINE_RADIUS_KM } from "@/lib/matching-engine";
import { registerParentFromWhatsapp, registerTutorFromWhatsapp } from "@/lib/whatsapp-bot/auto-register";
import type { TeachingMode } from "@prisma/client";

export type BolnaLookup = {
  known: boolean;
  role: string;
  customer_name: string;
  first_name: string;
  classes: string;
  subjects: string;
  location: string;
  city: string;
  nearest_metro: string;
  teaching_mode: string;
  plan: string;
  email: string;
  spoken_summary: string;
  agent_say: string;
};

export type BolnaUpdateInput = {
  phone?: string;
  contact_number?: string;
  from_number?: string;
  action?: string;
  role?: string;
  name?: string;
  customer_name?: string;
  classes?: string;
  subjects?: string;
  location?: string;
  city?: string;
  nearest_metro?: string;
  teaching_mode?: string;
  email?: string;
  whatsapp_same?: string | boolean;
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function callerPhone(input: BolnaUpdateInput | URLSearchParams): string {
  if (input instanceof URLSearchParams) {
    return str(input.get("contact_number") || input.get("from_number") || input.get("phone") || input.get("to_number"));
  }
  return str(input.contact_number || input.from_number || input.phone);
}

export function parseAddress(address?: string | null): { locality: string; metro: string } {
  if (!address) return { locality: "", metro: "" };
  const [left, ...rest] = address.split("|");
  const locality = (left || "").trim();
  const metro = rest
    .join("|")
    .replace(/\s*metro\s*$/i, "")
    .trim();
  return { locality, metro };
}

export function composeAddress(locality: string, metro?: string | null): string {
  const loc = locality.replace(/\s*\|\s*.*$/, "").trim();
  const m = (metro || "").replace(/\s*metro\s*$/i, "").trim();
  if (loc && m) return `${loc} | ${m} Metro`;
  return loc;
}

function parseClasses(raw: string): string[] {
  const text = raw.trim();
  if (!text) return [];
  const grades = extractAllGrades(text);
  const out: string[] = [];
  if (/\bjee\b/i.test(text)) out.push("JEE");
  if (/\bneet\b/i.test(text)) out.push("NEET");
  if (grades.size > 0) {
    out.push(...[...grades].sort((a, b) => a - b).map((n) => `Class ${n}`));
  }
  if (out.length > 0) return [...new Set(out)];
  const canon = normalizeCanonicalClassLevel(text);
  return canon ? [canon] : [];
}

function parseSubjects(raw: string, classHint?: string): string[] {
  if (!raw.trim()) return [];
  const aligned = validateAndAlignSubjects(raw, classHint);
  if (aligned.isValid && aligned.subjects.length > 0) return aligned.subjects;
  return raw
    .split(/[,&+/]|(?:\band\b)|(?:\baur\b)/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 40);
}

function parseMode(raw: string): TeachingMode | null {
  const s = raw.toLowerCase();
  if (!s) return null;
  if (/\bboth\b|\beither\b|online\s*(and|aur|&)\s*offline|offline\s*(and|aur|&)\s*online/.test(s)) return "EITHER";
  if (/\bonline\b/.test(s) && !/\boffline\b|\bhome\b/.test(s)) return "ONLINE";
  if (/\boffline\b|\bhome\b|\btuition\b/.test(s) && !/\bonline\b/.test(s)) return "OFFLINE";
  return "EITHER";
}

function firstName(name?: string | null): string {
  if (!name) return "";
  return name.trim().split(/\s+/)[0] || "";
}

function emptyLookup(agentSay: string): BolnaLookup {
  return {
    known: false,
    role: "unknown",
    customer_name: "",
    first_name: "",
    classes: "",
    subjects: "",
    location: "",
    city: "",
    nearest_metro: "",
    teaching_mode: "",
    plan: "",
    email: "",
    spoken_summary: "New caller, not in database yet.",
    agent_say: agentSay,
  };
}

export async function lookupCaller(phoneRaw: string): Promise<BolnaLookup> {
  const phone = canonicalIndiaPhone(phoneRaw) || phoneRaw;
  if (!indiaPhoneLast10Safe(phoneRaw)) {
    return emptyLookup("नंबर क्लियर नहीं है। आप ट्यूटर हैं या पेरेंट?");
  }

  const user = await findPrimaryUserForWhatsApp(prisma, phone);
  if (!user) {
    return emptyLookup("नया कॉलर हैं। आप ट्यूटर हैं या पेरेंट?");
  }

  const full = await prisma.user.findUnique({
    where: { id: user.id },
    include: { tutorProfile: true, parentProfile: true },
  });
  if (!full) return emptyLookup("नया कॉलर हैं। आप ट्यूटर हैं या पेरेंट?");

  const parsed = parseAddress(full.tutorProfile?.address);
  const classes = (full.tutorProfile?.classLevels || []).join(", ");
  const subjects = (full.tutorProfile?.subjects || []).join(", ");
  const location = parsed.locality || full.tutorProfile?.address || full.parentProfile?.address || "";
  const city = full.tutorProfile?.city || full.parentProfile?.city || "";
  const metro = parsed.metro;
  const role = full.role === "TUTOR" || full.tutorProfile ? "TUTOR" : full.role === "PARENT" ? "PARENT" : full.role;
  const name = full.name || "";
  const plan = full.tutorProfile?.subscriptionPlan || "NONE";

  const bits = [
    role === "TUTOR" ? "known tutor" : role === "PARENT" ? "known parent" : `known ${role}`,
    name,
    classes,
    subjects,
    location,
    metro ? `metro ${metro}` : "",
    city,
  ].filter(Boolean);

  const agent_say =
    role === "TUTOR"
      ? `अच्छा ${firstName(name) || "सर"}, आप पहले से रजिस्टर्ड ट्यूटर हैं${location ? `, ${location}` : ""}${metro ? `, मेट्रो ${metro}` : ""}। आज क्या अपडेट करना है?`
      : role === "PARENT"
        ? `अच्छा ${firstName(name) || ""}, आप पेरेंट हैं। बच्चे की क्लास बताइए।`.replace(/\s+/g, " ").trim()
        : "आप ट्यूटर हैं या पेरेंट?";

  return {
    known: true,
    role,
    customer_name: name,
    first_name: firstName(name),
    classes,
    subjects,
    location,
    city,
    nearest_metro: metro,
    teaching_mode: full.tutorProfile?.teachingMode || "",
    plan,
    email: full.email?.startsWith("wa_") ? "" : full.email || "",
    spoken_summary: bits.join(", "),
    agent_say,
  };
}

function indiaPhoneLast10Safe(input: string): boolean {
  const last = input.replace(/\D/g, "").slice(-10);
  return /^[6-9]\d{9}$/.test(last);
}

export async function updateCaller(input: BolnaUpdateInput): Promise<{
  ok: boolean;
  error?: string;
  updated: string[];
  agent_say: string;
  profile: BolnaLookup;
}> {
  const phoneRaw = callerPhone(input);
  if (!indiaPhoneLast10Safe(phoneRaw)) {
    return {
      ok: false,
      error: "Valid phone required",
      updated: [],
      agent_say: "नंबर क्लियर नहीं आया। WhatsApp नंबर बताइए।",
      profile: emptyLookup("नंबर क्लियर नहीं आया।"),
    };
  }

  const roleHint = str(input.role).toUpperCase();
  const name = str(input.name || input.customer_name);
  const classes = parseClasses(str(input.classes));
  const classHint = classes[0] || str(input.classes);
  let subjects = parseSubjects(str(input.subjects), classHint);
  if (subjects.length === 0 && classes[0] && isTill8thClass(classes[0])) {
    subjects = leadSubjectsForClass(classes[0], ["All Subjects"]);
  }
  const locationRaw = str(input.location);
  const metro = str(input.nearest_metro);
  const cityHint = str(input.city);
  const email = str(input.email);
  const mode = parseMode(str(input.teaching_mode));
  const wantsTutor = roleHint === "TUTOR" || roleHint === "TEACHER" || Boolean(classes.length || subjects.length || locationRaw || metro);

  const loc = locationRaw
    ? validateAndCleanLocality(locationRaw, cityHint || "Delhi")
    : { isValid: false, area: "", city: cityHint || "" };

  const existing = await findPrimaryUserForWhatsApp(prisma, phoneRaw);
  const updated: string[] = [];

  if (!existing && (wantsTutor || roleHint === "PARENT")) {
    if (roleHint === "PARENT") {
      const parentRes = await registerParentFromWhatsapp(phoneRaw, {
        parentName: name || undefined,
        phone: phoneRaw,
        email: email.includes("@") ? email : undefined,
        classLevel: classes[0] || classHint,
        subjects,
        area: loc.isValid ? loc.area : locationRaw,
        city: loc.city || cityHint,
        modeKey: mode === "ONLINE" ? "2" : "1",
      });
      const profile = await lookupCaller(phoneRaw);
      if (!parentRes.ok) {
        return { ok: false, error: parentRes.error, updated, agent_say: "इन्क्वायरी सेव नहीं हुई। क्लास, सब्जेक्ट और लोकेशन दोबारा बताइए।", profile };
      }
      return {
        ok: true,
        updated: ["parent_enquiry"],
        agent_say: "इन्क्वायरी नोट हो गई। Nearby tutors को inform करेंगे। फ्री डेमो हो सकती है।",
        profile,
      };
    }

    const tutorRes = await registerTutorFromWhatsapp(phoneRaw, {
      name: name || "Tutor",
      phone: phoneRaw,
      email: email.includes("@") ? email : undefined,
      city: loc.city || cityHint || undefined,
      area: loc.isValid ? loc.area : locationRaw || undefined,
      subjects: subjects.length ? subjects : undefined,
      classLevels: classes.length ? classes : undefined,
      modeKey: mode === "ONLINE" ? "2" : mode === "OFFLINE" ? "1" : "3",
    });
    if (metro && tutorRes.ok) {
      await patchMetro(phoneRaw, loc.isValid ? loc.area : locationRaw, metro);
      updated.push("metro");
    }
    const profile = await lookupCaller(phoneRaw);
    if (!tutorRes.ok) {
      return { ok: false, error: tutorRes.error, updated, agent_say: "सेव नहीं हुआ। लोकेशन या क्लास दोबारा बताइए।", profile };
    }
    if (name) updated.push("name");
    if (classes.length) updated.push("classes");
    if (subjects.length) updated.push("subjects");
    if (locationRaw) updated.push("location");
    return {
      ok: true,
      updated,
      agent_say: confirmTutorLine(profile),
      profile,
    };
  }

  if (!existing) {
    return {
      ok: false,
      error: "Caller not found",
      updated,
      agent_say: "पहले बताइए आप ट्यूटर हैं या पेरेंट।",
      profile: emptyLookup("आप ट्यूटर हैं या पेरेंट?"),
    };
  }

  const full = await prisma.user.findUnique({
    where: { id: existing.id },
    include: { tutorProfile: true, parentProfile: true },
  });
  if (!full) {
    return { ok: false, error: "User missing", updated, agent_say: "सेव नहीं हुआ।", profile: emptyLookup("सेव नहीं हुआ।") };
  }

  const isStaff = full.role === "SUPER_ADMIN" || full.role === "SUB_ADMIN";
  const nextRole = isStaff ? full.role : wantsTutor || full.tutorProfile ? "TUTOR" : full.role;

  const userPatch: { name?: string; email?: string; role?: typeof full.role; phone?: string } = {};
  if (name && name.length >= 2) {
    userPatch.name = name;
    updated.push("name");
  }
  if (email.includes("@") && !email.startsWith("wa_")) {
    const taken = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true } });
    if (!taken || taken.id === full.id) {
      userPatch.email = email.toLowerCase();
      updated.push("email");
    }
  }
  if (nextRole !== full.role) userPatch.role = nextRole;
  const canon = canonicalIndiaPhone(phoneRaw);
  if (canon && full.phone !== canon) userPatch.phone = canon;

  if (Object.keys(userPatch).length > 0) {
    await prisma.user.update({ where: { id: full.id }, data: userPatch });
  }
  await ensureCanonicalPhoneOnUser(prisma, full.id, phoneRaw);

  if (roleHint === "PARENT" && !full.tutorProfile && (classes[0] || classHint) && locationRaw) {
    const parentRes = await registerParentFromWhatsapp(phoneRaw, {
      parentName: name || full.name || undefined,
      phone: phoneRaw,
      classLevel: classes[0] || classHint,
      subjects,
      area: loc.isValid ? loc.area : locationRaw,
      city: loc.city || cityHint,
      modeKey: mode === "ONLINE" ? "2" : "1",
    });
    const profile = await lookupCaller(phoneRaw);
    if (!parentRes.ok) {
      return { ok: false, error: parentRes.error, updated, agent_say: "इन्क्वायरी सेव नहीं हुई। क्लास, सब्जेक्ट और एरिया बताइए।", profile };
    }
    return {
      ok: true,
      updated: [...updated, "parent_enquiry"],
      agent_say: "इन्क्वायरी नोट हो गई। Nearby tutors को inform करेंगे।",
      profile,
    };
  }

  const locality = loc.isValid ? loc.area : locationRaw;
  const city = loc.isValid ? loc.city : cityHint || full.tutorProfile?.city || "Delhi";
  const current = parseAddress(full.tutorProfile?.address);
  const nextLocality = locality || current.locality;
  const nextMetro = metro || current.metro;
  const nextAddress = nextLocality ? composeAddress(nextLocality, nextMetro) : full.tutorProfile?.address || null;
  const coords = resolveLocationCoordinates(`${nextLocality || ""} ${city}`.trim());

  const profilePatch: {
    address?: string | null;
    city?: string;
    latitude?: number;
    longitude?: number;
    subjects?: string[];
    classLevels?: string[];
    teachingMode?: TeachingMode;
  } = {};

  if (nextLocality && (locationRaw || metro)) {
    profilePatch.address = nextAddress;
    if (locationRaw) updated.push("location");
    if (metro) updated.push("metro");
  }
  if (city && (locationRaw || cityHint)) {
    profilePatch.city = city;
  }
  if (coords && (locationRaw || metro)) {
    profilePatch.latitude = coords.lat;
    profilePatch.longitude = coords.lng;
  }
  if (classes.length) {
    profilePatch.classLevels = classes;
    updated.push("classes");
  }
  if (subjects.length) {
    profilePatch.subjects = subjects;
    updated.push("subjects");
  }
  if (mode) {
    profilePatch.teachingMode = mode;
    updated.push("mode");
  }

  if (Object.keys(profilePatch).length > 0) {
    if (full.tutorProfile) {
      await prisma.tutorProfile.update({
        where: { id: full.tutorProfile.id },
        data: profilePatch,
      });
    } else if (!isStaff) {
      if (full.role === "PARENT") {
        await prisma.user.update({ where: { id: full.id }, data: { role: "TUTOR" } });
      }
      const created = await prisma.tutorProfile.create({
        data: {
          userId: full.id,
          address: profilePatch.address ?? null,
          city: profilePatch.city ?? city,
          latitude: profilePatch.latitude ?? null,
          longitude: profilePatch.longitude ?? null,
          subjects: profilePatch.subjects ?? [],
          classLevels: profilePatch.classLevels ?? [],
          teachingMode: profilePatch.teachingMode ?? "EITHER",
        },
      });
      await prisma.wallet.upsert({
        where: { tutorProfileId: created.id },
        create: { tutorProfileId: created.id, balance: 0 },
        update: {},
      });
    }
  }

  const profile = await lookupCaller(phoneRaw);
  if (updated.length === 0) {
    return { ok: true, updated, agent_say: "कुछ नया सेव करने को नहीं मिला। लोकेशन या क्लास बताइए।", profile };
  }
  return { ok: true, updated, agent_say: confirmTutorLine(profile), profile };
}

async function patchMetro(phone: string, locality: string, metro: string) {
  const user = await findPrimaryUserForWhatsApp(prisma, phone);
  if (!user) return;
  const profile = await prisma.tutorProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return;
  const current = parseAddress(profile.address);
  await prisma.tutorProfile.update({
    where: { id: profile.id },
    data: { address: composeAddress(locality || current.locality || profile.address || "", metro) },
  });
}

function confirmTutorLine(profile: BolnaLookup): string {
  const loc = profile.location;
  const metro = profile.nearest_metro;
  if (loc && metro) {
    return `ठीक है सर, ${loc} और ${metro} मेट्रो सिस्टम में अपडेट हो गया है। Nearby parents की classes के notifications WhatsApp पे आते रहेंगे।`;
  }
  if (loc) {
    return `ठीक है सर, ${loc} सिस्टम में अपडेट हो गया है। Nearby parents की classes के alerts WhatsApp पे आएंगे।`;
  }
  if (profile.classes) {
    return `ठीक है सर, आपकी क्लास डिटेल सिस्टम में अपडेट हो गई है।`;
  }
  return "ठीक है सर, आपकी डिटेल सिस्टम में अपडेट हो गई है।";
}

export async function matchingLeadsForCaller(input: BolnaUpdateInput): Promise<{
  ok: boolean;
  count: number;
  agent_say: string;
  leads: Array<{ classLevel: string; subjects: string; area: string; mode: string; budget: string }>;
}> {
  const phoneRaw = callerPhone(input);
  const lookup = indiaPhoneLast10Safe(phoneRaw) ? await lookupCaller(phoneRaw) : emptyLookup("");
  const classes = str(input.classes) || lookup.classes;
  const subjects = parseSubjects(str(input.subjects) || lookup.subjects, classes);
  const location = str(input.location) || lookup.location;
  const city = str(input.city) || lookup.city;
  const modeHint = parseMode(str(input.teaching_mode) || lookup.teaching_mode);

  const tutorCoords = location || city ? resolveLocationCoordinates(`${location} ${city}`.trim()) : null;
  const user = indiaPhoneLast10Safe(phoneRaw) ? await findPrimaryUserForWhatsApp(prisma, phoneRaw) : null;
  const tutorRow = user
    ? await prisma.tutorProfile.findUnique({
        where: { userId: user.id },
        select: { latitude: true, longitude: true, city: true, address: true, teachingMode: true },
      })
    : null;
  const tutorLat = tutorRow?.latitude ?? tutorCoords?.lat ?? null;
  const tutorLng = tutorRow?.longitude ?? tutorCoords?.lng ?? null;
  const tutorLocality = (parseAddress(tutorRow?.address).locality || location).toLowerCase();
  const onlineOnly = modeHint === "ONLINE" || (!tutorLocality && !tutorLat);

  const rawLeads = await prisma.lead.findMany({
    where: { status: { in: ["ACTIVE", "MATCHING", "APPLICATIONS_RECEIVED"] } },
    orderBy: { createdAt: "desc" },
    take: 80,
    select: {
      classLevel: true,
      subjects: true,
      area: true,
      city: true,
      budgetMin: true,
      budgetMax: true,
      mode: true,
      latitude: true,
      longitude: true,
    },
  });

  const classOk = (leadClass: string) => {
    if (!classes) return true;
    return isClassCompatible(classes, leadClass);
  };

  const picked: typeof rawLeads = [];
  for (const lead of rawLeads) {
    if (!classOk(lead.classLevel)) continue;
    if (subjects.length && !isSubjectCompatible(subjects, lead.subjects, classes, lead.classLevel)) continue;

    const isOnline = lead.mode === "ONLINE";
    if (onlineOnly && !isOnline) continue;
    if (isOnline) {
      picked.push(lead);
    } else {
      if (tutorLat != null && tutorLng != null && lead.latitude != null && lead.longitude != null) {
        const km = haversineDistanceKm(tutorLat, tutorLng, lead.latitude, lead.longitude);
        if (km > MAX_OFFLINE_RADIUS_KM) continue;
        picked.push(lead);
      } else {
        const leadArea = (extractPublicLocality(lead.area, lead.city) || "").toLowerCase();
        if (tutorLocality && leadArea && (leadArea.includes(tutorLocality) || tutorLocality.includes(leadArea))) {
          picked.push(lead);
        }
      }
    }
    if (picked.length >= 2) break;
  }

  if (picked.length === 0) {
    return {
      ok: true,
      count: 0,
      leads: [],
      agent_say: location
        ? `अभी ${location} में matching class नहीं है। जब आएगी, WhatsApp पे अलर्ट जाएगा।`
        : "अभी matching class नहीं है। जब आएगी WhatsApp पे अलर्ट जाएगा।",
    };
  }

  const leads = picked.map((lead) => ({
    classLevel: lead.classLevel,
    subjects: leadSubjectsForClass(lead.classLevel, lead.subjects).slice(0, 3).join(", "),
    area: extractPublicLocality(lead.area, lead.city) || (lead.mode === "ONLINE" ? "Online" : lead.city || ""),
    mode: lead.mode === "ONLINE" ? "Online" : "Home",
    budget: formatLeadBudget(lead, "full"),
  }));

  const first = leads[0];
  const junior = isTill8thClass(first.classLevel);
  const subBit = junior ? "ऑल सब्जेक्ट्स" : first.subjects || first.classLevel;
  const agent_say = `एक nearby parent class है — ${first.classLevel}, ${subBit}, ${first.area}${first.mode === "Online" ? ", ऑनलाइन" : ""}। WhatsApp पे डिटेल आ जाएगी।`;

  return { ok: true, count: leads.length, leads, agent_say };
}

export function flattenBolnaBody(body: unknown): BolnaUpdateInput {
  if (!body || typeof body !== "object") return {};
  const rec = body as Record<string, unknown>;
  const nested = rec.param && typeof rec.param === "object" ? (rec.param as Record<string, unknown>) : null;
  const src = nested ? { ...rec, ...nested } : rec;
  const out: BolnaUpdateInput = {};
  for (const [k, v] of Object.entries(src)) {
    if (v == null || typeof v === "object") continue;
    (out as Record<string, string>)[k] = String(v);
  }
  return out;
}
