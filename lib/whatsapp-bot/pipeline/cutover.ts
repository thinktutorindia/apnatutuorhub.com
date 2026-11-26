/**
 * CUTOVER DECISION — pure helper. Nothing is enabled by this file.
 * WA_CUTOVER_MODE: OFF | STAFF | NEW | P10 | P50 | P100
 */
export type CutoverMode = "OFF" | "STAFF" | "NEW" | "P10" | "P50" | "P100";

export function parseCutoverMode(value?: string | null): CutoverMode {
  const v = (value ?? "").trim().toUpperCase();
  return (["OFF", "STAFF", "NEW", "P10", "P50", "P100"] as string[]).includes(v) ? v as CutoverMode : "OFF";
}

function last10(digits: string): string {
  return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
}

export function parseAllowlist(value?: string | null): Set<string> {
  return new Set((value ?? "").split(/[,\s]+/).map((s) => last10(s.replace(/\D/g, ""))).filter(Boolean));
}

function bucket(phone: string): number {
  const digits = phone.replace(/\D/g, "");
  let h = 0;
  for (let i = 0; i < digits.length; i += 1) h = (h * 31 + Number(digits[i])) % 100000;
  return h % 100;
}

export function useNewPipeline(input: {
  mode: CutoverMode;
  phone: string;
  allowlist?: Set<string>;
  isRegistered?: boolean;
}): boolean {
  const digits = input.phone.replace(/\D/g, "");
  const phone10 = last10(digits);
  if (input.allowlist?.has(phone10)) return input.mode !== "OFF";
  switch (input.mode) {
    case "OFF": return false;
    case "STAFF": return false;
    case "NEW": return !input.isRegistered;
    case "P10": return bucket(digits) < 10;
    case "P50": return bucket(digits) < 50;
    case "P100": return true;
  }
}
