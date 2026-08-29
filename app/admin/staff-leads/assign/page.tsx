import { getStaffLeadsAction, getStaffMembersAction } from "@/app/actions/staff-leads.actions";
import { StaffLeadsAssignClient } from "@/components/admin/staff-leads/StaffLeadsAssignClient";

export const metadata = { title: "Assign Leads — Staff CRM" };
export const dynamic = "force-dynamic";

export default async function StaffLeadsAssignPage() {
  const [leadsRes, staffRes] = await Promise.all([
    getStaffLeadsAction({ status: "NEW", pageSize: 500 }),
    getStaffMembersAction(),
  ]);

  const leads = (leadsRes.success && leadsRes.data) ? leadsRes.data.leads : [];
  const total = (leadsRes.success && leadsRes.data) ? leadsRes.data.total : leads.length;
  const staff = (staffRes.success && staffRes.data) ? staffRes.data.staff : [];

  return <StaffLeadsAssignClient leads={leads} totalPoolCount={total} staff={staff} />;
}
