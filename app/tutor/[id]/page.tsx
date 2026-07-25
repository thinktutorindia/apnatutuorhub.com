import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  MapPin,
  ShieldCheck,
  Star,
  Video,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await prisma.tutorProfile.findUnique({
    where: { id },
    select: { user: { select: { name: true } } },
  });

  return {
    title: profile?.user.name
      ? `${profile.user.name} — Tutor | ThinkTutor`
      : "Tutor Profile | ThinkTutor",
  };
}

export default async function PublicTutorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const profile = await prisma.tutorProfile.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, image: true } },
      availability: { orderBy: { dayOfWeek: "asc" } },
      reviews: {
        where: { booking: { status: "COMPLETED" } },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          overallRating: true,
          teachingRating: true,
          communicationRating: true,
          punctualityRating: true,
          comment: true,
          createdAt: true,
        },
      },
    },
  });

  if (!profile || !profile.isVerified) {
    notFound();
  }

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const youtubeEmbedUrl = profile.introVideoUrl
    ? profile.introVideoUrl
        .replace("watch?v=", "embed/")
        .replace("youtu.be/", "youtube.com/embed/")
    : null;

  return (
    <div className="min-h-screen bg-[#FAF8F5] py-8">
      <div className="mx-auto max-w-3xl space-y-6 px-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-600 hover:text-[#22C55E]"
        >
          <ArrowLeft size={15} />
          Back to ThinkTutor
        </Link>

        {/* Hero */}
        <div className="neu-card flex flex-col gap-6 bg-[#DCFCE7] p-6 sm:flex-row sm:items-start sm:p-8">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-[2.5px] border-[#0F172A] bg-white text-4xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            🧑‍🏫
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-black text-[#0F172A]">
                {profile.user.name ?? "Tutor"}
              </h1>
              {profile.isVerified && (
                <span className="neu-badge bg-[#DCFCE7] text-[11px]">
                  <ShieldCheck size={12} className="text-[#22C55E]" />
                  Verified
                </span>
              )}
            </div>

            <p className="text-sm font-semibold text-slate-700">
              {profile.qualification} · {profile.experience ?? 0} yrs experience
            </p>

            <div className="flex flex-wrap gap-2">
              {profile.totalReviews > 0 && (
                <span className="neu-badge bg-[#FEF3C7] text-xs">
                  <Star size={12} className="text-amber-500" />
                  {profile.averageRating.toFixed(1)} ({profile.totalReviews}{" "}
                  reviews)
                </span>
              )}
              {profile.city && (
                <span className="neu-badge bg-white text-xs">
                  <MapPin size={12} />
                  {profile.city}
                </span>
              )}
              <span className="neu-badge bg-white text-xs">
                {profile.teachingMode}
              </span>
              {profile.feeMin && profile.feeMax && (
                <span className="neu-badge bg-white text-xs">
                  <Wallet size={12} />₹{profile.feeMin}–₹{profile.feeMax}/hr
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <section className="neu-card space-y-3 bg-white p-6">
            <h2 className="text-lg font-black text-[#0F172A]">About</h2>
            <p className="whitespace-pre-line text-sm font-semibold leading-relaxed text-slate-700">
              {profile.bio}
            </p>
          </section>
        )}

        {/* Intro Video */}
        {youtubeEmbedUrl && (
          <section className="neu-card space-y-3 bg-white p-6">
            <h2 className="flex items-center gap-2 text-lg font-black text-[#0F172A]">
              <Video size={18} />
              Intro Video
            </h2>
            <div className="aspect-video overflow-hidden rounded-2xl border-2 border-[#0F172A]">
              <iframe
                src={youtubeEmbedUrl}
                title="Tutor intro video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </section>
        )}

        {/* Subjects & Classes */}
        <section className="neu-card space-y-4 bg-white p-6">
          <h2 className="text-lg font-black text-[#0F172A]">What I Teach</h2>
          <div className="space-y-3">
            <div>
              <p className="mb-2 text-xs font-extrabold uppercase text-slate-500">
                Subjects
              </p>
              <div className="flex flex-wrap gap-1.5">
                {profile.subjects.map((subject) => (
                  <span key={subject} className="neu-badge bg-[#DCFCE7] text-xs">
                    {subject}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-extrabold uppercase text-slate-500">
                Class Levels
              </p>
              <div className="flex flex-wrap gap-1.5">
                {profile.classLevels.map((level) => (
                  <span key={level} className="neu-badge bg-[#E0F2FE] text-xs">
                    {level}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Availability */}
        {profile.availability.length > 0 && (
          <section className="neu-card space-y-3 bg-white p-6">
            <h2 className="text-lg font-black text-[#0F172A]">
              Weekly Availability
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.availability.map((slot) => (
                <div
                  key={slot.id}
                  className="rounded-xl border-2 border-[#0F172A] bg-[#FEF3C7] px-3 py-2 text-xs font-bold"
                >
                  {DAYS[slot.dayOfWeek]}: {slot.startTime}–{slot.endTime}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Reviews */}
        {profile.reviews.length > 0 && (
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-2xl font-black text-[#0F172A]">
              <Star size={20} className="text-amber-500" />
              Verified Reviews ({profile.reviews.length})
            </h2>
            <div className="space-y-4">
              {profile.reviews.map((review) => (
                <div key={review.id} className="neu-card space-y-3 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={
                            i < review.overallRating
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-200"
                          }
                        />
                      ))}
                    </div>
                    <span className="neu-badge bg-[#DCFCE7] text-[10px]">
                      <ShieldCheck size={10} />
                      Verified Student
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm font-semibold text-slate-700">
                      {review.comment}
                    </p>
                  )}
                  <p className="text-[11px] font-bold text-slate-400">
                    {new Date(review.createdAt).toLocaleDateString("en-IN", {
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="neu-card flex flex-col items-center gap-4 bg-[#E0F2FE] p-6 text-center">
          <BookOpen size={28} className="text-[#22C55E]" />
          <h2 className="text-xl font-black text-[#0F172A]">
            Interested in classes with {profile.user.name?.split(" ")[0]}?
          </h2>
          <p className="text-sm font-semibold text-slate-700">
            Post your tuition requirement on ThinkTutor and get matched with
            verified tutors like {profile.user.name?.split(" ")[0]}.
          </p>
          <Link
            href="/register"
            className="neu-btn neu-btn-primary px-8 py-3.5 text-sm"
          >
            Post a Requirement — It&apos;s Free
          </Link>
        </div>
      </div>
    </div>
  );
}
