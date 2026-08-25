/**
 * lib/staff-lead-parser.ts
 *
 * Universal Multi-Format Lead Ingestion Engine.
 * Supports:
 * 1. JSON (raw array of objects or single objects)
 * 2. CSV / TSV / Excel table copy-pastes
 * 3. WhatsApp chat exports (with/without bracketed timestamps)
 * 4. Multi-profile unstructured message dumps & CV snippets
 * 5. Freeform emails, forms, and custom contact lists
 */

import { extractLeadsBatch, type ParsedLead } from "./gemini-lead-extractor";

// ─── WhatsApp Timestamp Pattern ───────────────────────────────────────────────
const WA_TIMESTAMP_PATTERN = /\[\d{1,2}:\d{2}\s*(?:am|pm)?,?\s*\d{1,2}\/\d{1,2}\/\d{2,4}\]|\[\d{1,2}\/\d{1,2}\/\d{2,4},?\s*\d{1,2}:\d{2}\s*(?:am|pm)?\]|\b\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2}\s*(?:am|pm)?\s*-\s*/i;

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
        rawText: JSON.stringify(item, null, 2),
        name: item.name || item.fullName || item.tutorName || null,
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
  const nameIdx = headers.findIndex((h) => h.includes("name"));
  const phoneIdx = headers.findIndex((h) => h.includes("phone") || h.includes("mobile") || h.includes("contact") || h.includes("whatsapp"));
  const emailIdx = headers.findIndex((h) => h.includes("email") || h.includes("mail"));
  const locIdx = headers.findIndex((h) => h.includes("location") || h.includes("address") || h.includes("city"));
  const subIdx = headers.findIndex((h) => h.includes("subject"));
  const classIdx = headers.findIndex((h) => h.includes("class") || h.includes("grade"));
  const qualIdx = headers.findIndex((h) => h.includes("qual") || h.includes("degree"));

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

    const subjects = subIdx !== -1 && cols[subIdx] ? cols[subIdx].split(/[,/|]/).map((s) => s.trim()).filter(Boolean) : [];
    const classes = classIdx !== -1 && cols[classIdx] ? cols[classIdx].split(/[,/|]/).map((c) => c.trim()).filter(Boolean) : [];

    results.push({
      rawText: lines[i],
      name: nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx] : null,
      phone: phoneClean && /^[6-9]\d{9}$/.test(phoneClean) ? phoneClean : null,
      altPhone: null,
      whatsapp: phoneClean && /^[6-9]\d{9}$/.test(phoneClean) ? phoneClean : null,
      email: emailClean,
      location: locIdx !== -1 && cols[locIdx] ? cols[locIdx] : null,
      pincode: null,
      fullAddress: null,
      subjects,
      classes,
      board: null,
      qualification: qualIdx !== -1 && cols[qualIdx] ? cols[qualIdx] : null,
      experienceYears: null,
      gender: null,
      confidence: 0.95,
      isJunk: false,
    });
  }

  return results.length > 0 ? results : null;
}

// ─── 3. Universal Multi-Profile Freeform Segmenter ────────────────────────────
export function splitWhatsAppDump(raw: string): string[] {
  const text = raw.trim();
  if (!text) return [];

  const normalized = text.replace(/\r\n/g, "\n");

  // 1. WhatsApp timestamps
  if (WA_TIMESTAMP_PATTERN.test(normalized)) {
    const lines = normalized.split("\n");
    const segments: string[] = [];
    let currentSegment: string[] = [];

    for (const line of lines) {
      if (WA_TIMESTAMP_PATTERN.test(line)) {
        if (currentSegment.length > 0) {
          const combined = currentSegment.join("\n").trim();
          if (combined) segments.push(combined);
        }
        const contentAfterHeader = line.replace(/^(?:\[.*?\]|\d{1,2}\/\d{1,2}\/\d{2,4},?\s*\d{1,2}:\d{2}\s*(?:am|pm)?\s*-?)\s*[^:]*:\s*/i, "").trim();
        currentSegment = contentAfterHeader ? [contentAfterHeader] : [];
      } else {
        currentSegment.push(line);
      }
    }
    if (currentSegment.length > 0) {
      const combined = currentSegment.join("\n").trim();
      if (combined) segments.push(combined);
    }
    if (segments.length > 0) return segments;
  }

  // 2. Multi-Profile Dump without timestamps:
  // Split on 2+ blank lines OR explicit tutor profile boundaries
  const majorSplits = normalized.split(/\n\s*\n\s*\n+|(?<=\n)\s*(?=(?:Tutor Profile|Tutor Details|PROFILE DETAILS|Details Require|Dear (?:Team|Tutor|Tutor Coordinator)|Please provide the following|My profile\s*-|\b\d+\.\s*Full Name|\+\d{1,2}\s*[6-9]\d{4}\s*\n))/i);

  const segments: string[] = [];
  for (const block of majorSplits) {
    const trimmed = block.trim();
    if (trimmed.length > 10) {
      // If a block has multiple distinct phone numbers, split them
      const phoneCount = (trimmed.match(/(?:(?:\+?91[\s-]?)|\b)[6-9]\d{1,4}[-\s]?\d{2,4}[-\s]?\d{2,4}\b/g) || []).length;
      if (phoneCount > 1) {
        const innerSplits = trimmed.split(/(?=\n\s*(?:(?:\+\d{1,2}\s*[6-9]\d{4})|(?:Your email address:)|(?:Tutor Name[-:]\s*)|(?:Name\s*[-:]\s*[A-Za-z])))/i);
        for (const inner of innerSplits) {
          const tInner = inner.trim();
          if (tInner.length > 10) segments.push(tInner);
        }
      } else {
        segments.push(trimmed);
      }
    }
  }

  // Fallback: If no segments generated, split by double newlines
  if (segments.length === 0) {
    return normalized.split(/\n\s*\n/).map((b) => b.trim()).filter((b) => b.length > 5);
  }

  return segments;
}

// ─── Deduplicate Leads in the Same Batch ──────────────────────────────────────
function deduplicateLeads(leads: ParsedLead[]): ParsedLead[] {
  const seenPhones = new Set<string>();
  const seenEmails = new Set<string>();
  const uniqueLeads: ParsedLead[] = [];

  for (const lead of leads) {
    const phone = lead.phone?.trim();
    const email = lead.email?.trim().toLowerCase();

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
  const validLeads = allParsed.filter((l) => !l.isJunk);
  const junkCount = allParsed.filter((l) => l.isJunk).length;
  const deduped = deduplicateLeads(validLeads);

  return {
    leads: deduped,
    junkCount,
    totalMessages,
  };
}
