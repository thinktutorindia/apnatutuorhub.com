"use client";

import { useState } from "react";
import { Copy, Check, Gift, Users, Coins, Sparkles, ArrowLeft, Share2 } from "lucide-react";
import Link from "next/link";

interface ReferralItem {
  id: string;
  refereeName: string;
  refereeEmail: string;
  status: "PENDING" | "COMPLETED" | "REWARDED";
  rewardCoins: number;
  createdAt: string;
}

interface ReferralClientViewProps {
  referralCode: string;
  totalInvited: number;
  rewardedCount: number;
  totalCoinsEarned: number;
  referrals: ReferralItem[];
  backHref: string;
}

export function ReferralClientView({
  referralCode,
  totalInvited,
  rewardedCount,
  totalCoinsEarned,
  referrals,
  backHref,
}: ReferralClientViewProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://apnatutorhub.com";
  const referralLink = `${baseUrl}/register?ref=${referralCode}`;

  function copyCode() {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  function copyLink() {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  return (
    <div className="min-h-screen pb-16" style={{ background: "#FAF8F5", fontFamily: "'Inter', sans-serif" }}>
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Top Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-200"
            style={{ background: "#F1F5F9", border: "1.5px solid #0F172A" }}
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>

          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold"
            style={{ background: "rgba(34,197,94,0.12)", color: "#16A34A", border: "1px solid #BBF7D0" }}
          >
            <Sparkles size={13} />
            Referral Rewards Active
          </span>
        </div>

        {/* Main Hero Card */}
        <div
          className="relative overflow-hidden rounded-3xl p-8 text-white shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]"
          style={{
            background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
            border: "2.5px solid #0F172A",
          }}
        >
          {/* Background Glow */}
          <div
            className="absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-20 blur-3xl"
            style={{ background: "#22C55E" }}
          />

          <div className="relative z-10 grid grid-cols-1 gap-8 md:grid-cols-12 md:items-center">
            <div className="md:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
                <Gift size={14} /> Earn 50 Coins Per Friend
              </div>

              <h1
                className="mt-3 text-3xl font-extrabold text-white leading-tight md:text-4xl"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Invite Friends & Unlock Free Leads 🚀
              </h1>

              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                Share your unique code with tutors or parents. When they verify their account, you get{" "}
                <strong className="text-emerald-400">50 Bonus Coins</strong> and they get{" "}
                <strong className="text-emerald-400">25 Coins</strong>!
              </p>
            </div>

            {/* Code Box */}
            <div className="rounded-2xl bg-slate-900/90 p-6 backdrop-blur-sm border border-slate-800 md:col-span-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Your Referral Code</p>
              <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-800 p-3 border border-slate-700">
                <span
                  className="text-2xl font-black text-emerald-400 tracking-widest"
                  style={{ fontFamily: "'Fira Code', monospace" }}
                >
                  {referralCode}
                </span>

                <button
                  type="button"
                  onClick={copyCode}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all"
                  style={{
                    background: copiedCode ? "#22C55E" : "#334155",
                    color: "#fff",
                  }}
                >
                  {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                  {copiedCode ? "Copied" : "Copy"}
                </button>
              </div>

              <button
                type="button"
                onClick={copyLink}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #22C55E, #16A34A)",
                  boxShadow: "0 4px 15px rgba(34,197,94,0.3)",
                }}
              >
                {copiedLink ? <Check size={15} /> : <Share2 size={15} />}
                {copiedLink ? "Link Copied!" : "Copy Referral Link"}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div
            className="rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
            style={{ background: "#fff", border: "2px solid #0F172A" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Invited</span>
              <Users size={20} className="text-blue-500" />
            </div>
            <p className="mt-2 text-3xl font-black text-slate-900">{totalInvited}</p>
          </div>

          <div
            className="rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
            style={{ background: "#fff", border: "2px solid #0F172A" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rewards Claimed</span>
              <Gift size={20} className="text-purple-500" />
            </div>
            <p className="mt-2 text-3xl font-black text-slate-900">{rewardedCount}</p>
          </div>

          <div
            className="rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
            style={{ background: "#fff", border: "2px solid #0F172A" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Coins Earned</span>
              <Coins size={20} className="text-emerald-500" />
            </div>
            <p className="mt-2 text-3xl font-black text-emerald-600">🪙 {totalCoinsEarned}</p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-10">
          <h2
            className="text-xl font-bold text-slate-900"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            How the Referral Program Works 💡
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Share Your Link",
                desc: "Send your invite code or referral link to fellow tutors, students, or parents.",
              },
              {
                step: "02",
                title: "Friend Joins & Verifies",
                desc: "Your friend signs up using your code and completes account KYC verification.",
              },
              {
                step: "03",
                title: "Get Coins Automatically",
                desc: "You instantly receive 50 coins in your wallet to unlock more tuition leads!",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
                style={{ background: "#fff", border: "2px solid #0F172A" }}
              >
                <span
                  className="inline-block rounded-lg px-2.5 py-1 text-xs font-black text-white"
                  style={{ background: "#0F172A" }}
                >
                  STEP {s.step}
                </span>
                <h3 className="mt-3 text-base font-bold text-slate-900">{s.title}</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Invited Friends List */}
        <div className="mt-10">
          <h2
            className="text-xl font-bold text-slate-900"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Invited Friends History
          </h2>

          {referrals.length === 0 ? (
            <div
              className="mt-4 flex flex-col items-center gap-3 rounded-2xl py-12 text-center shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
              style={{ background: "#fff", border: "2px solid #0F172A" }}
            >
              <Users size={32} className="text-slate-300" />
              <p className="text-sm font-medium text-slate-500">
                You haven&apos;t invited any friends yet. Share your code above to start earning!
              </p>
            </div>
          ) : (
            <div
              className="mt-4 overflow-hidden rounded-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
              style={{ background: "#fff", border: "2px solid #0F172A" }}
            >
              <div className="divide-y divide-slate-100">
                {referrals.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{r.refereeName}</p>
                      <p className="text-xs text-slate-500">{r.refereeEmail}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {r.status === "REWARDED" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                          <Check size={12} /> +{r.rewardCoins} Coins Credited
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                          Pending KYC Verification
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
