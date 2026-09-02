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
    <div className="ath-panel p-6">
      <div className="mb-5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-[#2D9E6B]" size={20} />
          <h2
            className="text-lg font-800 text-[#0F2540]"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            Tutor Performance
          </h2>
        </div>
        {profile.isFeatured && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-800 text-amber-800 border border-amber-300">
            <Star size={12} className="fill-amber-500 text-amber-500" />
            Featured Tutor
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-[#F0F4F8] p-4 border border-[#E2E8F0]">
          <div className="flex items-center gap-1.5 text-xs font-800 text-[#64748B]">
            <Unlock size={14} className="text-[#0F2540]" /> Unlocked Leads
          </div>
          <p className="mt-2 text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>{totalUnlocked}</p>
        </div>

        <div className="rounded-2xl bg-[#F0F4F8] p-4 border border-[#E2E8F0]">
          <div className="flex items-center gap-1.5 text-xs font-800 text-[#64748B]">
            <Target size={14} className="text-[#2D9E6B]" /> Conversion Rate
          </div>
          <p className="mt-2 text-2xl font-800 text-[#2D9E6B]" style={{ fontFamily: "Poppins, sans-serif" }}>{conversionRate}%</p>
          <p className="text-[10px] text-[#64748B] mt-0.5">{totalShortlisted} shortlisted</p>
        </div>

        <div className="rounded-2xl bg-[#F0F4F8] p-4 border border-[#E2E8F0]">
          <div className="flex items-center gap-1.5 text-xs font-800 text-[#64748B]">
            <BookOpen size={14} className="text-[#2D9E6B]" /> Completed Tuitions
          </div>
          <p className="mt-2 text-2xl font-800 text-[#2D9E6B]" style={{ fontFamily: "Poppins, sans-serif" }}>{totalBookings}</p>
        </div>

        <div className="rounded-2xl bg-[#F0F4F8] p-4 border border-[#E2E8F0]">
          <div className="flex items-center gap-1.5 text-xs font-800 text-[#64748B]">
            <Star size={14} className="text-[#F5A623]" /> Average Rating
          </div>
          <p className="mt-2 text-2xl font-800 text-[#F5A623]" style={{ fontFamily: "Poppins, sans-serif" }}>
            {profile.totalReviews > 0 ? profile.averageRating.toFixed(1) : "N/A"}
          </p>
          <p className="text-[10px] text-[#64748B] mt-0.5">{profile.totalReviews} reviews</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-[#F0F4F8] p-4 border border-[#E2E8F0]">
        <div className="flex items-center justify-between text-xs font-800">
          <span className="text-[#0F2540]">Profile Completion Score</span>
          <span className="text-[#2D9E6B]">{profile.profileScore}%</span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, profile.profileScore)}%`,
              background: "#2D9E6B",
            }}
          />
        </div>
      </div>
    </div>
  );
}
