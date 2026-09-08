"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useStaffDutyStore } from "@/lib/stores/staff-duty-store";
import {
  staffHeartbeatAction,
  getMyPresenceAction,
} from "@/app/actions/staff-presence.actions";

// Desktop: No mouse/keyboard for 60 seconds → idle (timer pauses)
const DESKTOP_IDLE_MS = 60_000;
// Mobile: If tab hidden without a call for 2.5 minutes → idle
const MOBILE_HIDDEN_IDLE_MS = 150_000;
// Mobile telecalling: Max active call window when user leaves browser to dialer/WhatsApp (10 minutes)
const MOBILE_CALL_GRACE_MS = 600_000;
// Keep-alive heartbeat cadence
const HEARTBEAT_MS = 25_000;
// Throttle mousemove events
const ACTIVITY_THROTTLE_MS = 1_500;

/**
 * Invisible presence agent mounted once in the admin layout.
 * Accurately tracks desktop mouse movement vs Android/mobile touch & telecalling actions.
 * Prevents phantom work timers by pausing when staff is away or screen is off.
 */
export function StaffPresenceTracker() {
  const pathname = usePathname();
  const setSnapshot = useStaffDutyStore((s) => s.setSnapshot);
  const setIdleLocal = useStaffDutyStore((s) => s.setIdleLocal);
  const setActivityPing = useStaffDutyStore((s) => s.setActivityPing);

  const idleRef = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hiddenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityReset = useRef(Date.now());
  const lastCallInitiatedAt = useRef<number | null>(null);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    let cancelled = false;
    const isMobile =
      typeof navigator !== "undefined" &&
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

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
      idleTimer.current = setTimeout(goIdle, DESKTOP_IDLE_MS);
    };

    const onActivity = () => {
      const now = Date.now();
      // Throttle rapid mouse movements on desktop
      if (now - lastActivityReset.current < ACTIVITY_THROTTLE_MS && !idleRef.current) {
        return;
      }
      lastActivityReset.current = now;
      setActivityPing(now);

      // Coming back from idle → immediately mark active + heartbeat
      if (idleRef.current) {
        idleRef.current = false;
        setIdleLocal(false);
        void sendHeartbeat(false);
      }
      armIdleTimer();
    };

    // ── Android / Mobile Call Action Interceptor ──
    // Detects when telecaller taps a tel: link or WhatsApp link to call a lead
    const onLinkOrButtonClick = (e: MouseEvent | TouchEvent) => {
      const target = (e.target as HTMLElement)?.closest("a, button");
      if (!target) return;
      const href = target.getAttribute("href") || "";
      const text = target.textContent?.toLowerCase() || "";
      if (
        href.startsWith("tel:") ||
        href.includes("api.whatsapp.com") ||
        href.includes("wa.me") ||
        text.includes("call") ||
        text.includes("dial") ||
        text.includes("whatsapp")
      ) {
        lastCallInitiatedAt.current = Date.now();
        onActivity();
      }
    };

    // ── Visibility & Mobile Screen-Off / App-Switch Handling ──
    const onVisibilityChange = () => {
      const now = Date.now();
      if (document.visibilityState === "hidden") {
        // Tab went to background / phone screen locked / switched apps
        const justCalled =
          lastCallInitiatedAt.current &&
          now - lastCallInitiatedAt.current < 90_000;

        if (justCalled && isMobile) {
          // User opened Android dialer or WhatsApp to talk to a lead!
          // Give up to 10 minutes active calling grace period
          if (hiddenTimer.current) clearTimeout(hiddenTimer.current);
          hiddenTimer.current = setTimeout(() => {
            goIdle();
          }, MOBILE_CALL_GRACE_MS);
        } else {
          // Normal backgrounding without a call (e.g. phone put in pocket)
          if (hiddenTimer.current) clearTimeout(hiddenTimer.current);
          hiddenTimer.current = setTimeout(() => {
            goIdle();
          }, isMobile ? MOBILE_HIDDEN_IDLE_MS : DESKTOP_IDLE_MS);
        }
      } else {
        // Tab became visible again (user opened browser / returned from call)
        if (hiddenTimer.current) {
          clearTimeout(hiddenTimer.current);
          hiddenTimer.current = null;
        }
        const callDuration = lastCallInitiatedAt.current
          ? now - lastCallInitiatedAt.current
          : 0;

        // If returned from call within 10 minutes, restore active status
        if (callDuration > 0 && callDuration < MOBILE_CALL_GRACE_MS) {
          lastCallInitiatedAt.current = null;
        }
        onActivity();
      }
    };

    const onWindowBlur = () => {
      // On desktop: if user switches away from the window, start countdown to idle
      if (!isMobile) {
        if (hiddenTimer.current) clearTimeout(hiddenTimer.current);
        hiddenTimer.current = setTimeout(goIdle, DESKTOP_IDLE_MS);
      }
    };

    const onWindowFocus = () => {
      if (hiddenTimer.current) {
        clearTimeout(hiddenTimer.current);
        hiddenTimer.current = null;
      }
      onActivity();
    };

    // Initial hydrate from the server, then first heartbeat
    getMyPresenceAction().then((res) => {
      if (!cancelled && res.success && res.data) setSnapshot(res.data);
    });
    void sendHeartbeat(false);
    armIdleTimer();

    // Desktop events: mouse, keyboard, wheel
    // Mobile events: touch, scroll, pointer
    const events: (keyof DocumentEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "touchmove",
      "touchend",
      "pointerdown",
      "pointermove",
      "wheel",
    ];

    events.forEach((e) => document.addEventListener(e, onActivity, { passive: true }));
    document.addEventListener("click", onLinkOrButtonClick, { capture: true, passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onWindowFocus);
    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("pageshow", onWindowFocus);

    const interval = setInterval(() => void sendHeartbeat(idleRef.current), HEARTBEAT_MS);

    return () => {
      cancelled = true;
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (hiddenTimer.current) clearTimeout(hiddenTimer.current);
      clearInterval(interval);
      events.forEach((e) => document.removeEventListener(e, onActivity));
      document.removeEventListener("click", onLinkOrButtonClick);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onWindowFocus);
      window.removeEventListener("blur", onWindowBlur);
      window.removeEventListener("pageshow", onWindowFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Heartbeat immediately whenever the route changes (movement trail)
  useEffect(() => {
    let cancelled = false;
    staffHeartbeatAction({ path: pathname, idle: idleRef.current }).then((res) => {
      if (!cancelled && res.success && res.data) setSnapshot(res.data);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
