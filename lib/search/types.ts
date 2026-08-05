/**
 * lib/search/types.ts
 * Enterprise Search System — Types & Interfaces
 */

export type SearchEngineType = "TYPESENSE" | "POSTGRES_FTS";

// ── Searchable Document Schemas ──────────────────────────────────────────────

export type TutorSearchDoc = {
  id: string; // tutorProfileId
  userId: string;
  name: string;
  subjects: string[];
  classLevels: string[];
  qualification: string;
  experience: number;
  board: string[];
  teachingMode: "ONLINE" | "OFFLINE" | "EITHER";
  feeMin: number;
  feeMax: number;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  isVerified: boolean;
  isFeatured: boolean;
  rating: number;
  reviewCount: number;
  profileScore: number;
  bio: string;
  languages: string[];
  updatedAt: number; // Unix timestamp
};

export type LeadSearchDoc = {
  id: string; // leadId
  parentProfileId: string;
  parentName: string;
  subjects: string[];
  classLevel: string;
  board: string;
  mode: "ONLINE" | "OFFLINE" | "EITHER";
  budgetMin: number;
  budgetMax: number;
  city: string;
  area: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  languagePref: string[];
  notes: string;
  status: string; // ACTIVE, MATCHING, etc.
  createdAt: number;
  expiresAt: number;
};

export type ParentSearchDoc = {
  id: string; // parentProfileId
  userId: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  createdAt: number;
};

export type ConversationSearchDoc = {
  id: string; // conversationId
  parentProfileId: string;
  parentName: string;
  tutorProfileId: string;
  tutorName: string;
  leadId: string | null;
  lastMessageText: string;
  attachmentNames: string[];
  lastMessageAt: number;
};

// ── Search Query & Filter Inputs ─────────────────────────────────────────────

export type TutorSearchFilters = {
  subjects?: string[];
  classLevels?: string[];
  boards?: string[];
  teachingMode?: "ONLINE" | "OFFLINE" | "EITHER";
  minExperience?: number;
  minRating?: number;
  isVerified?: boolean;
  isFeatured?: boolean;
  minFee?: number;
  maxFee?: number;
  city?: string;
  lat?: number;
  lng?: number;
  maxDistanceKm?: number;
};

export type LeadSearchFilters = {
  subjects?: string[];
  classLevel?: string;
  teachingMode?: "ONLINE" | "OFFLINE" | "EITHER";
  minBudget?: number;
  maxBudget?: number;
  city?: string;
  status?: string;
  lat?: number;
  lng?: number;
  maxDistanceKm?: number;
};

export type ParentSearchFilters = {
  city?: string;
  state?: string;
};

export type SortOrder =
  | "best_match"
  | "nearest"
  | "rating_desc"
  | "newest"
  | "featured"
  | "reviews_desc"
  | "budget_desc"
  | "budget_asc"
  | "highest_budget"
  | "lowest_budget";

export type SearchParams<F = Record<string, unknown>> = {
  query?: string;
  filters?: F;
  sort?: SortOrder;
  page?: number;
  limit?: number;
  highlight?: boolean;
};

// ── Search Result Outputs ───────────────────────────────────────────────────

export type SearchHit<T> = {
  document: T;
  score?: number;
  distanceKm?: number;
  highlights?: Record<string, string>;
};

export type SearchResult<T> = {
  hits: SearchHit<T>[];
  total: number;
  page: number;
  totalPages: number;
  engine: SearchEngineType;
  processingTimeMs: number;
};

export type AutocompleteResult = {
  query: string;
  suggestions: string[];
  tutors: { id: string; name: string; subjects: string[]; city: string }[];
  leads: { id: string; subjects: string[]; classLevel: string; city: string }[];
};

// ── Health & Diagnostics ────────────────────────────────────────────────────

export type SearchEngineHealth = {
  status: "HEALTHY" | "DEGRADED" | "DOWN";
  connectedEngine: SearchEngineType;
  typesenseHost?: string;
  documentCounts: {
    tutors: number;
    leads: number;
    parents: number;
    conversations: number;
  };
  cacheStatus: "UP" | "DOWN" | "DISABLED";
  lastSyncAt: string | null;
  failedJobsCount: number;
};
