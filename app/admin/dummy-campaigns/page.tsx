import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getDummyCampaignStats } from "@/app/actions/dummy-campaign.actions";
import { DummyCampaignDashboard } from "@/components/admin/DummyCampaignDashboard";

export const metadata = { title: "Dummy Lead Campaigns — Admin | ApnaTutorHub" };
export const dynamic = "force-dynamic";

export default async function DummyCampaignsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") redirect("/admin/dashboard");

  const stats = await getDummyCampaignStats();

  return (
    <DummyCampaignDashboard
      campaigns={stats.campaigns as any}
      totalCampaigns={stats.totalCampaigns}
      activeCampaigns={stats.activeCampaigns}
      sentToday={stats.sentToday}
      sentThisMonth={stats.sentThisMonth}
      dailyVolume={stats.dailyVolume}
      channelBreakdown={stats.channelBreakdown}
    />
  );
}
