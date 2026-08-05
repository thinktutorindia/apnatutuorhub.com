/**
 * lib/search/query-builder.ts
 * Query & Filter builder with Synonym Expansion
 */

import type { TutorSearchFilters, LeadSearchFilters } from "./types";

// ── Synonym Dictionary ────────────────────────────────────────────────────────

const SYNONYM_GROUPS: Record<string, string[]> = {
  math: ["math", "maths", "mathematics"],
  maths: ["math", "maths", "mathematics"],
  mathematics: ["math", "maths", "mathematics"],
  physics: ["physics", "phy", "science"],
  phy: ["physics", "phy", "science"],
  chem: ["chemistry", "chem", "science"],
  chemistry: ["chemistry", "chem", "science"],
  bio: ["biology", "bio", "science"],
  biology: ["biology", "bio", "science"],
  tutor: ["tutor", "teacher", "educator", "faculty", "home tutor"],
  teacher: ["tutor", "teacher", "educator", "faculty", "home tutor"],
  cbse: ["cbse", "central board"],
  icse: ["icse", "indian certificate"],
  state: ["state board", "state"],
};

/**
 * Expands search term with registered synonyms.
 */
export function expandSynonyms(query: string): string[] {
  if (!query) return [];
  const words = query.toLowerCase().trim().split(/\s+/);
  const expanded = new Set<string>();

  for (const word of words) {
    expanded.add(word);
    if (SYNONYM_GROUPS[word]) {
      SYNONYM_GROUPS[word].forEach((syn) => expanded.add(syn));
    }
  }

  return Array.from(expanded);
}

/**
 * Builds Typesense filter_by string for Tutor queries.
 */
export function buildTypesenseTutorFilter(filters?: TutorSearchFilters): string {
  if (!filters) return "";
  const clauses: string[] = [];

  if (filters.subjects && filters.subjects.length > 0) {
    clauses.push(`subjects:=[${filters.subjects.map((s) => `\`${s}\``).join(",")}]`);
  }
  if (filters.classLevels && filters.classLevels.length > 0) {
    clauses.push(`classLevels:=[${filters.classLevels.map((c) => `\`${c}\``).join(",")}]`);
  }
  if (filters.boards && filters.boards.length > 0) {
    clauses.push(`board:=[${filters.boards.map((b) => `\`${b}\``).join(",")}]`);
  }
  if (filters.teachingMode && filters.teachingMode !== "EITHER") {
    clauses.push(`teachingMode:=[${filters.teachingMode}, EITHER]`);
  }
  if (filters.minExperience && filters.minExperience > 0) {
    clauses.push(`experience:>=${filters.minExperience}`);
  }
  if (filters.minRating && filters.minRating > 0) {
    clauses.push(`rating:>=${filters.minRating}`);
  }
  if (filters.isVerified) {
    clauses.push("isVerified:=true");
  }
  if (filters.isFeatured) {
    clauses.push("isFeatured:=true");
  }
  if (filters.minFee && filters.minFee > 0) {
    clauses.push(`feeMin:>=${filters.minFee}`);
  }
  if (filters.maxFee && filters.maxFee > 0) {
    clauses.push(`feeMax:<=${filters.maxFee}`);
  }
  if (filters.city) {
    clauses.push(`city:=\`${filters.city}\``);
  }

  return clauses.join(" && ");
}

/**
 * Builds Typesense filter_by string for Lead queries.
 */
export function buildTypesenseLeadFilter(filters?: LeadSearchFilters): string {
  if (!filters) return "";
  const clauses: string[] = [];

  if (filters.subjects && filters.subjects.length > 0) {
    clauses.push(`subjects:=[${filters.subjects.map((s) => `\`${s}\``).join(",")}]`);
  }
  if (filters.classLevel) {
    clauses.push(`classLevel:=\`${filters.classLevel}\``);
  }
  if (filters.teachingMode && filters.teachingMode !== "EITHER") {
    clauses.push(`mode:=[${filters.teachingMode}, EITHER]`);
  }
  if (filters.minBudget && filters.minBudget > 0) {
    clauses.push(`budgetMax:>=${filters.minBudget}`);
  }
  if (filters.maxBudget && filters.maxBudget > 0) {
    clauses.push(`budgetMin:<=${filters.maxBudget}`);
  }
  if (filters.city) {
    clauses.push(`city:=\`${filters.city}\``);
  }
  if (filters.status) {
    clauses.push(`status:=\`${filters.status}\``);
  } else {
    clauses.push("status:=[ACTIVE, MATCHING]");
  }

  return clauses.join(" && ");
}
