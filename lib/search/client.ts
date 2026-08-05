/**
 * lib/search/client.ts
 * Unified Search Engine Client Abstraction (Typesense / Postgres FTS Fallback)
 */

import { prisma } from "@/lib/prisma";
import type {
  SearchEngineType,
  TutorSearchDoc,
  LeadSearchDoc,
  ParentSearchDoc,
  ConversationSearchDoc,
  SearchResult,
  SearchHit,
  SearchParams,
  TutorSearchFilters,
  LeadSearchFilters,
  ParentSearchFilters,
} from "./types";
import { computeDistance, rankHits, highlightMatches } from "./ranking";
import { expandSynonyms, buildTypesenseTutorFilter, buildTypesenseLeadFilter } from "./query-builder";

export function isTypesenseConfigured(): boolean {
  return Boolean(process.env.TYPESENSE_HOST && process.env.TYPESENSE_API_KEY);
}

export function getActiveSearchEngine(): SearchEngineType {
  return isTypesenseConfigured() ? "TYPESENSE" : "POSTGRES_FTS";
}

// ── Typesense Low-Level Query Helper ──────────────────────────────────────────

async function typesenseSearch<T>(
  collection: string,
  searchParams: Record<string, unknown>
): Promise<SearchResult<T> | null> {
  const host = process.env.TYPESENSE_HOST;
  const apiKey = process.env.TYPESENSE_API_KEY;
  const port = process.env.TYPESENSE_PORT ?? "8108";
  const protocol = process.env.TYPESENSE_PROTOCOL ?? "https";

  if (!host || !apiKey) return null;

  const startTime = Date.now();

  try {
    const url = `${protocol}://${host}:${port}/collections/${collection}/documents/search`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-TYPESENSE-API-KEY": apiKey,
      },
      body: JSON.stringify(searchParams),
    });

    if (!res.ok) {
      console.error(`[typesense] Search failed with status ${res.status}`);
      return null;
    }

    const data = (await res.json()) as {
      found: number;
      page: number;
      hits: { document: T; highlight?: Record<string, { snippet: string }> }[];
    };

    const total = data.found ?? 0;
    const limit = (searchParams.per_page as number) ?? 20;

    return {
      hits: data.hits.map((h) => ({
        document: h.document,
        highlights: h.highlight
          ? Object.fromEntries(Object.entries(h.highlight).map(([k, v]) => [k, v.snippet]))
          : undefined,
      })),
      total,
      page: data.page ?? 1,
      totalPages: Math.ceil(total / limit) || 1,
      engine: "TYPESENSE",
      processingTimeMs: Date.now() - startTime,
    };
  } catch (err) {
    console.error("[typesense] Network error during search, falling back to Postgres FTS", err);
    return null;
  }
}

// ── Search Tutors ─────────────────────────────────────────────────────────────

export async function searchTutors(
  params: SearchParams<TutorSearchFilters>
): Promise<SearchResult<TutorSearchDoc>> {
  const startTime = Date.now();
  const query = params.query?.trim() ?? "";
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const skip = (page - 1) * limit;

  // 1. Try Typesense if configured
  if (isTypesenseConfigured()) {
    const filterBy = buildTypesenseTutorFilter(params.filters);
    const tsResult = await typesenseSearch<TutorSearchDoc>("tutors", {
      q: query || "*",
      query_by: "name,subjects,qualification,city,bio",
      filter_by: filterBy || undefined,
      page,
      per_page: limit,
      sort_by:
        params.sort === "rating_desc"
          ? "rating:desc"
          : params.sort === "featured"
            ? "isFeatured:desc,rating:desc"
            : params.sort === "newest"
              ? "updatedAt:desc"
              : "_text_match:desc,rating:desc",
    });

    if (tsResult) return tsResult;
  }

  // 2. PostgreSQL Full-Text Search & Distance Fallback
  const synonyms = expandSynonyms(query);

  type WhereClause = {
    tutorProfile: { kycStatus: "APPROVED" };
    OR?: Array<Record<string, unknown>>;
    subjects?: { hasSome: string[] };
    classLevels?: { hasSome: string[] };
    teachingMode?: "ONLINE" | "OFFLINE" | "EITHER";
    experience?: { gte: number };
    feeMin?: { gte: number };
    feeMax?: { lte: number };
    city?: { equals: string; mode: "insensitive" };
  };

  const where: WhereClause = {
    tutorProfile: { kycStatus: "APPROVED" },
  };

  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { subjects: { hasSome: synonyms } },
      { classLevels: { hasSome: synonyms } },
      { city: { contains: query, mode: "insensitive" } },
    ];
  }

  if (params.filters?.subjects?.length) {
    where.subjects = { hasSome: params.filters.subjects };
  }
  if (params.filters?.classLevels?.length) {
    where.classLevels = { hasSome: params.filters.classLevels };
  }
  if (params.filters?.teachingMode && params.filters.teachingMode !== "EITHER") {
    where.teachingMode = params.filters.teachingMode;
  }
  if (params.filters?.minExperience) {
    where.experience = { gte: params.filters.minExperience };
  }
  if (params.filters?.minFee) {
    where.feeMin = { gte: params.filters.minFee };
  }
  if (params.filters?.maxFee) {
    where.feeMax = { lte: params.filters.maxFee };
  }
  if (params.filters?.city) {
    where.city = { equals: params.filters.city, mode: "insensitive" };
  }

  const [tutors, total] = await Promise.all([
    prisma.tutorProfile.findMany({
      where: where as any,
      skip,
      take: limit,
      include: { user: { select: { name: true } } },
      orderBy:
        params.sort === "rating_desc"
          ? { averageRating: "desc" }
          : params.sort === "featured"
            ? { isFeatured: "desc" }
            : { updatedAt: "desc" },
    }),
    prisma.tutorProfile.count({ where: where as any }),
  ]);

  const hits: SearchHit<TutorSearchDoc>[] = tutors.map((t) => {
    const doc: TutorSearchDoc = {
      id: t.id,
      userId: t.userId,
      name: t.user.name ?? "Tutor",
      subjects: t.subjects,
      classLevels: t.classLevels,
      qualification: t.qualification ?? "",
      experience: t.experience ?? 0,
      board: [],
      teachingMode: t.teachingMode as "ONLINE" | "OFFLINE" | "EITHER",
      feeMin: t.feeMin ?? 0,
      feeMax: t.feeMax ?? 0,
      city: t.city ?? "",
      state: t.state ?? "",
      latitude: t.latitude,
      longitude: t.longitude,
      isVerified: t.isVerified,
      isFeatured: t.isFeatured,
      rating: t.averageRating,
      reviewCount: t.totalReviews,
      profileScore: t.profileScore,
      bio: t.bio ?? "",
      languages: [],
      updatedAt: Math.floor(t.updatedAt.getTime() / 1000),
    };

    const dist = computeDistance(
      t.latitude,
      t.longitude,
      params.filters?.lat,
      params.filters?.lng
    );

    return {
      document: doc,
      distanceKm: dist ?? undefined,
      highlights: query
        ? {
            name: highlightMatches(doc.name, query),
            subjects: doc.subjects.map((s) => highlightMatches(s, query)).join(", "),
          }
        : undefined,
    };
  });

  return {
    hits,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
    engine: "POSTGRES_FTS",
    processingTimeMs: Date.now() - startTime,
  };
}

// ── Search Leads ──────────────────────────────────────────────────────────────

export async function searchLeads(
  params: SearchParams<LeadSearchFilters>
): Promise<SearchResult<LeadSearchDoc>> {
  const startTime = Date.now();
  const query = params.query?.trim() ?? "";
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const skip = (page - 1) * limit;

  if (isTypesenseConfigured()) {
    const filterBy = buildTypesenseLeadFilter(params.filters);
    const tsResult = await typesenseSearch<LeadSearchDoc>("leads", {
      q: query || "*",
      query_by: "subjects,classLevel,city,area,notes",
      filter_by: filterBy || undefined,
      page,
      per_page: limit,
      sort_by:
        params.sort === "highest_budget"
          ? "budgetMax:desc"
          : params.sort === "lowest_budget"
            ? "budgetMin:asc"
            : "createdAt:desc",
    });

    if (tsResult) return tsResult;
  }

  const synonyms = expandSynonyms(query);

  const where: any = {
    status: params.filters?.status ?? { in: ["ACTIVE", "MATCHING"] },
  };

  if (query) {
    where.OR = [
      { subjects: { hasSome: synonyms } },
      { classLevel: { contains: query, mode: "insensitive" } },
      { city: { contains: query, mode: "insensitive" } },
      { area: { contains: query, mode: "insensitive" } },
      { notes: { contains: query, mode: "insensitive" } },
    ];
  }

  if (params.filters?.subjects?.length) {
    where.subjects = { hasSome: params.filters.subjects };
  }
  if (params.filters?.classLevel) {
    where.classLevel = params.filters.classLevel;
  }
  if (params.filters?.teachingMode && params.filters.teachingMode !== "EITHER") {
    where.mode = params.filters.teachingMode;
  }
  if (params.filters?.minBudget) {
    where.budgetMax = { gte: params.filters.minBudget };
  }
  if (params.filters?.maxBudget) {
    where.budgetMin = { lte: params.filters.maxBudget };
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip,
      take: limit,
      include: { parentProfile: { select: { user: { select: { name: true } } } } },
      orderBy:
        params.sort === "highest_budget"
          ? { budgetMax: "desc" }
          : params.sort === "lowest_budget"
            ? { budgetMin: "asc" }
            : { createdAt: "desc" },
    }),
    prisma.lead.count({ where }),
  ]);

  const hits: SearchHit<LeadSearchDoc>[] = leads.map((l) => {
    const doc: LeadSearchDoc = {
      id: l.id,
      parentProfileId: l.parentProfileId,
      parentName: l.parentProfile.user.name ?? "Parent",
      subjects: l.subjects,
      classLevel: l.classLevel,
      board: l.board ?? "",
      mode: l.mode as "ONLINE" | "OFFLINE" | "EITHER",
      budgetMin: l.budgetMin ?? 0,
      budgetMax: l.budgetMax ?? 0,
      city: l.city ?? "",
      area: l.area ?? "",
      state: "",
      latitude: l.latitude,
      longitude: l.longitude,
      languagePref: l.languagePref ? [l.languagePref] : [],
      notes: l.notes ?? "",
      status: l.status,
      createdAt: Math.floor(l.createdAt.getTime() / 1000),
      expiresAt: l.expiresAt ? Math.floor(l.expiresAt.getTime() / 1000) : 0,
    };

    const dist = computeDistance(l.latitude, l.longitude, params.filters?.lat, params.filters?.lng);

    return {
      document: doc,
      distanceKm: dist ?? undefined,
      highlights: query
        ? {
            subjects: doc.subjects.map((s) => highlightMatches(s, query)).join(", "),
            notes: highlightMatches(doc.notes, query),
          }
        : undefined,
    };
  });

  return {
    hits,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
    engine: "POSTGRES_FTS",
    processingTimeMs: Date.now() - startTime,
  };
}

// ── Search Parents (Admin Only) ───────────────────────────────────────────────

export async function searchParents(
  params: SearchParams<ParentSearchFilters>
): Promise<SearchResult<ParentSearchDoc>> {
  const startTime = Date.now();
  const query = params.query?.trim() ?? "";
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: any = {};
  if (query) {
    where.OR = [
      { user: { name: { contains: query, mode: "insensitive" } } },
      { user: { email: { contains: query, mode: "insensitive" } } },
      { user: { phone: { contains: query, mode: "insensitive" } } },
      { city: { contains: query, mode: "insensitive" } },
    ];
  }

  const [parents, total] = await Promise.all([
    prisma.parentProfile.findMany({
      where,
      skip,
      take: limit,
      include: { user: { select: { name: true, email: true, phone: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.parentProfile.count({ where }),
  ]);

  const hits: SearchHit<ParentSearchDoc>[] = parents.map((p) => ({
    document: {
      id: p.id,
      userId: p.userId,
      name: p.user.name ?? "Parent",
      email: p.user.email ?? "",
      phone: p.user.phone ?? "",
      city: p.city ?? "",
      state: p.state ?? "",
      createdAt: Math.floor(p.createdAt.getTime() / 1000),
    },
  }));

  return {
    hits,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
    engine: "POSTGRES_FTS",
    processingTimeMs: Date.now() - startTime,
  };
}

// ── Search Conversations ──────────────────────────────────────────────────────

export async function searchConversations(
  userId: string,
  query: string
): Promise<SearchResult<ConversationSearchDoc>> {
  const startTime = Date.now();

  const messages = await prisma.message.findMany({
    where: {
      conversation: {
        OR: [
          { parentProfile: { userId } },
          { tutorProfile: { userId } },
        ],
      },
      content: { contains: query, mode: "insensitive" },
    },
    take: 30,
    orderBy: { createdAt: "desc" },
    include: {
      conversation: {
        include: {
          parentProfile: { select: { user: { select: { name: true } } } },
          tutorProfile: { select: { user: { select: { name: true } } } },
        },
      },
    },
  });

  const hits: SearchHit<ConversationSearchDoc>[] = messages.map((m) => ({
    document: {
      id: m.conversationId,
      parentProfileId: m.conversation.parentProfileId,
      parentName: m.conversation.parentProfile.user.name ?? "Parent",
      tutorProfileId: m.conversation.tutorProfileId,
      tutorName: m.conversation.tutorProfile.user.name ?? "Tutor",
      leadId: m.conversation.leadId,
      lastMessageText: m.content,
      attachmentNames: m.attachmentUrl ? [m.attachmentUrl] : [],
      lastMessageAt: Math.floor(m.createdAt.getTime() / 1000),
    },
    highlights: {
      lastMessageText: highlightMatches(m.content, query),
    },
  }));

  return {
    hits,
    total: hits.length,
    page: 1,
    totalPages: 1,
    engine: "POSTGRES_FTS",
    processingTimeMs: Date.now() - startTime,
  };
}
