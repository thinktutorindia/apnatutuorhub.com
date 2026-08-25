/**
 * lib/search/events.ts
 * Domain Event Listeners for Automatic Search Index Synchronization
 */

import { eventBus } from "@/lib/event-bus";
import { indexTutor, indexLead, deleteTutorIndex, deleteLeadIndex } from "./indexer";
import { invalidateSearchCache } from "./cache";

let searchEventsInitialized = false;

export function initSearchEventHandlers(): void {
  if (searchEventsInitialized) return;
  searchEventsInitialized = true;

  // Tutor mutations
  eventBus.on("domain:tutor:updated", (payload: { tutorProfileId: string }) => {
    void indexTutor(payload.tutorProfileId);
    void invalidateSearchCache("tutors");
  });

  eventBus.on("domain:kyc:status_changed", (payload: { tutorProfileId: string }) => {
    void indexTutor(payload.tutorProfileId);
    void invalidateSearchCache("tutors");
  });

  // Lead mutations
  eventBus.on("domain:lead:created", (payload: { leadId: string }) => {
    void indexLead(payload.leadId);
    void invalidateSearchCache("leads");
  });

  eventBus.on("domain:lead:updated", (payload: { leadId: string }) => {
    void indexLead(payload.leadId);
    void invalidateSearchCache("leads");
  });

  console.info("[search-events] Search indexing event listeners initialized.");
}

if (typeof process !== "undefined" && typeof process.nextTick === "function") {
  process.nextTick(() => {
    initSearchEventHandlers();
  });
} else {
  initSearchEventHandlers();
}
