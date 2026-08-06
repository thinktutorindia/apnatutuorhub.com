import { z } from "zod";

// ────────────────────────────────────────────────
// Constants & Taxonomy
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
// Shared field builders
// ────────────────────────────────────────────────

const pincodeField = z
  .string()
  .regex(/^\d{6}$/, "Enter a valid 6-digit pincode");

const phoneField = z
  .string()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");

const classLevelField = z
  .string({ required_error: "Class level is required" })
  .min(1, "Class level is required")
  .refine((value) => CLASS_LEVEL_SET.has(value), "Choose a class level from the list");

const boardField = z
  .string()
  .refine((value) => BOARD_SET.has(value), "Choose a board from the list")
  .optional();

const subjectsField = z
  .array(z.string())
  .min(1, "Select at least one subject")
  .max(6, "Select up to 6 subjects")
  .refine(
    (values) => values.every((value) => SUBJECT_SET.has(value)),
    "Choose subjects from the list"
  );

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
    .string({ required_error: "Name is required" })
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),
  phone: phoneField.optional(),
  city: z.string({ required_error: "City is required" }).min(1, "City is required"),
  state: z.string({ required_error: "State is required" }).min(1, "State is required"),
  pincode: pincodeField,
  address: z.string().max(300, "Address is too long").optional(),
});

export const studentProfileSchema = z.object({
  name: z
    .string({ required_error: "Student name is required" })
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),
  classLevel: classLevelField,
  board: boardField,
  subjects: subjectsField,
  notes: z.string().max(500, "Keep notes under 500 characters").optional(),
});

// ────────────────────────────────────────────────
// Lead / Requirement Schemas
// ────────────────────────────────────────────────

const leadCoreShape = {
  subjects: subjectsField,
  classLevel: classLevelField,
  board: boardField,
  mode: z.enum(["ONLINE", "OFFLINE", "EITHER"], {
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
};

/** Fields a parent may always change, even after tutors have unlocked the lead. */
const leadPreferenceShape = {
  timingPreference: z.string().max(120).optional(),
  tutorGenderPref: z.enum(["MALE", "FEMALE", "ANY"]).optional(),
  languagePref: z.string().max(60).optional(),
  notes: z.string().max(500, "Keep notes under 500 characters").optional(),
};

type LeadBudgetAndLocation = {
  mode?: "ONLINE" | "OFFLINE" | "EITHER";
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
  teachingMode: z.enum(["ONLINE", "OFFLINE", "EITHER"]),
  teachingRadius: z.number().int().min(1).max(50).default(10),
  feeMin: budgetField,
  feeMax: budgetField,
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: pincodeField.optional().or(z.literal("")),
  address: z.string().max(300, "Address is too long").optional(),
  introVideoUrl: z.string().url().optional().or(z.literal("")),
});
