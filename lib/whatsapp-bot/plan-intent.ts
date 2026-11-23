/**
 * Plan-related intents — commission vs zero-commission must not cross-match.
 */

import { refusesAdvancePayment } from "./conversation-intents";

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
  if (
    /commission/i.test(t) &&
    /(?:bata|bataye|batao|detail|info|kya\s*hai|explain|samjha|plan|lete|leta|kitna|kay|kya\s*lete)/i.test(t)
  ) {
    return true;
  }
  return false;
}

/** How to pay / QR / UPI / activate */
export function asksPlanPaymentOrQr(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  if (refusesAdvancePayment(t)) return false;
  if (/\b(?:will not|won't|wont|do not|don't|dont|not wanna|wanna not|not want to)\s+pay\b/i.test(t)) return false;

  return (
    /\b(qr|qrcode|scan\s*qr|upi|razorpay|payment\s*link|pay\s*link)\b/i.test(t) ||
    /(?:kaise\s*(?:pay|kare|karein|payment|kharid)|payment\s*kaise|pay\s*kaise|plan\s*(?:kaise|activate|kharid)|kharid\s*(?:karu|karna|kaise)|activate\s*(?:1257|2999|plan)|1257\s*(?:pay|payment|kaise)|2999\s*(?:pay|payment|kaise))/i.test(
      t
    ) ||
    /^\s*activate\s*(1257|2999)\s*$/i.test(t) ||
    /\bi\s*(?:want|will|would like|gonna|going)\s+to\s+pay\b/i.test(t) ||
    /\b(?:ready|want)\s+to\s+pay\b/i.test(t)
  );
}

export function paymentPlanHint(raw: string): "1257" | "2999" | "any" {
  if (/1257|commission\s*(?:wala|based|plan)/i.test(raw) && !asksZeroCommissionPlan(raw)) return "1257";
  if (/2999|silver|zero\s*commission|0\s*%/i.test(raw)) return "2999";
  return "any";
}

/**
 * Messages that must NEVER trigger an in-chat QR: opt-outs, hostility,
 * pay-later objections, and unrelated login/KYC threads.
 */
export function blocksPaymentQrInChat(raw: string): boolean {
  const t = raw.trim();
  if (!t) return true;
  return (
    /\b(?:stop|unsubscribe|unsub|block|mat\s*bhejo|msg\s*mat\s*karo|band\s*karo|dont\s*send|don't\s*send)\b/i.test(t) ||
    /\b(?:not\s*interested|no\s*thanks|scam|scammer|fraud|bakwas|faltu|chutiya|dudee)\b/i.test(t) ||
    refusesAdvancePayment(t) ||
    /\b(?:free\s*(?:lead|demo|me|mein)|bina\s*(?:paise|payment|reg)|pehle\s*demo|payment\s*(?:baad|ke\s*baad)|tuition\s*milne\s*ke\s*baad|class\s*milne\s*se\s*pehle)\b/i.test(t) ||
    /\bpayment\b.{0,60}\b(?:baad|after|milne\s*ke|milne\s*par)\b/i.test(t) ||
    (/\b(?:password|login|log\s*in|otp|forgot|reset)\b/i.test(t) && !/\b(?:pay|payment|qr)\b/i.test(t)) ||
    (/\b(?:kyc|document|aadhaar|pan\s*card|marksheet|selfie)\b/i.test(t) && !/\b(?:pay|payment|qr|plan)\b/i.test(t))
  );
}

/**
 * Previously sent payment QR images in chat. Now deprecated in favor of 1-click Razorpay payment links.
 */
export function wantsPaymentQrInChat(raw: string, replyBody?: string): boolean {
  return false;
}

export function shouldIncludePaymentQr(raw: string, replyBody?: string): boolean {
  return false;
}
