import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight, BookOpen, MapPin, PlusCircle, Phone, ShieldCheck,
  MessageCircle, BadgeCheck, Clock, Calendar, Star, RefreshCw,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EnablePushBanner } from "@/components/EnablePushBanner";
import { getWhatsAppSupportLink, SUPPORT_PHONE_DISPLAY } from "@/lib/support";
import { getMediaUrl } from "@/lib/s3";

const OPEN_STATUSES = ["ACTIVE", "MATCHING", "APPLICATIONS_RECEIVED"] as const;

function honorific(name: string) {
  const first = name.split(" ")[0] || "there";
  if (first.toLowerCase().endsWith("ji")) return first;
  return `${first} Ji`;
}

export default async function ParentDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });
  if (!dbUser) redirect("/login");

  let parentProfile = await prisma.parentProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      city: true,
      pincode: true,
      _count: { select: { students: true, leads: true } },
      students: {
        take: 3,
        orderBy: { createdAt: "asc" },
        select: { name: true, classLevel: true, board: true },
      },
      leads: {
        orderBy: { createdAt: "desc" },
        take: 4,
        select: {
          id: true,
          subjects: true,
          classLevel: true,
          mode: true,
          budgetMin: true,
          budgetMax: true,
          city: true,
          status: true,
          maxTutors: true,
          purchases: {
            take: 5,
            select: {
              tutorProfile: {
                select: {
                  id: true,
                  user: { select: { name: true, image: true } },
                },
              },
            },
          },
          _count: { select: { purchases: true } },
        },
      },
    },
  });

  if (!parentProfile) {
    try {
      const created = await prisma.parentProfile.create({
        data: { userId: session.user.id },
      });
      parentProfile = {
        id: created.id,
        city: null,
        pincode: null,
        _count: { students: 0, leads: 0 },
        students: [],
        leads: [],
      };
    } catch {
      redirect("/login");
    }
  }

  const [upcomingBooking, nearbyTutors] = await Promise.all([
    prisma.booking.findFirst({
      where: {
        lead: { parentProfileId: parentProfile.id },
        status: { in: ["REQUESTED", "CONFIRMED", "RESCHEDULED"] },
      },
      orderBy: { startDate: "asc" },
      select: {
        id: true,
        isTrial: true,
        startDate: true,
        venueAddress: true,
        mode: true,
        tutorName: true,
        subject: true,
        classLevel: true,
        tutorProfile: {
          select: {
            qualification: true,
            user: { select: { name: true, phone: true } },
          },
        },
      },
    }),
    prisma.tutorProfile.findMany({
      where: {
        kycStatus: "APPROVED",
        user: { isActive: true },
        ...(parentProfile.city
          ? { city: { contains: parentProfile.city, mode: "insensitive" } }
          : {}),
      },
      take: 4,
      orderBy: [{ isFeatured: "desc" }, { averageRating: "desc" }],
      select: {
        id: true,
        feeMin: true,
        subjects: true,
        averageRating: true,
        totalReviews: true,
        qualification: true,
        city: true,
        user: { select: { name: true, image: true } },
      },
    }),
  ]);

  const displayName = honorific(session.user.name || "Parent");
  const child = parentProfile.students[0];
  const place = parentProfile.city || "your area";
  const helpText = `Namaste, I am ${session.user.name || "a parent"} on ApnaTutorHub. I need help finding a good tutor for my child.`;
  const activeLead = parentProfile.leads.find((l) =>
    OPEN_STATUSES.includes(l.status as (typeof OPEN_STATUSES)[number])
  ) ?? parentProfile.leads[0];

  const tutorPhone = upcomingBooking?.tutorProfile.user.phone?.replace(/\s/g, "") || "";

  return (
    <div className="space-y-6 text-slate-900">
      <EnablePushBanner userId={session.user.id} role="PARENT" />

      <div className="relative overflow-hidden rounded-3xl bg-[#0F2540] p-6 sm:p-8 text-white">
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-800 tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
              Namaste {displayName}! Welcome back.
            </h1>
            <p className="text-[15px] sm:text-base text-slate-200 font-500 max-w-xl">
              {child
                ? `Managing tuition for ${child.name} (${child.classLevel}${child.board ? ` ${child.board}` : ""}, ${place})`
                : `Tell us what your child needs. Verified home and online tutors will reach out. Free for parents.`}
            </p>
          </div>
          <Link
            href="/parent/post-requirement"
            className="w-full min-h-12 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] px-5 py-3.5 text-[15px] font-800 text-white sm:w-auto shrink-0"
          >
            <PlusCircle size={18} />
            Post New Subject Requirement
          </Link>
        </div>
      </div>

      {!parentProfile.city && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950">
          <div className="flex items-center gap-3">
            <MapPin size={18} className="shrink-0" />
            <p className="text-[15px] font-700">
              Add your area or pincode so we can match tutors who live near you.
            </p>
          </div>
          <Link href="/parent/profile" className="px-4 py-2.5 rounded-xl bg-white border border-amber-300 font-800 text-sm min-h-11 inline-flex items-center">
            Update Profile
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        <div className="ath-panel p-6 space-y-4">
          <h2 className="text-lg font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            Active Tuition Requirement
          </h2>
          {activeLead ? (
            <>
              <p className="text-[15px] font-700 text-[#0F2540]">
                {activeLead.classLevel} {activeLead.subjects.join(" & ")}
              </p>
              <span className="ath-verified">
                <BadgeCheck size={14} />
                {activeLead._count.purchases} Verified Tutors Applied
              </span>
              {activeLead.purchases.length > 0 && (
                <div className="flex items-center">
                  {activeLead.purchases.slice(0, 3).map((p, i) => (
                    <div
                      key={p.tutorProfile.id}
                      className="w-9 h-9 rounded-full border-2 border-white bg-[#E8F7F0] text-[#238357] text-xs font-800 flex items-center justify-center overflow-hidden"
                      style={{ marginLeft: i === 0 ? 0 : -8 }}
                    >
                      {p.tutorProfile.user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={getMediaUrl(p.tutorProfile.user.image) || ""} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (p.tutorProfile.user.name || "T")[0]
                      )}
                    </div>
                  ))}
                  {activeLead._count.purchases > 3 && (
                    <span className="ml-2 text-xs font-800 text-[#64748B]">+{activeLead._count.purchases - 3}</span>
                  )}
                </div>
              )}
              <Link
                href={`/parent/my-leads/${activeLead.id}/applicants`}
                className="w-full min-h-12 inline-flex items-center justify-center rounded-xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-[15px] font-800"
              >
                Review Tutors & Schedule Demo
              </Link>
            </>
          ) : (
            <>
              <p className="text-[15px] text-[#64748B] font-500">
                You have not posted a requirement yet. It takes about a minute.
              </p>
              <Link href="/parent/post-requirement" className="w-full min-h-12 inline-flex items-center justify-center rounded-xl bg-[#2D9E6B] text-white text-[15px] font-800">
                Post your first requirement
              </Link>
            </>
          )}
        </div>

        <div className="ath-panel p-6 space-y-4">
          <h2 className="text-lg font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            Upcoming Free Demo Class
          </h2>
          {upcomingBooking ? (
            <>
              <p className="flex items-center gap-2 text-[15px] font-800 text-[#0F2540]">
                <Clock size={16} className="text-[#2D9E6B]" />
                {upcomingBooking.startDate
                  ? upcomingBooking.startDate.toLocaleString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "Time to be confirmed"}
                {upcomingBooking.mode === "OFFLINE" ? " (Home Visit)" : " (Online)"}
              </p>
              <p className="text-sm font-600 text-[#64748B]">
                Tutor {upcomingBooking.tutorProfile.user.name || upcomingBooking.tutorName || "Teacher"}
                {upcomingBooking.tutorProfile.qualification ? ` (${upcomingBooking.tutorProfile.qualification})` : ""}
              </p>
              <p className="flex items-center gap-1.5 text-sm font-600 text-[#64748B]">
                <MapPin size={14} className="text-[#2D9E6B]" />
                {upcomingBooking.venueAddress || (upcomingBooking.mode === "OFFLINE" ? "At your home" : "Online class")}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {tutorPhone ? (
                  <a href={`tel:${tutorPhone}`} className="min-h-11 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#2D9E6B] text-white text-sm font-800">
                    <Phone size={14} /> Call Tutor
                  </a>
                ) : (
                  <Link href="/parent/bookings" className="min-h-11 inline-flex items-center justify-center rounded-xl bg-[#2D9E6B] text-white text-sm font-800">
                    View class
                  </Link>
                )}
                <Link href="/parent/bookings" className="min-h-11 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] text-[#0F2540] text-sm font-800">
                  <Calendar size={14} /> Reschedule
                </Link>
              </div>
            </>
          ) : (
            <p className="text-[15px] text-[#64748B] font-500">
              No demo booked yet. Review tutor profiles and schedule a free trial.
            </p>
          )}
        </div>

        <div className="ath-panel p-6 space-y-4">
          <h2 className="text-lg font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            Need Help Finding a Teacher?
          </h2>
          <p className="text-[15px] font-500 text-[#64748B]">
            Talk to an education counsellor. No charge.
          </p>
          <p className="text-sm font-800 text-[#0F2540]">{SUPPORT_PHONE_DISPLAY}</p>
          <a
            href={getWhatsAppSupportLink(helpText)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-[15px] font-800"
          >
            <MessageCircle size={16} />
            Chat with Counsellor on WhatsApp
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            {parentProfile.city
              ? `Recommended Verified Home Tutors in ${parentProfile.city}`
              : "Recommended Verified Home Tutors"}
          </h2>
          {nearbyTutors.length === 0 ? (
            <div className="ath-panel p-8 text-center space-y-3">
              <BookOpen className="mx-auto text-[#2D9E6B]" size={28} />
              <p className="text-[15px] font-500 text-[#64748B]">
                Post a requirement and nearby verified teachers will apply.
              </p>
              <Link href="/find-tutor" className="inline-flex text-sm font-800 text-[#2D9E6B]">
                Browse tutors <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {nearbyTutors.map((t) => (
                <div key={t.id} className="ath-panel overflow-hidden">
                  <div className="relative h-36 bg-[#E8F7F0]">
                    {t.user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getMediaUrl(t.user.image) || ""} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl font-800 text-[#2D9E6B]">
                        {(t.user.name || "T")[0]}
                      </div>
                    )}
                    <span className="absolute top-2 right-2 ath-verified bg-white">KYC Verified</span>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-800 text-[#0F2540] truncate">{t.user.name || "Verified Teacher"}</p>
                      <span className="inline-flex items-center gap-0.5 text-sm font-800">
                        <Star size={13} className="fill-[#F5A623] text-[#F5A623]" />
                        {t.averageRating > 0 ? t.averageRating.toFixed(1) : "New"}
                      </span>
                    </div>
                    <p className="text-xs font-600 text-[#64748B] truncate">
                      {t.subjects.slice(0, 3).join(", ")}
                    </p>
                    <p className="text-sm font-800 text-[#0F2540]">
                      ₹{t.feeMin ?? 500}/hr
                    </p>
                    <Link
                      href="/parent/post-requirement"
                      className="w-full min-h-11 inline-flex items-center justify-center rounded-xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-sm font-800"
                    >
                      Book Free Demo Class
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ath-panel p-6 space-y-4 h-fit">
          <h3 className="font-800 text-[#0F2540] text-lg" style={{ fontFamily: "Poppins, sans-serif" }}>
            ApnaTutorHub Parent Trust Promise
          </h3>
          <ul className="space-y-3">
            {[
              { t: "100% Background Checked Tutors", d: "Aadhaar and degree verified" },
              { t: "Free Replacement Guarantee", d: "We help you switch if it is not the right fit" },
              { t: "Pay After Satisfaction", d: "No advance fees for parents" },
            ].map((item) => (
              <li key={item.t} className="flex gap-3">
                {item.t.startsWith("Free") ? (
                  <RefreshCw size={18} className="text-[#2D9E6B] shrink-0 mt-0.5" />
                ) : (
                  <ShieldCheck size={18} className="text-[#2D9E6B] shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="text-[15px] font-700 text-[#0F2540] leading-tight">{item.t}</p>
                  <p className="text-xs font-500 text-[#64748B]">{item.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
