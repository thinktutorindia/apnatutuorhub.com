"use client";

import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Loader2,
  MapPin,
  Search,
} from "lucide-react";
import {
  ALL_STRUCTURED_CLASSES,
  searchSmartSubjects,
  parseClassAndSubject,
} from "@/lib/subject-matcher";
import { FLATTENED_TAXONOMY_SUBJECTS } from "@/lib/subject-taxonomy";

interface HomeHeroCardProps {
  user: { role?: string } | null;
  dashboardUrl: string;
  isParent: boolean;
}

export type UrbanProItem = {
  lead: string;
  rest: string;
  subject: string;
  classLevel: string;
  label: string;
};

type LocHit = {
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

export const URBANPRO_POPULAR: UrbanProItem[] = [
  { lead: "Mathematics", rest: "in Class 10 Tuition", subject: "Mathematics", classLevel: "Class 9-10", label: "Mathematics in Class 10 Tuition" },
  { lead: "Science", rest: "in Class 9–10 Tuition", subject: "Science", classLevel: "Class 9-10", label: "Science in Class 9-10 Tuition" },
  { lead: "Physics", rest: "in Class 11–12 Tuition", subject: "Physics", classLevel: "Class 11-12", label: "Physics in Class 11-12 Tuition" },
  { lead: "Chemistry", rest: "in Class 11–12 Tuition", subject: "Chemistry", classLevel: "Class 11-12", label: "Chemistry in Class 11-12 Tuition" },
  { lead: "Biology", rest: "in NEET-UG Coaching", subject: "Biology", classLevel: "NEET", label: "Biology in NEET-UG Coaching" },
  { lead: "English", rest: "in Class 9–10 Tuition", subject: "English", classLevel: "Class 9-10", label: "English in Class 9-10 Tuition" },
  { lead: "Accountancy", rest: "in Class 11–12 Tuition", subject: "Accountancy", classLevel: "Class 11-12", label: "Accountancy in Class 11-12 Tuition" },
  { lead: "Economics", rest: "in Class 11–12 Tuition", subject: "Economics", classLevel: "Class 11-12", label: "Economics in Class 11-12 Tuition" },
  { lead: "All Subjects", rest: "in Class 1–5 Tuition", subject: "All Subjects", classLevel: "Class 1-5", label: "All Subjects in Class 1-5 Tuition" },
  { lead: "Coding & Python", rest: "in Computer Classes", subject: "Python", classLevel: "School / College", label: "Coding & Python in Computer Classes" },
  { lead: "Mathematics", rest: "in Class 12 Tuition", subject: "Mathematics", classLevel: "Class 11-12", label: "Mathematics in Class 12 Tuition" },
  { lead: "IIT-JEE Coaching", rest: "in Engineering Entrance", subject: "IIT-JEE", classLevel: "IIT-JEE", label: "IIT-JEE Coaching in Engineering Entrance" },
];

const POPULAR_CITIES: LocHit[] = [
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

const LOCAL_PLACES: LocHit[] = [
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
  { label: "Koramangala, Bengaluru", city: "Koramangala", meta: "Bengaluru" },
  { label: "Whitefield, Bengaluru", city: "Whitefield", meta: "Bengaluru" },
  { label: "Andheri, Mumbai", city: "Andheri", meta: "Mumbai" },
  { label: "Bandra, Mumbai", city: "Bandra", meta: "Mumbai" },
  { label: "Sector 56, Gurugram", city: "Sector 56", meta: "Gurugram" },
];

function normalizeClassBit(raw: string): string {
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

function formatUrbanProLine(name: string, category: string): UrbanProItem {
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

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <strong className="font-bold text-[#0F2540] underline decoration-[#0284C7]/50 underline-offset-2">
        {text.slice(i, i + q.length)}
      </strong>
      {text.slice(i + q.length)}
    </>
  );
}

function searchUrbanProSubjects(query: string): UrbanProItem[] {
  const q = query.trim();
  if (!q) return URBANPRO_POPULAR;

  const hits: UrbanProItem[] = [];
  const seen = new Set<string>();
  const leadCounts = new Map<string, number>();
  const qLower = q.toLowerCase();

  const pushHit = (item: UrbanProItem, force = false) => {
    const key = `${item.lead}::${item.rest}`.toLowerCase();
    if (seen.has(key)) return;

    // Limit repetition of the same lead subject (at most 2 entries per subject unless few total hits)
    const leadKey = item.lead.toLowerCase();
    const count = leadCounts.get(leadKey) || 0;
    if (!force && count >= 2 && hits.length >= 4) return;

    seen.add(key);
    leadCounts.set(leadKey, count + 1);
    hits.push(item);
  };

  // 1. Direct matches in Centralized Taxonomy Subjects (Exact & Prefix)
  for (const item of FLATTENED_TAXONOMY_SUBJECTS) {
    if (hits.length >= 8) break;
    const subLow = item.subject.toLowerCase();
    if (subLow === qLower || subLow.startsWith(qLower)) {
      pushHit(formatUrbanProLine(item.subject, item.breadcrumb));
    }
  }

  // 2. Curated high-converting UrbanPro catalog items
  const catalogExact: UrbanProItem[] = [];
  const catalogPrefix: UrbanProItem[] = [];
  const catalogOther: UrbanProItem[] = [];

  for (const item of URBANPRO_CATALOG) {
    const leadLow = item.lead.toLowerCase();
    const restLow = item.rest.toLowerCase();
    const labelLow = item.label.toLowerCase();

    if (leadLow === qLower) {
      catalogExact.push(item);
    } else if (leadLow.startsWith(qLower) || labelLow.startsWith(qLower)) {
      catalogPrefix.push(item);
    } else if (leadLow.includes(qLower) || restLow.includes(qLower) || item.subject.toLowerCase().includes(qLower)) {
      catalogOther.push(item);
    }
  }

  for (const it of [...catalogExact, ...catalogPrefix, ...catalogOther]) {
    pushHit(it);
  }

  // 3. Structured Classes (e.g. "Class 10 All Subjects")
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

  // 4. Word & Substring matches across Taxonomy Tree
  if (hits.length < 10) {
    for (const item of FLATTENED_TAXONOMY_SUBJECTS) {
      if (hits.length >= 10) break;
      const subLow = item.subject.toLowerCase();
      if (
        subLow.includes(qLower) ||
        (item.subcategory && item.subcategory.toLowerCase().includes(qLower)) ||
        item.category.toLowerCase().includes(qLower)
      ) {
        pushHit(formatUrbanProLine(item.subject, item.breadcrumb));
      }
    }
  }

  return hits.slice(0, 10);
}

function formatPhotonPlace(p: Record<string, string>): LocHit | null {
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

async function searchIndiaPlaces(query: string, signal: AbortSignal): Promise<LocHit[]> {
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

function FloatingMenu({
  open,
  anchorRef,
  menuRef,
  labelledBy,
  children,
  minWidth = 460,
  maxWidth = 640,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  menuRef: React.RefObject<HTMLDivElement | null>;
  labelledBy: string;
  children: React.ReactNode;
  minWidth?: number;
  maxWidth?: number;
}) {
  const [mounted, setMounted] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setBox(null);
      return;
    }
    const place = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const isMobile = viewportWidth < 640;

      let width: number;
      let left: number;

      if (isMobile) {
        left = 12;
        width = viewportWidth - 24;
      } else {
        width = Math.min(Math.max(r.width * 1.25, minWidth), maxWidth, viewportWidth - 32);
        left = r.left;
        if (left + width > viewportWidth - 16) {
          left = Math.max(16, viewportWidth - 16 - width);
        }
      }

      setBox({
        top: Math.round(r.bottom + 6),
        left: Math.round(left),
        width: Math.round(width),
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorRef, children, minWidth, maxWidth]);

  if (!mounted || !open || !box) return null;

  return createPortal(
    <div
      ref={menuRef}
      id={labelledBy}
      role="listbox"
      onMouseDown={(e) => {
        // Prevent input blur when interacting with tabs or items
        e.preventDefault();
        e.stopPropagation();
      }}
      style={{
        position: "fixed",
        top: box.top,
        left: box.left,
        width: box.width,
        zIndex: 9999,
      }}
      className="max-h-[460px] overflow-hidden flex flex-col rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_20px_48px_rgba(15,37,64,0.22),0_6px_16px_rgba(15,37,64,0.08)] animate-in fade-in-50 zoom-in-95 duration-150"
    >
      {children}
    </div>,
    document.body
  );
}

export function HomeHeroCard({ user, dashboardUrl, isParent }: HomeHeroCardProps) {
  const router = useRouter();
  const subjectListId = useId();
  const locationListId = useId();

  const [classSubject, setClassSubject] = useState("");
  const [selectedMeta, setSelectedMeta] = useState<{ subject: string; classLevel: string } | null>(null);

  const [locality, setLocality] = useState("");
  const [cityParam, setCityParam] = useState("");
  const [openPanel, setOpenPanel] = useState<"subject" | "location" | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [locHits, setLocHits] = useState<LocHit[]>([]);
  const [locLoading, setLocLoading] = useState(false);

  const rootRef = useRef<HTMLFormElement>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const subjectMenuRef = useRef<HTMLDivElement>(null);
  const locationMenuRef = useRef<HTMLDivElement>(null);

  const subjectHits = useMemo(() => searchUrbanProSubjects(classSubject), [classSubject]);

  const locationHits = useMemo(() => {
    const q = locality.trim().toLowerCase();
    const popular = POPULAR_CITIES.filter((c) =>
      !q ? true : c.label.toLowerCase().includes(q) || c.city.toLowerCase().includes(q)
    );
    if (q.length < 2) return popular.slice(0, 8);
    const local = LOCAL_PLACES.filter(
      (c) => c.label.toLowerCase().includes(q) || c.city.toLowerCase().includes(q)
    );
    const merged: LocHit[] = [];
    const seen = new Set<string>();
    for (const hit of [...local, ...popular, ...locHits]) {
      const key = hit.label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(hit);
    }
    return merged.slice(0, 8);
  }, [locality, locHits]);

  useEffect(() => {
    if (!openPanel) return;
    function onPointerDown(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (subjectMenuRef.current?.contains(t)) return;
      if (locationMenuRef.current?.contains(t)) return;
      setOpenPanel(null);
    }
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
    }, 50);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openPanel]);

  useEffect(() => {
    const q = locality.trim();
    if (openPanel !== "location" || q.length < 2) {
      setLocHits([]);
      setLocLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLocLoading(true);
      const hits = await searchIndiaPlaces(q, controller.signal);
      if (!controller.signal.aborted) {
        setLocHits(hits);
        setLocLoading(false);
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [locality, openPanel]);

  useEffect(() => {
    setActiveIndex(0);
  }, [openPanel, classSubject, locality]);

  const goSearch = useCallback(
    (rawClassSubject = classSubject, rawLocality = cityParam || locality) => {
      let finalSubject = "";
      let finalClassLevel = "";

      if (selectedMeta && selectedMeta.subject) {
        finalSubject = selectedMeta.subject;
        finalClassLevel = selectedMeta.classLevel;
      } else {
        const parsed = parseClassAndSubject(rawClassSubject);
        finalSubject = parsed.subject;
        finalClassLevel = parsed.classLevel;
      }

      // Preserve actual locality or area name
      const loc = (rawLocality || "").trim();
      const city = loc.includes(",") ? loc.split(",")[0].trim() : loc;

      const params = new URLSearchParams();
      if (finalSubject) params.set("subject", finalSubject);
      if (finalClassLevel) params.set("classLevel", finalClassLevel);
      if (city) params.set("city", city);

      if (user && isParent) {
        router.push(`/parent/post-requirement?${params.toString()}`);
      } else if (user) {
        router.push(dashboardUrl);
      } else {
        router.push(`/find-tutor?${params.toString()}`);
      }
    },
    [classSubject, cityParam, locality, selectedMeta, user, isParent, dashboardUrl, router]
  );

  const pickSubject = (item: UrbanProItem) => {
    setClassSubject(item.label);
    setSelectedMeta({ subject: item.subject, classLevel: item.classLevel });
    setOpenPanel(null);
    window.setTimeout(() => locationInputRef.current?.focus(), 40);
  };

  const pickLocation = (hit: LocHit) => {
    setLocality(hit.label);
    setCityParam(hit.city || hit.label); // Preserve specific locality
    setOpenPanel(null);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOpenPanel(null);
    goSearch();
  };

  const onSubjectKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!openPanel && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpenPanel("subject");
      return;
    }
    if (openPanel !== "subject") return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(subjectHits.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && subjectHits[activeIndex]) {
      e.preventDefault();
      pickSubject(subjectHits[activeIndex]);
    } else if (e.key === "Escape") {
      setOpenPanel(null);
    }
  };

  const onLocationKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!openPanel && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpenPanel("location");
      return;
    }
    if (openPanel !== "location") return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(locationHits.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && locationHits[activeIndex]) {
      e.preventDefault();
      pickLocation(locationHits[activeIndex]);
    } else if (e.key === "Escape") {
      setOpenPanel(null);
    }
  };

  const locationEmpty = locality.trim().length < 2;
  const lifted = openPanel !== null;

  return (
    <form
      ref={rootRef}
      onSubmit={handleSearch}
      className={`relative z-50 overflow-visible w-full max-w-full bg-white rounded-2xl p-2 sm:p-2.5 flex flex-col md:flex-row md:items-stretch gap-2 min-w-0 transition-shadow ${
        lifted
          ? "shadow-[0_16px_40px_rgba(10,25,47,0.28)]"
          : "shadow-[0_12px_32px_rgba(10,25,47,0.18)]"
      }`}
    >
      {/* 1. Subject & Class Selector (UrbanPro Style) */}
      <div className="relative z-20 flex-1 min-w-0">
        <label className="sr-only" htmlFor="hero-class-subject">
          Select class or subject
        </label>
        <input
          id="hero-class-subject"
          ref={subjectInputRef}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={openPanel === "subject"}
          aria-controls={subjectListId}
          value={classSubject}
          onChange={(e) => {
            setClassSubject(e.target.value);
            setSelectedMeta(null);
            setOpenPanel("subject");
          }}
          onFocus={() => setOpenPanel("subject")}
          onKeyDown={onSubjectKeyDown}
          placeholder="Select Class / Subject (e.g. Maths, NEET, Sanskrit)"
          className="w-full min-h-12 md:min-h-14 px-3 sm:px-4 rounded-xl bg-white text-[15px] font-600 text-[#0F2540] placeholder:text-[#94A3B8] outline-none border border-[#E2E8F0] md:border-0 focus:border-[#2D9E6B] md:focus:border-transparent"
        />

        <FloatingMenu
          open={openPanel === "subject"}
          anchorRef={subjectInputRef}
          menuRef={subjectMenuRef}
          labelledBy={subjectListId}
          minWidth={460}
          maxWidth={640}
        >
          {subjectHits.length === 0 ? (
            <p className="px-4 py-3 text-sm font-semibold text-slate-500">
              No matching courses found. Try Maths, NEET, or Science.
            </p>
          ) : (
            subjectHits.map((item, i) => (
              <button
                key={`${item.label}-${i}`}
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => pickSubject(item)}
                className={`w-full flex items-center px-4 py-2.5 text-left transition-colors cursor-pointer border-b border-slate-100 last:border-0 ${
                  i === activeIndex ? "bg-[#F0F9FF]" : "bg-white hover:bg-[#F8FAFC]"
                }`}
              >
                <span className="truncate text-[14px] leading-snug text-[#0284C7]">
                  <span className="font-semibold text-[#0F2540]">
                    <Highlight text={item.lead} query={classSubject} />
                  </span>
                  {item.rest && (
                    <span className="font-normal text-[#0284C7] ml-1.5">{item.rest}</span>
                  )}
                </span>
              </button>
            ))
          )}
        </FloatingMenu>
      </div>

      <div className="hidden md:block w-px bg-[#E2E8F0] my-2 shrink-0" />

      {/* 2. Locality & City Selector */}
      <div className="relative z-20 flex-1 min-w-0">
        <label className="sr-only" htmlFor="hero-locality">
          Enter locality or city
        </label>
        <input
          id="hero-locality"
          ref={locationInputRef}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={openPanel === "location"}
          aria-controls={locationListId}
          value={locality}
          onChange={(e) => {
            setLocality(e.target.value);
            setCityParam(e.target.value);
            setOpenPanel("location");
          }}
          onFocus={() => setOpenPanel("location")}
          onKeyDown={onLocationKeyDown}
          placeholder="Enter Locality / City (e.g. Sangam Vihar, Delhi)"
          className="w-full min-h-12 md:min-h-14 px-3 sm:px-4 pr-9 rounded-xl bg-white text-[15px] font-600 text-[#0F2540] placeholder:text-[#94A3B8] outline-none border border-[#E2E8F0] md:border-0 focus:border-[#2D9E6B] md:focus:border-transparent"
        />
        {locLoading && (
          <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-[#2D9E6B]" />
        )}
        <FloatingMenu
          open={openPanel === "location"}
          anchorRef={locationInputRef}
          menuRef={locationMenuRef}
          labelledBy={locationListId}
          minWidth={320}
          maxWidth={460}
        >
          <div className="px-3.5 py-2 border-b border-[#F1F5F9] bg-[#FAFBFD]">
            <p className="text-[11px] font-800 uppercase tracking-wider text-[#94A3B8]">
              {locationEmpty ? "Popular Localities & Cities" : "Search results"}
            </p>
          </div>
          <div className="overflow-y-auto max-h-72">
            {locationHits.length === 0 && !locLoading ? (
              <p className="px-3.5 py-3 text-sm font-semibold text-slate-500">
                No matching places. Try your locality or pincode.
              </p>
            ) : (
              locationHits.map((hit, i) => (
                <button
                  key={`${hit.label}-${i}`}
                  type="button"
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => pickLocation(hit)}
                  className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors cursor-pointer border-b border-slate-100 last:border-0 ${
                    i === activeIndex ? "bg-[#E8F7F0]" : "bg-white hover:bg-[#F8FAFC]"
                  }`}
                >
                  <span className="inline-flex min-w-0 items-center gap-2 text-[14px] font-bold text-[#0F2540] leading-snug">
                    <MapPin size={14} className="shrink-0 text-[#2D9E6B]" />
                    <span className="min-w-0 whitespace-normal">
                      <Highlight text={hit.label} query={locality} />
                    </span>
                  </span>
                  {hit.meta && <span className="shrink-0 text-[11px] font-semibold text-[#64748B]">{hit.meta}</span>}
                </button>
              ))
            )}
          </div>
        </FloatingMenu>
      </div>

      {/* 3. Search Action Button */}
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 min-h-12 md:min-h-14 px-6 w-full md:w-auto rounded-xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-[15px] font-800 shadow-[0_8px_22px_rgba(45,158,107,0.4)] shrink-0 cursor-pointer transition-all hover:shadow-[0_10px_28px_rgba(45,158,107,0.5)] active:scale-[0.99]"
      >
        <Search size={18} />
        Search Tutors
      </button>
    </form>
  );
}
