/**
 * jobs/search-reindex.worker.ts
 * Background Worker for Batch Reindexing Database Entities
 */

import { reindexAllEntities } from "@/lib/search/indexer";

export async function processSearchReindexJob() {
  console.info("[search-worker] Batch reindex started...");
  const stats = await reindexAllEntities();
  console.info("[search-worker] Batch reindex completed:", stats);
  return stats;
}
