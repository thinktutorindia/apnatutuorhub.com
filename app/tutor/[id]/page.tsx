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
      ? `${profile.user.name} — Tutor | ApnaTutorHub`
      : "Tutor Profile | ApnaTutorHub",
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
    <div className="min-h-screen py-8 px-4 sm:px-6" style={{ backgroundColor: "#F9FAFB" }}>
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-500 text-gray-500 hover:text-green-700 transition-colors"
        >
          <ArrowLeft size={15} />
          Back to ApnaTutorHub
        </Link>

        {/* Hero */}
        <div
          className="rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-5"
          style={{ backgroundColor: "#E8F5F0", border: "1px solid #cce9df" }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0 font-700"
            style={{ backgroundColor: "#FFFFFF", color: "#1A7F5A", border: "1px solid #E5E7EB" }}
          >
            {(profile.user.name?.[0] ?? "T").toUpperCase()}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-700 text-gray-900">
                {profile.user.name ?? "Tutor"}
              </h1>
              {profile.isVerified && (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-600"
                  style={{ backgroundColor: "#F0FDF4", color: "#16A34A" }}
                >
                  <ShieldCheck size={14} />
                  Verified Tutor
                </span>
              )}
              {profile.isFeatured && (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-600"
                  style={{ backgroundColor: "#FEF3C7", color: "#92400e" }}
                >
                  <Star size={12} className="fill-amber-500 text-amber-500" />
                  Featured
                </span>
              )}
            </div>

            <p className="text-sm text-gray-700">
              {profile.qualification} · {profile.experience ?? 0} years experience
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {profile.totalReviews > 0 && (
                <span className="at-badge at-badge-accent">
                  <Star size={12} className="fill-amber-500 text-amber-500" />
                  {profile.averageRating.toFixed(1)} ({profile.totalReviews} review{profile.totalReviews !== 1 ? "s" : ""})
                </span>
              )}
              {profile.city && (
                <span className="at-badge at-badge-neutral">
                  <MapPin size={12} />
                  {profile.city}
                </span>
              )}
              <span className="at-badge at-badge-primary">
                {profile.teachingMode === "ONLINE" ? "Online Lessons" : profile.teachingMode === "OFFLINE" ? "Home Tuition" : "Online & Home"}
              </span>
              {profile.feeMin && profile.feeMax && (
                <span className="at-badge at-badge-neutral font-600">
                  <Wallet size={12} />
                  ₹{profile.feeMin}–₹{profile.feeMax}/hr
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <section
            className="rounded-xl p-6 space-y-2"
            style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB" }}
          >
            <h2 className="text-base font-700 text-gray-900">About</h2>
            <p className="whitespace-pre-line text-sm text-gray-700 leading-relaxed">
              {profile.bio}
            </p>
          </section>
        )}

        {/* Intro Video */}
        {youtubeEmbedUrl && (
          <section
            className="rounded-xl p-6 space-y-3"
            style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB" }}
          >
            <h2 className="flex items-center gap-2 text-base font-700 text-gray-900">
              <Video size={18} className="text-green-700" />
              Intro Video
            </h2>
            <div className="aspect-video overflow-hidden rounded-xl border border-gray-200">
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
        <section
          className="rounded-xl p-6 space-y-4"
          style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB" }}
        >
          <h2 className="text-base font-700 text-gray-900">What I Teach</h2>
          <div className="space-y-3">
            <div>
              <p className="mb-2 text-xs font-600 uppercase text-gray-500">
                Subjects
              </p>
              <div className="flex flex-wrap gap-1.5">
                {profile.subjects.map((subject) => (
                  <span key={subject} className="at-badge at-badge-primary">
                    {subject}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-600 uppercase text-gray-500">
                Class Levels
              </p>
              <div className="flex flex-wrap gap-1.5">
                {profile.classLevels.map((level) => (
                  <span key={level} className="at-badge at-badge-info">
                    {level}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Availability */}
        {profile.availability.length > 0 && (
          <section
            className="rounded-xl p-6 space-y-3"
            style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB" }}
          >
            <h2 className="text-base font-700 text-gray-900">
              Weekly Availability
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.availability.map((slot) => (
                <div
                  key={slot.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-500 text-gray-800"
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
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-700 text-gray-900">
                <Star size={20} className="fill-amber-400 text-amber-400" />
                Student Reviews ({profile.reviews.length})
              </h2>
              <span className="text-sm font-600 text-gray-900">
                ★ {profile.averageRating.toFixed(1)} / 5.0
              </span>
            </div>

            <div className="space-y-3">
              {profile.reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-xl p-5 space-y-2.5"
                  style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={
                            i < review.overallRating
                              ? "fill-amber-400 text-amber-400"
                              : "text-gray-200"
                          }
                        />
                      ))}
                    </div>
                    <span className="at-badge at-badge-success text-[11px]">
                      Verified Student Booking
                    </span>
                  </div>

                  {review.comment && (
                    <p className="text-sm text-gray-700 italic">
                      &quot;{review.comment}&quot;
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    {new Date(review.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
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
        <div
          className="rounded-2xl p-8 text-center space-y-3"
          style={{ backgroundColor: "#1A7F5A" }}
        >
          <BookOpen size={28} className="mx-auto text-emerald-200" />
          <h2 className="text-xl font-700 text-white">
            Interested in learning with {profile.user.name?.split(" ")[0]}?
          </h2>
          <p className="text-sm text-emerald-100 max-w-md mx-auto">
            Post your tuition requirement on ApnaTutorHub for free and get connected.
          </p>
          <Link
            href="/register"
            className="at-btn at-btn-accent at-btn-lg inline-flex"
          >
            Post a Requirement — Free
          </Link>
        </div>
      </div>
    </div>
  );
}
