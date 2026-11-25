"use client";

import React from "react";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { useSeniorTutor } from "@/components/tutor/SeniorTutorContext";
import BookingCard from "@/components/booking/BookingCard";
import { RequestLeadRefundButton } from "@/components/tutor/RequestLeadRefundButton";
import type { ExistingReview } from "@/app/actions/review.actions";

interface BookingItem {
  id: string;
  subject: string;
  classLevel: string;
  mode: string;
  status: string;
  isTrial: boolean;
  startDate: string | null;
  classFrequency: string | null;
  agreedFee: number | null;
  meetLink: string | null;
  venueAddress: string | null;
  cancelReason: string | null;
  completedAt: string | null;
  parentName: string | null;
  tutorName: string | null;
  leadId: string | null;
}

interface Props {
  tab: string;
  counts: {
    ALL: number;
    ACTIVE: number;
    COMPLETED: number;
    CANCELLED: number;
  };
  pendingCount: number;
  displayedBookings: BookingItem[];
  reviewMapObj: Record<string, ExistingReview>;
  purchaseByLead: Record<
    string,
    { purchaseId: string; purchasedAt: string; coinsSpent: number }
  >;
}

export function TutorBookingsClient({
  tab,
  counts,
  pendingCount,
  displayedBookings,
  reviewMapObj,
  purchaseByLead,
}: Props) {
  const { lang, t } = useSeniorTutor();

  const statusTabs = [
    { key: "ALL", label: t("tabAllClasses") },
    { key: "ACTIVE", label: t("tabUpcoming") },
    { key: "COMPLETED", label: t("tabCompleted") },
    { key: "CANCELLED", label: t("tabCancelled") },
  ];

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 sm:p-6 bg-white rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              {t("bookingsBadge")}
            </span>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                ⚡ {pendingCount} {lang === "hi" ? "नए अनुरोध प्रतीक्षारत" : `Pending Request${pendingCount > 1 ? "s" : ""}`}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {t("bookingsTitle")}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {t("bookingsSub")}
          </p>
        </div>

        <Link
          href="/tutor/leads"
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shrink-0 inline-flex items-center gap-1.5 transition-colors"
        >
          <span>{t("findMoreStudentsBtn")}</span>
        </Link>
      </div>

      {/* Status Filter Tabs */}
      <div className="p-1 rounded-2xl bg-slate-100 border border-slate-200 inline-flex flex-wrap gap-1">
        {statusTabs.map((st) => {
          const count = counts[st.key as keyof typeof counts];
          const isActive = tab === st.key;
          return (
            <Link
              key={st.key}
              href={`/tutor/bookings?tab=${st.key}`}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? "bg-white text-slate-900 shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {st.label} {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
            </Link>
          );
        })}
      </div>

      {/* Booking list container */}
      {displayedBookings.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 sm:p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Calendar size={22} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">{t("noClassesTitle")}</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
              {t("noClassesSub")}
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/tutor/leads"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-xs"
            >
              {t("browseInquiriesBtn")}
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedBookings.map((booking) => {
            const purchase = booking.leadId
              ? purchaseByLead[booking.leadId]
              : undefined;
            return (
              <div key={booking.id} className="space-y-2">
                <BookingCard
                  booking={{
                    ...booking,
                    startDate: booking.startDate ? new Date(booking.startDate) : null,
                    completedAt: booking.completedAt
                      ? new Date(booking.completedAt)
                      : null,
                    leadId: booking.leadId || "",
                  }}
                  viewerRole="TUTOR"
                  hasReview={Boolean(reviewMapObj[booking.id])}
                  existingReview={reviewMapObj[booking.id] ?? null}
                />
                {purchase && (
                  <div className="flex justify-end">
                    <RequestLeadRefundButton
                      purchaseId={purchase.purchaseId}
                      purchasedAt={purchase.purchasedAt}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
