import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Settings, Save, Info } from "lucide-react";
import { updatePlatformSettingAction } from "@/app/actions/admin.actions";
import { PLATFORM_SETTING_DEFAULTS, type PlatformSettingKey } from "@/lib/platform-settings";
import { SendTestEmailForm } from "@/components/admin/SendTestEmailForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Platform Settings — Admin" };

const SETTING_META: Record<
  PlatformSettingKey,
  { label: string; description: string; group: string; unit: string; min: number; max: number }
> = {
  MAX_TUTORS_PER_LEAD: {
    label: "Max Tutors Per Lead",
    description: "Maximum number of tutors that can unlock a single lead",
    group: "Lead Rules",
    unit: "tutors",
    min: 1,
    max: 20,
  },
  LEAD_EXPIRY_HOURS: {
    label: "Lead Expiry",
    description: "Time in hours before an unfilled lead auto-expires",
    group: "Lead Rules",
    unit: "hours",
    min: 6,
    max: 168,
  },
  RADIUS_EXPANSION_STEP_KM: {
    label: "Radius Expansion Step",
    description: "Distance added during each radius expansion cycle",
    group: "Matching Engine",
    unit: "km",
    min: 1,
    max: 50,
  },
  RADIUS_EXPANSION_INTERVAL_HOURS: {
    label: "Expansion Interval",
    description: "How often the radius expansion job runs",
    group: "Matching Engine",
    unit: "hours",
    min: 1,
    max: 48,
  },
  COIN_COST_CLASS_1_8: {
    label: "Class 1-8 Lead Cost",
    description: "Coins required to unlock Class 1–8 leads",
    group: "Coin Pricing",
    unit: "coins",
    min: 1,
    max: 500,
  },
  COIN_COST_CLASS_9_12: {
    label: "Class 9-12 Lead Cost",
    description: "Coins required to unlock Class 9–12 leads",
    group: "Coin Pricing",
    unit: "coins",
    min: 1,
    max: 500,
  },
  COIN_COST_COMPETITIVE_CODING: {
    label: "JEE/NEET/Coding Lead Cost",
    description: "Coins required to unlock competitive exam / coding leads",
    group: "Coin Pricing",
    unit: "coins",
    min: 1,
    max: 500,
  },
  WEIGHT_KYC_VERIFIED: {
    label: "KYC Verified Weight",
    description: "Ranking bonus points for KYC-approved tutors",
    group: "Ranking Weights",
    unit: "pts",
    min: 0,
    max: 1000,
  },
  WEIGHT_MAX_DISTANCE: {
    label: "Distance Weight",
    description: "Max ranking points awarded for physical proximity",
    group: "Ranking Weights",
    unit: "pts",
    min: 0,
    max: 1000,
  },
  WEIGHT_BAYESIAN_RATING: {
    label: "Rating Weight",
    description: "Max ranking points awarded for Bayesian-weighted rating",
    group: "Ranking Weights",
    unit: "pts",
    min: 0,
    max: 1000,
  },
  WEIGHT_PROFILE_COMPLETION: {
    label: "Profile Completion Weight",
    description: "Max ranking points for 100% profile completeness",
    group: "Ranking Weights",
    unit: "pts",
    min: 0,
    max: 500,
  },
};

const GROUPS = ["Coin Pricing", "Lead Rules", "Matching Engine", "Ranking Weights"];

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Load current DB values
  const rows = await prisma.platformSetting.findMany({
    select: { key: true, value: true },
  });
  const dbValues = new Map(rows.map((r) => [r.key, Number(r.value)]));

  const keys = Object.keys(PLATFORM_SETTING_DEFAULTS) as PlatformSettingKey[];

  const current = Object.fromEntries(
    keys.map((k) => [k, dbValues.has(k) ? dbValues.get(k)! : PLATFORM_SETTING_DEFAULTS[k]])
  ) as Record<PlatformSettingKey, number>;

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <span className="text-[11px] font-800 uppercase tracking-widest text-[#2D9E6B]">System Configuration</span>
          <h1 className="text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            Platform Settings &amp; Dynamic Pricing
          </h1>
          <p className="text-xs text-slate-600 font-600">
            Changes take effect immediately — matching workers, coin costs, and ranking engines read these dynamically
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {GROUPS.map((group) => {
          const groupKeys = keys.filter((k) => SETTING_META[k].group === group);
          return (
            <div
              key={group}
              className="overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-xs"
            >
              <div className="flex items-center gap-3 px-6 py-4 bg-slate-50 border-b border-slate-200">
                <div className="h-2.5 w-2.5 rounded-full bg-[#2D9E6B]" />
                <h2 className="font-800 text-base text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
                  {group}
                </h2>
              </div>

              <div className="divide-y divide-slate-200">
                {groupKeys.map((key) => {
                  const meta = SETTING_META[key];
                  const defaultVal = PLATFORM_SETTING_DEFAULTS[key];
                  const val = current[key];
                  const isOverridden = dbValues.has(key);

                  return (
                    <form
                      key={key}
                      action={async (formData: FormData) => {
                        "use server";
                        await updatePlatformSettingAction(formData);
                      }}
                      className="px-4 sm:px-6 py-4 hover:bg-slate-50/60 transition-colors"
                    >
                      <input type="hidden" name="key" value={key} />
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <p className="font-800 text-[#0F2540] text-sm">{meta.label}</p>
                            {isOverridden && (
                              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-800 bg-emerald-100 text-emerald-950 border border-emerald-300">
                                Custom Override
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-600 text-slate-600">
                            {meta.description} · <span className="text-slate-700">Default: {defaultVal} {meta.unit}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            name="value"
                            defaultValue={val}
                            min={meta.min}
                            max={meta.max}
                            step="1"
                            required
                            className="w-28 h-10 rounded-2xl px-3 text-right text-sm font-800 text-[#0F2540] bg-slate-50 border border-slate-300 outline-none focus:border-[#2D9E6B]"
                          />
                          <span className="text-xs font-700 text-slate-700 w-12">
                            {meta.unit}
                          </span>
                          <button
                            type="submit"
                            className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-800 bg-[#2D9E6B] hover:bg-[#238357] text-white shadow-xs transition-all cursor-pointer"
                          >
                            <Save size={13} />
                            Save
                          </button>
                        </div>
                      </div>
                    </form>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Email Integration Test Card */}
      <div className="mt-8">
        <SendTestEmailForm currentUserEmail={session.user.email ?? undefined} />
      </div>

      {/* Info note */}
      <div className="rounded-3xl p-5 bg-sky-50 border border-sky-200">
        <p className="flex items-start gap-2 text-xs font-700 text-sky-950">
          <Info size={16} className="mt-0.5 flex-shrink-0 text-sky-700" />
          All settings are persisted in the database table and read dynamically by background workers, lead pricing calculations, and ranking algorithms — no code deployment needed.
        </p>
      </div>
    </div>
  );
}
