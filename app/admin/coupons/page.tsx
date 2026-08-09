import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { createCouponAction, toggleCouponActiveAction, deleteCouponAction } from "@/app/actions/coupon.actions";
import { CouponActions } from "@/components/admin/CouponActions";
import { Ticket, Plus, CheckCircle, XCircle, Trash2, Power, Tag } from "lucide-react";

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
    <div style={{ color: "#F8FAFC" }}>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: "-0.02em" }}
          >
            Coupon & Discount Management
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#64748B" }}>
            Create promo codes, percentage discounts, and flat order coupons.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Create Coupon Form */}
        <div
          className="rounded-2xl p-6 lg:col-span-1"
          style={{ background: "#0F172A", border: "1px solid #1E293B" }}
        >
          <div className="mb-5 flex items-center gap-2">
            <Plus size={18} style={{ color: "#22C55E" }} />
            <h2 className="text-base font-semibold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Create New Coupon
            </h2>
          </div>

          <form
            action={async (formData: FormData) => {
              "use server";
              await createCouponAction(formData);
            }}
            className="space-y-4"
          >
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">Coupon Code</label>
              <input
                name="code"
                type="text"
                required
                placeholder="e.g. WELCOME20 or FLAT100"
                className="w-full rounded-xl px-4 py-2.5 text-sm uppercase text-white placeholder-slate-600 outline-none"
                style={{ background: "#1E293B", border: "1px solid #334155", fontFamily: "'Fira Code', monospace" }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-white">Type</label>
                <select
                  name="discountType"
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                  style={{ background: "#1E293B", border: "1px solid #334155" }}
                >
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FLAT">Flat Rate (₹)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-white">Discount</label>
                <input
                  name="discountAmount"
                  type="number"
                  step="any"
                  required
                  placeholder="20 (for 20% or ₹20)"
                  className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none"
                  style={{ background: "#1E293B", border: "1px solid #334155" }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-white">
                  Max Cap (₹) <span className="text-slate-500">(pct only)</span>
                </label>
                <input
                  name="maxDiscountInr"
                  type="number"
                  placeholder="e.g. 200"
                  className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none"
                  style={{ background: "#1E293B", border: "1px solid #334155" }}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-white">Min Order (₹)</label>
                <input
                  name="minOrderInr"
                  type="number"
                  placeholder="e.g. 500"
                  className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none"
                  style={{ background: "#1E293B", border: "1px solid #334155" }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-white">Usage Limit</label>
                <input
                  name="usageLimit"
                  type="number"
                  placeholder="e.g. 100"
                  className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none"
                  style={{ background: "#1E293B", border: "1px solid #334155" }}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-white">Expiry Date</label>
                <input
                  name="expiresAt"
                  type="date"
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                  style={{ background: "#1E293B", border: "1px solid #334155" }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)", boxShadow: "0 4px 15px rgba(34,197,94,0.3)" }}
            >
              <Ticket size={16} />
              Create Coupon
            </button>
          </form>
        </div>

        {/* Coupons List */}
        <div
          className="rounded-2xl p-6 lg:col-span-2"
          style={{ background: "#0F172A", border: "1px solid #1E293B" }}
        >
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag size={18} style={{ color: "#3B82F6" }} />
              <h2 className="text-base font-semibold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
                Active & Archived Coupons
              </h2>
            </div>
            <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: "#1E293B", color: "#94A3B8" }}>
              Total: {coupons.length}
            </span>
          </div>

          {coupons.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Ticket size={36} style={{ color: "#334155" }} />
              <p className="text-sm" style={{ color: "#64748B" }}>No coupons created yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {coupons.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-xl p-4 transition-all"
                  style={{
                    background: "#0A0F1E",
                    border: c.isActive ? "1px solid #1E293B" : "1px solid #334155",
                    opacity: c.isActive ? 1 : 0.6,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl font-bold"
                      style={{
                        background: c.discountType === "PERCENTAGE" ? "rgba(59,130,246,0.15)" : "rgba(34,197,94,0.15)",
                        color: c.discountType === "PERCENTAGE" ? "#3B82F6" : "#22C55E",
                      }}
                    >
                      {c.discountType === "PERCENTAGE" ? "%" : "₹"}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-sm font-bold text-white tracking-wider"
                          style={{ fontFamily: "'Fira Code', monospace" }}
                        >
                          {c.code}
                        </span>
                        {c.isActive ? (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                            <CheckCircle size={10} /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                            <XCircle size={10} /> Disabled
                          </span>
                        )}
                      </div>

                      <p className="mt-0.5 text-xs text-slate-400">
                        {c.discountType === "PERCENTAGE"
                          ? `${c.discountAmount}% OFF ${c.maxDiscountInr ? `(Up to ₹${c.maxDiscountInr / 100})` : ""}`
                          : `₹${c.discountAmount / 100} FLAT OFF`}
                        {c.minOrderInr ? ` • Min Order: ₹${c.minOrderInr / 100}` : ""}
                      </p>

                      <p className="mt-1 text-[10px] text-slate-500">
                        Used: {c.usedCount} {c.usageLimit ? `/ ${c.usageLimit}` : ""} times
                        {c.expiresAt ? ` • Expires: ${new Date(c.expiresAt).toLocaleDateString("en-IN")}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <CouponActions couponId={c.id} code={c.code} isActive={c.isActive} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
