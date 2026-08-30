import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { parseWhatsAppDump } from "@/lib/staff-lead-parser";

export const maxDuration = 60; // Allow long running for large batches

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }
    if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SUB_ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    let rawText = "";
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const text = formData.get("rawText") as string | null;
      if (file) {
        rawText = await file.text();
      } else if (text) {
        rawText = text;
      }
    } else {
      const body = await req.json();
      rawText = body.rawText || "";
    }

    if (!rawText || !rawText.trim()) {
      return NextResponse.json({ success: false, error: "Please provide valid lead data or upload a file" }, { status: 400 });
    }

    const result = await parseWhatsAppDump(rawText);

    // Extract all unique phones and emails
    const phones = [...new Set(result.leads.map((l) => l.phone).filter((p): p is string => Boolean(p)))];
    const emails = [...new Set(result.leads.map((l) => l.email?.toLowerCase()).filter((e): e is string => Boolean(e)))];

    // Query in chunks of 500 to prevent DB parameter limit
    const CHUNK_SIZE = 500;
    const existingStaffLeads: Array<{ phone: string | null; email: string | null; name: string | null; status: string }> = [];
    const existingUsers: Array<{ phone: string | null; email: string | null; name: string | null; role: string }> = [];

    const phoneChunks: string[][] = [];
    for (let i = 0; i < phones.length; i += CHUNK_SIZE) phoneChunks.push(phones.slice(i, i + CHUNK_SIZE));
    if (phoneChunks.length === 0) phoneChunks.push([]);

    const emailChunks: string[][] = [];
    for (let i = 0; i < emails.length; i += CHUNK_SIZE) emailChunks.push(emails.slice(i, i + CHUNK_SIZE));
    if (emailChunks.length === 0) emailChunks.push([]);

    await Promise.all([
      ...phoneChunks.filter((c) => c.length > 0).map(async (chunk) => {
        const [staff, users] = await Promise.all([
          prisma.staffLead.findMany({
            where: { phone: { in: chunk } },
            select: { phone: true, email: true, name: true, status: true },
          }),
          prisma.user.findMany({
            where: { phone: { in: chunk } },
            select: { phone: true, email: true, name: true, role: true },
          }),
        ]);
        existingStaffLeads.push(...staff);
        existingUsers.push(...users);
      }),
      ...emailChunks.filter((c) => c.length > 0).map(async (chunk) => {
        const [staff, users] = await Promise.all([
          prisma.staffLead.findMany({
            where: { email: { in: chunk, mode: "insensitive" as const } },
            select: { phone: true, email: true, name: true, status: true },
          }),
          prisma.user.findMany({
            where: { email: { in: chunk, mode: "insensitive" as const } },
            select: { phone: true, email: true, name: true, role: true },
          }),
        ]);
        existingStaffLeads.push(...staff);
        existingUsers.push(...users);
      }),
    ]);

    const staffPhoneMap = new Map(existingStaffLeads.filter((s) => s.phone).map((s) => [s.phone!, s]));
    const staffEmailMap = new Map(existingStaffLeads.filter((s) => s.email).map((s) => [s.email!.toLowerCase(), s]));
    const userPhoneMap = new Map(existingUsers.filter((u) => u.phone).map((u) => [u.phone!, u]));
    const userEmailMap = new Map(existingUsers.filter((u) => u.email).map((u) => [u.email!.toLowerCase(), u]));

    const enrichedLeads = result.leads.map((lead) => {
      const phone = lead.phone ?? "";
      const email = lead.email?.toLowerCase() ?? "";

      if (phone && userPhoneMap.has(phone)) {
        const u = userPhoneMap.get(phone)!;
        return {
          ...lead,
          isDuplicate: true,
          duplicateSource: "USER" as const,
          duplicateDetail: `Already registered as ${u.role} (${u.name ?? u.email})`,
        };
      }
      if (email && userEmailMap.has(email)) {
        const u = userEmailMap.get(email)!;
        return {
          ...lead,
          isDuplicate: true,
          duplicateSource: "USER" as const,
          duplicateDetail: `Already registered as ${u.role} (${u.name ?? u.email})`,
        };
      }

      if (phone && staffPhoneMap.has(phone)) {
        const s = staffPhoneMap.get(phone)!;
        return {
          ...lead,
          isDuplicate: true,
          duplicateSource: "STAFF_LEAD" as const,
          duplicateDetail: `Already in CRM as ${s.name ?? "Lead"} (${s.status})`,
        };
      }
      if (email && staffEmailMap.has(email)) {
        const s = staffEmailMap.get(email)!;
        return {
          ...lead,
          isDuplicate: true,
          duplicateSource: "STAFF_LEAD" as const,
          duplicateDetail: `Already in CRM as ${s.name ?? "Lead"} (${s.status})`,
        };
      }

      return {
        ...lead,
        isDuplicate: false,
        duplicateSource: null,
        duplicateDetail: null,
      };
    });

    const totalLeads = enrichedLeads.length;
    const totalPhones = enrichedLeads.filter((l) => Boolean(l.phone)).length;
    const totalEmails = enrichedLeads.filter((l) => Boolean(l.email)).length;
    const totalDuplicates = enrichedLeads.filter((l) => l.isDuplicate).length;
    const totalReady = enrichedLeads.filter((l) => !l.isDuplicate && (l.phone || l.email)).length;

    // Cap preview slice to 500 records for fast browser rendering
    const previewSlice = enrichedLeads.slice(0, 500);

    return NextResponse.json({
      success: true,
      data: {
        leads: previewSlice,
        junkCount: result.junkCount,
        totalMessages: result.totalMessages,
        totalLeadsCount: totalLeads,
        totalPhonesCount: totalPhones,
        totalEmailsCount: totalEmails,
        totalDuplicatesCount: totalDuplicates,
        totalReadyCount: totalReady,
        isPreviewCapped: totalLeads > 500,
      },
    });
  } catch (err: any) {
    console.error("[api/admin/staff-leads/preview]", err);
    return NextResponse.json({ success: false, error: err?.message || "Failed to process leads" }, { status: 500 });
  }
}
