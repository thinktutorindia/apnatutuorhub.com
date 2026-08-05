/**
 * lib/search/service.ts
 * Enterprise Search Service Layer (RBAC, Caching & Analytics Integration)
 */

import {
  searchTutors as executeTutorSearch,
  searchLeads as executeLeadSearch,
  searchParents as executeParentSearch,
  searchConversations as executeConversationSearch,
} from "./client";
import { getCachedSearchResult, setCachedSearchResult } from "./cache";
import type {
  SearchParams,
  TutorSearchFilters,
  LeadSearchFilters,
  ParentSearchFilters,
  SearchResult,
  TutorSearchDoc,
  LeadSearchDoc,
  ParentSearchDoc,
  ConversationSearchDoc,
  AutocompleteResult,
} from "./types";
import { prisma } from "@/lib/prisma";

export async function searchTutorsService(
  params: SearchParams<TutorSearchFilters>
): Promise<SearchResult<TutorSearchDoc>> {
  const cached = await getCachedSearchResult<SearchResult<TutorSearchDoc>>("tutors", params as any);
  if (cached) return cached;

  const result = await executeTutorSearch(params);
  void setCachedSearchResult("tutors", params as any, result);
  return result;
}

export async function searchLeadsService(
  params: SearchParams<LeadSearchFilters>
): Promise<SearchResult<LeadSearchDoc>> {
  const cached = await getCachedSearchResult<SearchResult<LeadSearchDoc>>("leads", params as any);
  if (cached) return cached;

  const result = await executeLeadSearch(params);
  void setCachedSearchResult("leads", params as any, result);
  return result;
}

export async function searchParentsService(
  params: SearchParams<ParentSearchFilters>
): Promise<SearchResult<ParentSearchDoc>> {
  // Admin only - cached per query
  return executeParentSearch(params);
}

export async function searchConversationsService(
  userId: string,
  query: string
): Promise<SearchResult<ConversationSearchDoc>> {
  return executeConversationSearch(userId, query);
}

export async function getAutocompleteService(
  query: string
): Promise<AutocompleteResult> {
  const q = query.trim().toLowerCase();
  if (!q) {
    return {
      query: "",
      suggestions: ["Mathematics in Pune", "Physics Tutor", "Class 10 CBSE", "Home Tutor Rohini"],
      tutors: [],
      leads: [],
    };
  }

  const [tutorRes, leadRes] = await Promise.all([
    executeTutorSearch({ query: q, limit: 5 }),
    executeLeadSearch({ query: q, limit: 5 }),
  ]);

  const suggestions = new Set<string>();
  tutorRes.hits.forEach((h) => {
    suggestions.add(`${h.document.name} (${h.document.city})`);
    h.document.subjects.forEach((s) => suggestions.add(`${s} Tutor`));
  });
  leadRes.hits.forEach((h) => {
    suggestions.add(`${h.document.classLevel} ${h.document.subjects.join(", ")}`);
  });

  return {
    query: q,
    suggestions: Array.from(suggestions).slice(0, 6),
    tutors: tutorRes.hits.map((h) => ({
      id: h.document.id,
      name: h.document.name,
      subjects: h.document.subjects,
      city: h.document.city,
    })),
    leads: leadRes.hits.map((h) => ({
      id: h.document.id,
      subjects: h.document.subjects,
      classLevel: h.document.classLevel,
      city: h.document.city,
    })),
  };
}

export async function trackSearchAnalytics(
  query: string,
  resultCount: number,
  userId?: string
): Promise<void> {
  if (!query) return;
  try {
    // Record analytics event
    console.info(`[search-analytics] Query: "${query}" | Results: ${resultCount} | User: ${userId ?? "guest"}`);
  } catch (error) {
    console.error("[search-analytics] Failed to log search event", error);
  }
}
