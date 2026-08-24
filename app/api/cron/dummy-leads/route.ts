import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runCampaignPass } from "@/lib/dummy-lead-engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Validate cron secret to prevent unauthorized triggers
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET ?? "";
  const isProd = process.env.NODE_ENV === "production";

  if (isProd && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const activeCampaigns = await prisma.dummyCampaign.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
    });

    const results: Array<{ id: string; name: string; sent: number; failed: number; usersProcessed: number }> = [];

    for (const campaign of activeCampaigns) {
      const result = await runCampaignPass(campaign.id);
      results.push({
        id: campaign.id,
        name: campaign.name,
        ...result,
      });
    }

    const totalSent = results.reduce((a, r) => a + r.sent, 0);
    const totalFailed = results.reduce((a, r) => a + r.failed, 0);

    console.info(`[dummy-leads cron] Ran ${activeCampaigns.length} campaigns. Total sent: ${totalSent}, failed: ${totalFailed}`);

    return NextResponse.json({
      success: true,
      campaignsRun: activeCampaigns.length,
      totalSent,
      totalFailed,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[dummy-leads cron] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
