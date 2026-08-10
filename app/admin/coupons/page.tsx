import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { CouponActions } from "@/components/admin/CouponActions";
import { CreateCouponForm } from "@/components/admin/CreateCouponForm";
import { Ticket, Tag } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Coupon Management — Admin" };

export default async function AdminCouponsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN" && !can(session.user, "settings:manage")) {
    redirect("/admin/dashboard");
  }

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { usages: true } },
    },
  });

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <span className="text-[11px] font-800 uppercase tracking-widest text-[#2D9E6B]">Promotions &amp; Discounts</span>
          <h1 className="text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            Coupon &amp; Discount Management
          </h1>
          <p className="text-xs text-slate-600 font-600">
            Create promo codes, percentage discounts, and flat coin bonus coupons
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Create Coupon Form */}
        <div className="lg:col-span-1">
          <CreateCouponForm />
        </div>

        {/* Coupons List */}
        <div className="rounded-3xl p-6 lg:col-span-2 bg-white border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Tag size={20} className="text-[#2563EB]" />
              <h2 className="text-lg font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
                Active &amp; Archived Coupons
              </h2>
            </div>
            <span className="rounded-full px-3 py-1 text-xs font-800 bg-slate-100 text-slate-800 border border-slate-300">
              Total: {coupons.length}
            </span>
          </div>

          {coupons.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Ticket size={40} className="text-slate-400" />
              <p className="text-sm font-700 text-slate-600">No promo coupons created yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {coupons.map((c) => (
                <div
                  key={c.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all ${
                    c.isActive ? "bg-white border-slate-200 shadow-xs" : "bg-slate-50 border-slate-200 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-800 text-sm bg-blue-100 text-[#2563EB] border border-blue-300">
                      {c.discountType === "PERCENTAGE" ? "%" : "₹"}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-800 text-[#0F2540] tracking-wider uppercase">
                          {c.code}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-800 border ${
                          c.isActive ? "bg-emerald-100 text-emerald-950 border-emerald-300" : "bg-slate-100 text-slate-700 border-slate-300"
                        }`}>
                          {c.isActive ? "Active" : "Archived"}
                        </span>
                      </div>
                      <p className="text-xs font-600 text-slate-600">
                        {c.discountType === "PERCENTAGE" ? `${c.discountAmount}% OFF` : `₹${c.discountAmount} Flat Discount`} · Used {c._count.usages} times
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 sm:mt-0 flex items-center gap-2">
                    <CouponActions couponId={c.id} code={c.code} isActive={c.isActive} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
