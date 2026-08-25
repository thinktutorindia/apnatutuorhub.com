/**
 * lib/gemini-lead-extractor.ts
 *
 * Uses Google Gemini Flash to extract structured tutor lead data from
 * messy WhatsApp messages, CV blobs, or chat snippets.
 *
 * Falls back to a local regex-based extractor if the API key is missing or call fails.
 */

import { GoogleGenAI } from "@google/genai";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ParsedLead {
  name: string | null;
  phone: string | null;
  altPhone: string | null;
  whatsapp: string | null;
  email: string | null;
  location: string | null;
  pincode: string | null;
  fullAddress: string | null;
  subjects: string[];
  classes: string[];
  board: string | null;
  qualification: string | null;
  experienceYears: number | null;
  gender: string | null;
  isJunk: boolean;          // true = skip this message (boilerplate / no useful info)
  confidence: number;       // 0-100 how confident the AI is in this extraction
  rawText: string;          // original snippet
  isDuplicate?: boolean;
  duplicateSource?: "STAFF_LEAD" | "USER" | "IN_BATCH" | null;
  duplicateDetail?: string | null;
}

// ─── Junk phrases to detect ───────────────────────────────────────────────────

const JUNK_PHRASES = [
  "50 percent of the first month",
  "50% of the first month",
  "send me your adhar",
  "please copy paste this form",
  "please be advised that due to whatsapp",
  "we will be implementing email notifications",
  "send me your aadhar",
  "please copy paste",
  "copy paste this form",
  "fill details & send me",
  "fill details and send me",
  "adhar card also separately",
  "aadhar card also separately",
  "thank you for your cooperation",
];

function isJunkMessage(text: string): boolean {
  const lower = text.toLowerCase();
  return JUNK_PHRASES.some((p) => lower.includes(p));
}

// ─── Regex fallback extractor ─────────────────────────────────────────────────

function regexExtract(text: string): Omit<ParsedLead, "rawText" | "confidence" | "isJunk"> {
  // Phones (matches all formats: 977-39-46-019, +91 90000 10001, 3.Alternate mobile - 9000010003, etc.)
  const rawDigits = text.match(/(?:(?:\+?91[\s-]?)|\b)[6-9]\d{9}\b|(?:(?:\+?91[\s-]?)|\b)[6-9][\d\s-]{8,15}\b|(?<=[-:\s])[6-9]\d{9}\b/g) ?? [];
  const phoneMatches = rawDigits
    .map((p) => p.replace(/\D/g, "").slice(-10))
    .filter((p) => /^[6-9]\d{9}$/.test(p));
  const uniquePhones = [...new Set(phoneMatches)];

  // Emails
  const emailMatches = [...text.matchAll(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g)].map((m) => m[0].toLowerCase());
  const uniqueEmails = [...new Set(emailMatches)];

  // Name
  let name: string | null = null;
  const INVALID_NAMES = [
    "karol bagh", "whatsapp on", "objective", "tutor profile", "dear tutor",
    "sincerely", "regards", "qualification", "complete address",
    "educational qualification", "special skills", "team", "details require",
    "sarita vihar", "maya puri", "munirka", "roop nagar", "delhi"
  ];

  const namePatterns = [
    /(?:Tutor Name|Full Name|Name)[^\n\r:-]*[-:=]\s*([^\n\r]+)/i,
    /(?:Sincerely|Regards)[,\s]+([A-Za-z\s.]{2,35})/i,
    /(?:^|\n)([A-Z\s]{3,30})\s*\n\s*OBJECTIVE/i,
  ];

  for (const pat of namePatterns) {
    const m = text.match(pat);
    if (m && m[1]) {
      let candidate = m[1].replace(/^(as per Aadhar|for Profile|as a Tutor)\s*[-:]?\s*/i, "")
                          .replace(/\s*(?:Contact no|Email|Qualification|Phone|Classes|Subjects|Current address)[\s\S]*$/i, "")
                          .trim();
      const lower = candidate.toLowerCase();
      if (candidate.length > 2 && !INVALID_NAMES.some((inv) => lower.includes(inv))) {
        name = candidate;
        break;
      }
    }
  }

  // Infer name from email if still null (e.g. deepikaarora8285 -> Deepika Arora, anishabhatia1712 -> Anisha Bhatia)
  if (!name && uniqueEmails.length > 0) {
    const prefix = uniqueEmails[0].split("@")[0].replace(/\d+/g, "");
    if (prefix.length >= 3 && !prefix.includes("nbr") && !prefix.includes("info")) {
      // Split camelcase or common patterns
      name = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
  }

  // Location
  let location: string | null = null;
  const locPatterns = [
    /(?:Your location|Location|Complete address|Current address|Full address with house no\.)[^\n\r:-]*[-:=]\s*([^\n\r]{3,100})/i,
    /\b(Sarita Vihar|Karol Bagh|Maya Puri|Munirka village New Delhi \d+|Munirka|Roop Nagar|Derawal Nagar|Krishan [Vv]ihar delhi|West Patel Nagar|East Patel Nagar|Mukharjee Nagar|Vaishali|Uttam Nagar|Sarita Vihar|Delhi)\b/i,
  ];
  for (const pat of locPatterns) {
    const m = text.match(pat);
    if (m && m[1]) {
      location = m[1].replace(/^(with house no\.?|Address pincode)[\s\S]*$/i, "").trim().split("\n")[0].trim();
      break;
    }
  }

  // Pincode
  const pincodeMatch = text.match(/\b(\d{6})\b/);

  // Subjects
  const subjectKeywords = ["Mathematics", "Maths", "Math", "Physics", "Chemistry", "Biology", "Science",
    "English", "Hindi", "Social Science", "SST", "Computer Science", "Economics", "Accountancy",
    "Business Studies", "History", "Geography", "French", "Sanskrit", "Commerce", "Accounts"];
  const foundSubjects: string[] = [];
  const subjectLine = text.match(/(?:subjects?[\s:]+|Subjects Can Teach[\s\-:]+|Your subjects?[\s:]+)(.{2,200})/i)?.[1] ?? text;
  for (const sub of subjectKeywords) {
    if (subjectLine.toLowerCase().includes(sub.toLowerCase())) {
      const canonical = sub === "Maths" || sub === "Math" ? "Mathematics"
        : sub === "SST" ? "Social Science"
        : sub === "Accounts" ? "Accountancy"
        : sub;
      if (!foundSubjects.includes(canonical)) foundSubjects.push(canonical);
    }
  }

  // Classes
  const classLine = text.match(/(?:Classes?[^\n]{0,20}Teach|Class Can Teach|Classes Can|Your class|class can teach)[\s:\-]+(.{2,200})/i)?.[1] ?? text;
  const classNumbers: string[] = [];
  const classRanges = [...classLine.matchAll(/(?:class\s*)?(\d{1,2})\s*(?:st|nd|rd|th)?\s*(?:to|-|–)\s*(?:class\s*)?(\d{1,2})\s*(?:st|nd|rd|th)?/gi)];
  for (const m of classRanges) {
    const s = parseInt(m[1]), e = parseInt(m[2]);
    if (s >= 1 && e <= 12 && s <= e) for (let i = s; i <= e; i++) { const c = `Class ${i}`; if (!classNumbers.includes(c)) classNumbers.push(c); }
  }
  if (classNumbers.length === 0) {
    const singles = [...classLine.matchAll(/(?:class\s*)?(\d{1,2})\s*(?:st|nd|rd|th)/gi)];
    for (const m of singles) { const n = parseInt(m[1]); if (n >= 1 && n <= 12) { const c = `Class ${n}`; if (!classNumbers.includes(c)) classNumbers.push(c); } }
  }
  if (/nursery|kg|lkg|ukg/i.test(classLine)) {
    const uptoM = classLine.match(/(?:to|–|-)\s*(?:class\s*)?(\d{1,2})/i);
    const end = uptoM ? parseInt(uptoM[1]) : 5;
    for (let i = 1; i <= Math.min(end, 12); i++) { const c = `Class ${i}`; if (!classNumbers.includes(c)) classNumbers.push(c); }
  }

  // Qualification
  let qualification: string | null = null;
  const qualPatterns = [/(?:qualification|degree)[\s:\-]+([A-Za-z\s\(\)\.]{3,80})/i];
  for (const pat of qualPatterns) {
    const m = text.match(pat);
    if (m) { qualification = m[1].trim().split("\n")[0].trim(); break; }
  }
  if (!qualification) {
    const qualKeywords = ["B.Ed", "B.Tech", "BTech", "B.Sc", "BSc", "M.Tech", "MBA", "MCA", "M.Sc", "MSc", "MA", "BA", "PhD", "CTET", "JBT", "graduation", "Btech", "master"];
    for (const kw of qualKeywords) {
      if (text.toLowerCase().includes(kw.toLowerCase())) { qualification = kw; break; }
    }
  }

  // Experience
  let experienceYears: number | null = null;
  const expMatch = text.match(/(?:experience|exp)[^\d]*(\d+)\s*(?:year|yr)/i);
  if (expMatch) experienceYears = parseInt(expMatch[1]);

  // Gender
  let gender: string | null = null;
  if (/\bMale\b/i.test(text)) gender = "Male";
  else if (/\bFemale\b/i.test(text)) gender = "Female";

  return {
    name,
    phone: uniquePhones[0] ?? null,
    altPhone: uniquePhones[1] ?? null,
    whatsapp: uniquePhones[0] ?? null,
    email: uniqueEmails[0] ?? null,
    location,
    pincode: pincodeMatch?.[1] ?? null,
    fullAddress: null,
    subjects: foundSubjects,
    classes: classNumbers,
    board: text.includes("CBSE") ? "CBSE" : text.includes("ICSE") ? "ICSE" : null,
    qualification,
    experienceYears,
    gender,
  };
}

// ─── Gemini AI extractor ──────────────────────────────────────────────────────

const GEMINI_SYSTEM_PROMPT = `You are an expert data extraction assistant. Extract tutor profile information from messy WhatsApp messages, CVs, and chat snippets.

Return ONLY a valid JSON object with these exact keys:
{
  "name": string or null,
  "phone": string or null (10 digits, no +91 prefix),
  "altPhone": string or null,
  "whatsapp": string or null,
  "email": string or null,
  "location": string or null (area/city name only, short),
  "pincode": string or null (6-digit),
  "fullAddress": string or null,
  "subjects": string[] (standardize: Mathematics not Maths/Math, Science, English, Hindi, Physics, Chemistry, Biology, Social Science, Accountancy, Economics, Business Studies, Computer Science, French, Sanskrit),
  "classes": string[] (standardize as "Class 1", "Class 2", ... "Class 12". Expand ranges: "1 to 8" -> ["Class 1","Class 2","Class 3","Class 4","Class 5","Class 6","Class 7","Class 8"]),
  "board": string or null (CBSE, ICSE, State Board, etc.),
  "qualification": string or null (B.Ed, B.Tech, M.Sc, etc.),
  "experienceYears": number or null,
  "gender": "Male" or "Female" or null,
  "isJunk": boolean (true if the message has no useful tutor data - e.g. boilerplate, spam, instructions, "50% of first month" etc.),
  "confidence": number 0-100
}

Rules:
- Phone numbers: always 10 digits without +91
- If message is just a phone number + location: extract them, isJunk = false
- If message is boilerplate / instructions / "Adhar card" / "50 percent": isJunk = true
- Expand all class ranges to individual classes
- Standardize subject names
- Do not hallucinate. If a field is not present, set it to null or []`;

async function geminiExtract(text: string): Promise<Omit<ParsedLead, "rawText">> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("No GEMINI_API_KEY");

  // 1. Direct REST call to Google Generative Language API
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: `${GEMINI_SYSTEM_PROMPT}\n\nExtract from this message:\n---\n${text}\n---` }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    // Try with GoogleGenAI SDK as fallback
    try {
      const ai = new GoogleGenAI({ apiKey });
      const sdkRes = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: `${GEMINI_SYSTEM_PROMPT}\n\nExtract from this message:\n---\n${text}\n---` }],
          },
        ],
        config: { temperature: 0.1, responseMimeType: "application/json" },
      });
      const raw = sdkRes.text ?? "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in SDK response");
      const parsed = JSON.parse(jsonMatch[0]);
      return formatParsedJson(parsed);
    } catch {
      throw new Error(`Gemini API Error: ${response.status} ${errText}`);
    }
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in Gemini REST response");
  const parsed = JSON.parse(jsonMatch[0]);
  return formatParsedJson(parsed);
}

function formatParsedJson(parsed: Record<string, any>): Omit<ParsedLead, "rawText"> {
  return {
    name: parsed.name ?? null,
    phone: parsed.phone ? String(parsed.phone).replace(/\D/g, "").slice(-10) : null,
    altPhone: parsed.altPhone ? String(parsed.altPhone).replace(/\D/g, "").slice(-10) : null,
    whatsapp: parsed.whatsapp ? String(parsed.whatsapp).replace(/\D/g, "").slice(-10) : null,
    email: parsed.email ?? null,
    location: parsed.location ?? null,
    pincode: parsed.pincode ? String(parsed.pincode) : null,
    fullAddress: parsed.fullAddress ?? null,
    subjects: Array.isArray(parsed.subjects) ? parsed.subjects : [],
    classes: Array.isArray(parsed.classes) ? parsed.classes : [],
    board: parsed.board ?? null,
    qualification: parsed.qualification ?? null,
    experienceYears: parsed.experienceYears ? Number(parsed.experienceYears) : null,
    gender: parsed.gender ?? null,
    isJunk: parsed.isJunk === true,
    confidence: Number(parsed.confidence ?? 70),
  };
}

// ─── Main: AI with regex fallback ────────────────────────────────────────────

export async function extractLeadData(rawText: string): Promise<ParsedLead> {
  const text = rawText.trim();

  // Quick junk check before hitting the API
  if (isJunkMessage(text) && text.length < 400) {
    return {
      ...regexExtract(text),
      isJunk: true,
      confidence: 95,
      rawText: text,
    };
  }

  try {
    const result = await geminiExtract(text);
    return { ...result, rawText: text };
  } catch (err) {
    console.warn("[gemini-lead-extractor] AI extraction failed, using regex fallback:", err instanceof Error ? err.message : err);
    const regexResult = regexExtract(text);
    const hasPhone = Boolean(regexResult.phone);
    const hasEmail = Boolean(regexResult.email);
    const hasName = Boolean(regexResult.name);
    let dynConfidence = 30;
    if (hasPhone) dynConfidence += 35;
    if (hasEmail) dynConfidence += 20;
    if (hasName) dynConfidence += 15;

    return {
      ...regexResult,
      isJunk: !hasPhone && !hasEmail && !hasName,
      confidence: dynConfidence,
      rawText: text,
    };
  }
}

// ─── Batch extract with concurrency limit ────────────────────────────────────

export async function extractLeadsBatch(
  messages: string[],
  onProgress?: (done: number, total: number) => void
): Promise<ParsedLead[]> {
  const results: ParsedLead[] = [];
  const CONCURRENCY = 5; // parallel AI calls at once

  for (let i = 0; i < messages.length; i += CONCURRENCY) {
    const chunk = messages.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(chunk.map((msg) => extractLeadData(msg)));
    results.push(...chunkResults);
    onProgress?.(Math.min(i + CONCURRENCY, messages.length), messages.length);
  }

  return results;
}
