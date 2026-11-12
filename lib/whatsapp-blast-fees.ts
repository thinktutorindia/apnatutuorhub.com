/**
 * lib/whatsapp-blast-fees.ts
 *
 * Single source of truth for class-band fee resolution in the WhatsApp blast
 * tool. Imported by BOTH the client live-preview (WhatsAppBlastModal) and the
 * server dispatch (interested-leads.actions.ts) so the fee an admin sees in
 * the preview is guaranteed to be the fee that is actually sent.
 *
 * Bands mirror the system defaults produced by resolveSpecificClassLabel():
 *   Class 1–5  → monthly (e.g. ₹6,200/month)
 *   Class 6–8  → monthly (e.g. ₹7,200/month)
 *   Class 9–10 → hourly  (e.g. ₹750/hr)
 *   Class 11–12→ hourly  (e.g. ₹900/hr)
 */

export type BlastFeeBandKey = "1-5" | "6-8" | "9-10" | "11-12";

/** Admin-editable fee strings per class band. Empty/missing value = system default. */
export type BlastFeeOverrides = Partial<Record<BlastFeeBandKey, string>>;

export const BLAST_FEE_BAND_DEFAULTS: Record<BlastFeeBandKey, string> = {
  "1-5": "₹6,200/month",
  "6-8": "₹7,200/month",
  "9-10": "₹750/hr",
  "11-12": "₹900/hr",
};

export const BLAST_FEE_BAND_LABELS: Record<BlastFeeBandKey, string> = {
  "1-5": "Class 1–5 (monthly)",
  "6-8": "Class 6–8 (monthly)",
  "9-10": "Class 9–10 (hourly)",
  "11-12": "Class 11–12 (hourly)",
};

/**
 * Map a lead/meta to its fee band from the resolved class label.
 * The class label is always a specific concrete class ("Class 7", "Class 11"…)
 * produced by resolveSpecificClassLabel(), so band detection from it stays in
 * lockstep with that function's own fee logic.
 */
export function blastFeeBandForLead(lead: {
  classCategory?: string | null;
  classLabel?: string | null;
}): BlastFeeBandKey | null {
  const label = (lead.classLabel || "").trim();
  const match = label.match(/(\d+)/);
  const grade = match ? parseInt(match[1], 10) : NaN;
  if (Number.isNaN(grade)) return null;

  if (lead.classCategory === "CLASS_9_12") return grade >= 11 ? "11-12" : "9-10";
  if (lead.classCategory === "CLASS_1_8") return grade >= 6 ? "6-8" : "1-5";
  return null;
}

/**
 * Resolve the effective fee string for a lead:
 * admin override (per class band) → system default for the band → raw recommendedFee.
 */
export function resolveBlastFee(
  lead: { classCategory?: string | null; classLabel?: string | null; recommendedFee?: string | null },
  overrides?: BlastFeeOverrides
): string {
  const band = blastFeeBandForLead(lead);
  if (band) {
    const override = (overrides?.[band] ?? "").trim();
    if (override) return override;
    return BLAST_FEE_BAND_DEFAULTS[band];
  }
  return lead.recommendedFee || BLAST_FEE_BAND_DEFAULTS["1-5"];
}

/** Strip empty override values server-side so blanks cleanly fall back to defaults. */
export function sanitizeBlastFeeOverrides(
  overrides?: BlastFeeOverrides
): BlastFeeOverrides | undefined {
  if (!overrides) return undefined;
  const out: BlastFeeOverrides = {};
  let hasAny = false;
  for (const band of Object.keys(BLAST_FEE_BAND_DEFAULTS) as BlastFeeBandKey[]) {
    const value = (overrides[band] ?? "").trim();
    if (value) {
      out[band] = value;
      hasAny = true;
    }
  }
  return hasAny ? out : undefined;
}
