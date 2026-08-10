"use client";

import { useState } from "react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const TIME_OPTIONS = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00",
] as const;

type DaySlot = { start: string; end: string; enabled: boolean };

export function AvailabilityGrid({
  defaultSlots,
}: {
  defaultSlots: { dayOfWeek: number; startTime: string; endTime: string }[];
}) {
  const [slots, setSlots] = useState<DaySlot[]>(() =>
    DAYS.map((_, index) => {
      const existing = defaultSlots.find((slot) => slot.dayOfWeek === index);
      return {
        enabled: Boolean(existing),
        start: existing?.startTime ?? "09:00",
        end: existing?.endTime ?? "17:00",
      };
    })
  );

  const toggle = (dayIndex: number) => {
    setSlots((prev) =>
      prev.map((slot, i) =>
        i === dayIndex ? { ...slot, enabled: !slot.enabled } : slot
      )
    );
  };

  const update = (dayIndex: number, field: "start" | "end", value: string) => {
    setSlots((prev) =>
      prev.map((slot, i) => (i === dayIndex ? { ...slot, [field]: value } : slot))
    );
  };

  return (
    <div className="space-y-3">
      {/* Hidden inputs for server-action form submission */}
      {slots.map((slot, index) =>
        slot.enabled ? (
          <span key={index}>
            <input type="hidden" name={`day_${index}_start`} value={slot.start} />
            <input type="hidden" name={`day_${index}_end`} value={slot.end} />
          </span>
        ) : null
      )}

      <div className="space-y-2">
        {DAYS.map((day, index) => {
          const slot = slots[index];
          return (
            <div
              key={day}
              className={`flex flex-wrap items-center gap-3 rounded-xl border-[2.5px] border-[#0F172A] p-3 transition-colors ${
                slot.enabled ? "bg-[#DCFCE7]" : "bg-white opacity-60"
              }`}
            >
              <button
                type="button"
                aria-pressed={slot.enabled}
                onClick={() => toggle(index)}
                className={`flex h-9 w-14 shrink-0 items-center justify-center rounded-full border-2 border-[#0F172A] text-xs font-extrabold transition-colors ${
                  slot.enabled
                    ? "bg-[#22C55E] text-[#0F172A]"
                    : "bg-white text-slate-500"
                }`}
              >
                {day}
              </button>

              {slot.enabled ? (
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <select
                    value={slot.start}
                    onChange={(e) => update(index, "start", e.target.value)}
                    className="flex-1 rounded-xl border-2 border-[#0F172A] bg-white px-3 py-2 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] focus:outline-none"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs font-extrabold text-slate-500">to</span>
                  <select
                    value={slot.end}
                    onChange={(e) => update(index, "end", e.target.value)}
                    className="flex-1 rounded-xl border-2 border-[#0F172A] bg-white px-3 py-2 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] focus:outline-none"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-xs font-semibold text-slate-400">
                  Not available
                </span>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] font-semibold text-slate-500">
        Toggle a day to set your available teaching hours. At least 3 days
        earns full availability ranking points.
      </p>
    </div>
  );
}
