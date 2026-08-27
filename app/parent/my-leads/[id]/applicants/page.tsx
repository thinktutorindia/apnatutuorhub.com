import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { haversineDistanceKm } from "@/lib/haversine";
import { calculateRankingScore } from "@/lib/ranking-score";
import { loadMatchingWeights } from "@/lib/matching-config";
import BookApplicantButtons from "@/components/booking/BookApplicantButtons";
import { StartChatButton } from "@/components/chat/StartChatButton";
import { ApplicantDecisionButtons } from "@/components/parent/ApplicantDecisionButtons";

export const metadata = {
  title: "Tutor Applicants | ApnaTutorHub",
};

export default async function ApplicantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [session, { id }] = await Promise.all([auth(), params]);

  if (!session?.user?.id) redirect("/login");

  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, latitude: true, longitude: true },
  });

  if (!parentProfile) redirect("/parent/dashboard");

  const lead = await prisma.lead.findFirst({
    where: { id, parentProfileId: parentProfile.id },
    select: {
      id: true,
      subjects: true,
      classLevel: true,
      mode: true,
      status: true,
      coinCost: true,
      purchaseCount: true,
      latitude: true,
      longitude: true,
      purchases: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          coinsSpent: true,
          proposalNote: true,
          feeQuote: true,
          isShortlisted: true,
          isRejected: true,
          isHired: true,
          createdAt: true,
          tutorProfile: {
            select: {
              id: true,
              bio: true,
              qualification: true,
              experience: true,
              subjects: true,
              classLevels: true,
              teachingMode: true,
              teachingRadius: true,
              feeMin: true,
              feeMax: true,
              latitude: true,
              longitude: true,
              city: true,
              kycStatus: true,
              isVerified: true,
              profileScore: true,
              averageRating: true,
              totalReviews: true,
              introVideoUrl: true,
              user: { select: { name: true, email: true, phone: true } },
              userId: true,
            },
          },
        },
      },
    },
  });

  if (!lead) notFound();

  const weights = await loadMatchingWeights();

  type RankedApplicant = (typeof lead.purchases)[number] & {
    distanceKm: number | null;
    rankingScore: number;
  };

  const ranked: RankedApplicant[] = lead.purchases
    .map((purchase) => {
      const tutor = purchase.tutorProfile;
      let distanceKm: number | null = null;

      if (
        parentProfile.latitude !== null &&
        parentProfile.longitude !== null &&
        tutor.latitude !== null &&
        tutor.longitude !== null
      ) {
        distanceKm =
          Math.round(
            haversineDistanceKm(
              parentProfile.latitude,
              parentProfile.longitude,
              tutor.latitude,
              tutor.longitude
            ) * 10
          ) / 10;
      }

      const scoreBreakdown = calculateRankingScore(
        { ...tutor, distanceKm },
        weights
      );

      return { ...purchase, distanceKm, rankingScore: scoreBreakdown.total };
    })
    .sort((a, b) => {
      if (a.isShortlisted && !b.isShortlisted) return -1;
      if (!a.isShortlisted && b.isShortlisted) return 1;
      if (a.isRejected && !b.isRejected) return 1;
      if (!a.isRejected && b.isRejected) return -1;
      return b.rankingScore - a.rankingScore;
    });

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <Link
            href="/parent/my-leads"
            className="inline-flex items-center gap-1 text-xs font-800 text-[#2D9E6B] hover:underline mb-1"
          >
            <ArrowLeft size={14} />
            <span>Back to My Requirements</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-800 text-[#0F2540] break-words" style={{ fontFamily: "Poppins, sans-serif" }}>
            Tutor Applicants for {lead.subjects.join(", ")}
          </h1>
          <p className="text-xs text-slate-600 font-600">
            {lead.classLevel} · {lead.mode} · {ranked.length} Tutors Responded
          </p>
        </div>
      </div>

      {/* Applicant Cards List */}
      {ranked.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl py-20 bg-white border border-slate-200 text-center shadow-xs">
          <Users size={44} className="text-slate-400" />
          <h3 className="text-base font-800 text-[#0F2540]">No tutor responses received yet</h3>
          <p className="text-xs font-600 text-slate-600 max-w-sm">
            Tutor applications will appear here as tutors in your area unlock your tuition post.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {ranked.map((applicant) => {
            const tutor = applicant.tutorProfile;
            return (
              <div
                key={applicant.id}
                className="overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4 p-6"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0F2540] to-[#1E3A5F] text-white font-800 text-base flex items-center justify-center shrink-0 shadow-2xs">
                      {(tutor.user.name || tutor.user.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-800 text-base text-[#0F2540] min-w-0 break-words">
                          <Link href={`/tutor/${tutor.id}`} className="hover:text-[#2D9E6B] hover:underline">
                            {tutor.user.name || "Verified Tutor"}
                          </Link>
                        </h3>
                        {tutor.isVerified && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-800 bg-emerald-100 text-emerald-950 border border-emerald-300 flex items-center gap-1">
                            <ShieldCheck size={12} />
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-600 text-slate-600">
                        {tutor.qualification || "Qualified Educator"} · {tutor.experience ?? 0} Years Exp
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-800">
                    <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-3 py-1.5 rounded-2xl border border-amber-200">
                      <Star size={14} className="fill-amber-400 text-amber-400" />
                      <span>{tutor.averageRating.toFixed(1)} ({tutor.totalReviews})</span>
                    </div>
                    {applicant.distanceKm !== null && (
                      <div className="flex items-center gap-1 text-[#2D9E6B] bg-emerald-50 px-3 py-1.5 rounded-2xl border border-emerald-200">
                        <MapPin size={14} />
                        <span>{applicant.distanceKm} km away</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Proposal & Quote */}
                {applicant.proposalNote && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-600 text-slate-800 space-y-1">
                    <span className="text-[10px] font-800 uppercase text-slate-900">Tutor Proposal Note:</span>
                    <p className="font-700 text-slate-900">&quot;{applicant.proposalNote}&quot;</p>
                  </div>
                )}

                {/* Tutor Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="text-xs font-800 text-[#0F2540]">
                    Fee Quote: ₹{applicant.feeQuote || tutor.feeMin || "As agreed"}/mo
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <ApplicantDecisionButtons
                      purchaseId={applicant.id}
                      isShortlisted={applicant.isShortlisted}
                      isRejected={applicant.isRejected}
                    />
                    {!applicant.isRejected && (
                      <>
                        <StartChatButton
                          targetProfileId={tutor.id}
                          leadId={lead.id}
                          role="PARENT"
                          className="px-4 py-2 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-800 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                          buttonText="In-App Chat"
                        />
                        <BookApplicantButtons
                          purchaseId={applicant.id}
                          leadId={lead.id}
                          tutorProfileId={tutor.id}
                          tutorName={tutor.user.name || "Tutor"}
                          subject={lead.subjects.join(", ")}
                          classLevel={lead.classLevel}
                          isShortlisted={applicant.isShortlisted}
                          feeLabel="Agreed Fee per Month"
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
