"use server";

import { auth } from "@/auth";
import { actionError, actionSuccess, type ActionResult } from "@/lib/action-result";
import {
  searchTutorsService,
  searchLeadsService,
  searchParentsService,
  searchConversationsService,
  getAutocompleteService,
  trackSearchAnalytics,
} from "@/lib/search/service";
import { getSearchEngineHealth } from "@/lib/search/health";
import { reindexAllEntities } from "@/lib/search/indexer";
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
  SearchEngineHealth,
} from "@/lib/search/types";

export async function searchTutorsAction(
  params: SearchParams<TutorSearchFilters>
): Promise<ActionResult<SearchResult<TutorSearchDoc>>> {
  try {
    const session = await auth();
    const res = await searchTutorsService(params);
    void trackSearchAnalytics(params.query ?? "", res.total, session?.user?.id);
    return actionSuccess(res);
  } catch (err) {
    return actionError(err instanceof Error ? err.message : "Failed to search tutors.");
  }
}

export async function searchLeadsAction(
  params: SearchParams<LeadSearchFilters>
): Promise<ActionResult<SearchResult<LeadSearchDoc>>> {
  try {
    const session = await auth();
    const res = await searchLeadsService(params);
    void trackSearchAnalytics(params.query ?? "", res.total, session?.user?.id);
    return actionSuccess(res);
  } catch (err) {
    return actionError(err instanceof Error ? err.message : "Failed to search leads.");
  }
}

export async function searchParentsAction(
  params: SearchParams<ParentSearchFilters>
): Promise<ActionResult<SearchResult<ParentSearchDoc>>> {
  try {
    const session = await auth();
    if (!session?.user || !["SUPER_ADMIN", "SUB_ADMIN"].includes(session.user.role)) {
      return actionError("Unauthorized access. Admin privileges required.");
    }
    const res = await searchParentsService(params);
    return actionSuccess(res);
  } catch (err) {
    return actionError(err instanceof Error ? err.message : "Failed to search parents.");
  }
}

export async function searchConversationsAction(
  query: string
): Promise<ActionResult<SearchResult<ConversationSearchDoc>>> {
  try {
    const session = await auth();
    if (!session?.user?.id) return actionError("Unauthorized.");

    const res = await searchConversationsService(session.user.id, query);
    return actionSuccess(res);
  } catch (err) {
    return actionError(err instanceof Error ? err.message : "Failed to search conversations.");
  }
}

export async function searchAutocompleteAction(
  query: string
): Promise<ActionResult<AutocompleteResult>> {
  try {
    const res = await getAutocompleteService(query);
    return actionSuccess(res);
  } catch (err) {
    return actionError(err instanceof Error ? err.message : "Autocomplete failed.");
  }
}

export async function getSearchEngineHealthAction(): Promise<
  ActionResult<SearchEngineHealth>
> {
  try {
    const session = await auth();
    if (!session?.user || !["SUPER_ADMIN", "SUB_ADMIN"].includes(session.user.role)) {
      return actionError("Unauthorized.");
    }
    const health = await getSearchEngineHealth();
    return actionSuccess(health);
  } catch (err) {
    return actionError(err instanceof Error ? err.message : "Failed to get search health.");
  }
}

export async function reindexSearchEngineAction(): Promise<
  ActionResult<{ tutors: number; leads: number }>
> {
  try {
    const session = await auth();
    if (!session?.user || !["SUPER_ADMIN", "SUB_ADMIN"].includes(session.user.role)) {
      return actionError("Unauthorized.");
    }
    const stats = await reindexAllEntities();
    return actionSuccess(stats);
  } catch (err) {
    return actionError(err instanceof Error ? err.message : "Failed to rebuild index.");
  }
}
