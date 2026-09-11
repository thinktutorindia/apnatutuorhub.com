"use client";

import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Loader2,
  MapPin,
  Search,
} from "lucide-react";
import { parseClassAndSubject } from "@/lib/subject-matcher";
import {
  type UrbanProItem,
  type LocHit,
  URBANPRO_POPULAR,
  POPULAR_CITIES,
  LOCAL_PLACES,
  Highlight,
  searchUrbanProSubjects,
  searchIndiaPlaces,
} from "@/lib/urbanpro-catalog";

interface HomeHeroCardProps {
  user: { role?: string } | null;
  dashboardUrl: string;
  isParent: boolean;
}

function FloatingMenu({
  open,
  anchorRef,
  menuRef,
  labelledBy,
  children,
  minWidth = 460,
  maxWidth = 640,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  menuRef: React.RefObject<HTMLDivElement | null>;
  labelledBy: string;
  children: React.ReactNode;
  minWidth?: number;
  maxWidth?: number;
}) {
  const [mounted, setMounted] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setBox(null);
      return;
    }
    const place = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const isMobile = viewportWidth < 640;

      let width: number;
      let left: number;

      if (isMobile) {
        left = 12;
        width = viewportWidth - 24;
      } else {
        width = Math.min(Math.max(r.width * 1.25, minWidth), maxWidth, viewportWidth - 32);
        left = r.left;
        if (left + width > viewportWidth - 16) {
          left = Math.max(16, viewportWidth - 16 - width);
        }
      }

      setBox({
        top: Math.round(r.bottom + 6),
        left: Math.round(left),
        width: Math.round(width),
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorRef, children, minWidth, maxWidth]);

  if (!mounted || !open || !box) return null;

  return createPortal(
    <div
      ref={menuRef}
      id={labelledBy}
      role="listbox"
      onMouseDown={(e) => {
        // Prevent input blur when interacting with tabs or items
        e.preventDefault();
        e.stopPropagation();
      }}
      style={{
        position: "fixed",
        top: box.top,
        left: box.left,
        width: box.width,
        zIndex: 9999,
      }}
      className="max-h-[460px] overflow-hidden flex flex-col rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_20px_48px_rgba(15,37,64,0.22),0_6px_16px_rgba(15,37,64,0.08)] animate-in fade-in-50 zoom-in-95 duration-150"
    >
      {children}
    </div>,
    document.body
  );
}

export function HomeHeroCard({ user, dashboardUrl, isParent }: HomeHeroCardProps) {
  const router = useRouter();
  const subjectListId = useId();
  const locationListId = useId();

  const [classSubject, setClassSubject] = useState("");
  const [selectedMeta, setSelectedMeta] = useState<{ subject: string; classLevel: string } | null>(null);

  const [locality, setLocality] = useState("");
  const [cityParam, setCityParam] = useState("");
  const [openPanel, setOpenPanel] = useState<"subject" | "location" | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [locHits, setLocHits] = useState<LocHit[]>([]);
  const [locLoading, setLocLoading] = useState(false);

  const rootRef = useRef<HTMLFormElement>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const subjectMenuRef = useRef<HTMLDivElement>(null);
  const locationMenuRef = useRef<HTMLDivElement>(null);

  const subjectHits = useMemo(() => searchUrbanProSubjects(classSubject), [classSubject]);

  const locationHits = useMemo(() => {
    const q = locality.trim().toLowerCase();
    const popular = POPULAR_CITIES.filter((c) =>
      !q ? true : c.label.toLowerCase().includes(q) || c.city.toLowerCase().includes(q)
    );
    if (q.length < 2) return popular.slice(0, 8);
    const local = LOCAL_PLACES.filter(
      (c) => c.label.toLowerCase().includes(q) || c.city.toLowerCase().includes(q)
    );
    const merged: LocHit[] = [];
    const seen = new Set<string>();
    for (const hit of [...local, ...popular, ...locHits]) {
      const key = hit.label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(hit);
    }
    return merged.slice(0, 8);
  }, [locality, locHits]);

  useEffect(() => {
    if (!openPanel) return;
    function onPointerDown(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (subjectMenuRef.current?.contains(t)) return;
      if (locationMenuRef.current?.contains(t)) return;
      setOpenPanel(null);
    }
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
    }, 50);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openPanel]);

  useEffect(() => {
    const q = locality.trim();
    if (openPanel !== "location" || q.length < 2) {
      setLocHits([]);
      setLocLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLocLoading(true);
      const hits = await searchIndiaPlaces(q, controller.signal);
      if (!controller.signal.aborted) {
        setLocHits(hits);
        setLocLoading(false);
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [locality, openPanel]);

  useEffect(() => {
    setActiveIndex(0);
  }, [openPanel, classSubject, locality]);

  const goSearch = useCallback(
    (rawClassSubject = classSubject, rawLocality = cityParam || locality) => {
      let finalSubject = "";
      let finalClassLevel = "";

      if (selectedMeta && selectedMeta.subject) {
        finalSubject = selectedMeta.subject;
        finalClassLevel = selectedMeta.classLevel;
      } else {
        const parsed = parseClassAndSubject(rawClassSubject);
        finalSubject = parsed.subject;
        finalClassLevel = parsed.classLevel;
      }

      // Preserve actual locality or area name
      const loc = (rawLocality || "").trim();
      const city = loc.includes(",") ? loc.split(",")[0].trim() : loc;

      const params = new URLSearchParams();
      if (finalSubject) params.set("subject", finalSubject);
      if (finalClassLevel) params.set("classLevel", finalClassLevel);
      if (city) params.set("city", city);

      if (user && isParent) {
        router.push(`/parent/post-requirement?${params.toString()}`);
      } else if (user) {
        router.push(dashboardUrl);
      } else {
        router.push(`/find-tutor?${params.toString()}`);
      }
    },
    [classSubject, cityParam, locality, selectedMeta, user, isParent, dashboardUrl, router]
  );

  const pickSubject = (item: UrbanProItem) => {
    setClassSubject(item.label);
    setSelectedMeta({ subject: item.subject, classLevel: item.classLevel });
    setOpenPanel(null);
    window.setTimeout(() => locationInputRef.current?.focus(), 40);
  };

  const pickLocation = (hit: LocHit) => {
    setLocality(hit.label);
    setCityParam(hit.city || hit.label); // Preserve specific locality
    setOpenPanel(null);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOpenPanel(null);
    goSearch();
  };

  const onSubjectKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!openPanel && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpenPanel("subject");
      return;
    }
    if (openPanel !== "subject") return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(subjectHits.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && subjectHits[activeIndex]) {
      e.preventDefault();
      pickSubject(subjectHits[activeIndex]);
    } else if (e.key === "Escape") {
      setOpenPanel(null);
    }
  };

  const onLocationKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!openPanel && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpenPanel("location");
      return;
    }
    if (openPanel !== "location") return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(locationHits.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && locationHits[activeIndex]) {
      e.preventDefault();
      pickLocation(locationHits[activeIndex]);
    } else if (e.key === "Escape") {
      setOpenPanel(null);
    }
  };

  const locationEmpty = locality.trim().length < 2;
  const lifted = openPanel !== null;

  return (
    <form
      ref={rootRef}
      onSubmit={handleSearch}
      className={`relative z-50 overflow-visible w-full max-w-full bg-white rounded-2xl p-2 sm:p-2.5 flex flex-col md:flex-row md:items-stretch gap-2 min-w-0 transition-shadow ${
        lifted
          ? "shadow-[0_16px_40px_rgba(10,25,47,0.28)]"
          : "shadow-[0_12px_32px_rgba(10,25,47,0.18)]"
      }`}
    >
      {/* 1. Subject & Class Selector (UrbanPro Style) */}
      <div className="relative z-20 flex-1 min-w-0">
        <label className="sr-only" htmlFor="hero-class-subject">
          Select class or subject
        </label>
        <input
          id="hero-class-subject"
          ref={subjectInputRef}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={openPanel === "subject"}
          aria-controls={subjectListId}
          value={classSubject}
          onChange={(e) => {
            setClassSubject(e.target.value);
            setSelectedMeta(null);
            setOpenPanel("subject");
          }}
          onFocus={() => setOpenPanel("subject")}
          onKeyDown={onSubjectKeyDown}
          placeholder="Select Class / Subject (e.g. Maths, NEET, Sanskrit)"
          className="w-full min-h-12 md:min-h-14 px-3 sm:px-4 rounded-xl bg-white text-[15px] font-600 text-[#0F2540] placeholder:text-[#94A3B8] outline-none border border-[#E2E8F0] md:border-0 focus:border-[#2D9E6B] md:focus:border-transparent"
        />

        <FloatingMenu
          open={openPanel === "subject"}
          anchorRef={subjectInputRef}
          menuRef={subjectMenuRef}
          labelledBy={subjectListId}
          minWidth={460}
          maxWidth={640}
        >
          {subjectHits.length === 0 ? (
            <p className="px-4 py-3 text-sm font-semibold text-slate-500">
              No matching courses found. Try Maths, NEET, or Science.
            </p>
          ) : (
            subjectHits.map((item, i) => (
              <button
                key={`${item.label}-${i}`}
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => pickSubject(item)}
                className={`w-full flex items-center px-4 py-2.5 text-left transition-colors cursor-pointer border-b border-slate-100 last:border-0 ${
                  i === activeIndex ? "bg-[#F0F9FF]" : "bg-white hover:bg-[#F8FAFC]"
                }`}
              >
                <span className="truncate text-[14px] leading-snug text-[#0284C7]">
                  <span className="font-semibold text-[#0F2540]">
                    <Highlight text={item.lead} query={classSubject} />
                  </span>
                  {item.rest && (
                    <span className="font-normal text-[#0284C7] ml-1.5">{item.rest}</span>
                  )}
                </span>
              </button>
            ))
          )}
        </FloatingMenu>
      </div>

      <div className="hidden md:block w-px bg-[#E2E8F0] my-2 shrink-0" />

      {/* 2. Locality & City Selector */}
      <div className="relative z-20 flex-1 min-w-0">
        <label className="sr-only" htmlFor="hero-locality">
          Enter locality or city
        </label>
        <input
          id="hero-locality"
          ref={locationInputRef}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={openPanel === "location"}
          aria-controls={locationListId}
          value={locality}
          onChange={(e) => {
            setLocality(e.target.value);
            setCityParam(e.target.value);
            setOpenPanel("location");
          }}
          onFocus={() => setOpenPanel("location")}
          onKeyDown={onLocationKeyDown}
          placeholder="Enter Locality / City (e.g. Sangam Vihar, Delhi)"
          className="w-full min-h-12 md:min-h-14 px-3 sm:px-4 pr-9 rounded-xl bg-white text-[15px] font-600 text-[#0F2540] placeholder:text-[#94A3B8] outline-none border border-[#E2E8F0] md:border-0 focus:border-[#2D9E6B] md:focus:border-transparent"
        />
        {locLoading && (
          <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-[#2D9E6B]" />
        )}
        <FloatingMenu
          open={openPanel === "location"}
          anchorRef={locationInputRef}
          menuRef={locationMenuRef}
          labelledBy={locationListId}
          minWidth={320}
          maxWidth={460}
        >
          <div className="px-3.5 py-2 border-b border-[#F1F5F9] bg-[#FAFBFD]">
            <p className="text-[11px] font-800 uppercase tracking-wider text-[#94A3B8]">
              {locationEmpty ? "Popular Localities & Cities" : "Search results"}
            </p>
          </div>
          <div className="overflow-y-auto max-h-72">
            {locationHits.length === 0 && !locLoading ? (
              <p className="px-3.5 py-3 text-sm font-semibold text-slate-500">
                No matching places. Try your locality or pincode.
              </p>
            ) : (
              locationHits.map((hit, i) => (
                <button
                  key={`${hit.label}-${i}`}
                  type="button"
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => pickLocation(hit)}
                  className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors cursor-pointer border-b border-slate-100 last:border-0 ${
                    i === activeIndex ? "bg-[#E8F7F0]" : "bg-white hover:bg-[#F8FAFC]"
                  }`}
                >
                  <span className="inline-flex min-w-0 items-center gap-2 text-[14px] font-bold text-[#0F2540] leading-snug">
                    <MapPin size={14} className="shrink-0 text-[#2D9E6B]" />
                    <span className="min-w-0 whitespace-normal">
                      <Highlight text={hit.label} query={locality} />
                    </span>
                  </span>
                  {hit.meta && <span className="shrink-0 text-[11px] font-semibold text-[#64748B]">{hit.meta}</span>}
                </button>
              ))
            )}
          </div>
        </FloatingMenu>
      </div>

      {/* 3. Search Action Button */}
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 min-h-12 md:min-h-14 px-6 w-full md:w-auto rounded-xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-[15px] font-800 shadow-[0_8px_22px_rgba(45,158,107,0.4)] shrink-0 cursor-pointer transition-all hover:shadow-[0_10px_28px_rgba(45,158,107,0.5)] active:scale-[0.99]"
      >
        <Search size={18} />
        Search Tutors
      </button>
    </form>
  );
}
