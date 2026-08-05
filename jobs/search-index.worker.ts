/**
 * jobs/search-index.worker.ts
 * Background Worker for Asynchronous Entity Indexing
 */

import { indexTutor, indexLead } from "@/lib/search/indexer";

export async function processSearchIndexJob(job: { entity: "tutor" | "lead"; id: string }) {
  console.info(`[search-worker] Indexing ${job.entity}:${job.id}`);
  if (job.entity === "tutor") {
    await indexTutor(job.id);
  } else if (job.entity === "lead") {
    await indexLead(job.id);
  }
}
