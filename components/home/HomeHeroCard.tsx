"use client";

import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, Search } from "lucide-react";
import {
  ALL_STRUCTURED_CLASSES,
  getAllTaxonomySubjects,
  searchSmartSubjects,
  parseClassAndSubject,
} from "@/lib/subject-matcher";

interface HomeHeroCardProps {
  user: { role?: string } | null;
  dashboardUrl: string;
  isParent: boolean;
}

type SubjectHit = {
  name: string;
  lead: string;
  rest: string;
  category: string;
};

type LocHit = {
  label: string;
  city: string;
  meta?: string;
};

const POPULAR_SUBJECTS: SubjectHit[] = [
  { name: "Mathematics", lead: "Mathematics", rest: "in Class 6–12 Tuition", category: "Most searched" },
  { name: "Physics", lead: "Physics", rest: "in Class 11–12 Tuition", category: "Science" },
  { name: "Chemistry", lead: "Chemistry", rest: "in Class 11–12 Tuition", category: "Science" },
  { name: "Biology", lead: "Biology", rest: "in NEET / Class 11–12", category: "Science" },
  { name: "English", lead: "English", rest: "in School Tuition", category: "Languages" },
  { name: "Class 1-5 All Subjects", lead: "All Subjects", rest: "in Class 1–5 Tuition", category: "School" },
  { name: "Class 9-10 Science & Math", lead: "Science & Maths", rest: "in Class 9–10 Tuition", category: "Board exams" },
  { name: "Class 11-12 Science", lead: "Science", rest: "in Class 11–12 Tuition", category: "Senior secondary" },
  { name: "NEET / IIT-JEE", lead: "NEET / IIT-JEE", rest: "in Entrance Coaching", category: "Entrance" },
  { name: "Coding / CS", lead: "Coding", rest: "in Computer Science", category: "Computer science" },
  { name: "Accountancy", lead: "Accountancy", rest: "in Class 11–12 Commerce", category: "Commerce" },
  { name: "Spoken English", lead: "Spoken English", rest: "in Language Classes", category: "Languages" },
];

const POPULAR_CITIES: LocHit[] = [
  { label: "Delhi", city: "Delhi", meta: "NCR" },
  { label: "Mumbai", city: "Mumbai", meta: "Maharashtra" },
  { label: "Bengaluru", city: "Bengaluru", meta: "Karnataka" },
  { label: "Hyderabad", city: "Hyderabad", meta: "Telangana" },
  { label: "Pune", city: "Pune", meta: "Maharashtra" },
  { label: "Gurugram", city: "Gurugram", meta: "Haryana" },
  { label: "Noida", city: "Noida", meta: "Uttar Pradesh" },
  { label: "Chennai", city: "Chennai", meta: "Tamil Nadu" },
  { label: "Kolkata", city: "Kolkata", meta: "West Bengal" },
  { label: "Jaipur", city: "Jaipur", meta: "Rajasthan" },
  { label: "Ahmedabad", city: "Ahmedabad", meta: "Gujarat" },
  { label: "Lucknow", city: "Lucknow", meta: "Uttar Pradesh" },
];

const LOCAL_PLACES: LocHit[] = [
  { label: "Sangam Vihar, New Delhi", city: "Delhi", meta: "Delhi" },
  { label: "Lajpat Nagar, New Delhi", city: "Delhi", meta: "Delhi" },
  { label: "Greater Kailash, New Delhi", city: "Delhi", meta: "Delhi" },
  { label: "Saket, New Delhi", city: "Delhi", meta: "Delhi" },
  { label: "Hauz Khas, New Delhi", city: "Delhi", meta: "Delhi" },
  { label: "Dwarka, New Delhi", city: "Delhi", meta: "Delhi" },
  { label: "Rohini, New Delhi", city: "Delhi", meta: "Delhi" },
  { label: "Janakpuri, New Delhi", city: "Delhi", meta: "Delhi" },
  { label: "Vasant Kunj, New Delhi", city: "Delhi", meta: "Delhi" },
  { label: "Mayur Vihar, New Delhi", city: "Delhi", meta: "Delhi" },
  { label: "Laxmi Nagar, New Delhi", city: "Delhi", meta: "Delhi" },
  { label: "Karol Bagh, New Delhi", city: "Delhi", meta: "Delhi" },
  { label: "Rajouri Garden, New Delhi", city: "Delhi", meta: "Delhi" },
  { label: "Koramangala, Bengaluru", city: "Bengaluru", meta: "Karnataka" },
  { label: "Whitefield, Bengaluru", city: "Bengaluru", meta: "Karnataka" },
  { label: "Andheri, Mumbai", city: "Mumbai", meta: "Maharashtra" },
  { label: "Bandra, Mumbai", city: "Mumbai", meta: "Maharashtra" },
  { label: "Sector 56, Gurugram", city: "Gurugram", meta: "Haryana" },
];

const ROMAN: Record<string, string> = {
  i: "1",
  ii: "2",
  iii: "3",
  iv: "4",
  v: "5",
  vi: "6",
  vii: "7",
  viii: "8",
  ix: "9",
  x: "10",
  xi: "11",
  xii: "12",
};

function levenshtein(a: string, b: string): number {
  const m: number[][] = [];
  for (let i = 0; i <= b.length; i++) m[i] = [i];
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      m[i][j] =
        b.charAt(i - 1).toLowerCase() === a.charAt(j - 1).toLowerCase()
          ? m[i - 1][j - 1]
          : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
    }
  }
  return m[b.length][a.length];
}

function nameMatchesQuery(name: string, query: string): boolean {
  const n = name.toLowerCase();
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (n.includes(q) || n.startsWith(q)) return true;
  const first = n.split(/\s+/)[0] ?? "";
  if (first.length >= 4 && q.length >= 4) {
    return levenshtein(first.slice(0, q.length + 2), q) <= 2;
  }
  return false;
}

function normalizeClassBit(raw: string): string {
  let s = raw.trim();
  s = s.replace(/\bclass\s+/i, "Class ");
  s = s.replace(/\b(xii|xi|x|ix|viii|vii|vi|iv|iii|ii|i)\b/gi, (m) => ROMAN[m.toLowerCase()] ?? m);
  s = s.replace(/\biitjee\b/i, "IIT-JEE");
  s = s.replace(/\bengineering entrance\b/i, "Engineering Entrance Coaching");
  s = s.replace(/\bmedical entrance\b/i, "Medical Entrance Coaching");
  if (!/tuition|coaching|class/i.test(s)) s = `${s} Tuition`;
  return s;
}

function formatSubjectLine(name: string, category: string): SubjectHit {
  const cleanedCategory = category.replace(/^.*?>\s*/, "").trim();
  const m = name.match(/^(.*?)\s+(?:for|upto)\s+(.*)$/i);
  if (m) {
    return {
      name,
      lead: m[1].trim(),
      rest: `in ${normalizeClassBit(m[2])}`,
      category: cleanedCategory,
    };
  }
  return {
    name,
    lead: name,
    rest: cleanedCategory && cleanedCategory.toLowerCase() !== name.toLowerCase() ? `in ${cleanedCategory}` : "",
    category: cleanedCategory,
  };
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent text-[#2D9E6B] font-800">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

function searchTaxonomyAndClasses(query: string): SubjectHit[] {
  const q = query.trim();
  if (!q) return POPULAR_SUBJECTS;

  const hits: SubjectHit[] = [];
  const seen = new Set<string>();

  const push = (name: string, category: string) => {
    if (seen.has(name.toLowerCase())) return;
    if (!nameMatchesQuery(name, q)) return;
    seen.add(name.toLowerCase());
    hits.push(formatSubjectLine(name, category));
  };

  for (const s of searchSmartSubjects(q, 16)) push(s.name, s.category);
  for (const cls of ALL_STRUCTURED_CLASSES) {
    if (`${cls.label} ${cls.sub}`.toLowerCase().includes(q.toLowerCase())) {
      push(cls.label, cls.sub);
    }
  }
  if (hits.length < 8) {
    for (const item of getAllTaxonomySubjects()) {
      if (hits.length >= 12) break;
      push(item.name, item.category);
    }
  }

  return hits.slice(0, 10);
}

function formatPhotonPlace(p: Record<string, string>): LocHit | null {
  const name = (p.name || "").trim();
  const city = (p.city || p.county || p.state_district || "").trim();
  const state = (p.state || "").trim();
  const parts: string[] = [];
  const pushPart = (value: string) => {
    if (!value || value.length < 2) return;
    if (parts.some((x) => x.toLowerCase() === value.toLowerCase())) return;
    parts.push(value);
  };
  pushPart(name);
  if (city.length > 2) pushPart(city);
  if (state.length > 2) pushPart(state);
  if (parts.length === 0) return null;
  return {
    label: parts.join(", "),
    city: city.length > 2 ? city : name || city,
    meta: state.length > 2 ? state : undefined,
  };
}

async function searchIndiaPlaces(query: string, signal: AbortSignal): Promise<LocHit[]> {
  const trimmed = query.trim();
  if (/^\d{6}$/.test(trimmed)) {
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${trimmed}`, { signal });
      if (!res.ok) return [];
      const data = await res.json();
      if (data?.[0]?.Status !== "Success") return [];
      return (data[0].PostOffice ?? []).slice(0, 6).map((po: { Name?: string; District?: string; State?: string }) => {
        const area = po.Name || "";
        const city = po.District || area;
        return {
          label: [area, city].filter(Boolean).join(", "),
          city,
          meta: po.State || undefined,
        };
      });
    } catch {
      return [];
    }
  }

  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&lang=en&limit=8&bbox=68.7,8.1,97.4,37.1`,
      { signal }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const hits: LocHit[] = [];
    const seen = new Set<string>();
    for (const feature of data.features ?? []) {
      const p = (feature.properties ?? {}) as Record<string, string>;
      const country = (p.country || "").toLowerCase();
      const code = (p.countrycode || "").toUpperCase();
      if (country && country !== "india" && code && code !== "IN") continue;
      const hit = formatPhotonPlace(p);
      if (!hit) continue;
      const key = hit.label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push(hit);
    }
    return hits.slice(0, 7);
  } catch {
    return [];
  }
}

function FloatingMenu({
  open,
  anchorRef,
  menuRef,
  labelledBy,
  children,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  menuRef: React.RefObject<HTMLDivElement | null>;
  labelledBy: string;
  children: React.ReactNode;
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
      setBox({
        top: Math.round(r.bottom + 4),
        left: Math.round(r.left),
        width: Math.round(r.width),
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorRef, children]);

  if (!mounted || !open || !box) return null;

  return createPortal(
    <div
      ref={menuRef}
      id={labelledBy}
      role="listbox"
      onMouseDown={(e) => {
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
      className="max-h-72 overflow-y-auto rounded-xl border border-white/80 bg-white py-1.5 shadow-[0_8px_12px_rgba(0,0,0,0.28),0_28px_64px_rgba(0,0,0,0.5)]"
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

  const subjectHits = useMemo(() => searchTaxonomyAndClasses(classSubject), [classSubject]);

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
    (rawClassSubject = classSubject, rawCity = cityParam || locality) => {
      const { subject, classLevel } = parseClassAndSubject(rawClassSubject);
      const city = (rawCity || "").trim();

      const params = new URLSearchParams();
      if (subject) params.set("subject", subject);
      if (classLevel) params.set("classLevel", classLevel);
      if (city) params.set("city", city);

      if (user && isParent) {
        router.push(`/parent/post-requirement?${params.toString()}`);
      } else if (user) {
        router.push(dashboardUrl);
      } else {
        router.push(`/find-tutor?${params.toString()}`);
      }
    },
    [classSubject, cityParam, locality, user, isParent, dashboardUrl, router]
  );

  const pickSubject = (name: string) => {
    setClassSubject(name);
    setOpenPanel(null);
    window.setTimeout(() => locationInputRef.current?.focus(), 0);
  };

  const pickLocation = (hit: LocHit) => {
    setLocality(hit.label);
    setCityParam(hit.city);
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
      pickSubject(subjectHits[activeIndex].name);
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

  const subjectEmpty = classSubject.trim().length === 0;
  const locationEmpty = locality.trim().length < 2;
  const lifted = openPanel !== null;

  return (
    <form
      ref={rootRef}
      onSubmit={handleSearch}
      className={`relative z-50 overflow-visible w-full max-w-full bg-white rounded-2xl p-2 sm:p-2.5 flex flex-col md:flex-row md:items-stretch gap-2 min-w-0 ${
        lifted
          ? "shadow-[0_16px_40px_rgba(10,25,47,0.28)]"
          : "shadow-[0_12px_32px_rgba(10,25,47,0.18)]"
      }`}
    >
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
            setOpenPanel("subject");
          }}
          onFocus={() => setOpenPanel("subject")}
          onKeyDown={onSubjectKeyDown}
          placeholder="Select Class / Subject"
          className="w-full min-h-12 md:min-h-14 px-3 sm:px-4 rounded-xl bg-white text-[15px] font-600 text-[#0F2540] placeholder:text-[#94A3B8] outline-none border border-[#E2E8F0] md:border-0 focus:border-[#2D9E6B] md:focus:border-transparent"
        />
        <FloatingMenu
          open={openPanel === "subject"}
          anchorRef={subjectInputRef}
          menuRef={subjectMenuRef}
          labelledBy={subjectListId}
        >
          <p className="px-3.5 pt-2 pb-1 text-[10px] font-800 uppercase tracking-wider text-[#94A3B8]">
            {subjectEmpty ? "Popular searches" : "Search results"}
          </p>
          {subjectHits.length === 0 ? (
            <p className="px-3.5 py-3 text-sm font-600 text-[#64748B]">No matching subjects. Try Maths, NEET, or Class 10.</p>
          ) : (
            subjectHits.map((item, i) => (
              <button
                key={`${item.name}-${item.category}`}
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => pickSubject(item.name)}
                className={`flex w-full flex-col items-start gap-0.5 px-3.5 py-2.5 text-left ${
                  i === activeIndex ? "bg-[#E8F7F0]" : "bg-white hover:bg-[#F8FAFC]"
                }`}
              >
                <span className="text-[15px] font-700 text-[#0F2540] leading-snug">
                  <Highlight text={item.lead} query={classSubject} />
                  {item.rest ? (
                    <span className="font-500 text-[#64748B]"> {item.rest}</span>
                  ) : null}
                </span>
              </button>
            ))
          )}
        </FloatingMenu>
      </div>

      <div className="hidden md:block w-px bg-[#E2E8F0] my-2 shrink-0" />

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
          placeholder="Enter Locality / City"
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
        >
          <p className="px-3.5 pt-2 pb-1 text-[10px] font-800 uppercase tracking-wider text-[#94A3B8]">
            {locationEmpty ? "Popular cities" : "Search results"}
          </p>
          {locationHits.length === 0 && !locLoading ? (
            <p className="px-3.5 py-3 text-sm font-600 text-[#64748B]">No matching places. Try your city or pincode.</p>
          ) : (
            locationHits.map((hit, i) => (
              <button
                key={`${hit.label}-${i}`}
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => pickLocation(hit)}
                className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left ${
                  i === activeIndex ? "bg-[#E8F7F0]" : "bg-white hover:bg-[#F8FAFC]"
                }`}
              >
                <span className="inline-flex min-w-0 items-center gap-2 text-[15px] font-700 text-[#0F2540] leading-snug">
                  <MapPin size={14} className="shrink-0 text-[#2D9E6B]" />
                  <span className="min-w-0 whitespace-normal">
                    <Highlight text={hit.label} query={locality} />
                  </span>
                </span>
                {hit.meta && <span className="shrink-0 text-[12px] font-600 text-[#64748B]">{hit.meta}</span>}
              </button>
            ))
          )}
        </FloatingMenu>
      </div>

      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 min-h-12 md:min-h-14 px-5 w-full md:w-auto rounded-xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-[15px] font-800 shadow-[0_8px_22px_rgba(45,158,107,0.4)] shrink-0"
      >
        <Search size={18} />
        Search Tutors
      </button>
    </form>
  );
}
