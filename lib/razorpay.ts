import Razorpay from "razorpay";
import crypto from "crypto";

// ── Config ────────────────────────────────────────────────────────────────────

const KEY_ID = process.env.RAZORPAY_KEY_ID ?? "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";

export function isRazorpayConfigured(): boolean {
  return Boolean(KEY_ID && KEY_SECRET);
}

// ── Client ────────────────────────────────────────────────────────────────────

let _client: Razorpay | null = null;

function getRazorpayClient(): Razorpay {
  if (!isRazorpayConfigured()) {
    throw new Error(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file."
    );
  }
  if (!_client) {
    _client = new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });
  }
  return _client;
}

// ── Coin Packages ─────────────────────────────────────────────────────────────

/** Source-of-truth for the 3 coin tiers.
 *  These mirror rows seeded into the `coin_packages` table by Phase 9 admin setup.
 */
export const COIN_PACKAGES = [
  {
    id: "starter",
    name: "Starter Pack",
    coins: 50,
    bonusCoins: 0,
    totalCoins: 50,
    priceInr: 500,        // ₹500
    priceInPaise: 50000,  // Razorpay uses paise
    badge: null,
    bg: "#DCFCE7",
    accentBg: "#22C55E",
    popular: false,
  },
  {
    id: "pro",
    name: "Pro Pack",
    coins: 120,
    bonusCoins: 20,
    totalCoins: 140,
    priceInr: 1000,
    priceInPaise: 100000,
    badge: "Most Popular 🔥",
    bg: "#FEF3C7",
    accentBg: "#F59E0B",
    popular: true,
  },
  {
    id: "elite",
    name: "Elite Pack",
    coins: 300,
    bonusCoins: 80,
    totalCoins: 380,
    priceInr: 2200,
    priceInPaise: 220000,
    badge: "Best Value 💎",
    bg: "#F3E8FF",
    accentBg: "#8B5CF6",
    popular: false,
  },
] as const;

export type CoinPackageId = (typeof COIN_PACKAGES)[number]["id"];

export function getCoinPackage(id: CoinPackageId) {
  return COIN_PACKAGES.find((p) => p.id === id);
}

// ── Order creation ────────────────────────────────────────────────────────────

export type RazorpayOrderResult = {
  orderId: string;
  amount: number;       // paise
  currency: string;
  keyId: string;
};

export async function createRazorpayOrder(
  amountInPaise: number,
  receiptId: string,
  notes?: Record<string, string>
): Promise<RazorpayOrderResult> {
  const client = getRazorpayClient();

  const order = await client.orders.create({
    amount: amountInPaise,
    currency: "INR",
    receipt: receiptId,
    notes: notes ?? {},
  });

  return {
    orderId: order.id,
    amount: amountInPaise,
    currency: "INR",
    keyId: KEY_ID,
  };
}

// ── Signature verification ────────────────────────────────────────────────────

/** Verify the `razorpay-signature` header on incoming webhooks. */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn("[razorpay] RAZORPAY_WEBHOOK_SECRET is not set — skipping verification");
    return false;
  }

  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(signature, "hex")
  );
}

/** Verify the payment signature returned from the Razorpay checkout callback. */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!KEY_SECRET) return false;
  const payload = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac("sha256", KEY_SECRET)
    .update(payload)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(signature, "hex")
  );
}
