import { getStaffLeadStatsAction, getStaffLeadsAction, getStaffLeadBatchesAction } from "@/app/actions/staff-leads.actions";
import { StaffLeadsDashboardClient } from "@/components/admin/staff-leads/StaffLeadsDashboardClient";

export const metadata = { title: "Staff Leads CRM — ApnaTutorHub Admin" };

export default async function StaffLeadsPage() {
  const [statsRes, leadsRes, batchesRes] = await Promise.all([
    getStaffLeadStatsAction(),
    getStaffLeadsAction({ pageSize: 100 }),
    getStaffLeadBatchesAction(),
  ]);

  const stats = (statsRes.success && statsRes.data) ? statsRes.data : null;
  const leads = (leadsRes.success && leadsRes.data) ? leadsRes.data.leads : [];
  const total = (leadsRes.success && leadsRes.data) ? leadsRes.data.total : 0;
  const batches = (batchesRes.success && batchesRes.data) ? batchesRes.data.batches : [];

  return <StaffLeadsDashboardClient stats={stats} leads={leads} total={total} batches={batches} />;
}
