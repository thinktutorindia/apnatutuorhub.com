import { getStaffLeadStatsAction, getStaffLeadsAction, getStaffLeadBatchesAction, getDataPipelineAction, getStaffLiveStatusAction, getStaffLeadActivityFeedAction } from "@/app/actions/staff-leads.actions";
import { StaffLeadsDashboardClient } from "@/components/admin/staff-leads/StaffLeadsDashboardClient";
import { auth } from "@/auth";

export const metadata = { title: "Staff Leads CRM — ApnaTutorHub Admin" };
export const dynamic = "force-dynamic";

export default async function StaffLeadsPage() {
  const session = await auth();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const [statsRes, leadsRes, batchesRes, pipelineRes, liveStatusRes, activityRes] = await Promise.all([
    getStaffLeadStatsAction(),
    getStaffLeadsAction({ pageSize: 100 }),
    getStaffLeadBatchesAction(),
    getDataPipelineAction(),
    getStaffLiveStatusAction(),
    getStaffLeadActivityFeedAction({ limit: 15 }),
  ]);

  const stats = (statsRes.success && statsRes.data) ? statsRes.data : null;
  const leads = (leadsRes.success && leadsRes.data) ? leadsRes.data.leads : [];
  const total = (leadsRes.success && leadsRes.data) ? leadsRes.data.total : 0;
  const batches = (batchesRes.success && batchesRes.data) ? batchesRes.data.batches : [];
  const pipeline = (pipelineRes.success && pipelineRes.data) ? pipelineRes.data : null;
  const liveStatus = (liveStatusRes.success && liveStatusRes.data) ? liveStatusRes.data : null;
  const activityFeed = (activityRes.success && activityRes.data) ? activityRes.data.logs : [];

  return (
    <StaffLeadsDashboardClient
      stats={stats}
      leads={leads}
      total={total}
      batches={batches}
      pipeline={pipeline as any}
      liveStatus={liveStatus as any}
      activityFeed={activityFeed as any}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
