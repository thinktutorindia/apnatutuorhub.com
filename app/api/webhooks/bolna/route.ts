/**
 * Bolna inbound caller match + live tools.
 *
 * GET  /api/webhooks/bolna?contact_number=+91...   lookup (Calling tab inbound API)
 * POST /api/webhooks/bolna                         { action: lookup|update|leads, ... }
 *
 * Auth: Authorization: Bearer $BOLNA_WEBHOOK_SECRET
 */
import { NextResponse } from "next/server";
import {
  flattenBolnaBody,
  lookupCaller,
  matchingLeadsForCaller,
  updateCaller,
  type BolnaUpdateInput,
} from "@/lib/bolna/profile";

export const runtime = "nodejs";

function bolnaSecret(): string {
  return (process.env.BOLNA_WEBHOOK_SECRET || "").trim();
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function authorize(request: Request): boolean {
  const secret = bolnaSecret();
  if (!secret) {
    console.error("[bolna] BOLNA_WEBHOOK_SECRET is not set");
    return false;
  }
  const header =
    request.headers.get("authorization") ||
    request.headers.get("x-bolna-secret") ||
    request.headers.get("x-api-key") ||
    "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  return token.length > 0 && token === secret;
}

function hasProfileFields(input: BolnaUpdateInput): boolean {
  return Boolean(
    input.name ||
      input.customer_name ||
      input.classes ||
      input.subjects ||
      input.location ||
      input.city ||
      input.nearest_metro ||
      input.teaching_mode ||
      input.email ||
      (input.role && /tutor|parent|teacher/i.test(input.role))
  );
}

function actionOf(input: BolnaUpdateInput, fallback: string): string {
  const raw = (input.action || "").toLowerCase().trim();
  const a = raw || (fallback === "update" && !hasProfileFields(input) ? "lookup" : fallback);
  if (a === "save" || a === "save_tutor_profile" || a === "update_profile") return "update";
  if (a === "lookup_caller" || a === "get_caller") return "lookup";
  if (a === "get_matching_leads" || a === "leads") return "leads";
  if (a === "parent_enquiry" || a === "save_parent_enquiry") return "parent";
  return a || fallback;
}

async function handle(input: BolnaUpdateInput, fallbackAction: string) {
  const action = actionOf(input, fallbackAction);

  if (action === "update" || action === "parent") {
    if (action === "parent") input.role = "PARENT";
    return updateCaller(input);
  }
  if (action === "leads") {
    return matchingLeadsForCaller(input);
  }
  return lookupCaller(input.contact_number || input.from_number || input.phone || "");
}

export async function GET(request: Request) {
  if (!authorize(request)) return unauthorized();
  const url = new URL(request.url);
  const input: BolnaUpdateInput = {
    contact_number: url.searchParams.get("contact_number") || "",
    from_number: url.searchParams.get("from_number") || "",
    phone: url.searchParams.get("phone") || "",
    action: url.searchParams.get("action") || "lookup",
    classes: url.searchParams.get("classes") || "",
    subjects: url.searchParams.get("subjects") || "",
    location: url.searchParams.get("location") || "",
    city: url.searchParams.get("city") || "",
  };
  const result = await handle(input, "lookup");
  return NextResponse.json(result);
}

function isBolnaExecutionPayload(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const rec = body as Record<string, unknown>;
  return Boolean(
    rec.status &&
      (rec.execution_id || rec.id || rec.transcript || rec.conversation_time || rec.agent_id)
  );
}

function phoneFromExecution(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const rec = body as Record<string, unknown>;
  const telephony = rec.telephony_data && typeof rec.telephony_data === "object"
    ? (rec.telephony_data as Record<string, unknown>)
    : {};
  return String(
    rec.from_number ||
      rec.contact_number ||
      telephony.from ||
      telephony.from_number ||
      rec.user_number ||
      ""
  );
}

export async function POST(request: Request) {
  if (!authorize(request)) return unauthorized();
  const contentType = request.headers.get("content-type") || "";
  let body: unknown = {};
  try {
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await request.text();
      body = Object.fromEntries(new URLSearchParams(text).entries());
    } else {
      body = await request.json();
    }
  } catch {
    body = {};
  }

  // Extractions tab "Send test" / post-call status webhook — not a live tool call.
  if (isBolnaExecutionPayload(body) && !flattenBolnaBody(body).action) {
    const phone = phoneFromExecution(body);
    if (phone) {
      const profile = await lookupCaller(phone);
      return NextResponse.json({ received: true, profile });
    }
    return NextResponse.json({ received: true });
  }

  const input = flattenBolnaBody(body);
  if (!input.from_number && !input.contact_number && !input.phone) {
    const nestedPhone = phoneFromExecution(body);
    if (nestedPhone) input.from_number = nestedPhone;
  }
  const result = await handle(input, "update");
  return NextResponse.json(result);
}
