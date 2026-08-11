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
        let finalPriceInr: number = pkg.priceInr;

        if (appliedCoupon) {
          const val = appliedCoupon.discountValue ?? appliedCoupon.discountAmountInr ?? 0;
          if (appliedCoupon.discountType === "FLAT") {
            discountSavings = val;
          } else {
            discountSavings = Math.round((pkg.priceInr * val) / 100);
          }
          discountSavings = Math.min(discountSavings, pkg.priceInr);
          finalPriceInr = Math.max(0, pkg.priceInr - discountSavings);
        }

        return (
          <div
            key={pkg.id}
            className={`relative flex flex-col justify-between gap-4 p-5 rounded-xl border transition-all ${
              pkg.popular ? "border-green-600 shadow-md ring-1 ring-green-600" : "border-gray-200 shadow-xs"
            }`}
            style={{ backgroundColor: "#FFFFFF" }}
          >
            {/* Popular / Coupon Discount Badge */}
            {discountSavings > 0 ? (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-green-100 border border-green-300 px-3 py-0.5 text-[11px] font-600 text-green-800 flex items-center gap-1">
                <Tag size={11} className="text-green-600" />
                <span>SAVE ₹{discountSavings}!</span>
              </div>
            ) : pkg.badge ? (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-100 border border-amber-300 px-3 py-0.5 text-[11px] font-600 text-amber-800">
                {pkg.badge}
              </div>
            ) : null}

            {/* Header */}
            <div className="pt-2 text-center">
              <p className="text-xs font-600 uppercase tracking-wide text-gray-500">
                {pkg.name}
              </p>
              <p className="mt-1 text-3xl font-800 text-gray-900">
                🪙 {pkg.totalCoins}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                {pkg.coins} coins
                {pkg.bonusCoins > 0 && (
                  <span className="ml-1 font-600 text-green-600">
                    +{pkg.bonusCoins} bonus
                  </span>
                )}
              </p>
            </div>

            {/* Dynamic Price Box */}
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              {discountSavings > 0 ? (
                <div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs font-500 text-gray-400 line-through">
                      ₹{pkg.priceInr.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xl font-700 text-gray-900">
                      ₹{finalPriceInr.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="text-[10px] font-600 text-green-700 uppercase tracking-wider mt-0.5">
                    Discounted with &quot;{appliedCoupon?.code}&quot;
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xl font-700 text-gray-900">
                    ₹{pkg.priceInr.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] text-gray-500">
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
              className="at-btn at-btn-primary w-full text-xs font-600 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Zap size={14} className="at-spinner" />
                  <span>Processing…</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
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
