/**
 * lib/staff-lead-parser.ts
 *
 * Universal Multi-Format Lead Ingestion Engine.
 * Supports:
 * 1. JSON (raw array of objects or single objects)
 * 2. CSV / TSV / Excel table copy-pastes
 * 3. WhatsApp chat exports (with/without bracketed timestamps, narrow non-breaking spaces)
 * 4. Multi-profile unstructured message dumps, contact lists & CV snippets
 * 5. Freeform emails, forms, and custom contact lists
 */

import { extractLeadsBatch, extractLeadDataFast, type ParsedLead } from "./gemini-lead-extractor";

// ─── WhatsApp Timestamp Pattern (matches standard spaces, non-breaking spaces \u202F \u00A0) ───
const WA_TIMESTAMP_PATTERN = /^(?:\[\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4},?[\s\u202F\u00A0]*\d{1,2}:\d{2}(?::\d{2})?[\s\u202F\u00A0]*(?:am|pm|AM|PM)?\]|\[\d{1,2}:\d{2}(?::\d{2})?[\s\u202F\u00A0]*(?:am|pm|AM|PM)?,?[\s\u202F\u00A0]*\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\]|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4},?[\s\u202F\u00A0]*\d{1,2}:\d{2}(?::\d{2})?[\s\u202F\u00A0]*(?:am|pm|AM|PM)?[\s\u202F\u00A0]*-[\s\u202F\u00A0]*)/i;

// ─── 1. JSON Parser ───────────────────────────────────────────────────────────
function tryParseJson(text: string): ParsedLead[] | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return null;

  try {
    const parsed = JSON.parse(trimmed);
    const items = Array.isArray(parsed) ? parsed : [parsed];
    const results: ParsedLead[] = [];

    for (const item of items) {
      if (typeof item !== "object" || !item) continue;
      const phoneRaw = item.phone || item.mobile || item.whatsapp || item.contact || item.contactNo || item.phone_number;
      const phoneClean = phoneRaw ? String(phoneRaw).replace(/\D/g, "").slice(-10) : null;
      const emailRaw = item.email || item.mail || item.emailAddress || item.email_address;
      const emailClean = emailRaw ? String(emailRaw).trim().toLowerCase() : null;

      if (!phoneClean && !emailClean) continue;

      const subjectsRaw = item.subjects || item.subject || [];
      const subjects = Array.isArray(subjectsRaw) ? subjectsRaw.map(String) : String(subjectsRaw).split(/[,/|]/).map((s) => s.trim()).filter(Boolean);

      const classesRaw = item.classes || item.class || item.grade || [];
      const classes = Array.isArray(classesRaw) ? classesRaw.map(String) : String(classesRaw).split(/[,/|]/).map((c) => c.trim()).filter(Boolean);

      results.push({
        leadType: (item.leadType === "PARENT_LEAD" || item.type === "PARENT" || /parent|student/i.test(item.role || "")) ? "PARENT_LEAD" : "TUTOR",
        rawText: JSON.stringify(item, null, 2),
        name: item.name || item.fullName || item.tutorName || item.studentName || null,
        phone: phoneClean && /^[6-9]\d{9}$/.test(phoneClean) ? phoneClean : null,
        altPhone: item.altPhone ? String(item.altPhone).replace(/\D/g, "").slice(-10) : null,
        whatsapp: phoneClean && /^[6-9]\d{9}$/.test(phoneClean) ? phoneClean : null,
        email: emailClean && emailClean.includes("@") ? emailClean : null,
        location: item.location || item.address || item.city || null,
        pincode: item.pincode || item.pin || null,
        fullAddress: item.address || item.fullAddress || null,
        subjects,
        classes,
        board: item.board || null,
        qualification: item.qualification || item.degree || null,
        experienceYears: typeof item.experience === "number" ? item.experience : null,
        gender: item.gender || null,
        budgetFee: item.fee || item.budget || null,
        appliedCodes: Array.isArray(item.codes) ? item.codes : (item.code ? [String(item.code)] : []),
        operationalNotes: item.notes || null,
        confidence: 0.99,
        isJunk: false,
      });
    }

    return results.length > 0 ? results : null;
  } catch {
    return null;
  }
}

// ─── 2. CSV / TSV / Tabular Parser ────────────────────────────────────────────
function tryParseTabular(text: string): ParsedLead[] | null {
  const lines = text.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  // Check delimiter (comma or tab or pipe)
  const firstLine = lines[0];
  const delimiter = firstLine.includes("\t") ? "\t" : firstLine.includes(",") ? "," : firstLine.includes("|") ? "|" : null;
  if (!delimiter) return null;

  const headers = firstLine.split(delimiter).map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
  const nameIdx = headers.findIndex((h) => h.includes("name") || h.includes("tutor") || h.includes("candidate"));
  const phoneIdx = headers.findIndex((h) => h.includes("phone") || h.includes("mobile") || h.includes("contact") || h.includes("whatsapp"));
  const emailIdx = headers.findIndex((h) => h.includes("email") || h.includes("mail"));
  const addrIdx = headers.findIndex((h) => h.includes("fulladdress") || h.includes("completeaddress") || h.includes("address") || h.includes("street"));
  const locIdx = headers.findIndex((h) => h.includes("location") || h.includes("locality") || h.includes("area") || h.includes("city"));
  const pinIdx = headers.findIndex((h) => h.includes("pincode") || h.includes("pin") || h.includes("zip"));
  const subIdx = headers.findIndex((h) => h.includes("subject") || h.includes("skill"));
  const classIdx = headers.findIndex((h) => h.includes("class") || h.includes("grade"));
  const qualIdx = headers.findIndex((h) => h.includes("qual") || h.includes("degree") || h.includes("edu"));
  const expIdx = headers.findIndex((h) => h.includes("exp") || h.includes("year"));
  const genderIdx = headers.findIndex((h) => h.includes("gender") || h.includes("sex"));

  if (phoneIdx === -1 && emailIdx === -1) return null;

  const results: ParsedLead[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map((c) => c.trim());
    if (cols.length < 2) continue;

    const phoneRaw = phoneIdx !== -1 ? cols[phoneIdx] : null;
    const phoneClean = phoneRaw ? phoneRaw.replace(/\D/g, "").slice(-10) : null;
    const emailRaw = emailIdx !== -1 ? cols[emailIdx] : null;
    const emailClean = emailRaw && emailRaw.includes("@") ? emailRaw.toLowerCase() : null;

    if (!phoneClean && !emailClean) continue;

    let name = nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx].trim() : null;
    if (!name && emailClean) {
      const user = emailClean.split("@")[0].replace(/\d+/g, "").replace(/(?:tutor|mail|git)[._-]?/gi, "");
      const parts = user.split(/[._-]+/).filter((p) => p.length >= 2);
      if (parts.length > 0) {
        name = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
      }
    }

    const rawLoc = locIdx !== -1 && cols[locIdx] ? cols[locIdx].trim() : null;
    const rawAddr = addrIdx !== -1 && cols[addrIdx] ? cols[addrIdx].trim() : null;
    const fullAddress = rawAddr || rawLoc || null;
    const location = rawLoc || (rawAddr ? (rawAddr.split(",").length >= 2 ? rawAddr.split(",").slice(-2).join(", ").trim() : rawAddr) : null);
    const pincodeRaw = pinIdx !== -1 && cols[pinIdx] ? cols[pinIdx].replace(/\D/g, "").slice(0, 6) : null;

    const subjects = subIdx !== -1 && cols[subIdx] ? cols[subIdx].split(/[,/|]/).map((s) => s.trim()).filter(Boolean) : [];
    const classes = classIdx !== -1 && cols[classIdx] ? cols[classIdx].split(/[,/|]/).map((c) => c.trim()).filter(Boolean) : [];
    const expRaw = expIdx !== -1 && cols[expIdx] ? parseInt(cols[expIdx].replace(/\D/g, ""), 10) : null;
    const genderRaw = genderIdx !== -1 && cols[genderIdx] ? (cols[genderIdx].toLowerCase().startsWith("f") ? "Female" : cols[genderIdx].toLowerCase().startsWith("m") ? "Male" : null) : null;

    results.push({
      leadType: "TUTOR",
      rawText: lines[i],
      name: name || null,
      phone: phoneClean && /^[6-9]\d{9}$/.test(phoneClean) ? phoneClean : null,
      altPhone: null,
      whatsapp: phoneClean && /^[6-9]\d{9}$/.test(phoneClean) ? phoneClean : null,
      email: emailClean,
      location: location || null,
      pincode: pincodeRaw && pincodeRaw.length === 6 ? pincodeRaw : null,
      fullAddress: fullAddress || null,
      subjects,
      classes,
      board: null,
      qualification: qualIdx !== -1 && cols[qualIdx] ? cols[qualIdx] : null,
      experienceYears: !isNaN(Number(expRaw)) && Number(expRaw) > 0 ? Number(expRaw) : null,
      gender: genderRaw,
      budgetFee: null,
      appliedCodes: [],
      operationalNotes: null,
      confidence: 0.95,
      isJunk: false,
    });
  }

  return results.length > 0 ? results : null;
}

// ─── 3. Universal Multi-Profile Freeform & WhatsApp Segmenter ─────────────────
export function splitWhatsAppDump(raw: string): string[] {
  const text = raw.trim();
  if (!text) return [];

  const normalized = text.replace(/\r\n/g, "\n");
  const rawSegments: string[] = [];

  // Check if text has WhatsApp timestamps
  const lines = normalized.split("\n");
  let hasTimestamps = false;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    if (WA_TIMESTAMP_PATTERN.test(lines[i])) {
      hasTimestamps = true;
      break;
    }
  }

  if (hasTimestamps) {
    let currentSegment: string[] = [];

    for (const line of lines) {
      if (WA_TIMESTAMP_PATTERN.test(line)) {
        if (currentSegment.length > 0) {
          const combined = currentSegment.join("\n").trim();
          if (combined) rawSegments.push(combined);
        }
        // Extract content after timestamp and sender header (e.g. "26/08/26, 2:02 pm - +91 85069 51507: ...")
        const contentAfterHeader = line
          .replace(WA_TIMESTAMP_PATTERN, "")
          .replace(/^[^:]*:\s*/i, "")
          .trim();
        currentSegment = contentAfterHeader ? [contentAfterHeader] : [];
      } else {
        currentSegment.push(line);
      }
    }
    if (currentSegment.length > 0) {
      const combined = currentSegment.join("\n").trim();
      if (combined) rawSegments.push(combined);
    }
  } else {
    // Non-timestamped freeform dump
    const majorSplits = normalized.split(/\n\s*\n\s*\n+|(?<=\n)\s*(?=(?:Tutor Profile|Tutor Details|PROFILE DETAILS|Details Require|Dear (?:Team|Tutor|Tutor Coordinator)|Please provide the following|My profile\s*-|\b\d+\.\s*Full Name|\+\d{1,2}\s*[6-9]\d{4}\s*\n))/i);
    for (const block of majorSplits) {
      const t = block.trim();
      if (t.length > 0) rawSegments.push(t);
    }
  }

  // Post-process segments:
  // If a segment contains a list of multiple phone numbers or multiple profile codes, split it into individual sub-leads!
  const finalSegments: string[] = [];

  for (const seg of rawSegments) {
    const trimmedSeg = seg.trim();
    if (!trimmedSeg) continue;

    // Check if this segment contains multiple standalone phone numbers (like 8587022506\n9999218333...)
    const segLines = trimmedSeg.split("\n").map((l) => l.trim()).filter(Boolean);
    const phoneLines = segLines.filter((l) => /^(?:\+?91[\s-]?)?[6-9]\d{9}$/.test(l.replace(/\s+/g, "")));

    // If most lines in this segment are individual phone numbers (a contact list)
    if (phoneLines.length >= 2 && phoneLines.length >= segLines.length * 0.6) {
      for (const pl of segLines) {
        if (pl.length > 5) finalSegments.push(pl);
      }
      continue;
    }

    // Check if segment has multiple Code blocks (e.g. Code: C102 ... Code: C103 ...)
    const codeCount = (trimmedSeg.match(/\bCode[:.]\s*C\d+/gi) || []).length;
    if (codeCount > 1) {
      const codeSplits = trimmedSeg.split(/(?=\bCode[:.]\s*C\d+)/i);
      for (const cs of codeSplits) {
        const tcs = cs.trim();
        if (tcs.length > 5) finalSegments.push(tcs);
      }
      continue;
    }

    finalSegments.push(trimmedSeg);
  }

  return finalSegments;
}

// ─── Deduplicate Leads in the Same Batch ──────────────────────────────────────
function deduplicateLeads(leads: ParsedLead[]): ParsedLead[] {
  const seenPhones = new Set<string>();
  const seenEmails = new Set<string>();
  const uniqueLeads: ParsedLead[] = [];

  for (const lead of leads) {
    const phone = lead.phone?.trim();
    const email = lead.email?.trim().toLowerCase();

    // If it has neither phone nor email, keep it only if it has a name and location
    if (!phone && !email) {
      if (lead.name && lead.location) {
        uniqueLeads.push(lead);
      }
      continue;
    }

    const isDuplicatePhone = phone ? seenPhones.has(phone) : false;
    const isDuplicateEmail = email ? seenEmails.has(email) : false;

    if (isDuplicatePhone || isDuplicateEmail) {
      continue;
    }

    if (phone) seenPhones.add(phone);
    if (email) seenEmails.add(email);
    uniqueLeads.push(lead);
  }

  return uniqueLeads;
}

// ─── Public Batch Parser API ──────────────────────────────────────────────────
export interface BatchParseResult {
  leads: ParsedLead[];
  junkCount: number;
  totalMessages: number;
}

export async function parseWhatsAppDump(
  rawText: string,
  onProgress?: (done: number, total: number) => void
): Promise<BatchParseResult> {
  // Check 1: JSON format
  const jsonResult = tryParseJson(rawText);
  if (jsonResult && jsonResult.length > 0) {
    const deduped = deduplicateLeads(jsonResult);
    return {
      leads: deduped,
      junkCount: 0,
      totalMessages: jsonResult.length,
    };
  }

  // Check 2: CSV / Tabular / Excel format
  const tabularResult = tryParseTabular(rawText);
  if (tabularResult && tabularResult.length > 0) {
    const deduped = deduplicateLeads(tabularResult);
    return {
      leads: deduped,
      junkCount: 0,
      totalMessages: tabularResult.length,
    };
  }

  // Check 3: Universal Freeform / WhatsApp Chat parser
  const messages = splitWhatsAppDump(rawText);
  const totalMessages = messages.length;

  const allParsed = await extractLeadsBatch(messages, onProgress);
  const validLeads = allParsed.filter((l) => !l.isJunk && (l.phone || l.email || l.name));
  const junkCount = allParsed.length - validLeads.length;
  const deduped = deduplicateLeads(validLeads);

  return {
    leads: deduped,
    junkCount,
    totalMessages,
  };
}
