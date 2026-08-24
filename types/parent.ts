import type { TeachingMode } from "@prisma/client";

export type ParentStudent = {
  id: string;
  name: string;
  classLevel: string;
  board: string | null;
  subjects: string[];
  notes: string | null;
  image?: string | null;
};

/** Serialised lead values used to prefill the requirement form. */
export type RequirementFormValues = {
  subjects: string[];
  classLevel: string;
  board: string;
  mode: TeachingMode;
  budgetMin: string;
  budgetMax: string;
  latitude: string;
  longitude: string;
  city: string;
  area: string;
  pincode: string;
  timingPreference: string;
  tutorGenderPref: string;
  languagePref: string;
  notes: string;
  studentProfileId: string;
  radiusKm?: number;
};
