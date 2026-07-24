import { z } from "zod";

// ────────────────────────────────────────────────
// Auth Schemas
// ────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),
  email: z.string().email("Please enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Must contain uppercase, lowercase, and a number"
    ),
  role: z.enum(["PARENT", "TUTOR"], {
    required_error: "Please select a role",
  }),
});

// ────────────────────────────────────────────────
// Parent Profile Schemas
// ────────────────────────────────────────────────

export const parentProfileSchema = z.object({
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  address: z.string().optional(),
});

export const studentProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  classLevel: z.string().min(1, "Class level is required"),
  board: z.string().optional(),
  subjects: z.array(z.string()).min(1, "Select at least one subject"),
  notes: z.string().optional(),
});

// ────────────────────────────────────────────────
// Lead / Requirement Schemas
// ────────────────────────────────────────────────

export const createLeadSchema = z.object({
  subjects: z.array(z.string()).min(1, "Select at least one subject"),
  classLevel: z.string().min(1, "Class level is required"),
  board: z.string().optional(),
  mode: z.enum(["ONLINE", "OFFLINE", "EITHER"]),
  budgetMin: z.number().int().min(0).optional(),
  budgetMax: z.number().int().min(0).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  city: z.string().optional(),
  area: z.string().optional(),
  timingPreference: z.string().optional(),
  tutorGenderPref: z.enum(["MALE", "FEMALE", "ANY"]).optional(),
  languagePref: z.string().optional(),
  notes: z.string().max(500).optional(),
  studentProfileId: z.string().optional(),
});

// ────────────────────────────────────────────────
// Tutor Profile Schemas
// ────────────────────────────────────────────────

export const tutorProfileSchema = z.object({
  bio: z.string().max(2000).optional(),
  qualification: z.string().min(1, "Qualification is required"),
  experience: z.number().int().min(0).max(50),
  subjects: z.array(z.string()).min(1, "Select at least one subject"),
  classLevels: z.array(z.string()).min(1, "Select at least one class level"),
  teachingMode: z.enum(["ONLINE", "OFFLINE", "EITHER"]),
  teachingRadius: z.number().int().min(1).max(50).default(10),
  feeMin: z.number().int().min(0).optional(),
  feeMax: z.number().int().min(0).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  introVideoUrl: z.string().url().optional().or(z.literal("")),
});

// ────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────

export const CLASS_LEVELS = [
  "Class 1-5",
  "Class 6-8",
  "Class 9-10",
  "Class 11-12",
  "JEE",
  "NEET",
  "CA",
  "Coding",
  "Arts",
  "Languages",
] as const;

export const SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Hindi",
  "Social Studies",
  "Computer Science",
  "Economics",
  "Accountancy",
  "Business Studies",
  "Geography",
  "History",
  "Political Science",
  "Psychology",
  "Sociology",
  "Sanskrit",
  "French",
  "German",
  "Art & Drawing",
  "Music",
  "Dance",
  "Spoken English",
  "Python",
  "JavaScript",
  "Java",
  "Data Science",
  "Web Development",
] as const;

export const BOARDS = [
  "CBSE",
  "ICSE",
  "State Board",
  "IB",
  "IGCSE",
  "Other",
] as const;

export const TEACHING_MODES = [
  { value: "ONLINE", label: "Online" },
  { value: "OFFLINE", label: "Offline (At Home)" },
  { value: "EITHER", label: "Either" },
] as const;
