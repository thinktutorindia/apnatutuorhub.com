import { prisma } from "@/lib/prisma";
import { TrendingUp, Target, Star, Unlock, BookOpen } from "lucide-react";

interface TutorAnalyticsWidgetProps {
  tutorProfileId: string;
}

export async function TutorAnalyticsWidget({ tutorProfileId }: TutorAnalyticsWidgetProps) {
  const profile = await prisma.tutorProfile.findUnique({
    where: { id: tutorProfileId },
    select: {
      profileScore: true,
      averageRating: true,
      totalReviews: true,
      isVerified: true,
      isFeatured: true,
      wallet: { select: { balance: true } },
    },
  });

  if (!profile) return null;

  // Compute tutor metrics
  const [totalUnlocked, totalBookings, totalShortlisted] = await Promise.all([
    prisma.leadPurchase.count({ where: { tutorProfileId } }),
    prisma.booking.count({ where: { tutorProfileId, status: "COMPLETED" } }),
    prisma.leadPurchase.count({ where: { tutorProfileId, isShortlisted: true } }),
  ]);

  // Conversion rate: (Shortlisted + Booked) / Unlocked * 100
  const conversionRate = totalUnlocked > 0 ? Math.round(((totalShortlisted + totalBookings) / totalUnlocked) * 100) : 0;

  return (
    <div
      className="rounded-3xl p-6 shadow-[5px_5px_0px_0px_rgba(15,23,42,1)]"
      style={{ background: "#FFFFFF", border: "2.5px solid #0F172A" }}
    >
      <div className="mb-5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-emerald-600" size={20} />
          <h2
            className="text-lg font-black text-slate-900"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Tutor Performance & Analytics
          </h2>
        </div>
        {profile.isFeatured && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-300">
            <Star size={12} className="fill-amber-500 text-amber-500" />
            Featured Tutor
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Metric 1 */}
        <div className="group rounded-2xl bg-slate-50 p-4 border border-slate-200 transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-white hover:border-blue-200 hover:shadow-md hover:shadow-blue-500/10">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Unlock size={14} className="text-blue-500 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12" /> Unlocked Leads
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900 transition-colors group-hover:text-blue-600">{totalUnlocked}</p>
        </div>

        {/* Metric 2 */}
        <div className="group rounded-2xl bg-slate-50 p-4 border border-slate-200 transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-white hover:border-purple-200 hover:shadow-md hover:shadow-purple-500/10">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Target size={14} className="text-purple-500 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12" /> Conversion Rate
          </div>
          <p className="mt-2 text-2xl font-black text-purple-700 transition-colors group-hover:text-purple-600">{conversionRate}%</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{totalShortlisted} shortlisted</p>
        </div>

        {/* Metric 3 */}
        <div className="group rounded-2xl bg-slate-50 p-4 border border-slate-200 transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-white hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-500/10">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <BookOpen size={14} className="text-emerald-500 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12" /> Completed Tuitions
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-700 transition-colors group-hover:text-emerald-600">{totalBookings}</p>
        </div>

        {/* Metric 4 */}
        <div className="group rounded-2xl bg-slate-50 p-4 border border-slate-200 transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-white hover:border-amber-200 hover:shadow-md hover:shadow-amber-500/10">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Star size={14} className="text-amber-500 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12" /> Average Rating
          </div>
          <p className="mt-2 text-2xl font-black text-amber-600 transition-colors group-hover:text-amber-500">
            {profile.totalReviews > 0 ? profile.averageRating.toFixed(1) : "N/A"}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">{profile.totalReviews} reviews</p>
        </div>
      </div>

      {/* Progress Bar for Profile Strength */}
      <div className="mt-5 rounded-2xl bg-slate-50 p-4 border border-slate-200">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-700">Profile Completion Score</span>
          <span className="text-emerald-600">{profile.profileScore}%</span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, profile.profileScore)}%`,
              background: "linear-gradient(90deg, #22C55E, #16A34A)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
