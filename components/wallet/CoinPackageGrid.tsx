"use client";

import { Sparkles, Zap } from "lucide-react";
import { COIN_PACKAGES, type CoinPackageId } from "@/lib/razorpay";

export function CoinPackageGrid({
  onSelect,
  loading,
}: {
  onSelect: (id: CoinPackageId) => void;
  loading: CoinPackageId | null;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {COIN_PACKAGES.map((pkg) => {
        const isLoading = loading === pkg.id;

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
            {/* Popular badge */}
            {pkg.badge && (
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-[#0F172A] px-3 py-0.5 text-[11px] font-black"
                style={{ backgroundColor: pkg.accentBg, color: "#0F172A" }}
              >
                {pkg.badge}
              </div>
            )}

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

            {/* Price */}
            <div
              className="rounded-xl border-2 border-[#0F172A] py-2 text-center"
              style={{ backgroundColor: pkg.accentBg }}
            >
              <p className="text-2xl font-black text-[#0F172A]">
                ₹{pkg.priceInr.toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] font-bold text-slate-700">
                ₹{(pkg.priceInr / pkg.totalCoins).toFixed(1)} / coin
              </p>
            </div>

            {/* CTA */}
            <button
              type="button"
              disabled={isLoading || loading !== null}
              onClick={() => onSelect(pkg.id as CoinPackageId)}
              className="neu-btn neu-btn-primary w-full py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Zap size={15} className="animate-pulse" />
                  <span>Processing…</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>Buy Now</span>
                </>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
