import React from "react";
import { parseClassAndSubject, searchSmartSubjects, ALL_STRUCTURED_CLASSES } from "./subject-matcher";
import { FLATTENED_TAXONOMY_SUBJECTS } from "./subject-taxonomy";

export type UrbanProItem = {
  lead: string;
  rest: string;
  subject: string;
  classLevel: string;
  label: string;
};

export type LocHit = {
  label: string;
  city: string;
  meta?: string;
};

export const URBANPRO_CATALOG: UrbanProItem[] = [
  // Mathematics
  { lead: "Mathematics", rest: "in Class 10 Tuition", subject: "Mathematics", classLevel: "Class 9-10", label: "Mathematics in Class 10 Tuition" },
  { lead: "Mathematics", rest: "in Class 12 Tuition", subject: "Mathematics", classLevel: "Class 11-12", label: "Mathematics in Class 12 Tuition" },
  { lead: "Mathematics", rest: "in Class 9–10 Tuition", subject: "Mathematics", classLevel: "Class 9-10", label: "Mathematics in Class 9-10 Tuition" },
  { lead: "Mathematics", rest: "in Class 11–12 Tuition", subject: "Mathematics", classLevel: "Class 11-12", label: "Mathematics in Class 11-12 Tuition" },
  { lead: "Mathematics", rest: "in Class 6–8 Tuition", subject: "Mathematics", classLevel: "Class 6-8", label: "Mathematics in Class 6-8 Tuition" },
  { lead: "Mathematics", rest: "in Class I–V Tuition", subject: "Mathematics", classLevel: "Class 1-5", label: "Mathematics in Class I-V Tuition" },
  { lead: "Science & Maths", rest: "in Class 9–10 Tuition", subject: "Science & Maths", classLevel: "Class 9-10", label: "Science & Maths in Class 9-10 Tuition" },
  { lead: "Mathematics", rest: "in IIT-JEE Coaching", subject: "Mathematics", classLevel: "IIT-JEE", label: "Mathematics in IIT-JEE Coaching" },
  { lead: "Vedic Maths", rest: "in Mental Maths Classes", subject: "Vedic Maths", classLevel: "All Grades", label: "Vedic Maths in Mental Maths Classes" },
  { lead: "Business Mathematics", rest: "in Class 11–12 Commerce Tuition", subject: "Mathematics", classLevel: "Class 11-12", label: "Business Mathematics in Class 11-12 Commerce Tuition" },
  { lead: "Applied Mathematics", rest: "in Class 11–12 Tuition", subject: "Mathematics", classLevel: "Class 11-12", label: "Applied Mathematics in Class 11-12 Tuition" },

  // Science
  { lead: "Science", rest: "in Class 9–10 Tuition", subject: "Science", classLevel: "Class 9-10", label: "Science in Class 9-10 Tuition" },
  { lead: "Science", rest: "in Class 6–8 Tuition", subject: "Science", classLevel: "Class 6-8", label: "Science in Class 6-8 Tuition" },
  { lead: "Science", rest: "in Class I–V Tuition", subject: "Science", classLevel: "Class 1-5", label: "Science in Class I-V Tuition" },
  { lead: "Social Science", rest: "in Class 9–10 Tuition", subject: "Social Science", classLevel: "Class 9-10", label: "Social Science in Class 9-10 Tuition" },
  { lead: "Social Science", rest: "in Class 6–8 Tuition", subject: "Social Science", classLevel: "Class 6-8", label: "Social Science in Class 6-8 Tuition" },
  { lead: "Social Studies", rest: "in Class I–V Tuition", subject: "Social Studies", classLevel: "Class 1-5", label: "Social Studies in Class I-V Tuition" },

  // Physics, Chemistry, Biology
  { lead: "Physics", rest: "in Class 11–12 Tuition", subject: "Physics", classLevel: "Class 11-12", label: "Physics in Class 11-12 Tuition" },
  { lead: "Physics", rest: "in Class 9–10 Tuition", subject: "Physics", classLevel: "Class 9-10", label: "Physics in Class 9-10 Tuition" },
  { lead: "Physics", rest: "in NEET-UG Coaching", subject: "Physics", classLevel: "NEET", label: "Physics in NEET-UG Coaching" },
  { lead: "Physics", rest: "in IIT-JEE Coaching", subject: "Physics", classLevel: "IIT-JEE", label: "Physics in IIT-JEE Coaching" },
  { lead: "Chemistry", rest: "in Class 11–12 Tuition", subject: "Chemistry", classLevel: "Class 11-12", label: "Chemistry in Class 11-12 Tuition" },
  { lead: "Chemistry", rest: "in Class 9–10 Tuition", subject: "Chemistry", classLevel: "Class 9-10", label: "Chemistry in Class 9-10 Tuition" },
  { lead: "Chemistry", rest: "in NEET-UG Coaching", subject: "Chemistry", classLevel: "NEET", label: "Chemistry in NEET-UG Coaching" },
  { lead: "Chemistry", rest: "in IIT-JEE Coaching", subject: "Chemistry", classLevel: "IIT-JEE", label: "Chemistry in IIT-JEE Coaching" },
  { lead: "Biology", rest: "in Class 11–12 Tuition", subject: "Biology", classLevel: "Class 11-12", label: "Biology in Class 11-12 Tuition" },
  { lead: "Biology", rest: "in NEET-UG Coaching", subject: "Biology", classLevel: "NEET", label: "Biology in NEET-UG Coaching" },
  { lead: "Biology", rest: "in Class 9–10 Tuition", subject: "Biology", classLevel: "Class 9-10", label: "Biology in Class 9-10 Tuition" },

  // Commerce & Humanities
  { lead: "Accountancy", rest: "in Class 11–12 Tuition", subject: "Accountancy", classLevel: "Class 11-12", label: "Accountancy in Class 11-12 Tuition" },
  { lead: "Economics", rest: "in Class 11–12 Tuition", subject: "Economics", classLevel: "Class 11-12", label: "Economics in Class 11-12 Tuition" },
  { lead: "Business Studies", rest: "in Class 11–12 Tuition", subject: "Business Studies", classLevel: "Class 11-12", label: "Business Studies in Class 11-12 Tuition" },
  { lead: "Commerce (All Subjects)", rest: "in Class 11–12 Tuition", subject: "Commerce", classLevel: "Class 11-12", label: "Commerce in Class 11-12 Tuition" },
  { lead: "Political Science", rest: "in Class 11–12 Tuition", subject: "Political Science", classLevel: "Class 11-12", label: "Political Science in Class 11-12 Tuition" },
  { lead: "History", rest: "in Class 11–12 Tuition", subject: "History", classLevel: "Class 11-12", label: "History in Class 11-12 Tuition" },
  { lead: "Geography", rest: "in Class 11–12 Tuition", subject: "Geography", classLevel: "Class 11-12", label: "Geography in Class 11-12 Tuition" },
  { lead: "Psychology", rest: "in Class 11–12 Tuition", subject: "Psychology", classLevel: "Class 11-12", label: "Psychology in Class 11-12 Tuition" },

  // Languages
  { lead: "Spoken English", rest: "in Language Classes", subject: "Spoken English", classLevel: "Beginner / Spoken", label: "Spoken English in Language Classes" },
  { lead: "English", rest: "in Class 9–10 Tuition", subject: "English", classLevel: "Class 9-10", label: "English in Class 9-10 Tuition" },
  { lead: "English", rest: "in Class 11–12 Tuition", subject: "English", classLevel: "Class 11-12", label: "English in Class 11-12 Tuition" },
  { lead: "English", rest: "in Class 6–8 Tuition", subject: "English", classLevel: "Class 6-8", label: "English in Class 6-8 Tuition" },
  { lead: "English", rest: "in Class I–V Tuition", subject: "English", classLevel: "Class 1-5", label: "English in Class I-V Tuition" },
  { lead: "Hindi", rest: "in Class 9–10 Tuition", subject: "Hindi", classLevel: "Class 9-10", label: "Hindi in Class 9-10 Tuition" },
  { lead: "Hindi", rest: "in Class 6–8 Tuition", subject: "Hindi", classLevel: "Class 6-8", label: "Hindi in Class 6-8 Tuition" },
  { lead: "Hindi", rest: "in Class I–V Tuition", subject: "Hindi", classLevel: "Class 1-5", label: "Hindi in Class I-V Tuition" },
  { lead: "Sanskrit", rest: "in Class 6–8 Tuition", subject: "Sanskrit", classLevel: "Class 6-8", label: "Sanskrit in School Tuition" },
  { lead: "Sanskrit", rest: "in Class 9–10 Tuition", subject: "Sanskrit", classLevel: "Class 9-10", label: "Sanskrit in School Tuition" },
  { lead: "French", rest: "in Foreign Language Classes", subject: "French Language", classLevel: "Beginner / Spoken", label: "French in Foreign Language Classes" },
  { lead: "German", rest: "in Foreign Language Classes", subject: "German Language", classLevel: "Beginner / Spoken", label: "German in Foreign Language Classes" },
  { lead: "Spanish", rest: "in Foreign Language Classes", subject: "Spanish Language", classLevel: "Beginner / Spoken", label: "Spanish in Foreign Language Classes" },

  // School Grade Bundles
  { lead: "Class 10 All Subjects", rest: "in Secondary School Tuition", subject: "All Subjects", classLevel: "Class 9-10", label: "Class 10 All Subjects in Secondary School Tuition" },
  { lead: "Class 9 All Subjects", rest: "in Secondary School Tuition", subject: "All Subjects", classLevel: "Class 9-10", label: "Class 9 All Subjects in Secondary School Tuition" },
  { lead: "All Subjects", rest: "in Class 1–5 Tuition", subject: "All Subjects", classLevel: "Class 1-5", label: "All Subjects in Class 1-5 Tuition" },
  { lead: "All Subjects", rest: "in Class 6–8 Tuition", subject: "All Subjects", classLevel: "Class 6-8", label: "All Subjects in Class 6-8 Tuition" },

  // Coding & Computer Science
  { lead: "Coding & Python", rest: "in Computer Classes", subject: "Python", classLevel: "School / College", label: "Coding & Python in Computer Classes" },
  { lead: "Computer Science", rest: "in Class 11–12 Tuition", subject: "Computer Science", classLevel: "Class 11-12", label: "Computer Science in Class 11-12 Tuition" },
  { lead: "Informatics Practices (IP)", rest: "in Class 11–12 Tuition", subject: "Informatics Practices", classLevel: "Class 11-12", label: "Informatics Practices in Class 11-12 Tuition" },
  { lead: "Java Programming", rest: "in Computer Classes", subject: "Java", classLevel: "School / College", label: "Java Programming in Computer Classes" },

  // Competitive Exams
  { lead: "IIT-JEE Coaching", rest: "in Engineering Entrance", subject: "IIT-JEE", classLevel: "IIT-JEE", label: "IIT-JEE Coaching in Engineering Entrance" },
  { lead: "NEET-UG Coaching", rest: "in Medical Entrance", subject: "NEET", classLevel: "NEET", label: "NEET-UG Coaching in Medical Entrance" },
  { lead: "CUET Coaching", rest: "in University Entrance", subject: "CUET", classLevel: "CUET", label: "CUET Coaching in University Entrance" },
  { lead: "NDA Exam Coaching", rest: "in Defence Entrance", subject: "NDA", classLevel: "NDA", label: "NDA Exam Coaching in Defence Entrance" },
  { lead: "CLAT Exam Coaching", rest: "in Law Entrance", subject: "CLAT", classLevel: "CLAT", label: "CLAT Exam Coaching in Law Entrance" },
];

export const URBANPRO_POPULAR: UrbanProItem[] = URBANPRO_CATALOG.slice(0, 12);

export const POPULAR_CITIES: LocHit[] = [
  { label: "Delhi", city: "Delhi", meta: "NCR" },
  { label: "Mumbai", city: "Mumbai", meta: "Maharashtra" },
  { label: "Bengaluru", city: "Bengaluru", meta: "Karnataka" },
  { label: "Hyderabad", city: "Hyderabad", meta: "Telangana" },
  { label: "Pune", city: "Pune", meta: "Maharashtra" },
  { label: "Gurugram", city: "Gurugram", meta: "Haryana" },
  { label: "Noida", city: "Noida", meta: "Uttar Pradesh" },
  { label: "Chennai", city: "Chennai", meta: "Tamil Nadu" },
  { label: "Kolkata", city: "Kolkata", meta: "West Bengal" },
  { label: "Jaipur", city: "Jaipur", meta: "Rajasthan" },
  { label: "Ahmedabad", city: "Ahmedabad", meta: "Gujarat" },
  { label: "Lucknow", city: "Lucknow", meta: "Uttar Pradesh" },
];

export const LOCAL_PLACES: LocHit[] = [
  { label: "Sangam Vihar, New Delhi", city: "Sangam Vihar", meta: "South Delhi" },
  { label: "Lajpat Nagar, New Delhi", city: "Lajpat Nagar", meta: "South Delhi" },
  { label: "Greater Kailash, New Delhi", city: "Greater Kailash", meta: "South Delhi" },
  { label: "Saket, New Delhi", city: "Saket", meta: "South Delhi" },
  { label: "Hauz Khas, New Delhi", city: "Hauz Khas", meta: "South Delhi" },
  { label: "Dwarka, New Delhi", city: "Dwarka", meta: "South West Delhi" },
  { label: "Rohini, New Delhi", city: "Rohini", meta: "North West Delhi" },
  { label: "Janakpuri, New Delhi", city: "Janakpuri", meta: "West Delhi" },
  { label: "Vasant Kunj, New Delhi", city: "Vasant Kunj", meta: "South West Delhi" },
  { label: "Mayur Vihar, New Delhi", city: "Mayur Vihar", meta: "East Delhi" },
  { label: "Laxmi Nagar, New Delhi", city: "Laxmi Nagar", meta: "East Delhi" },
  { label: "Karol Bagh, New Delhi", city: "Karol Bagh", meta: "Central Delhi" },
  { label: "Rajouri Garden, New Delhi", city: "Rajouri Garden", meta: "West Delhi" },
  { label: "Dilshad Garden, New Delhi", city: "Dilshad Garden", meta: "East Delhi" },
  { label: "Pitampura, New Delhi", city: "Pitampura", meta: "North West Delhi" },
  { label: "Koramangala, Bengaluru", city: "Koramangala", meta: "Bengaluru" },
  { label: "Whitefield, Bengaluru", city: "Whitefield", meta: "Bengaluru" },
  { label: "Andheri, Mumbai", city: "Andheri", meta: "Mumbai" },
  { label: "Bandra, Mumbai", city: "Bandra", meta: "Mumbai" },
  { label: "Sector 56, Gurugram", city: "Sector 56", meta: "Gurugram" },
];

export function normalizeClassBit(raw: string): string {
  let s = raw.trim();
  s = s.replace(/\bClass\s+XII\b/i, "Class 12");
  s = s.replace(/\bClass\s+XI\b/i, "Class 11");
  s = s.replace(/\bClass\s+X\b/i, "Class 10");
  s = s.replace(/\bClass\s+IX\b/i, "Class 9");
  s = s.replace(/\bClass\s+VIII\b/i, "Class 8");
  s = s.replace(/\bClass\s+VII\b/i, "Class 7");
  s = s.replace(/\bClass\s+VI\b/i, "Class 6");
  s = s.replace(/\bClass\s+V\b/i, "Class 5");
  s = s.replace(/\bClass\s+IV\b/i, "Class 4");
  s = s.replace(/\bClass\s+III\b/i, "Class 3");
  s = s.replace(/\bClass\s+II\b/i, "Class 2");
  s = s.replace(/\bClass\s+I\b/i, "Class 1");
  s = s.replace(/\b(iitjee|iit-jee|jee)\b/i, "IIT-JEE Coaching");
  s = s.replace(/\bneet\b/i, "NEET Coaching");
  if (!/tuition|coaching|classes|prep/i.test(s)) {
    s = `${s} Tuition`;
  }
  return s;
}

export function formatUrbanProLine(name: string, category: string): UrbanProItem {
  const rawName = name.trim();
  const parsed = parseClassAndSubject(rawName);

  // Check if subject has "for Class X" or "upto Class V"
  const m = rawName.match(/^(.*?)\s+(?:for|upto)\s+(.*)$/i);
  if (m) {
    const sub = m[1].trim();
    const cls = normalizeClassBit(m[2]);
    return {
      lead: sub,
      rest: `in ${cls}`,
      subject: parsed.subject || sub,
      classLevel: parsed.classLevel || cls,
      label: `${sub} in ${cls}`,
    };
  }

  // Clean up internal taxonomy categories
  let cleanedCat = category.replace(/^.*?>\s*/, "").trim();
  cleanedCat = cleanedCat.replace(/combo subjects(\s*kg to 10th)?/i, "School");
  cleanedCat = cleanedCat.replace(/school level (math|science)/i, "School");
  cleanedCat = cleanedCat.replace(/school core/i, "School");
  cleanedCat = cleanedCat.replace(/elementary/i, "Primary School");

  const restLabel =
    cleanedCat && cleanedCat.toLowerCase() !== rawName.toLowerCase() && !/subjects/i.test(cleanedCat)
      ? `in ${/tuition|coaching|classes/i.test(cleanedCat) ? cleanedCat : `${cleanedCat} Tuition`}`
      : "Tuition";

  return {
    lead: rawName,
    rest: restLabel,
    subject: parsed.subject || rawName,
    classLevel: parsed.classLevel || "",
    label: `${rawName} ${restLabel}`,
  };
}

export function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return React.createElement(React.Fragment, null, text);
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return React.createElement(React.Fragment, null, text);
  return React.createElement(
    React.Fragment,
    null,
    text.slice(0, i),
    React.createElement(
      "strong",
      { className: "font-bold text-[#0F2540] underline decoration-[#0284C7]/50 underline-offset-2" },
      text.slice(i, i + q.length)
    ),
    text.slice(i + q.length)
  );
}

export function searchUrbanProSubjects(query: string): UrbanProItem[] {
  const q = query.trim();
  if (!q) return URBANPRO_POPULAR;

  const hits: UrbanProItem[] = [];
  const seen = new Set<string>();
  const leadCounts = new Map<string, number>();
  const qLower = q.toLowerCase();

  const pushHit = (item: UrbanProItem, force = false) => {
    const key = `${item.lead}::${item.rest}`.toLowerCase();
    if (seen.has(key)) return;

    // Limit repetition of the same lead subject (e.g. at most 3 entries for "Mathematics")
    const leadKey = item.lead.toLowerCase();
    const count = leadCounts.get(leadKey) || 0;
    if (!force && count >= 3 && hits.length >= 4) return;

    seen.add(key);
    leadCounts.set(leadKey, count + 1);
    hits.push(item);
  };

  // 1. Matches in the curated UrbanPro catalog
  const catalogExactLead: UrbanProItem[] = [];
  const catalogPrefixLead: UrbanProItem[] = [];
  const catalogOther: UrbanProItem[] = [];

  for (const item of URBANPRO_CATALOG) {
    const leadLow = item.lead.toLowerCase();
    const restLow = item.rest.toLowerCase();
    const labelLow = item.label.toLowerCase();

    if (leadLow === qLower) {
      catalogExactLead.push(item);
    } else if (leadLow.startsWith(qLower) || labelLow.startsWith(qLower)) {
      catalogPrefixLead.push(item);
    } else if (leadLow.includes(qLower) || restLow.includes(qLower) || item.subject.toLowerCase().includes(qLower)) {
      catalogOther.push(item);
    }
  }

  for (const it of [...catalogExactLead, ...catalogPrefixLead, ...catalogOther]) {
    pushHit(it);
  }

  // 2. Structured Classes (e.g. "Class 10", "Class 9")
  if (hits.length < 10) {
    for (const cls of ALL_STRUCTURED_CLASSES) {
      if (`${cls.label} ${cls.sub}`.toLowerCase().includes(qLower)) {
        pushHit({
          lead: `${cls.label} All Subjects`,
          rest: `in ${cls.sub} Tuition`,
          subject: "All Subjects",
          classLevel: cls.label,
          label: `${cls.label} All Subjects in ${cls.sub} Tuition`,
        });
      }
    }
  }

  // 3. Fallback to smart typo and synonym search (sanitized)
  if (hits.length < 10) {
    for (const s of searchSmartSubjects(q, 12)) {
      const item = formatUrbanProLine(s.name, s.category);
      pushHit(item);
    }
  }

  // 4. Matches across 300+ taxonomy tree subjects (sanitized)
  if (hits.length < 10) {
    for (const item of FLATTENED_TAXONOMY_SUBJECTS) {
      if (hits.length >= 10) break;
      if (
        item.subject.toLowerCase().includes(qLower) ||
        (item.subcategory && item.subcategory.toLowerCase().includes(qLower)) ||
        item.category.toLowerCase().includes(qLower)
      ) {
        pushHit(formatUrbanProLine(item.subject, item.breadcrumb));
      }
    }
  }

  return hits.slice(0, 10);
}

export function formatPhotonPlace(p: Record<string, string>): LocHit | null {
  const name = (p.name || "").trim();
  const city = (p.city || p.county || p.state_district || "").trim();
  const state = (p.state || "").trim();
  const parts: string[] = [];
  const pushPart = (value: string) => {
    if (!value || value.length < 2) return;
    if (parts.some((x) => x.toLowerCase() === value.toLowerCase())) return;
    parts.push(value);
  };
  pushPart(name);
  if (city.length > 2) pushPart(city);
  if (state.length > 2) pushPart(state);
  if (parts.length === 0) return null;
  return {
    label: parts.join(", "),
    city: name || city,
    meta: state.length > 2 ? state : undefined,
  };
}

export async function searchIndiaPlaces(query: string, signal: AbortSignal): Promise<LocHit[]> {
  const trimmed = query.trim();
  if (/^\d{6}$/.test(trimmed)) {
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${trimmed}`, { signal });
      if (!res.ok) return [];
      const data = await res.json();
      if (data?.[0]?.Status !== "Success") return [];
      return (data[0].PostOffice ?? []).slice(0, 6).map((po: { Name?: string; District?: string; State?: string }) => {
        const area = po.Name || "";
        const city = po.District || area;
        return {
          label: [area, city].filter(Boolean).join(", "),
          city,
          meta: po.State || undefined,
        };
      });
    } catch {
      return [];
    }
  }

  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&lang=en&limit=8&bbox=68.7,8.1,97.4,37.1`,
      { signal }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const hits: LocHit[] = [];
    const seen = new Set<string>();
    for (const feature of data.features ?? []) {
      const p = (feature.properties ?? {}) as Record<string, string>;
      const country = (p.country || "").toLowerCase();
      const code = (p.countrycode || "").toUpperCase();
      if (country && country !== "india" && code && code !== "IN") continue;
      const hit = formatPhotonPlace(p);
      if (!hit) continue;
      const key = hit.label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push(hit);
    }
    return hits.slice(0, 7);
  } catch {
    return [];
  }
}
