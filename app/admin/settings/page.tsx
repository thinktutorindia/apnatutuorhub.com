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
const GROUP_COLOR: Record<string, string> = {
  "Coin Pricing": "#22C55E",
  "Lead Rules": "#3B82F6",
  "Matching Engine": "#F59E0B",
  "Ranking Weights": "#8B5CF6",
};

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Load current DB values
  const rows = await prisma.platformSetting.findMany({
    select: { key: true, value: true },
  });
  const dbValues = new Map(rows.map((r) => [r.key, Number(r.value)]));

  const keys = Object.keys(PLATFORM_SETTING_DEFAULTS) as PlatformSettingKey[];

  // Current value: DB override OR code default
  const current = Object.fromEntries(
    keys.map((k) => [k, dbValues.has(k) ? dbValues.get(k)! : PLATFORM_SETTING_DEFAULTS[k]])
  ) as Record<PlatformSettingKey, number>;

  return (
    <div style={{ color: "#F8FAFC" }}>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <Settings size={16} style={{ color: "#22C55E" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: "-0.04em" }}>
              Platform Settings
            </h1>
            <p className="text-sm" style={{ color: "#475569" }}>
              Changes take effect immediately — all workers read these values dynamically
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {GROUPS.map((group) => {
          const groupKeys = keys.filter((k) => SETTING_META[k].group === group);
          const color = GROUP_COLOR[group] ?? "#64748B";
          return (
            <div
              key={group}
              className="overflow-hidden rounded-2xl"
              style={{ background: "#0F172A", border: "1px solid #1E293B" }}
            >
              <div
                className="flex items-center gap-3 px-5 py-4"
                style={{ borderBottom: "1px solid #1E293B", background: `${color}08` }}
              >
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ background: color }}
                />
                <h2 className="font-semibold" style={{ color, fontFamily: "'Poppins', sans-serif" }}>
                  {group}
                </h2>
              </div>

              <div className="divide-y" style={{ borderColor: "#0A0F1E" }}>
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
                      className="px-5 py-4"
                    >
                      <input type="hidden" name="key" value={key} />
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-white">{meta.label}</p>
                            {isOverridden && (
                              <span
                                className="rounded-full px-2 py-0.5 text-xs font-semibold"
                                style={{ background: `${color}15`, color }}
                              >
                                Custom
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 flex items-center gap-1 text-xs" style={{ color: "#475569" }}>
                            <Info size={10} />
                            {meta.description}
                            <span style={{ color: "#334155" }}>
                              · Default: {defaultVal} {meta.unit}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            name="value"
                            defaultValue={val}
                            min={meta.min}
                            max={meta.max}
                            step="1"
                            required
                            className="w-28 rounded-xl px-3 py-2 text-right text-sm font-semibold text-white outline-none"
                            style={{ background: "#1E293B", border: `1px solid ${color}30` }}
                          />
                          <span className="text-xs" style={{ color: "#475569" }}>
                            {meta.unit}
                          </span>
                          <button
                            type="submit"
                            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all hover:opacity-90"
                            style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
                          >
                            <Save size={12} />
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
      <div
        className="mt-6 rounded-2xl px-5 py-4"
        style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}
      >
        <p className="flex items-start gap-2 text-sm" style={{ color: "#3B82F6" }}>
          <Info size={16} className="mt-0.5 flex-shrink-0" />
          All settings are persisted in the <code className="rounded px-1 py-0.5 text-xs" style={{ background: "rgba(59,130,246,0.12)" }}>platform_settings</code> table.
          Changes are read dynamically by matching workers, lead pricing, and ranking engines — no redeployment required.
        </p>
      </div>
    </div>
  );
}

