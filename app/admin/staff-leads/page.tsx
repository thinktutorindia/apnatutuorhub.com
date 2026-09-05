import {
  getStaffLeadStatsAction,
  getStaffLeadsAction,
  getStaffLeadBatchesAction,
  getDataPipelineAction,
  getStaffLiveStatusAction,
  getStaffLeadActivityFeedAction,
  getStaffMembersAction,
} from "@/app/actions/staff-leads.actions";
import { StaffLeadsDashboardClient } from "@/components/admin/staff-leads/StaffLeadsDashboardClient";
import { auth } from "@/auth";

export const metadata = { title: "Staff Leads CRM — ApnaTutorHub Admin" };
export const dynamic = "force-dynamic";

export default async function StaffLeadsPage() {
  const session = await auth();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const DEFAULT_PAGE_SIZE = 50;

  const [statsRes, leadsRes, batchesRes, pipelineRes, liveStatusRes, activityRes, staffRes] = await Promise.all([
    getStaffLeadStatsAction().catch(() => ({ success: false, data: null })),
    getStaffLeadsAction({ pageSize: DEFAULT_PAGE_SIZE }).catch(() => ({ success: false, data: null })),
    getStaffLeadBatchesAction().catch(() => ({ success: false, data: null })),
    getDataPipelineAction().catch(() => ({ success: false, data: null })),
    getStaffLiveStatusAction().catch(() => ({ success: false, data: null })),
    getStaffLeadActivityFeedAction({ limit: 15 }).catch(() => ({ success: false, data: null })),
    isSuperAdmin
      ? getStaffMembersAction().catch(() => ({ success: false, data: null }))
      : Promise.resolve({ success: false, data: null }),
  ]);

  const stats = (statsRes.success && statsRes.data) ? statsRes.data : null;
  const rawLeads = (leadsRes.success && leadsRes.data) ? leadsRes.data.leads : [];
  const total = (leadsRes.success && leadsRes.data) ? leadsRes.data.total : 0;
  const rawBatches = (batchesRes.success && batchesRes.data) ? batchesRes.data.batches : [];
  const pipeline = (pipelineRes.success && pipelineRes.data) ? pipelineRes.data : null;
  const liveStatus = (liveStatusRes.success && liveStatusRes.data) ? liveStatusRes.data : null;
  const rawActivityFeed = (activityRes.success && activityRes.data) ? activityRes.data.logs : [];
  const staff = (staffRes.success && staffRes.data) ? staffRes.data.staff : [];

  const leads = rawLeads.map((l) => ({
    ...l,
    createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : new Date().toISOString(),
    lastContactedAt: l.lastContactedAt ? new Date(l.lastContactedAt).toISOString() : null,
    nextFollowUpAt: l.nextFollowUpAt ? new Date(l.nextFollowUpAt).toISOString() : null,
  }));

  const batches = rawBatches.map((b) => ({
    ...b,
    createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString(),
  }));

  const activityFeed = rawActivityFeed.map((a: any) => ({
    ...a,
    calledAt: a.calledAt ? new Date(a.calledAt).toISOString() : new Date().toISOString(),
  }));

  return (
    <StaffLeadsDashboardClient
      stats={stats}
      leads={leads as any}
      total={total}
      pageSize={DEFAULT_PAGE_SIZE}
      batches={batches as any}
      staff={staff as any}
      pipeline={pipeline as any}
      liveStatus={liveStatus as any}
      activityFeed={activityFeed as any}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
