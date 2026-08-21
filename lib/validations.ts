import { z } from "zod";

// ────────────────────────────────────────────────
// Constants & Taxonomy
// ────────────────────────────────────────────────

export const CLASS_LEVELS = [
  "Nursery / KG",
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
  "College / Degree",
  "IIT-JEE",
  "NEET",
  "CA / Commerce",
  "Coding & IT",
  "Languages",
  "Music & Arts",
  "Competitive Exams",
] as const;

export type ClassLevel = (typeof CLASS_LEVELS)[number];

/**
 * Subject taxonomy grouped for the requirement posting UI. `SUBJECTS` is
 * derived from this so the picker and the validator can never drift apart.
 */
export const SUBJECT_TAXONOMY = [
  {
    group: "School Core",
    subjects: [
      "Mathematics",
      "Physics",
      "Chemistry",
      "Biology",
      "English",
      "Hindi",
      "Social Studies",
      "Geography",
      "History",
      "Sanskrit",
    ],
  },
  {
    group: "Commerce & Humanities",
    subjects: [
      "Economics",
      "Accountancy",
      "Business Studies",
      "Political Science",
      "Psychology",
      "Sociology",
    ],
  },
  {
    group: "Coding & Tech",
    subjects: [
      "Computer Science",
      "Python",
      "JavaScript",
      "Java",
      "Data Science",
      "Web Development",
    ],
  },
  {
    group: "Languages",
    subjects: ["Spoken English", "French", "German"],
  },
  {
    group: "Arts & Music",
    subjects: ["Art & Drawing", "Music", "Dance"],
  },
] as const;

export const SUBJECTS: readonly string[] = SUBJECT_TAXONOMY.flatMap(
  (group) => group.subjects
);

const SUBJECT_SET = new Set(SUBJECTS);
const CLASS_LEVEL_SET = new Set<string>(CLASS_LEVELS);

export const BOARDS = [
  "CBSE",
  "ICSE",
  "State Board",
  "IB",
  "IGCSE",
  "Other",
] as const;

const BOARD_SET = new Set<string>(BOARDS);

export const TEACHING_MODES = [
  { value: "ONLINE", label: "Online" },
  { value: "OFFLINE", label: "Offline (At Home)" },
  { value: "COACHING", label: "Coaching / Institute" },
  { value: "EITHER", label: "Either" },
] as const;

export const TUTOR_GENDER_PREFS = [
  { value: "ANY", label: "No preference" },
  { value: "FEMALE", label: "Female tutor" },
  { value: "MALE", label: "Male tutor" },
] as const;

export const TIMING_PREFERENCES = [
  "Early Morning (6 AM - 9 AM)",
  "Morning (9 AM - 12 PM)",
  "Afternoon (12 PM - 4 PM)",
  "Evening (4 PM - 8 PM)",
  "Night (8 PM - 10 PM)",
  "Weekends Only",
  "Flexible",
] as const;

export const LANGUAGE_PREFERENCES = [
  "English",
  "Hindi",
  "Bengali",
  "Marathi",
  "Telugu",
  "Tamil",
  "Gujarati",
  "Kannada",
  "Malayalam",
  "Punjabi",
] as const;

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu & Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

/** Lead status labels and pastel badge colours used across the parent module. */
export const LEAD_STATUS_META = {
  ACTIVE: { label: "Active", background: "#DCFCE7" },
  MATCHING: { label: "Matching Tutors", background: "#E0F2FE" },
  APPLICATIONS_RECEIVED: { label: "Applications Received", background: "#FEF3C7" },
  BOOKED: { label: "Booked", background: "#F3E8FF" },
  COMPLETED: { label: "Completed", background: "#DCFCE7" },
  EXPIRED: { label: "Expired", background: "#FFEDD5" },
  CLOSED: { label: "Closed", background: "#FCE7F3" },
} as const;

export type LeadStatusKey = keyof typeof LEAD_STATUS_META;

export const LEAD_STATUS_FILTERS = Object.keys(LEAD_STATUS_META) as LeadStatusKey[];

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
  phone: z
    .string()
    .min(10, "Phone number must be 10 digits")
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)"),
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
  referralCode: z
    .string()
    .min(3, "Referral code must be at least 3 characters")
    .max(12, "Referral code is too long")
    .toUpperCase()
    .optional()
    .or(z.literal("")),
});

// ────────────────────────────────────────────────
// Shared field builders
// ────────────────────────────────────────────────

const pincodeField = z
  .string()
  .regex(/^\d{6}$/, "Enter a valid 6-digit pincode");

const phoneField = z
  .string()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");

export function inferClassLevelFromSubjects(subjects: string[]): string {
  if (!subjects || subjects.length === 0) return "General";

  for (const s of subjects) {
    const raw = s.toLowerCase();
    if (raw.includes("class xii") || raw.includes("class 12") || raw.includes("xii")) return "Class 12";
    if (raw.includes("class xi") || raw.includes("class 11") || raw.includes("xi")) return "Class 11";
    if (raw.includes("class x") || raw.includes("class 10") || raw.includes("class 10th")) return "Class 10";
    if (raw.includes("class ix") || raw.includes("class 9") || raw.includes("class 9th")) return "Class 9";
    if (raw.includes("class viii") || raw.includes("class 8") || raw.includes("class 8th")) return "Class 8";
    if (raw.includes("class vii") || raw.includes("class 7") || raw.includes("class 7th")) return "Class 7";
    if (raw.includes("class vi") || raw.includes("class 6") || raw.includes("class 6th")) return "Class 6";
    if (raw.includes("class v") || raw.includes("class 5") || raw.includes("class 5th")) return "Class 5";
    if (raw.includes("class iv") || raw.includes("class 4") || raw.includes("class 4th")) return "Class 4";
    if (raw.includes("class iii") || raw.includes("class 3") || raw.includes("class 3rd")) return "Class 3";
    if (raw.includes("class ii") || raw.includes("class 2") || raw.includes("class 2nd")) return "Class 2";
    if (raw.includes("class i") || raw.includes("class 1") || raw.includes("class 1st")) return "Class 1";
    if (raw.includes("kg") || raw.includes("nursery") || raw.includes("kindergarten") || raw.includes("preparatory")) return "Nursery / KG";
    if (raw.includes("iit") || raw.includes("jee")) return "IIT-JEE";
    if (raw.includes("neet") || raw.includes("medical")) return "NEET";
    if (raw.includes("ca ") || raw.includes("commerce") || raw.includes("account")) return "CA / Commerce";
    if (raw.includes("college") || raw.includes("graduation") || raw.includes("b.tech") || raw.includes("engineering")) return "College / Degree";
    if (raw.includes("code") || raw.includes("python") || raw.includes("java") || raw.includes("programming")) return "Coding & IT";
    if (raw.includes("french") || raw.includes("german") || raw.includes("spanish") || raw.includes("language")) return "Languages";
    if (raw.includes("music") || raw.includes("guitar") || raw.includes("piano") || raw.includes("dance") || raw.includes("art")) return "Music & Arts";
  }

  return "General";
}

const classLevelField = z
  .string()
  .trim()
  .max(50, "Class level is too long")
  .optional()
  .or(z.literal(""));

const boardField = z
  .string()
  .trim()
  .max(50)
  .optional()
  .or(z.literal(""));

const subjectsField = z
  .array(z.string().trim().min(1, "Subject cannot be empty").max(100, "Subject is too long"))
  .min(1, "Select at least one subject")
  .max(6, "Select up to 6 subjects");


const budgetField = z
  .number({ invalid_type_error: "Enter a valid amount in ₹" })
  .int("Enter a whole number")
  .min(0, "Budget cannot be negative")
  .max(100000, "Budget looks too high")
  .optional();

// ────────────────────────────────────────────────
// Parent Profile Schemas
// ────────────────────────────────────────────────

export const parentProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name is too long"),
  phone: phoneField.optional(),
  image: z.string().optional().or(z.literal("")).or(z.null()),
  city: z.string().max(100, "City name is too long").optional().or(z.literal("")),
  state: z.string().max(100, "State name is too long").optional().or(z.literal("")),
  pincode: z
    .string()
    .trim()
    .refine((val) => !val || /^\d{6}$/.test(val), "Enter a valid 6-digit pincode")
    .optional()
    .or(z.literal("")),
  address: z.string().max(300, "Address is too long").optional().or(z.literal("")),
});

export const studentProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .max(100, "Name is too long")
    .optional()
    .or(z.literal("")),
  classLevel: classLevelField,
  board: boardField,
  subjects: z
    .array(z.string().trim().max(100))
    .max(15)
    .optional()
    .default([]),
  notes: z.string().max(500, "Keep notes under 500 characters").optional().or(z.literal("")),
  image: z.string().optional().or(z.literal("")).or(z.null()),
});

// ────────────────────────────────────────────────
// Lead / Requirement Schemas
// ────────────────────────────────────────────────

const leadCoreShape = {
  subjects: subjectsField,
  classLevel: classLevelField,
  board: boardField,
  mode: z.enum(["ONLINE", "OFFLINE", "EITHER", "COACHING"], {
    required_error: "Select a teaching mode",
    invalid_type_error: "Select a teaching mode",
  }),
  budgetMin: budgetField,
  budgetMax: budgetField,
  latitude: z
    .number({ invalid_type_error: "Invalid latitude" })
    .min(-90)
    .max(90)
    .optional(),
  longitude: z
    .number({ invalid_type_error: "Invalid longitude" })
    .min(-180)
    .max(180)
    .optional(),
  city: z.string().max(100, "City name is too long").optional(),
  area: z.string().max(120, "Area name is too long").optional(),
  pincode: pincodeField.optional(),
  /** How far the parent is willing to have a tutor travel (OFFLINE/EITHER only). */
  radiusKm: z
    .number({ invalid_type_error: "Enter a valid radius" })
    .int("Radius must be a whole number")
    .min(1, "Minimum radius is 1 km")
    .max(50, "Maximum radius is 50 km")
    .optional()
    .default(10),
};

/** Fields a parent may always change, even after tutors have unlocked the lead. */
const leadPreferenceShape = {
  timingPreference: z.string().max(120).optional(),
  tutorGenderPref: z.enum(["MALE", "FEMALE", "ANY"]).optional(),
  languagePref: z.string().max(60).optional(),
  notes: z.string().max(500, "Keep notes under 500 characters").optional(),
};

type LeadBudgetAndLocation = {
  mode?: "ONLINE" | "OFFLINE" | "EITHER" | "COACHING";
  budgetMin?: number;
  budgetMax?: number;
  city?: string;
};

function checkBudgetAndLocation(
  value: LeadBudgetAndLocation,
  ctx: z.RefinementCtx
) {
  if (
    value.budgetMin !== undefined &&
    value.budgetMax !== undefined &&
    value.budgetMax < value.budgetMin
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["budgetMax"],
      message: "Maximum budget must be at least the minimum",
    });
  }

  if (value.mode !== "ONLINE" && !value.city) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["city"],
      message: "City is required for home tuition",
    });
  }
}

export const createLeadSchema = z
  .object({
    ...leadCoreShape,
    ...leadPreferenceShape,
    studentProfileId: z.string().cuid("Select a valid student").optional(),
  })
  .superRefine(checkBudgetAndLocation);

/** Full edit — allowed only while `purchaseCount === 0` (docs/Phases.md §6.2). */
export const updateLeadSchema = createLeadSchema;

/** Restricted edit — core fields are permanently locked once a tutor has paid. */
export const updateLockedLeadSchema = z.object(leadPreferenceShape);

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLockedLeadInput = z.infer<typeof updateLockedLeadSchema>;

// ────────────────────────────────────────────────
// Tutor Profile Schemas
// ────────────────────────────────────────────────

export const tutorProfileSchema = z.object({
  bio: z.string().max(2000).optional(),
  qualification: z.string().min(1, "Qualification is required"),
  experience: z.number().int().min(0).max(50),
  subjects: subjectsField,
  classLevels: z.array(z.string()).min(1, "Select at least one class level"),
  teachingMode: z.enum(["ONLINE", "OFFLINE", "EITHER", "COACHING"]),
  teachingRadius: z.number().int().min(1).max(50).default(10),
  feeMin: budgetField,
  feeMax: budgetField,
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: pincodeField.optional().or(z.literal("")),
  address: z.string().max(300, "Address is too long").optional(),
  introVideoUrl: z.string().url().optional().or(z.literal("")),
});
