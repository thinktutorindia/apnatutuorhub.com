import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Star, Search, Trash2, User, MessageSquare } from "lucide-react";
import { adminDeleteReviewAction } from "@/app/actions/admin.actions";
import { ReviewDeleteButton } from "@/components/admin/ReviewDeleteButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review Moderation — Admin" };

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; rating?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const ratingFilter = params.rating ? Number(params.rating) : null;

  const whereCondition: any = {};
  if (ratingFilter) {
    whereCondition.overallRating = ratingFilter;
  }
  if (q) {
    whereCondition.OR = [
      { comment: { contains: q, mode: "insensitive" } },
      { tutorProfile: { user: { name: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const [reviews, totalCount, ratingStats] = await Promise.all([
    prisma.review.findMany({
      where: whereCondition,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        tutorProfile: { include: { user: { select: { name: true, email: true } } } },
      },
    }),
    prisma.review.count({ where: whereCondition }),
    prisma.review.groupBy({
      by: ["overallRating"],
      _count: { id: true },
    }),
  ]);

  const ratingCountMap = Object.fromEntries(ratingStats.map((r) => [r.overallRating, r._count.id]));

  return (
    <div style={{ color: "#F8FAFC" }}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: "-0.04em" }}>
            Review Moderation & Feedback
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "#475569" }}>
            Monitor, moderate, and remove inappropriate or fake tutor reviews ({totalCount} total)
          </p>
        </div>
      </div>

      {/* Star Rating Badges */}
      <div className="mb-6 flex flex-wrap gap-2">
        <a
          href={`/admin/reviews?q=${q}`}
          className="rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all"
          style={
            !ratingFilter
              ? { background: "#22C55E", color: "#0F172A" }
              : { background: "#0F172A", color: "#64748B", border: "1px solid #1E293B" }
          }
        >
          All Reviews
        </a>
        {[5, 4, 3, 2, 1].map((stars) => (
          <a
            key={stars}
            href={`/admin/reviews?rating=${stars}&q=${q}`}
            className="flex items-center gap-1 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all"
            style={
              ratingFilter === stars
                ? { background: "#F59E0B", color: "#0F172A" }
                : { background: "#0F172A", color: "#64748B", border: "1px solid #1E293B" }
            }
          >
            <span>{stars} ⭐</span>
            <span>({ratingCountMap[stars] ?? 0})</span>
          </a>
        ))}
      </div>

      {/* Search */}
      <form method="GET" className="mb-6 flex gap-3">
        {ratingFilter && <input type="hidden" name="rating" value={ratingFilter} />}
        <div className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "#0F172A", border: "1px solid #1E293B" }}>
          <Search size={14} style={{ color: "#475569" }} />
          <input name="q" defaultValue={q} placeholder="Search by review comment or tutor name…" className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600" />
        </div>
        <button type="submit" className="rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ background: "#22C55E", color: "#0F172A" }}>Search</button>
      </form>

      {/* Reviews Stream */}
      <div className="space-y-3">
        {reviews.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl py-16" style={{ background: "#0F172A", border: "1px solid #1E293B" }}>
            <MessageSquare size={32} style={{ color: "#1E293B" }} />
            <p className="text-sm" style={{ color: "#334155" }}>No reviews found</p>
          </div>
        ) : (
          reviews.map((rev) => (
            <div key={rev.id} className="rounded-2xl p-4 transition-all" style={{ background: "#0F172A", border: "1px solid #1E293B" }}>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold" style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>
                      {rev.overallRating} <Star size={10} fill="#F59E0B" />
                    </span>
                    <span className="text-xs font-semibold" style={{ color: "#64748B" }}>
                      Role: {rev.reviewerRole}
                    </span>
                    <span className="text-xs" style={{ color: "#334155" }}>
                      {new Date(rev.createdAt).toLocaleDateString("en-IN")}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-white font-medium">
                    {rev.comment || <em className="text-slate-600">No written comment provided.</em>}
                  </p>

                  <div className="mt-2 flex items-center gap-3 text-xs" style={{ color: "#64748B" }}>
                    <span className="flex items-center gap-1">
                      <User size={12} style={{ color: "#8B5CF6" }} /> Tutor: <strong className="text-slate-300">{rev.tutorProfile.user.name || rev.tutorProfile.user.email}</strong>
                    </span>
                    {rev.teachingRating && <span>Teaching: <strong>{rev.teachingRating}/5</strong></span>}
                    {rev.communicationRating && <span>Communication: <strong>{rev.communicationRating}/5</strong></span>}
                    {rev.punctualityRating && <span>Punctuality: <strong>{rev.punctualityRating}/5</strong></span>}
                  </div>
                </div>

                {/* Delete action */}
                <ReviewDeleteButton reviewId={rev.id} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
