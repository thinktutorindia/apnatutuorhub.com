"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  ShieldCheck, Star, MapPin, Calendar, Clock, Phone,
  MessageCircle, ExternalLink, Sparkles, CheckCircle2,
  Coins, ArrowRight, BookOpen, GraduationCap, Eye,
  Send, User, Award, Check
} from "lucide-react";
import type { Lead } from "./MyStaffLeadsClient";
import { getStaffRecordType } from "@/lib/staff-lead-type";
import {
  promoteLeadToProfileAction,
  promoteLeadToStudentRequirementAction
} from "@/app/actions/staff-leads.actions";

interface Props {
  lead: Lead;
  onLeadPromoted?: (updated: Partial<Lead>) => void;
}

export function StaffLeadLivePreview({ lead, onLeadPromoted }: Props) {
  const isParent = getStaffRecordType(lead.staffNotes) === "PARENT";
  const [isPending, startTransition] = useTransition();
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const cleanPhone = lead.phone ? lead.phone.replace(/\D/g, "").slice(-10) : "";

  const handlePromoteTutor = () => {
    startTransition(async () => {
      const res = await promoteLeadToProfileAction(lead.id);
      if (res.success && res.data) {
        onLeadPromoted?.({
          isPromoted: true,
          promotedTutorProfileId: res.data.tutorProfileId,
          status: "CONVERTED",
        });
        setToastMsg("Tutor profile created & published to live directory!");
        setTimeout(() => setToastMsg(null), 4000);
      } else {
        alert(res.error || "Failed to promote tutor");
      }
    });
  };

  const handlePublishRequirement = () => {
    startTransition(async () => {
      const res = await promoteLeadToStudentRequirementAction(lead.id);
      if (res.success && res.data) {
        onLeadPromoted?.({
          isPromoted: true,
          status: "CONVERTED",
        });
        setToastMsg(`Student enquiry #${res.data.inquiryNumber} published live to tutors!`);
        setTimeout(() => setToastMsg(null), 4000);
      } else {
        alert(res.error || "Failed to publish requirement");
      }
    });
  };

  return (
    <div className="space-y-4 text-slate-900">
      {/* Toast */}
      {toastMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Live Preview Mode Banner */}
      <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-emerald-600" />
          <span className="font-extrabold text-[#0F2540]">
            {isParent ? "Live Tutor-Facing Preview" : "Live Parent-Facing Preview"}
          </span>
          <span className="text-[10px] text-slate-500 font-semibold">
            {isParent
              ? "(How 14,000+ registered tutors see this tuition post)"
              : "(How parents browsing tutors see this verified profile)"}
          </span>
        </div>

        {/* Live Status Badge */}
        {lead.isPromoted ? (
          <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
            <Check size={11} /> Published &amp; Live
          </span>
        ) : (
          <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
            Unpublished Draft
          </span>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          CARD A: TUTOR PREVIEW (HOW PARENTS SEE THIS TEACHER)
         ───────────────────────────────────────────────────────────────── */}
      {!isParent && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5 relative overflow-hidden">
          {/* Top Verification Crest */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black text-xl flex items-center justify-center shadow-md shrink-0">
                {lead.name?.[0]?.toUpperCase() || "T"}
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-lg font-black text-[#0F2540]">
                    {lead.name || "Verified Home & Online Tutor"}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <ShieldCheck size={11} className="text-emerald-600" />
                    Verified Credentials
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  {lead.qualification || "Qualified Graduate"} · {lead.experienceYears || 3}+ Years Teaching Experience
                </p>
              </div>
            </div>

            {/* Rating */}
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 text-amber-500 font-black text-sm">
                <Star size={14} className="fill-amber-400 text-amber-400" />
                <span>4.9</span>
                <span className="text-xs text-slate-400 font-semibold">(24 reviews)</span>
              </div>
              <span className="text-[10px] font-extrabold text-emerald-600">Top Rated Local Teacher</span>
            </div>
          </div>

          {/* Location & Subjects Badges */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold flex-wrap">
              <span className="inline-flex items-center gap-1 text-slate-700 font-bold bg-slate-100 px-2.5 py-1 rounded-xl">
                <MapPin size={12} className="text-emerald-600 shrink-0" />
                {lead.location || "Delhi / NCR Locality"}
              </span>
              <span className="text-slate-300">•</span>
              <span className="bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-xl border border-emerald-200">
                🏠 Home Tuition Available (Within 5 km)
              </span>
              <span className="bg-blue-50 text-blue-800 font-bold px-2.5 py-1 rounded-xl border border-blue-200">
                💻 1-on-1 Online Classes
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Subjects:</span>
              {lead.subjects.length > 0 ? (
                lead.subjects.map((sub) => (
                  <span
                    key={sub}
                    className="text-xs font-extrabold bg-[#0F2540]/5 text-[#0F2540] px-2.5 py-1 rounded-xl border border-[#0F2540]/10"
                  >
                    {sub}
                  </span>
                ))
              ) : (
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                  All Academic Subjects
                </span>
              )}
            </div>
          </div>

          {/* Pricing Strip & Action Buttons for Parents */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/70 p-4 rounded-2xl">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tuition Fee</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-[#0F2540]">₹500 - ₹800</span>
                <span className="text-xs text-slate-500 font-semibold">/ hour (or ~₹6,000/mo)</span>
              </div>
              <p className="text-[10px] text-emerald-700 font-bold mt-0.5">
                ✓ Free Demo Class Included · Pay after satisfaction
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-5 py-3 rounded-2xl bg-emerald-600 text-white font-black text-xs shadow-md flex items-center gap-1.5 pointer-events-none"
              >
                <Calendar size={14} />
                <span>Book Free Demo Class</span>
              </button>
              <button
                type="button"
                className="px-4 py-3 rounded-2xl bg-white border border-emerald-300 text-emerald-800 font-black text-xs flex items-center gap-1.5 pointer-events-none"
              >
                <MessageCircle size={14} />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Admin / Staff Publication Control */}
          <div className="pt-2 flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="text-slate-500 font-medium">
              Publishing adds this teacher to the public search directory.
            </span>
            {lead.isPromoted ? (
              <div className="flex items-center gap-2">
                <span className="text-emerald-700 font-bold">✓ Active Live Profile</span>
                <Link
                  href={`/tutors/${lead.promotedTutorProfileId || ""}`}
                  target="_blank"
                  className="px-3 py-1.5 rounded-xl bg-[#0F2540] text-white font-extrabold flex items-center gap-1 hover:bg-slate-800"
                >
                  <ExternalLink size={12} /> Open Live Page
                </Link>
              </div>
            ) : (
              <button
                type="button"
                disabled={isPending}
                onClick={handlePromoteTutor}
                className="px-4 py-2 rounded-xl bg-[#0F2540] hover:bg-slate-800 text-white font-black shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles size={13} className="text-emerald-400" />
                <span>{isPending ? "Publishing..." : "🚀 Publish Tutor to Live Directory"}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          CARD B: STUDENT LEAD PREVIEW (HOW TUTORS SEE THIS ENQUIRY)
         ───────────────────────────────────────────────────────────────── */}
      {isParent && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5 relative overflow-hidden">
          {/* Top Distance & Class Badge */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                  📍 Within 5 km Radius (1.8 km from tutor)
                </span>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                  {lead.classes[0] || "Class 9-10"} ({lead.board || "CBSE"})
                </span>
              </div>
              <h3 className="text-lg font-black text-[#0F2540] mt-1.5">
                {lead.subjects.join(", ") || "General Academic Subjects"} Tuition Required
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Student: {lead.name || "Student"} · Locality: {lead.location || "Delhi / NCR"}
              </p>
            </div>

            {/* Budget */}
            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Parent Budget</span>
              <p className="text-xl font-black text-emerald-700">₹6,000 - ₹10,000</p>
              <span className="text-[10px] text-slate-500 font-semibold">per month</span>
            </div>
          </div>

          {/* Mode & Schedule Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Teaching Mode</span>
              <p className="text-xs font-black text-slate-800">🏠 Home Tuition Offline</p>
              <p className="text-[10px] text-slate-500">Tutor visits student&apos;s home</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Timing Preference</span>
              <p className="text-xs font-black text-slate-800">Evening (5:00 PM - 7:00 PM)</p>
              <p className="text-[10px] text-slate-500">3 to 5 classes per week</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Tutor Preference</span>
              <p className="text-xs font-black text-slate-800">Any Experienced Teacher</p>
              <p className="text-[10px] text-slate-500">Free demo trial requested</p>
            </div>
          </div>

          {/* Tutor Unlock Action Bar (Exact Tutor-Facing View) */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                <Coins size={15} className="text-amber-600" />
                <span>Student Phone Number Locked</span>
              </span>
              <p className="text-[11px] text-amber-800/80 font-medium">
                Verified teachers spend 5 coins to reveal direct parent phone &amp; address. Max 5 tutors.
              </p>
            </div>

            <button
              type="button"
              className="px-5 py-3 rounded-2xl bg-amber-500 text-slate-950 font-black text-xs shadow-sm flex items-center justify-center gap-2 pointer-events-none"
            >
              <Coins size={15} />
              <span>Unlock Student Contact (5 Coins)</span>
            </button>
          </div>

          {/* Admin / Staff Publication Control */}
          <div className="pt-2 flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="text-slate-500 font-medium">
              Publishing broadcasts this enquiry to matching verified tutors within 5 km.
            </span>
            {lead.isPromoted ? (
              <div className="flex items-center gap-2">
                <span className="text-emerald-700 font-bold">✓ Live on Tuition Board</span>
                <Link
                  href="/admin/leads"
                  target="_blank"
                  className="px-3 py-1.5 rounded-xl bg-[#0F2540] text-white font-extrabold flex items-center gap-1 hover:bg-slate-800"
                >
                  <ExternalLink size={12} /> Open in Student Leads Feed
                </Link>
              </div>
            ) : (
              <button
                type="button"
                disabled={isPending}
                onClick={handlePublishRequirement}
                className="px-4 py-2 rounded-xl bg-[#0F2540] hover:bg-slate-800 text-white font-black shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles size={13} className="text-amber-400" />
                <span>{isPending ? "Publishing..." : "🚀 Publish to Student Leads Board"}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
