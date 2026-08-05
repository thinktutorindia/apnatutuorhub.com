"use client";

import Link from "next/link";
import { Star, MapPin, ShieldCheck, Award } from "lucide-react";
import type { SearchHit, TutorSearchDoc, LeadSearchDoc } from "@/lib/search/types";

type Props = {
  tutorHits?: SearchHit<TutorSearchDoc>[];
  leadHits?: SearchHit<LeadSearchDoc>[];
  processingTimeMs?: number;
  engine?: string;
};

export function SearchResults({
  tutorHits,
  leadHits,
  processingTimeMs,
  engine,
}: Props) {
  return (
    <div className="space-y-4">
      {processingTimeMs !== undefined && (
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
          <span>
            Found {tutorHits?.length ?? leadHits?.length ?? 0} matches ({processingTimeMs}ms)
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">
            Powered by {engine ?? "Search Engine"}
          </span>
        </div>
      )}

      {/* Tutor Search Hits */}
      {tutorHits && tutorHits.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {tutorHits.map(({ document: t, distanceKm, highlights }) => (
            <div
              key={t.id}
              className="neu-card flex flex-col justify-between bg-white p-5 space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-black text-[#0F172A] text-base flex items-center gap-1.5">
                      <span dangerouslySetInnerHTML={{ __html: highlights?.name ?? t.name }} />
                      {t.isVerified && (
                        <span title="Verified Tutor">
                          <ShieldCheck size={16} className="text-[#22C55E] shrink-0" />
                        </span>
                      )}
                      {t.isFeatured && (
                        <span title="Featured Tutor">
                          <Award size={16} className="text-[#F59E0B] shrink-0" />
                        </span>
                      )}
                    </h3>
                    <p className="text-xs font-bold text-slate-500">{t.qualification}</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-xl bg-[#FEF3C7] border border-[#0F172A] px-2 py-1 text-xs font-black text-[#0F172A]">
                    <Star size={12} className="fill-[#F59E0B] text-[#F59E0B]" />
                    <span>{t.rating.toFixed(1)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {t.subjects.map((sub) => (
                    <span
                      key={sub}
                      className="rounded-lg border border-[#0F172A] bg-[#DCFCE7] px-2 py-0.5 text-[10px] font-bold text-[#0F172A]"
                    >
                      {sub}
                    </span>
                  ))}
                </div>

                <p className="text-xs font-semibold text-slate-600 line-clamp-2">{t.bio}</p>
              </div>

              <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-1 text-slate-500">
                  <MapPin size={13} />
                  <span>{t.city} {distanceKm ? `(${distanceKm.toFixed(1)} km)` : ""}</span>
                </div>
                <Link
                  href={`/tutors/${t.id}`}
                  className="neu-btn neu-btn-primary px-3 py-1.5 text-xs"
                >
                  View Profile →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lead Search Hits */}
      {leadHits && leadHits.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {leadHits.map(({ document: l, distanceKm }) => (
            <div
              key={l.id}
              className="neu-card flex flex-col justify-between bg-white p-5 space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="neu-badge bg-[#E0F2FE] text-[#0F172A] text-[10px]">
                    {l.classLevel}
                  </span>
                  <span className="text-xs font-black text-[#22C55E]">
                    ₹{l.budgetMin} - ₹{l.budgetMax} / hr
                  </span>
                </div>

                <h3 className="font-black text-[#0F172A] text-sm">
                  {l.subjects.join(", ")}
                </h3>

                <p className="text-xs font-semibold text-slate-600 line-clamp-2">{l.notes}</p>
              </div>

              <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-1 text-slate-500">
                  <MapPin size={13} />
                  <span>{l.area ? `${l.area}, ${l.city}` : l.city} {distanceKm ? `(${distanceKm.toFixed(1)} km)` : ""}</span>
                </div>
                <Link
                  href={`/tutor/leads`}
                  className="neu-btn neu-btn-primary px-3 py-1.5 text-xs"
                >
                  Unlock Lead →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {(!tutorHits || tutorHits.length === 0) && (!leadHits || leadHits.length === 0) && (
        <div className="neu-card bg-white p-12 text-center space-y-3">
          <p className="text-3xl">🔍</p>
          <p className="text-base font-black text-[#0F172A]">No matching results found</p>
          <p className="text-xs font-semibold text-slate-500 max-w-sm mx-auto">
            Try adjusting your search query, clearing filter selections, or searching for broader terms.
          </p>
        </div>
      )}
    </div>
  );
}
