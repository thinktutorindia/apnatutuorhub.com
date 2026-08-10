"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";

export function AnalyticsRangePicker({ currentRange }: { currentRange: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const RANGES = [
    { label: "30 Days", val: "30d" },
    { label: "90 Days", val: "90d" },
    { label: "6 Months", val: "180d" },
    { label: "1 Year", val: "1y" },
    { label: "All Time", val: "all" },
  ];

  const handleSelectRange = (val: string) => {
    if (val === currentRange || isPending) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", val);

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-slate-100 p-1.5 border border-slate-200">
      {RANGES.map((r) => {
        const isActive = currentRange === r.val;
        return (
          <button
            key={r.val}
            type="button"
            onClick={() => handleSelectRange(r.val)}
            disabled={isPending}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-800 transition-all cursor-pointer ${
              isActive
                ? "bg-[#2563EB] !text-white shadow-xs"
                : "text-slate-700 hover:text-black hover:bg-white"
            }`}
          >
            {isPending && isActive && <Loader2 size={12} className="animate-spin text-white" />}
            <span>{r.label}</span>
          </button>
        );
      })}
    </div>
  );
}
