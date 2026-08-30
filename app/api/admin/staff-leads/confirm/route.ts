import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { parseWhatsAppDump } from "@/lib/staff-lead-parser";
import { refreshBatchProgressAction } from "@/app/actions/staff-leads.actions";
import { revalidatePath } from "next/cache";

export const maxDuration = 120; // 2 minutes for 30k+ records

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }
    if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SUB_ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    let batchName = "";
    let rawText = "";
    let excludeDuplicates = true;
    let requireContactMethod = true;
    let requireBothPhoneAndEmail = false;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const text = formData.get("rawText") as string | null;
      batchName = (formData.get("batchName") as string) || "";
      excludeDuplicates = formData.get("excludeDuplicates") !== "false";
      requireContactMethod = formData.get("requireContactMethod") !== "false";
      requireBothPhoneAndEmail = formData.get("requireBothPhoneAndEmail") === "true";

      if (file) {
        rawText = await file.text();
      } else if (text) {
        rawText = text;
      }
    } else {
      const body = await req.json();
      batchName = body.batchName || "";
      rawText = body.rawText || "";
      excludeDuplicates = body.excludeDuplicates !== false;
      requireContactMethod = body.requireContactMethod !== false;
      requireBothPhoneAndEmail = body.requireBothPhoneAndEmail === true;
    }

    if (!rawText || !rawText.trim()) {
      return NextResponse.json({ success: false, error: "No lead data provided" }, { status: 400 });
    }

    const parseResult = await parseWhatsAppDump(rawText);
    const leads = parseResult.leads;

    if (leads.length === 0) {
      return NextResponse.json({ success: false, error: "No valid leads found in data." }, { status: 400 });
    }

    // 1. In-memory deduplication
    const seenPhones = new Set<string>();
    const seenEmails = new Set<string>();
    const memoryDeduped: typeof leads = [];

    for (const lead of leads) {
      const phone = lead.phone?.trim();
      const email = lead.email?.trim().toLowerCase();

      if (requireContactMethod && !phone && !email) continue;
      if (requireBothPhoneAndEmail && (!phone || !email)) continue;

      if ((phone && seenPhones.has(phone)) || (email && seenEmails.has(email))) {
        continue;
      }
      if (phone) seenPhones.add(phone);
      if (email) seenEmails.add(email);
      memoryDeduped.push(lead);
    }

    // 2. DB deduplication
    let finalToSave = memoryDeduped;
    let skippedDuplicates = 0;

    if (excludeDuplicates) {
      const allPhones = [...new Set(memoryDeduped.map((l) => l.phone?.trim()).filter((p): p is string => Boolean(p)))];
      const allEmails = [...new Set(memoryDeduped.map((l) => l.email?.trim().toLowerCase()).filter((e): e is string => Boolean(e)))];

      const CHUNK_SIZE = 500;
      const existingStaffLeads: Array<{ phone: string | null; email: string | null }> = [];
      const existingUsers: Array<{ phone: string | null; email: string | null }> = [];

      const phoneChunks: string[][] = [];
      for (let i = 0; i < allPhones.length; i += CHUNK_SIZE) phoneChunks.push(allPhones.slice(i, i + CHUNK_SIZE));
      if (phoneChunks.length === 0) phoneChunks.push([]);

      const emailChunks: string[][] = [];
      for (let i = 0; i < allEmails.length; i += CHUNK_SIZE) emailChunks.push(allEmails.slice(i, i + CHUNK_SIZE));
      if (emailChunks.length === 0) emailChunks.push([]);

      await Promise.all([
        ...phoneChunks.filter((c) => c.length > 0).map(async (chunk) => {
          const [staff, users] = await Promise.all([
            prisma.staffLead.findMany({
              where: { phone: { in: chunk } },
              select: { phone: true, email: true },
            }),
            prisma.user.findMany({
              where: { phone: { in: chunk } },
              select: { phone: true, email: true },
            }),
          ]);
          existingStaffLeads.push(...staff);
          existingUsers.push(...users);
        }),
        ...emailChunks.filter((c) => c.length > 0).map(async (chunk) => {
          const [staff, users] = await Promise.all([
            prisma.staffLead.findMany({
              where: { email: { in: chunk, mode: "insensitive" as const } },
              select: { phone: true, email: true },
            }),
            prisma.user.findMany({
              where: { email: { in: chunk, mode: "insensitive" as const } },
              select: { phone: true, email: true },
            }),
          ]);
          existingStaffLeads.push(...staff);
          existingUsers.push(...users);
        }),
      ]);

      const dbPhones = new Set<string>([
        ...existingStaffLeads.map((s) => s.phone).filter((p): p is string => Boolean(p)),
        ...existingUsers.map((u) => u.phone).filter((p): p is string => Boolean(p)),
      ]);

      const dbEmails = new Set<string>([
        ...existingStaffLeads.map((s) => s.email?.toLowerCase()).filter((e): e is string => Boolean(e)),
        ...existingUsers.map((u) => u.email?.toLowerCase()).filter((e): e is string => Boolean(e)),
      ]);

      finalToSave = memoryDeduped.filter((lead) => {
        const phone = lead.phone?.trim();
        const email = lead.email?.trim().toLowerCase();
        if (phone && dbPhones.has(phone)) return false;
        if (email && dbEmails.has(email)) return false;
        return true;
      });

      skippedDuplicates = leads.length - finalToSave.length;
    }

    if (finalToSave.length === 0) {
      return NextResponse.json({
        success: false,
        error: `All ${leads.length} leads were skipped because they already exist in the database.`,
      }, { status: 400 });
    }

    const batch = await prisma.staffLeadBatch.create({
      data: {
        name: batchName.trim() || `Bulk Import ${new Date().toLocaleDateString("en-IN")}`,
        rawText: rawText.length > 50000 ? `${rawText.slice(0, 50000)}... [truncated ${rawText.length} chars]` : rawText,
        totalParsed: finalToSave.length,
        totalJunk: skippedDuplicates,
        createdById: session.user.id,
      },
    });

    const CHUNK_INSERT_SIZE = 1000;
    const leadsToInsert = finalToSave.map((l) => {
      const metaParts: string[] = [];
      if (l.leadType === "PARENT_LEAD") metaParts.push("[PARENT REQUIREMENT]");
      if (l.budgetFee) metaParts.push(`[BUDGET: ${l.budgetFee}]`);
      if (l.appliedCodes && l.appliedCodes.length > 0) metaParts.push(`[CODES: ${l.appliedCodes.join(", ")}]`);
      if (l.operationalNotes) metaParts.push(`[NOTES: ${l.operationalNotes}]`);

      return {
        batchId: batch.id,
        rawText: l.rawText || null,
        name: l.name || null,
        phone: l.phone?.trim() || null,
        altPhone: l.altPhone?.trim() || null,
        whatsapp: l.whatsapp?.trim() || null,
        email: l.email?.trim() || null,
        location: l.location || null,
        pincode: l.pincode || null,
        fullAddress: l.fullAddress || null,
        subjects: l.subjects ?? [],
        classes: l.classes ?? [],
        board: l.board || null,
        qualification: l.qualification || null,
        experienceYears: l.experienceYears ?? null,
        gender: l.gender || null,
        staffNotes: metaParts.length > 0 ? metaParts.join(" | ") : null,
        createdById: session.user.id,
      };
    });

    for (let i = 0; i < leadsToInsert.length; i += CHUNK_INSERT_SIZE) {
      const chunk = leadsToInsert.slice(i, i + CHUNK_INSERT_SIZE);
      await prisma.staffLead.createMany({
        data: chunk,
        skipDuplicates: true,
      });
    }

    try {
      await refreshBatchProgressAction(batch.id);
    } catch (e) {
      console.warn("[api/admin/staff-leads/confirm] Batch progress init error:", e);
    }

    revalidatePath("/admin/staff-leads");
    revalidatePath("/admin/staff-leads/manage");

    return NextResponse.json({
      success: true,
      data: {
        batchId: batch.id,
        saved: finalToSave.length,
        skippedDuplicates,
        totalParsed: leads.length,
      },
    });
  } catch (err: any) {
    console.error("[api/admin/staff-leads/confirm]", err);
    return NextResponse.json({ success: false, error: err?.message || "Failed to save batch" }, { status: 500 });
  }
}
