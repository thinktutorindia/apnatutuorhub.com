"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return actionError("Unauthorized. Super Admin only.");
    }
    const stats = await reindexAllEntities();
    return actionSuccess(stats);
  } catch (err) {
    return actionError(err instanceof Error ? err.message : "Failed to rebuild index.");
  }
}

export type GlobalUnifiedSearchResult = {
  staffLeads: Array<{
    id: string;
    name: string | null;
    phone: string | null;
    location: string | null;
    status: string;
    isPromoted: boolean;
    subjects: string[];
    recordType: "TUTOR" | "PARENT";
  }>;
  users: Array<{
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    role: string;
    city: string | null;
    isVerified: boolean;
  }>;
  liveLeads: Array<{
    id: string;
    studentName: string | null;
    phone: string | null;
    subject: string | null;
    classLevel: string | null;
    city: string | null;
    status: string;
  }>;
};

export async function globalAdminUnifiedSearchAction(
  query: string
): Promise<ActionResult<GlobalUnifiedSearchResult>> {
  try {
    const session = await auth();
    if (!session?.user || !["SUPER_ADMIN", "SUB_ADMIN"].includes(session.user.role)) {
      return actionError("Unauthorized. Admin or staff privileges required.");
    }

    const clean = (query || "").trim();
    if (!clean || clean.length < 2) {
      return actionSuccess({ staffLeads: [], users: [], liveLeads: [] });
    }

    const cleanDigits = clean.replace(/\D/g, "");

    const [staffLeads, users, liveLeads] = await Promise.all([
      // 1. StaffLeads (CRM Calling Desk)
      prisma.staffLead.findMany({
        where: {
          OR: [
            { name: { contains: clean, mode: "insensitive" } },
            ...(cleanDigits.length >= 3 ? [{ phone: { contains: cleanDigits } }] : []),
            { email: { contains: clean, mode: "insensitive" } },
            { location: { contains: clean, mode: "insensitive" } },
            { subjects: { hasSome: [clean] } },
          ],
        },
        select: {
          id: true,
          name: true,
          phone: true,
          location: true,
          status: true,
          isPromoted: true,
          subjects: true,
          staffNotes: true,
        },
        take: 8,
      }),

      // 2. Users & Tutors (Primary Directory)
      prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: clean, mode: "insensitive" } },
            ...(cleanDigits.length >= 3 ? [{ phone: { contains: cleanDigits } }] : []),
            { email: { contains: clean, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          role: true,
          tutorProfile: {
            select: {
              id: true,
              city: true,
              isVerified: true,
            },
          },
        },
        take: 6,
      }),

      // 3. Live Parent Requirements (Leads Feed)
      prisma.lead.findMany({
        where: {
          OR: [
            { subjects: { hasSome: [clean] } },
            { classLevel: { contains: clean, mode: "insensitive" } },
            { city: { contains: clean, mode: "insensitive" } },
            { area: { contains: clean, mode: "insensitive" } },
            {
              parentProfile: {
                user: {
                  OR: [
                    { name: { contains: clean, mode: "insensitive" } },
                    ...(cleanDigits.length >= 3 ? [{ phone: { contains: cleanDigits } }] : []),
                  ],
                },
              },
            },
            ...(Number.isInteger(Number(clean)) ? [{ inquiryNumber: Number(clean) }] : []),
          ],
        },
        select: {
          id: true,
          subjects: true,
          classLevel: true,
          city: true,
          area: true,
          status: true,
          parentProfile: {
            select: {
              user: {
                select: {
                  name: true,
                  phone: true,
                },
              },
            },
          },
        },
        take: 6,
      }),
    ]);

    return actionSuccess({
      staffLeads: staffLeads.map((sl) => ({
        id: sl.id,
        name: sl.name,
        phone: sl.phone,
        location: sl.location,
        status: sl.status,
        isPromoted: sl.isPromoted,
        subjects: sl.subjects,
        recordType: sl.staffNotes?.includes("[RECORD_TYPE:PARENT]") ? "PARENT" : "TUTOR",
      })),
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        role: u.role,
        city: u.tutorProfile?.city || null,
        isVerified: u.tutorProfile?.isVerified || false,
      })),
      liveLeads: liveLeads.map((l) => ({
        id: l.id,
        studentName: l.parentProfile?.user?.name || null,
        phone: l.parentProfile?.user?.phone || null,
        subject: l.subjects?.join(", ") || null,
        classLevel: l.classLevel,
        city: l.area ? `${l.area}, ${l.city || ""}` : l.city || null,
        status: l.status,
      })),
    });
  } catch (err) {
    return actionError(err instanceof Error ? err.message : "Unified admin search failed.");
  }
}

