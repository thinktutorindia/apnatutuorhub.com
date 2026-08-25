/**
 * lib/dummy-campaign-types.ts
 * Client-safe types, constants, and fee benchmark definitions for Dummy Campaigns.
 */

import type { DummyTargetGroup } from "@prisma/client";

// ─── Class-wise Benchmark Fee Structure (Realistic tight spreads) ───────────

export const CLASS_FEE_RATES = {
  "1-5": {
    label: "Class 1 to 5",
    hourlyMin: 200,
    hourlyMax: 300,
    monthlyMin: 2500,
    monthlyMax: 4000,
    classes: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Nursery", "KG", "LKG", "UKG", "Primary"],
  },
  "6-8": {
    label: "Class 6 to 8",
    hourlyMin: 250,
    hourlyMax: 350,
    monthlyMin: 3500,
    monthlyMax: 5000,
    classes: ["Class 6", "Class 7", "Class 8", "Middle School"],
  },
  "9-10": {
    label: "Class 9 to 10",
    hourlyMin: 350,
    hourlyMax: 500,
    monthlyMin: 5000,
    monthlyMax: 7000,
    classes: ["Class 9", "Class 10", "Secondary"],
  },
  "11-12": {
    label: "Class 11 to 12",
    hourlyMin: 500,
    hourlyMax: 700,
    monthlyMin: 7000,
    monthlyMax: 10000,
    classes: ["Class 11", "Class 12", "Senior Secondary", "JEE", "NEET", "IIT-JEE"],
  },
};

// ─── Helper to parse and expand tutor class ranges to discrete classes ──────

export function expandToIndividualClasses(inputClasses?: string[] | null): string[] {
  if (!inputClasses || inputClasses.length === 0) {
    return [
      "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
      "Class 6", "Class 7", "Class 8", "Class 9", "Class 10",
      "Class 11", "Class 12"
    ];
  }

  const result = new Set<string>();

  for (const raw of inputClasses) {
    if (!raw) continue;
    const str = String(raw).trim();

    // Check for range patterns like "1 to 8", "1-8", "1st to 8th", "Class 1 to 8", "1 st to5 th", "6 to 8 th", "9-10th"
    const rangeMatches = str.matchAll(/(?:class\s*)?(\d{1,2})\s*(?:st|nd|rd|th)?\s*(?:to|-|–)\s*(?:class\s*)?(\d{1,2})\s*(?:st|nd|rd|th)?/gi);
    let matchedRange = false;
    for (const match of rangeMatches) {
      const start = parseInt(match[1], 10);
      const end = parseInt(match[2], 10);
      if (start >= 1 && end <= 12 && start <= end) {
        matchedRange = true;
        for (let i = start; i <= end; i++) {
          result.add(`Class ${i}`);
        }
      }
    }
    if (matchedRange) continue;

    // Check for phrases like "Nursery to class 10", "KG to class 5", "till class 9", "upto 8th class", "up to class 10"
    const nurseryRangeMatch = str.match(/(?:nursery|kg|lkg|ukg|primary)\s*(?:to|-|–)\s*(?:class\s*)?(\d{1,2})\s*(?:st|nd|rd|th)?/i);
    if (nurseryRangeMatch) {
      const end = parseInt(nurseryRangeMatch[1], 10);
      if (end >= 1 && end <= 12) {
        for (let i = 1; i <= end; i++) {
          result.add(`Class ${i}`);
        }
        continue;
      }
    }

    const uptoMatch = str.match(/(?:till|upto|up to)\s*(?:class\s*)?(\d{1,2})\s*(?:st|nd|rd|th)?/i);
    if (uptoMatch) {
      const end = parseInt(uptoMatch[1], 10);
      if (end >= 1 && end <= 12) {
        for (let i = 1; i <= end; i++) {
          result.add(`Class ${i}`);
        }
        continue;
      }
    }

    // Check for specific individual class mentions like "Class 7th", "Class 4", "7th", "Class 10"
    const singleMatches = str.matchAll(/(?:class\s*)?(\d{1,2})\s*(?:st|nd|rd|th)?/gi);
    let foundSingle = false;
    for (const sMatch of singleMatches) {
      const num = parseInt(sMatch[1], 10);
      if (num >= 1 && num <= 12) {
        result.add(`Class ${num}`);
        foundSingle = true;
      }
    }
    if (foundSingle) continue;

    // Keyword based matches
    const lower = str.toLowerCase();
    if (lower.includes("nursery") || lower.includes("kg") || lower.includes("lkg") || lower.includes("ukg")) {
      result.add("Class 1");
      result.add("Class 2");
    } else if (lower.includes("primary")) {
      ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"].forEach((c) => result.add(c));
    } else if (lower.includes("middle")) {
      ["Class 6", "Class 7", "Class 8"].forEach((c) => result.add(c));
    } else if (lower.includes("secondary")) {
      ["Class 9", "Class 10"].forEach((c) => result.add(c));
    } else if (lower.includes("senior") || lower.includes("jee") || lower.includes("neet") || lower.includes("entrance")) {
      ["Class 11", "Class 12"].forEach((c) => result.add(c));
    } else {
      result.add(str.startsWith("Class") ? str : `Class ${str}`);
    }
  }

  if (result.size === 0) {
    return ["Class 4", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10"];
  }

  return Array.from(result);
}

// ─── DummyLead Type ───────────────────────────────────────────────────────────

export interface DummyLead {
  locality: string;
  city: string;
  distanceKm?: number;
  studentName: string;
  classLevel: string;
  board: string;
  subjects: string[];
  mode: "ONLINE" | "OFFLINE" | "EITHER" | "COACHING";
  budgetMin: number;
  budgetMax: number;
  rateType: "HOURLY" | "MONTHLY";
  days: string;
  timing: string;
  isDummy: true;
  generatedAt: string;
}

// ─── Mode label helper ────────────────────────────────────────────────────────

export const modeLabel: Record<string, string> = {
  ONLINE:   "Online",
  OFFLINE:  "In-Person",
  EITHER:   "Online / In-Person",
  COACHING: "Coaching Institute",
};
