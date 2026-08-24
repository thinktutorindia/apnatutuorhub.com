/**
 * lib/dummy-campaign-types.ts
 * Client-safe types, constants, and fee benchmark definitions for Dummy Campaigns.
 */

import type { DummyTargetGroup } from "@prisma/client";

// ─── Class-wise Benchmark Fee Structure (User-Defined Rates) ─────────────────

export const CLASS_FEE_RATES = {
  "1-5": {
    label: "Class 1 to 5",
    hourlyMin: 200,
    hourlyMax: 300,
    monthlyMin: 2500,
    monthlyMax: 4500,
    classes: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Nursery", "KG", "LKG", "UKG", "Primary"],
  },
  "6-8": {
    label: "Class 6 to 8",
    hourlyMin: 200,
    hourlyMax: 400,
    monthlyMin: 3500,
    monthlyMax: 6000,
    classes: ["Class 6", "Class 7", "Class 8", "Middle School"],
  },
  "9-10": {
    label: "Class 9 to 10",
    hourlyMin: 400,
    hourlyMax: 600,
    monthlyMin: 5000,
    monthlyMax: 9000,
    classes: ["Class 9", "Class 10", "Secondary"],
  },
  "11-12": {
    label: "Class 11 to 12",
    hourlyMin: 500,
    hourlyMax: 800,
    monthlyMin: 7000,
    monthlyMax: 12000,
    classes: ["Class 11", "Class 12", "Senior Secondary", "JEE", "NEET"],
  },
};

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
