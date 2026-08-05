/**
 * jobs/search-delete.worker.ts
 * Background Worker for Asynchronous Search Index Document Deletion
 */

import { deleteTutorIndex, deleteLeadIndex } from "@/lib/search/indexer";

export async function processSearchDeleteJob(job: { entity: "tutor" | "lead"; id: string }) {
  console.info(`[search-worker] Deleting ${job.entity}:${job.id}`);
  if (job.entity === "tutor") {
    await deleteTutorIndex(job.id);
  } else if (job.entity === "lead") {
    await deleteLeadIndex(job.id);
  }
}
