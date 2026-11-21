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
 * Broad positive intent for "let me pay from this chat" or "send plan details".
 * Whenever a tutor asks for plan details, pricing, membership, or how to pay,
 * send the payment QR code as well with the plan.
 */
export function wantsPaymentQrInChat(raw: string, replyBody?: string): boolean {
  const t = raw.trim();
  if (!t || blocksPaymentQrInChat(t)) return false;

  // Explicit payment/QR intents — always show QR
  if (asksPlanPaymentOrQr(t)) return true;
  if (/\b(?:qr|qrcode|upi|scan\s*(?:qr|karo|kar)|paytm|phonepe|gpay|google\s*pay|razorpay)\b/i.test(t)) return true;
  if (/\b(?:1257|₹\s?1,257|rs\.?\s?1257)\b/i.test(t)) return true;
  if (/^\s*(?:pay|payment|qr)\s*$/i.test(t)) return true;
  if (/^\s*(?:done|paid|pay\s*done|payment\s*done|utr\b|paid\s+\S+)/i.test(t)) return true;
  if (/\b(?:screenshot|ss|receipt|payment\s*proof)\b.{0,20}\b(?:bhej|send|diya|kar|done|h)\b/i.test(t)) return true;

  // Plan / Membership intent — send QR as well with plan!
  if (asksCommissionPlan(t) || asksZeroCommissionPlan(t)) return true;
  if (/\b(?:plans*|membership|pricing|package|packages|recharge|coins?|buy\s*coins|wallet)\b/i.test(t)) return true;

  // If the outbound reply itself presents the plan details or payment link
  if (replyBody && /\b(?:apnatutorhub\.com\/tutor\/plans|commission\s*based\s*plan|9311459543@kotakbank)\b/i.test(replyBody)) {
    return true;
  }

  // Lead unlock context — show QR when explicitly asking HOW to unlock (not just "interested")
  if (/\b(?:unlock|contact|number|parent)\b.{0,30}\b(?:kaise|kab|hoga)\b/i.test(t)) return true;

  return false;
}

export function shouldIncludePaymentQr(raw: string, replyBody?: string): boolean {
  return wantsPaymentQrInChat(raw, replyBody);
}
