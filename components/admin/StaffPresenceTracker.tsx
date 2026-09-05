"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useStaffDutyStore } from "@/lib/stores/staff-duty-store";
import {
  staffHeartbeatAction,
  getMyPresenceAction,
} from "@/app/actions/staff-presence.actions";

// No mouse/keyboard for this long → considered idle ("not working").
const IDLE_MS = 60_000;
// Keep-alive heartbeat cadence.
const HEARTBEAT_MS = 25_000;
// Throttle the idle-timer reset so heavy mousemove streams stay cheap.
const ACTIVITY_THROTTLE_MS = 1_500;

/**
 * Invisible presence agent mounted once in the admin layout.
 * Single writer of the shared duty store: sends heartbeats with the current
 * page + idle state, and flips idle on/off from real input.
 */
export function StaffPresenceTracker() {
  const pathname = usePathname();
  const setSnapshot = useStaffDutyStore((s) => s.setSnapshot);
  const setIdleLocal = useStaffDutyStore((s) => s.setIdleLocal);
  const setActivityPing = useStaffDutyStore((s) => s.setActivityPing);
  const setIdleDurationSec = useStaffDutyStore((s) => s.setIdleDurationSec);

  const idleRef = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityReset = useRef(Date.now());
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    let cancelled = false;

    const sendHeartbeat = async (idle: boolean) => {
      const res = await staffHeartbeatAction({ path: pathRef.current, idle });
      if (!cancelled && res.success && res.data) setSnapshot(res.data);
    };

    const goIdle = () => {
      if (idleRef.current) return;
      idleRef.current = true;
      setIdleLocal(true);
      void sendHeartbeat(true);
    };

    const armIdleTimer = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(goIdle, IDLE_MS);
    };

    const onActivity = () => {
      const now = Date.now();
      lastActivityReset.current = now;
      setActivityPing(now);

      // Coming back from idle → immediately mark active + heartbeat.
      if (idleRef.current) {
        idleRef.current = false;
        setIdleLocal(false);
        void sendHeartbeat(false);
      }
      armIdleTimer();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") onActivity();
    };

    // Initial hydrate from the server, then first heartbeat.
    getMyPresenceAction().then((res) => {
      if (!cancelled && res.success && res.data) setSnapshot(res.data);
    });
    void sendHeartbeat(false);
    armIdleTimer();

    const events: (keyof DocumentEventMap)[] = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "wheel"];
    events.forEach((e) => document.addEventListener(e, onActivity, { passive: true }));
    document.addEventListener("visibilitychange", onVisibility);

    const interval = setInterval(() => void sendHeartbeat(idleRef.current), HEARTBEAT_MS);

    return () => {
      cancelled = true;
      if (idleTimer.current) clearTimeout(idleTimer.current);
      clearInterval(interval);
      events.forEach((e) => document.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Heartbeat immediately whenever the route changes (movement trail).
  useEffect(() => {
    let cancelled = false;
    staffHeartbeatAction({ path: pathname, idle: idleRef.current }).then((res) => {
      if (!cancelled && res.success && res.data) setSnapshot(res.data);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
