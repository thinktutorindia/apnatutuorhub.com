import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  MapPin,
  ShieldCheck,
  Star,
  ThumbsDown,
  ThumbsUp,
  Users,
  Video,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { haversineDistanceKm } from "@/lib/haversine";
import { calculateRankingScore } from "@/lib/ranking-score";
import { loadMatchingWeights } from "@/lib/matching-config";
import {
  shortlistApplicantAction,
  rejectApplicantAction,
} from "@/app/actions/leads.actions";
import { LEAD_STATUS_META } from "@/lib/validations";
import BookApplicantButtons from "@/components/booking/BookApplicantButtons";

export const metadata = {
  title: "Tutor Applicants | ThinkTutor",
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
      // Shortlisted first, then rejected last, then by ranking score
      if (a.isShortlisted && !b.isShortlisted) return -1;
      if (!a.isShortlisted && b.isShortlisted) return 1;
      if (a.isRejected && !b.isRejected) return 1;
      if (!a.isRejected && b.isRejected) return -1;
      return b.rankingScore - a.rankingScore;
    });

  const statusMeta =
    LEAD_STATUS_META[lead.status as keyof typeof LEAD_STATUS_META];

  return (
    <div className="space-y-6 py-4">
      <Link
        href="/parent/my-leads"
        className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-600 hover:text-[#22C55E]"
      >
        <ArrowLeft size={15} />
        Back to my requirements
      </Link>

      {/* Header */}
      <header className="neu-card flex flex-col gap-3 bg-[#FEF3C7] p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <div className="neu-badge bg-white text-[#0F172A]">
            <Users size={14} />
            Applicants
          </div>
          {statusMeta && (
            <span
              className="neu-badge text-[11px]"
              style={{ backgroundColor: statusMeta.background }}
            >
              {statusMeta.label}
            </span>
          )}
          <span className="neu-badge bg-[#DCFCE7] text-[11px]">
            {lead.classLevel}
          </span>
        </div>
        <h1 className="text-3xl font-black text-[#0F172A] md:text-4xl">
          {lead.subjects.join(", ")}
        </h1>
        <p className="text-sm font-semibold text-slate-700">
          {lead.purchaseCount} tutor{lead.purchaseCount !== 1 ? "s" : ""}{" "}
          unlocked this requirement · sorted by matching score
        </p>
      </header>

      {/* Empty state */}
      {ranked.length === 0 && (
        <div className="neu-card space-y-3 bg-white p-12 text-center">
          <Users size={36} className="mx-auto text-slate-300" />
          <p className="text-lg font-black text-[#0F172A]">
            No tutor applications yet
          </p>
          <p className="mx-auto max-w-md text-sm font-semibold text-slate-600">
            Verified tutors matching your requirement are being notified.
            Applications typically arrive within a few hours.
          </p>
        </div>
      )}

      {/* Applicant cards */}
      <div className="space-y-4">
        {ranked.map((applicant) => {
          const tutor = applicant.tutorProfile;
          const phoneClean = tutor.user.phone
            ? tutor.user.phone.replace(/[^0-9]/g, "")
            : "";

          return (
            <div
              key={applicant.id}
              className={`neu-card space-y-4 bg-white p-5 ${
                applicant.isRejected ? "opacity-50" : ""
              } ${applicant.isShortlisted ? "border-[3px] border-[#22C55E]" : ""}`}
            >
              {/* Tutor header */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-[#0F172A] bg-[#F3E8FF] text-2xl shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
                    🧑‍🏫
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-[#0F172A]">
                        {tutor.user.name ?? "Tutor"}
                      </p>
                      {tutor.isVerified && (
                        <span className="neu-badge bg-[#DCFCE7] text-[10px]">
                          <ShieldCheck size={10} className="text-[#22C55E]" />
                          Verified
                        </span>
                      )}
                      {applicant.isShortlisted && (
                        <span className="neu-badge bg-[#DCFCE7] text-[10px] text-[#22C55E]">
                          ★ Shortlisted
                        </span>
                      )}
                      {applicant.isRejected && (
                        <span className="neu-badge bg-[#FCE7F3] text-[10px] text-[#EC4899]">
                          ✗ Rejected
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-600">
                      {tutor.qualification} · {tutor.experience ?? 0} yrs exp
                    </p>
                  </div>
                </div>

                {/* Ranking score */}
                <div className="flex items-center gap-1.5 rounded-xl border-2 border-[#0F172A] bg-[#FEF3C7] px-3 py-1.5 text-sm font-black">
                  🎯 {applicant.rankingScore} pts
                </div>
              </div>

              {/* Direct Contact Box for Parent */}
              <div className="rounded-2xl border-2 border-[#0F172A] bg-[#E0F2FE] p-4 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-500">
                      Direct Tutor Contact
                    </span>
                    <p className="text-sm font-black text-[#0F172A]">
                      {tutor.user.phone || tutor.user.email}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {tutor.user.phone && (
                      <>
                        <a
                          href={`tel:${tutor.user.phone}`}
                          className="neu-btn neu-btn-primary px-3 py-1 text-xs"
                        >
                          📞 Call Tutor
                        </a>
                        <a
                          href={`https://wa.me/91${phoneClean}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="neu-btn bg-[#25D366] text-xs text-white"
                        >
                          💬 WhatsApp
                        </a>
                      </>
                    )}
                    <a
                      href={`mailto:${tutor.user.email}`}
                      className="neu-btn neu-btn-white px-3 py-1 text-xs"
                    >
                      ✉️ Email
                    </a>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
                {tutor.averageRating > 0 && (
                  <span className="flex items-center gap-1">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    {tutor.averageRating.toFixed(1)} ({tutor.totalReviews} reviews)
                  </span>
                )}
                {applicant.distanceKm !== null && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} />
                    {applicant.distanceKm} km away
                  </span>
                )}
                {tutor.city && (
                  <span className="flex items-center gap-1">
                    📍 {tutor.city}
                  </span>
                )}
                {(tutor.feeMin || tutor.feeMax) && (
                  <span>
                    Fee Range: ₹{tutor.feeMin}–₹{tutor.feeMax}/hr
                  </span>
                )}
                {applicant.feeQuote && (
                  <span className="font-extrabold text-[#22C55E]">
                    Quoted Fee: ₹{applicant.feeQuote}/hr
                  </span>
                )}
                {tutor.introVideoUrl && (
                  <a
                    href={tutor.introVideoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-extrabold text-blue-500 hover:underline"
                  >
                    <Video size={12} />
                    Intro Video
                  </a>
                )}
              </div>

              {/* Subjects & class levels */}
              <div className="flex flex-wrap gap-1.5">
                {tutor.subjects.slice(0, 8).map((s) => (
                  <span
                    key={s}
                    className="rounded-full border-[2px] border-[#0F172A] bg-[#DCFCE7] px-2.5 py-0.5 text-[10px] font-extrabold"
                  >
                    {s}
                  </span>
                ))}
              </div>

              {/* Proposal note */}
              {applicant.proposalNote && (
                <blockquote className="rounded-xl border-l-4 border-[#22C55E] bg-[#F0FDF4] p-3 text-xs font-semibold italic text-slate-700">
                  &quot;{applicant.proposalNote}&quot;
                </blockquote>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 border-t-2 border-[#E2E8F0] pt-3">
                <Link
                  href={`/tutor/${tutor.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="neu-btn neu-btn-white px-4 py-2 text-xs"
                >
                  <BookOpen size={13} />
                  View Profile
                </Link>

                {/* Shortlist toggle */}
                <form
                  action={async () => {
                    "use server";
                    await shortlistApplicantAction(applicant.id);
                  }}
                >
                  <button
                    type="submit"
                    className={`neu-btn px-4 py-2 text-xs ${
                      applicant.isShortlisted
                        ? "neu-btn-primary"
                        : "neu-btn-white"
                    }`}
                  >
                    <ThumbsUp size={13} />
                    {applicant.isShortlisted ? "Shortlisted ★" : "Shortlist"}
                  </button>
                </form>

                {/* Reject toggle */}
                {!applicant.isShortlisted && (
                  <form
                    action={async () => {
                      "use server";
                      await rejectApplicantAction(applicant.id);
                    }}
                  >
                    <button
                      type="submit"
                      className={`neu-btn px-4 py-2 text-xs ${
                        applicant.isRejected
                          ? "bg-[#FCE7F3] text-[#EC4899]"
                          : "neu-btn-white"
                      }`}
                    >
                      <ThumbsDown size={13} />
                      {applicant.isRejected ? "Rejected" : "Reject"}
                    </button>
                  </form>
                )}

                {/* Book buttons — Schedule Trial (any) / Hire (shortlisted) */}
                {!applicant.isRejected && (
                  <BookApplicantButtons
                    purchaseId={applicant.id}
                    leadId={lead.id}
                    tutorProfileId={tutor.id}
                    tutorName={tutor.user.name ?? "Tutor"}
                    subject={lead.subjects.join(", ")}
                    classLevel={lead.classLevel}
                    isShortlisted={applicant.isShortlisted}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
