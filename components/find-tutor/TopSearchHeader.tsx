"use client";

import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, MapPin, Monitor, X, Loader2 } from "lucide-react";
import {
  searchUrbanProSubjects,
  type UrbanProItem,
  Highlight,
  POPULAR_CITIES,
  LOCAL_PLACES,
  type LocHit,
  searchIndiaPlaces,
} from "@/lib/urbanpro-catalog";
import { parseClassAndSubject } from "@/lib/subject-matcher";

export interface WizardState {
  subject: string;
  classLevel: string;
  board: string;
  mode: string;
  budgetMax: number;
  city: string;
  gender?: string;
  radiusKm?: number;
}

function FloatingMenu({
  open,
  anchorRef,
  menuRef,
  labelledBy,
  children,
  minWidth = 380,
  maxWidth = 540,
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
        width = Math.min(Math.max(r.width * 1.15, minWidth), maxWidth, viewportWidth - 32);
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
  }, [open, anchorRef, minWidth, maxWidth]);

  if (!mounted || !open || !box) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="listbox"
      aria-labelledby={labelledBy}
      style={{
        position: "fixed",
        top: box.top,
        left: box.left,
        width: box.width,
        zIndex: 9999,
      }}
      className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-2 text-left max-h-[380px] overflow-y-auto outline-none animate-in fade-in-50 zoom-in-95 duration-100"
    >
      {children}
    </div>,
    document.body
  );
}

export function TopSearchHeader({
  state,
  onChange,
  onSearch,
}: {
  state: WizardState;
  onChange: <K extends keyof WizardState>(key: K, val: WizardState[K]) => void;
  onSearch: (customState?: WizardState) => void;
}) {
  const subInputId = useId();
  const locInputId = useId();

  const [subInput, setSubInput] = useState(state.subject);
  const [locInput, setLocInput] = useState(state.city);

  const [subOpen, setSubOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);

  const [subActiveIdx, setSubActiveIdx] = useState(-1);
  const [locActiveIdx, setLocActiveIdx] = useState(-1);

  const [locRemoteHits, setLocRemoteHits] = useState<LocHit[]>([]);
  const [locSearching, setLocSearching] = useState(false);

  const subWrapRef = useRef<HTMLDivElement>(null);
  const subMenuRef = useRef<HTMLDivElement>(null);
  const subInputRef = useRef<HTMLInputElement>(null);

  const locWrapRef = useRef<HTMLDivElement>(null);
  const locMenuRef = useRef<HTMLDivElement>(null);
  const locInputRef = useRef<HTMLInputElement>(null);

  // Sync inputs if external state changes (e.g. filter chips reset)
  useEffect(() => {
    setSubInput(state.subject);
  }, [state.subject]);

  useEffect(() => {
    setLocInput(state.city);
  }, [state.city]);

  // Click outside handlers
  useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!subWrapRef.current?.contains(t) && !subMenuRef.current?.contains(t)) {
        setSubOpen(false);
      }
      if (!locWrapRef.current?.contains(t) && !locMenuRef.current?.contains(t)) {
        setLocOpen(false);
      }
    };
    document.addEventListener("mousedown", handleDown);
    return () => document.removeEventListener("mousedown", handleDown);
  }, []);

  // Subject suggestions
  const subHits = useMemo(() => searchUrbanProSubjects(subInput), [subInput]);

  // Debounced location search
  useEffect(() => {
    const trimmed = locInput.trim();
    if (!trimmed || trimmed.length < 2) {
      setLocRemoteHits([]);
      setLocSearching(false);
      return;
    }

    const ctrl = new AbortController();
    setLocSearching(true);
    const t = setTimeout(async () => {
      try {
        const hits = await searchIndiaPlaces(trimmed, ctrl.signal);
        setLocRemoteHits(hits);
      } catch {
        setLocRemoteHits([]);
      } finally {
        setLocSearching(false);
      }
    }, 220);

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [locInput]);

  // Combined location hits
  const locHits = useMemo(() => {
    const q = locInput.trim().toLowerCase();
    if (!q) {
      return [...LOCAL_PLACES.slice(0, 6), ...POPULAR_CITIES.slice(0, 6)];
    }

    const localMatches = LOCAL_PLACES.filter(
      (p) => p.label.toLowerCase().includes(q) || p.city.toLowerCase().includes(q)
    );
    const cityMatches = POPULAR_CITIES.filter(
      (c) => c.label.toLowerCase().includes(q) || c.city.toLowerCase().includes(q)
    );

    const merged: LocHit[] = [];
    const seen = new Set<string>();

    for (const h of [...localMatches, ...cityMatches, ...locRemoteHits]) {
      const key = h.label.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(h);
      }
    }
    return merged.slice(0, 8);
  }, [locInput, locRemoteHits]);

  const handleSelectSubject = (item: UrbanProItem) => {
    const cleanSub = item.subject || item.lead;
    setSubInput(item.lead);
    setSubOpen(false);

    const nextState: WizardState = {
      ...state,
      subject: cleanSub,
      classLevel: item.classLevel && item.classLevel !== "All Grades" ? item.classLevel : state.classLevel,
    };
    onChange("subject", cleanSub);
    if (item.classLevel && item.classLevel !== "All Grades") {
      onChange("classLevel", item.classLevel);
    }
    onSearch(nextState);
  };

  const handleSelectLocation = (hit: LocHit) => {
    setLocInput(hit.city);
    setLocOpen(false);

    const nextState: WizardState = {
      ...state,
      city: hit.city,
    };
    onChange("city", hit.city);
    onSearch(nextState);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubOpen(false);
    setLocOpen(false);

    const { subject: parsedSub, classLevel: parsedCls } = parseClassAndSubject(subInput);
    const finalSub = parsedSub || subInput.trim();
    const finalCls = parsedCls || state.classLevel;
    const finalCity = locInput.trim();

    const nextState: WizardState = {
      ...state,
      subject: finalSub,
      classLevel: finalCls,
      city: finalCity,
    };

    onChange("subject", finalSub);
    if (finalCls !== state.classLevel) onChange("classLevel", finalCls);
    if (finalCity !== state.city) onChange("city", finalCity);

    onSearch(nextState);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-2.5 shadow-2xs mb-6 relative">
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-center gap-2">
        {/* 1. Subject Input & Autocomplete */}
        <div
          ref={subWrapRef}
          className="relative flex items-center gap-2.5 px-3 py-2 flex-1 w-full border-b md:border-b-0 md:border-r border-slate-100"
        >
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            ref={subInputRef}
            id={subInputId}
            type="text"
            value={subInput}
            onChange={(e) => {
              setSubInput(e.target.value);
              setSubOpen(true);
              setSubActiveIdx(-1);
            }}
            onFocus={() => {
              setSubOpen(true);
              setLocOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSubOpen(true);
                setSubActiveIdx((i) => Math.min(i + 1, subHits.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSubActiveIdx((i) => Math.max(i - 1, -1));
              } else if (e.key === "Enter") {
                if (subOpen && subActiveIdx >= 0 && subHits[subActiveIdx]) {
                  e.preventDefault();
                  handleSelectSubject(subHits[subActiveIdx]);
                }
              } else if (e.key === "Escape") {
                setSubOpen(false);
              }
            }}
            placeholder="Search subject or class (e.g. Mathematics, Class 10)"
            className="w-full text-xs sm:text-sm font-semibold text-[#0F2540] placeholder:text-slate-400 outline-none bg-transparent"
            autoComplete="off"
          />
          {subInput && (
            <button
              type="button"
              onClick={() => {
                setSubInput("");
                onChange("subject", "");
                subInputRef.current?.focus();
              }}
              className="p-1 rounded-full text-slate-300 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}

          {/* Subject Dropdown */}
          <FloatingMenu open={subOpen} anchorRef={subWrapRef} menuRef={subMenuRef} labelledBy={subInputId}>
            <div className="px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
              <span>{subInput ? "Suggested Subjects & Classes" : "Popular Searches"}</span>
              <span className="text-[10px] font-normal text-slate-400">Press Enter to choose</span>
            </div>
            <div className="py-1">
              {subHits.map((item, idx) => {
                const isActive = idx === subActiveIdx;
                return (
                  <button
                    key={`${item.lead}-${item.rest}-${idx}`}
                    type="button"
                    onMouseEnter={() => setSubActiveIdx(idx)}
                    onClick={() => handleSelectSubject(item)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer ${
                      isActive ? "bg-emerald-50 text-[#0F2540]" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-[#0F2540]">
                        <Highlight text={item.lead} query={subInput} />
                      </span>
                      {item.rest && <span className="text-slate-400 font-normal text-[11px]">{item.rest}</span>}
                    </div>
                    {item.classLevel && (
                      <span className="shrink-0 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {item.classLevel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </FloatingMenu>
        </div>

        {/* 2. Location Input & Autocomplete */}
        <div
          ref={locWrapRef}
          className="relative flex items-center gap-2.5 px-3 py-2 flex-1 w-full border-b md:border-b-0 md:border-r border-slate-100"
        >
          <MapPin size={18} className="text-slate-400 shrink-0" />
          <input
            ref={locInputRef}
            id={locInputId}
            type="text"
            value={locInput}
            onChange={(e) => {
              setLocInput(e.target.value);
              setLocOpen(true);
              setLocActiveIdx(-1);
            }}
            onFocus={() => {
              setLocOpen(true);
              setSubOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setLocOpen(true);
                setLocActiveIdx((i) => Math.min(i + 1, locHits.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setLocActiveIdx((i) => Math.max(i - 1, -1));
              } else if (e.key === "Enter") {
                if (locOpen && locActiveIdx >= 0 && locHits[locActiveIdx]) {
                  e.preventDefault();
                  handleSelectLocation(locHits[locActiveIdx]);
                }
              } else if (e.key === "Escape") {
                setLocOpen(false);
              }
            }}
            placeholder="Locality or city (e.g. Sangam Vihar, Saket, Delhi)"
            className="w-full text-xs sm:text-sm font-semibold text-[#0F2540] placeholder:text-slate-400 outline-none bg-transparent"
            autoComplete="off"
          />
          {locSearching && <Loader2 size={14} className="animate-spin text-slate-400" />}
          {locInput && (
            <button
              type="button"
              onClick={() => {
                setLocInput("");
                onChange("city", "");
                locInputRef.current?.focus();
              }}
              className="p-1 rounded-full text-slate-300 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}

          {/* Location Dropdown */}
          <FloatingMenu open={locOpen} anchorRef={locWrapRef} menuRef={locMenuRef} labelledBy={locInputId}>
            <div className="px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
              <span>{locInput ? "Matching Localities & Cities" : "Top Localities & Cities"}</span>
              <span className="text-[10px] font-normal text-slate-400">Delhi NCR & India</span>
            </div>
            <div className="py-1">
              {locHits.map((hit, idx) => {
                const isActive = idx === locActiveIdx;
                return (
                  <button
                    key={`${hit.label}-${idx}`}
                    type="button"
                    onMouseEnter={() => setLocActiveIdx(idx)}
                    onClick={() => handleSelectLocation(hit)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer ${
                      isActive ? "bg-emerald-50 text-[#0F2540]" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin size={14} className="text-[#16A34A] shrink-0" />
                      <div className="truncate font-bold text-[#0F2540]">
                        <Highlight text={hit.label} query={locInput} />
                      </div>
                    </div>
                    {hit.meta && (
                      <span className="shrink-0 text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                        {hit.meta}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </FloatingMenu>
        </div>

        {/* 3. Teaching Mode Selector */}
        <div className="flex items-center gap-2.5 px-3 py-2 w-full md:w-52">
          <Monitor size={18} className="text-slate-400 shrink-0" />
          <select
            value={state.mode}
            onChange={(e) => {
              const val = e.target.value;
              onChange("mode", val);
              onSearch({ ...state, mode: val });
            }}
            className="w-full text-xs sm:text-sm font-semibold text-[#0F2540] outline-none bg-transparent cursor-pointer"
          >
            <option value="EITHER">Home & Online</option>
            <option value="OFFLINE">Home Tuition Only</option>
            <option value="ONLINE">Online Classes Only</option>
          </select>
        </div>

        {/* 4. Search Button */}
        <button
          type="submit"
          className="w-full md:w-auto px-7 py-2.5 rounded-xl bg-[#E08A3C] hover:bg-[#C9772F] text-white font-extrabold text-xs sm:text-sm shadow-xs transition-all shrink-0 cursor-pointer"
        >
          Search
        </button>
      </form>
    </div>
  );
}
