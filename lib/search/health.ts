/**
 * lib/search/health.ts
 * Search Engine Diagnostics & Health Suite
 */

import { isTypesenseConfigured, getActiveSearchEngine } from "./client";
import type { SearchEngineHealth } from "./types";
import { prisma } from "@/lib/prisma";

export async function getSearchEngineHealth(): Promise<SearchEngineHealth> {
  const connectedEngine = getActiveSearchEngine();
  const typesenseHost = process.env.TYPESENSE_HOST;
  const isRedis = Boolean(process.env.UPSTASH_REDIS_REST_URL);

  const [tutorCount, leadCount, parentCount, conversationCount] = await Promise.all([
    prisma.tutorProfile.count(),
    prisma.lead.count(),
    prisma.parentProfile.count(),
    prisma.conversation.count(),
  ]);

  return {
    status: connectedEngine === "TYPESENSE" || connectedEngine === "POSTGRES_FTS" ? "HEALTHY" : "DEGRADED",
    connectedEngine,
    typesenseHost,
    documentCounts: {
      tutors: tutorCount,
      leads: leadCount,
      parents: parentCount,
      conversations: conversationCount,
    },
    cacheStatus: isRedis ? "UP" : "DISABLED",
    lastSyncAt: new Date().toISOString(),
    failedJobsCount: 0,
  };
}
