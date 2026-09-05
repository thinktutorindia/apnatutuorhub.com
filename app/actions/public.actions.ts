"use server";

import { prisma } from "@/lib/prisma";
import { expandSubjectAliases, expandClassLevel } from "@/lib/subject-matcher";

export interface PublicTutorResult {
  id: string;
  name: string; // first name + last initial only e.g. "Ramesh K."
  qualification: string;
  experience: number;
  subjects: string[];
  classLevels: string[];
  teachingMode: string;
  feeMin: number | null;
  feeMax: number | null;
  city: string | null;
  state: string | null;
  address?: string | null;
  gender?: string | null;
  image?: string | null;
  averageRating: number;
  totalReviews: number;
  isVerified: boolean;
  isFeatured: boolean;
  bio: string | null;
  profileScore: number;
  teachingRadius?: number;
}

function maskName(fullName: string | null): string {
  if (!fullName) return "Verified Tutor";
  const cleaned = fullName
    .replace(/[()[\]{}<>]/g, " ")
    .replace(/[^a-zA-Z.\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = cleaned.split(/\s+/).filter((p) => p.replace(/[.'-]/g, "").length >= 2);
  if (parts.length === 0) return "Verified Tutor";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]!.toUpperCase()}.`;
}

function subjectMatchScore(tutorSubjects: string[], requested: string[]): number {
  if (!requested.length) return 0;
  const req = requested.map((s) => s.toLowerCase());
  const subs = tutorSubjects.map((s) => s.toLowerCase());
  let score = 0;
  if (subs[0] && req.some((r) => subs[0] === r || subs[0].includes(r) || r.includes(subs[0]))) {
    score += 100;
  }
  for (const s of subs) {
    if (req.some((r) => s === r)) score += 20;
    else if (req.some((r) => s.includes(r) || r.includes(s))) score += 8;
  }
  return score;
}

function getMetroName(locality: string): string {
  const loc = locality.toLowerCase().trim();
  if (
    /delhi|new delhi|sangam vihar|saket|malviya nagar|hauz khas|greater kailash|gk|lajpat|kalkaji|nehru place|vasant|dwarka|janakpuri|vikaspuri|uttam nagar|tilak nagar|rajouri|punjabi bagh|paschim vihar|kirti nagar|patel nagar|moti nagar|rohini|pitampura|shalimar|model town|ashok vihar|civil lines|mukherjee nagar|gtb nagar|burari|azadpur|jahangirpuri|karol bagh|laxmi nagar|mayur vihar|preet vihar|anand vihar|dilshad garden|shahdara|noida|greater noida|ghaziabad|indirapuram|vaishali|vasundhara|gurgaon|gurugram|faridabad/i.test(
      loc
    )
  ) {
    return "Delhi";
  }
  if (/mumbai|andheri|bandra|juhu|powai|thane|navi mumbai|borivali|dadar|worli/i.test(loc)) {
    return "Mumbai";
  }
  if (/bengaluru|bangalore|koramangala|indiranagar|whitefield|hsr|electronic city|jayanagar|jp nagar/i.test(loc)) {
    return "Bengaluru";
  }
  if (/hyderabad|gachibowli|madhapur|hitec|jubilee hills|banjara hills|kondapur/i.test(loc)) {
    return "Hyderabad";
  }
  if (/pune|kothrud|viman nagar|hinjewadi|wakad|baner|aundh/i.test(loc)) {
    return "Pune";
  }
  return "Delhi";
}

export async function searchTutorsPublic(params: {
  subjects?: string[];
  classLevel?: string;
  mode?: string;
  budgetMax?: number;
  city?: string;
  board?: string;
  gender?: string;
  radiusKm?: number;
}): Promise<{ tutors: PublicTutorResult[]; total: number; isFallback?: boolean; fallbackReason?: string }> {
  const { subjects, classLevel, mode, budgetMax, city, gender, radiusKm } = params;

  // Expand search subjects with synonyms and root aliases to prevent zero results on typos or naming variations
  let expandedSubjects: string[] | undefined = undefined;
  if (subjects && subjects.length > 0) {
    const set = new Set<string>();
    subjects.forEach((s) => {
      expandSubjectAliases(s).forEach((alias) => set.add(alias));
    });
    expandedSubjects = Array.from(set);
  }

  // Expand class level into matching tags (e.g. "Class 9-10" -> ["Class 9", "Class 10", "Class 1 to 10", "General"])
  const expandedClassLevels = classLevel ? expandClassLevel(classLevel) : undefined;

  const andClauses: any[] = [{ user: { isActive: true } }];

  if (expandedSubjects && expandedSubjects.length > 0) {
    andClauses.push({ subjects: { hasSome: expandedSubjects } });
  }

  if (expandedClassLevels && expandedClassLevels.length > 0) {
    andClauses.push({ classLevels: { hasSome: expandedClassLevels } });
  }

  if (mode && mode !== "EITHER") {
    andClauses.push({ teachingMode: { in: [mode, "EITHER"] } });
  }

  if (gender && gender !== "ANY" && gender !== "EITHER") {
    andClauses.push({ gender: { equals: gender, mode: "insensitive" } });
  }

  if (budgetMax && budgetMax < 99999) {
    andClauses.push({
      OR: [{ feeMin: { lte: budgetMax } }, { feeMin: null }],
    });
  }

  if (radiusKm && radiusKm > 0) {
    andClauses.push({ teachingRadius: { gte: Math.min(radiusKm, 3) } });
  }

  if (city && city.trim()) {
    const loc = city.trim();
    const tokens = loc.split(/[,–-]/).map((t) => t.trim()).filter(Boolean);
    const primaryLoc = tokens[0] || loc;
    andClauses.push({
      OR: [
        { city: { contains: primaryLoc, mode: "insensitive" } },
        { address: { contains: primaryLoc, mode: "insensitive" } },
        ...(tokens.length > 1 ? [{ city: { contains: tokens[1], mode: "insensitive" } }] : []),
      ],
    });
  }

  const where: any = { AND: andClauses };

  const profileSelect = {
    id: true,
    qualification: true,
    experience: true,
    subjects: true,
    classLevels: true,
    teachingMode: true,
    teachingRadius: true,
    feeMin: true,
    feeMax: true,
    city: true,
    state: true,
    address: true,
    gender: true,
    averageRating: true,
    totalReviews: true,
    isVerified: true,
    isFeatured: true,
    bio: true,
    profileScore: true,
    user: {
      select: { name: true, image: true },
    },
  };

  let profiles = await prisma.tutorProfile.findMany({
    where,
    orderBy: [
      { isFeatured: "desc" },
      { profileScore: "desc" },
      { averageRating: "desc" },
    ],
    take: 40,
    select: profileSelect,
  });

  let total = await prisma.tutorProfile.count({ where });
  let isFallback = false;
  let fallbackReason: string | undefined = undefined;

  // Locality Enrichment & Fallback:
  // If user specified a locality/city and local count is small (< 5), enrich with verified tutors from the broader metro/online
  if (city && city.trim() && profiles.length < 5) {
    const loc = city.trim();
    const widerMetro = getMetroName(loc);

    const metroAndClauses: any[] = [{ user: { isActive: true } }];
    if (expandedSubjects && expandedSubjects.length > 0) {
      metroAndClauses.push({ subjects: { hasSome: expandedSubjects } });
    }
    if (expandedClassLevels && expandedClassLevels.length > 0) {
      metroAndClauses.push({ classLevels: { hasSome: expandedClassLevels } });
    }
    if (mode && mode !== "EITHER") {
      metroAndClauses.push({ teachingMode: { in: [mode, "EITHER"] } });
    }
    if (gender && gender !== "ANY" && gender !== "EITHER") {
      metroAndClauses.push({ gender: { equals: gender, mode: "insensitive" } });
    }
    metroAndClauses.push({
      OR: [
        { city: { contains: widerMetro, mode: "insensitive" } },
        { address: { contains: widerMetro, mode: "insensitive" } },
        { teachingMode: { in: ["ONLINE", "EITHER"] } },
      ],
    });

    const metroProfiles = await prisma.tutorProfile.findMany({
      where: { AND: metroAndClauses },
      orderBy: [
        { isFeatured: "desc" },
        { profileScore: "desc" },
        { averageRating: "desc" },
      ],
      take: 40,
      select: profileSelect,
    });

    const existingIds = new Set(profiles.map((p) => p.id));
    const addedMetro = metroProfiles.filter((p) => !existingIds.has(p.id));

    if (profiles.length === 0 && addedMetro.length > 0) {
      profiles = addedMetro;
      total = addedMetro.length;
      isFallback = true;
      fallbackReason = `Showing ${addedMetro.length} verified teachers in ${widerMetro} serving ${loc} & nearby areas.`;
    } else if (profiles.length > 0 && addedMetro.length > 0) {
      const localCount = profiles.length;
      profiles = [...profiles, ...addedMetro.slice(0, 35)];
      total = profiles.length;
      isFallback = true;
      fallbackReason = `Found ${localCount} verified tutor in ${loc} + ${addedMetro.length} verified teachers across ${widerMetro} serving your area.`;
    }
  }

  // Grace Fallback: If still 0 results because subject was too niche, relax subject filter to show top tutors in this class/mode
  if (profiles.length === 0 && expandedSubjects && expandedSubjects.length > 0) {
    const fallbackAndClauses: any[] = [{ user: { isActive: true } }];
    if (expandedClassLevels && expandedClassLevels.length > 0) {
      fallbackAndClauses.push({ classLevels: { hasSome: expandedClassLevels } });
    }
    if (mode && mode !== "EITHER") {
      fallbackAndClauses.push({ teachingMode: { in: [mode, "EITHER"] } });
    }
    if (gender && gender !== "ANY" && gender !== "EITHER") {
      fallbackAndClauses.push({ gender: { equals: gender, mode: "insensitive" } });
    }
    const widerMetro = city ? getMetroName(city) : "Delhi";
    fallbackAndClauses.push({
      OR: [
        { city: { contains: widerMetro, mode: "insensitive" } },
        { address: { contains: widerMetro, mode: "insensitive" } },
        { teachingMode: { in: ["ONLINE", "EITHER"] } },
      ],
    });

    const fallbackProfiles = await prisma.tutorProfile.findMany({
      where: { AND: fallbackAndClauses },
      orderBy: [
        { isFeatured: "desc" },
        { profileScore: "desc" },
        { averageRating: "desc" },
      ],
      take: 30,
      select: profileSelect,
    });

    if (fallbackProfiles.length > 0) {
      profiles = fallbackProfiles;
      total = fallbackProfiles.length;
      isFallback = true;
      fallbackReason = `Showing top verified teachers in ${widerMetro || "your area"} for ${classLevel || "all classes"}.`;
    }
  }

  const locToken = city ? city.trim().toLowerCase() : "";
  const metroToken = city ? getMetroName(city).toLowerCase() : "";

  function locationPriorityScore(p: { city: string | null; address: string | null }): number {
    if (!locToken) return 0;
    const c = (p.city || "").toLowerCase();
    const a = (p.address || "").toLowerCase();
    if (c.includes(locToken) || a.includes(locToken)) return 2000;
    if (
      metroToken &&
      (c.includes(metroToken) ||
        a.includes(metroToken) ||
        /delhi|ncr|noida|gurgaon|gurugram|faridabad|ghaziabad/i.test(c) ||
        /delhi|ncr|noida|gurgaon|gurugram|faridabad|ghaziabad/i.test(a))
    ) {
      return 500;
    }
    return 100;
  }

  const ranked = [...profiles].sort((a, b) => {
    if (locToken) {
      const locDelta = locationPriorityScore(b) - locationPriorityScore(a);
      if (locDelta !== 0) return locDelta;
    }
    if (expandedSubjects && expandedSubjects.length > 0) {
      const overlapDelta =
        subjectMatchScore(b.subjects, expandedSubjects) - subjectMatchScore(a.subjects, expandedSubjects);
      if (overlapDelta !== 0) return overlapDelta;
    }
    if (Number(b.isFeatured) !== Number(a.isFeatured)) return Number(b.isFeatured) - Number(a.isFeatured);
    if (b.profileScore !== a.profileScore) return b.profileScore - a.profileScore;
    return b.averageRating - a.averageRating;
  }).slice(0, 16);

  const tutors: PublicTutorResult[] = ranked.map((p) => ({
    id: p.id,
    name: maskName(p.user.name),
    qualification: p.qualification ?? "",
    experience: p.experience ?? 0,
    subjects: p.subjects,
    classLevels: p.classLevels,
    teachingMode: p.teachingMode,
    teachingRadius: p.teachingRadius ?? 10,
    feeMin: p.feeMin,
    feeMax: p.feeMax,
    city: p.city,
    state: p.state,
    address: p.address,
    gender: p.gender,
    image: p.user.image,
    averageRating: p.averageRating,
    totalReviews: p.totalReviews,
    isVerified: p.isVerified,
    isFeatured: p.isFeatured,
    bio: p.bio,
    profileScore: p.profileScore,
  }));

  return { tutors, total, isFallback, fallbackReason };
}
