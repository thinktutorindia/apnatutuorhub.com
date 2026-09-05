"use client";

import { create } from "zustand";
import type { StaffDutyStatus } from "@prisma/client";

export type DutySnapshot = {
  dutyStatus: StaffDutyStatus;
  forcedOff: boolean;
  online: boolean;
  isIdle: boolean;
  /** True when sensitive contact data must be masked/blurred in list views. */
  protect: boolean;
  revealsToday: number;
  revealLimit: number;
};

export type ShiftState = {
  shiftStatus: "CLOCKED_IN" | "ON_BREAK" | "CLOCKED_OUT";
  activeSessionId: string | null;
  lastActivityTimestamp: number;
  idleDurationSec: number;
};

type DutyStore = DutySnapshot & ShiftState & {
  hydrated: boolean;
  setSnapshot: (s: Partial<DutySnapshot>) => void;
  setIdleLocal: (idle: boolean) => void;
  setActivityPing: (timestamp?: number) => void;
  setShiftSession: (session: { id: string | null; status: "CLOCKED_IN" | "ON_BREAK" | "CLOCKED_OUT" }) => void;
  setIdleDurationSec: (sec: number) => void;
};

/**
 * Shared, app-wide staff duty/presence state. The <StaffPresenceTracker/>
 * mounted in the admin layout is the single writer (heartbeats + idle
 * detection + duty toggles); any admin component can read it to decide
 * whether to protect (blur) sensitive data.
 */
export const useStaffDutyStore = create<DutyStore>((set) => ({
  dutyStatus: "OFF_DUTY",
  forcedOff: false,
  online: false,
  isIdle: false,
  protect: true,
  revealsToday: 0,
  revealLimit: 80,
  hydrated: false,
  shiftStatus: "CLOCKED_OUT",
  activeSessionId: null,
  lastActivityTimestamp: typeof Date !== "undefined" ? Date.now() : 0,
  idleDurationSec: 0,
  setSnapshot: (s) => set((prev) => ({ ...prev, ...s, hydrated: true })),
  setIdleLocal: (idle) =>
    set((prev) => ({
      ...prev,
      isIdle: idle,
      protect: prev.forcedOff || prev.dutyStatus === "OFF_DUTY" || idle,
    })),
  setActivityPing: (timestamp) =>
    set((prev) => ({
      ...prev,
      lastActivityTimestamp: timestamp ?? Date.now(),
      isIdle: false,
      idleDurationSec: 0,
      protect: prev.forcedOff || prev.dutyStatus === "OFF_DUTY" ? true : false,
    })),
  setShiftSession: ({ id, status }) =>
    set((prev) => ({
      ...prev,
      activeSessionId: id,
      shiftStatus: status,
    })),
  setIdleDurationSec: (sec) =>
    set((prev) => ({
      ...prev,
      idleDurationSec: sec,
    })),
}));
