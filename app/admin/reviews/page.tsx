import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Star, Search, Trash2, User, MessageSquare } from "lucide-react";
import { ReviewDeleteButton } from "@/components/admin/ReviewDeleteButton";
import Link from "next/link";

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
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <span className="text-[11px] font-800 uppercase tracking-widest text-[#2D9E6B]">Quality Moderation</span>
          <h1 className="text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            Review Moderation &amp; Feedback
          </h1>
          <p className="text-xs text-slate-600 font-600">
            Monitor, moderate, and remove inappropriate or fake tutor reviews ({totalCount} total)
          </p>
        </div>
      </div>

      {/* Star Rating Badges */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/admin/reviews?q=${q}`}
          className={`rounded-2xl px-4 py-2 text-xs font-800 transition-all border ${
            !ratingFilter
              ? "bg-[#2D9E6B] !text-white border-[#2D9E6B] shadow-xs"
              : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
          }`}
        >
          All Reviews
        </Link>
        {[5, 4, 3, 2, 1].map((stars) => (
          <Link
            key={stars}
            href={`/admin/reviews?rating=${stars}&q=${q}`}
            className={`flex items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-800 transition-all border ${
              ratingFilter === stars
                ? "bg-amber-500 !text-white border-amber-500 shadow-xs"
                : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
            }`}
          >
            <span>{stars} ⭐</span>
            <span>({ratingCountMap[stars] ?? 0})</span>
          </Link>
        ))}
      </div>

      {/* Search */}
      <form method="GET" className="flex flex-col gap-3 sm:flex-row p-4 rounded-3xl bg-white border border-slate-200 shadow-xs">
        {ratingFilter && <input type="hidden" name="rating" value={ratingFilter} />}
        <div className="flex flex-1 items-center gap-2 rounded-2xl px-4 py-2.5 bg-slate-50 border border-slate-300">
          <Search size={16} className="text-slate-500" />
          <input name="q" defaultValue={q} placeholder="Search by review text or tutor name…" className="flex-1 bg-transparent text-xs font-700 text-slate-900 outline-none placeholder:text-slate-500" />
        </div>
        <button type="submit" className="rounded-2xl px-6 py-2.5 text-xs font-800 bg-[#2D9E6B] text-white hover:bg-[#238357] transition-all cursor-pointer">
          Search
        </button>
      </form>

      {/* Reviews Cards List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="p-12 text-center text-sm font-700 text-slate-700 rounded-3xl bg-white border border-slate-200 shadow-xs">
            No tutor reviews found matching criteria
          </div>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center text-amber-500 font-800 text-sm">
                    {Array.from({ length: r.overallRating }).map((_, i) => (
                      <Star key={i} size={16} className="fill-amber-400 text-amber-400" />
                    ))}
                    <span className="ml-2 text-slate-900 font-800 text-xs">{r.overallRating}.0 / 5</span>
                  </div>
                  <span className="text-xs font-600 text-slate-500">
                    {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>

                <p className="text-sm font-700 text-slate-800 italic">
                  &ldquo;{r.comment || "No written review comment."}&rdquo;
                </p>

                <p className="text-xs font-800 text-[#0F2540]">
                  {r.reviewerRole === "TUTOR" ? "Tutor review of parent" : "Parent review of tutor"}:{" "}
                  <span className="text-[#2563EB]">{r.tutorProfile?.user?.name || "Tutor Profile"}</span> ({r.tutorProfile?.user?.email})
                </p>
              </div>

              <div className="shrink-0">
                <ReviewDeleteButton reviewId={r.id} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
