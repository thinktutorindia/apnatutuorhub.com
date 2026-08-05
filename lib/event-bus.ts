/**
 * lib/event-bus.ts
 * Enterprise Upgrade — Phase 6: Event-Driven Architecture
 *
 * Centralized domain event bus for decoupling business logic mutations
 * from background workers, analytics, activity logging, and notifications.
 *
 * Domain Events supported:
 * - domain:lead:created
 * - domain:lead:unlocked
 * - domain:booking:completed
 * - domain:review:submitted
 * - domain:kyc:status_changed
 */

import { EventEmitter } from "events";
import { logActivity, type ActivityEventType } from "@/lib/activity-logger";
import { createNotification } from "@/lib/notification-engine";

// ── Singleton Event Bus ───────────────────────────────────────────────────────

class DomainEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(25);
  }
}

// Global singleton instance
const globalForEventBus = globalThis as unknown as {
  domainEventBus?: DomainEventBus;
};

export const eventBus =
  globalForEventBus.domainEventBus ?? new DomainEventBus();

if (process.env.NODE_ENV !== "production") {
  globalForEventBus.domainEventBus = eventBus;
}

// ── Domain Event Handlers Initialization ─────────────────────────────────────

let handlersInitialized = false;

/**
 * Registers system listeners for domain events.
 * Safe to call multiple times (idempotent).
 */
export function initDomainEventHandlers(): void {
  if (handlersInitialized) return;
  handlersInitialized = true;

  // 1. Lead Created -> Log Activity
  eventBus.on("domain:lead:created", (payload: { userId: string; leadId: string }) => {
    void logActivity({
      userId: payload.userId,
      event: "LEAD_CREATED" as ActivityEventType,
      metadata: { leadId: payload.leadId },
    });
  });

  // 2. Lead Unlocked -> Log Activity & Notify Parent
  eventBus.on(
    "domain:lead:unlocked",
    (payload: { tutorUserId: string; parentUserId: string; leadId: string }) => {
      void logActivity({
        userId: payload.tutorUserId,
        event: "LEAD_PURCHASED" as ActivityEventType,
        metadata: { leadId: payload.leadId },
      });

      void createNotification({
        userId: payload.parentUserId,
        type: "LEAD_APPLICATION",
        title: "👨‍🏫 A Tutor Unlocked Your Requirement!",
        message: "A verified tutor has responded to your tuition post. Check your dashboard to view their profile.",
        actionUrl: `/parent/leads/${payload.leadId}`,
      });
    }
  );

  // 3. Booking Completed -> Log Activity & Trigger Review Prompt
  eventBus.on(
    "domain:booking:completed",
    (payload: { tutorProfileId: string; parentUserId: string; bookingId: string }) => {
      void logActivity({
        userId: payload.parentUserId,
        event: "BOOKING_COMPLETED" as ActivityEventType,
        metadata: { bookingId: payload.bookingId, tutorProfileId: payload.tutorProfileId },
      });
    }
  );

  // 4. Initialize Search Event Indexing Listeners
  try {
    const { initSearchEventHandlers } = require("@/lib/search/events");
    initSearchEventHandlers();
  } catch (e) {
    console.error("[event-bus] Search event handlers init error:", e);
  }

  console.info("[event-bus] Domain event handlers initialized.");
}

// Auto-initialize handlers on module load
initDomainEventHandlers();
