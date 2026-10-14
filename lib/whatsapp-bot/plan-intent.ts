/**
 * Plan-related intents — commission vs zero-commission must not cross-match.
 */

const ZERO_COMMISSION =
  /(?:without|with\s*out|no|zero|0\s*%|bina|non[\s-]*commission|commission\s*(?:nahi|free|free\s*plan)|0\s*commission)/i;

const COMMISSION_PLAN =
  /(?:commission\s*(?:wala|wali|plan|based|system|deal|pe|model|wali\s*plan)|1257|50\s*%\s*commission|commission\s*kya\s*hai|commission\s*pe\s*plan)/i;

/** User wants 0% / Silver / no commission plan */
export function asksZeroCommissionPlan(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;

  if (ZERO_COMMISSION.test(t) && /(?:plan|membership|wala|option|package|model)/i.test(t)) {
    return true;
  }
  if (/(?:no\s*commission|zero\s*commission|0\s*%\s*commission|bina\s*commission)/i.test(t)) {
    return true;
  }
  if (/(?:silver\s*plan|growth\s*plan|2999|full\s*fee|100\s*%\s*fee)/i.test(t)) {
    return true;
  }
  return false;
}

/** User wants ₹1,257 commission-based plan (not zero-commission) */
export function asksCommissionPlan(raw: string): boolean {
  const t = raw.trim();
  if (!t || asksZeroCommissionPlan(t)) return false;

  if (COMMISSION_PLAN.test(t)) return true;
  if (/commission/i.test(t) && /(?:bata|bataye|batao|detail|info|kya\s*hai|explain|samjha|plan)/i.test(t)) {
    return true;
  }
  return false;
}

/** How to pay / QR / UPI / activate */
export function asksPlanPaymentOrQr(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;

  return (
    /\b(qr|qrcode|scan\s*qr|upi|razorpay|payment\s*link|pay\s*link)\b/i.test(t) ||
    /(?:kaise\s*(?:pay|kare|karein|payment|kharid)|payment\s*kaise|pay\s*kaise|plan\s*(?:kaise|activate|kharid)|kharid\s*(?:karu|karna|kaise)|activate\s*(?:1257|2999|plan)|1257\s*(?:pay|payment|kaise)|2999\s*(?:pay|payment|kaise))/i.test(
      t
    ) ||
    /^\s*activate\s*(1257|2999)\s*$/i.test(t)
  );
}

export function paymentPlanHint(raw: string): "1257" | "2999" | "any" {
  if (/1257|commission\s*(?:wala|based|plan)/i.test(raw) && !asksZeroCommissionPlan(raw)) return "1257";
  if (/2999|silver|zero\s*commission|0\s*%/i.test(raw)) return "2999";
  return "any";
}
