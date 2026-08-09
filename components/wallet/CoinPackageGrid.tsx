"use client";

import { Sparkles, Zap, Tag } from "lucide-react";
import { COIN_PACKAGES, type CoinPackageId } from "@/lib/razorpay";
import type { ValidateCouponResult } from "@/app/actions/coupon.actions";

export function CoinPackageGrid({
  onSelect,
  loading,
  appliedCoupon,
}: {
  onSelect: (id: CoinPackageId) => void;
  loading: CoinPackageId | null;
  appliedCoupon?: ValidateCouponResult | null;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {COIN_PACKAGES.map((pkg) => {
        const isLoading = loading === pkg.id;

        // Calculate dynamic discounted price per package if coupon is applied
        let discountSavings = 0;
        let finalPriceInr = pkg.priceInr;

        if (appliedCoupon) {
          if (appliedCoupon.discountType === "FLAT") {
            discountSavings = appliedCoupon.discountAmountInr;
          } else {
            // Percentage discount for this specific package price
            discountSavings = Math.round((pkg.priceInr * appliedCoupon.discountAmountInr) / 100);
          }
          discountSavings = Math.min(discountSavings, pkg.priceInr);
          finalPriceInr = Math.max(0, pkg.priceInr - discountSavings);
        }

        return (
          <div
            key={pkg.id}
            className={`neu-card relative flex flex-col gap-4 p-5 transition-all ${
              pkg.popular
                ? "border-[3px] shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]"
                : ""
            }`}
            style={{ backgroundColor: pkg.bg }}
          >
            {/* Popular / Coupon Discount Badge */}
            {discountSavings > 0 ? (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-[#0F172A] bg-[#DCFCE7] px-3 py-0.5 text-[11px] font-black text-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] flex items-center gap-1">
                <Tag size={11} className="text-[#22C55E]" />
                <span>SAVE ₹{discountSavings}!</span>
              </div>
            ) : pkg.badge ? (
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-[#0F172A] px-3 py-0.5 text-[11px] font-black"
                style={{ backgroundColor: pkg.accentBg, color: "#0F172A" }}
              >
                {pkg.badge}
              </div>
            ) : null}

            {/* Header */}
            <div className="pt-2 text-center">
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                {pkg.name}
              </p>
              <p className="mt-1 text-4xl font-black text-[#0F172A]">
                🪙 {pkg.totalCoins}
              </p>
              <p className="text-[11px] font-bold text-slate-600">
                {pkg.coins} coins
                {pkg.bonusCoins > 0 && (
                  <span className="ml-1 font-extrabold text-[#22C55E]">
                    +{pkg.bonusCoins} bonus
                  </span>
                )}
              </p>
            </div>

            {/* Dynamic Price Box */}
            <div
              className="rounded-xl border-2 border-[#0F172A] py-2.5 text-center relative overflow-hidden"
              style={{ backgroundColor: pkg.accentBg }}
            >
              {discountSavings > 0 ? (
                <div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm font-bold text-slate-500 line-through">
                      ₹{pkg.priceInr.toLocaleString("en-IN")}
                    </span>
                    <span className="text-2xl font-black text-[#0F172A]">
                      ₹{finalPriceInr.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">
                    Discounted with "{appliedCoupon?.code}"
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-2xl font-black text-[#0F172A]">
                    ₹{pkg.priceInr.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] font-bold text-slate-700">
                    ₹{(pkg.priceInr / pkg.totalCoins).toFixed(1)} / coin
                  </p>
                </div>
              )}
            </div>

            {/* CTA */}
            <button
              type="button"
              disabled={isLoading || loading !== null}
              onClick={() => onSelect(pkg.id as CoinPackageId)}
              className="neu-btn neu-btn-primary w-full py-3 text-xs font-black disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer shadow-[3px_3px_0px_0px_#0F172A]"
            >
              {isLoading ? (
                <>
                  <Zap size={15} className="animate-pulse" />
                  <span>Processing…</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>
                    {discountSavings > 0 ? `Buy Now for ₹${finalPriceInr}` : "Buy Now"}
                  </span>
                </>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
