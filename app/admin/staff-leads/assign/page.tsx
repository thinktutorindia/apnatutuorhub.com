import { getStaffLeadsAction, getStaffMembersAction } from "@/app/actions/staff-leads.actions";
import { StaffLeadsAssignClient } from "@/components/admin/staff-leads/StaffLeadsAssignClient";

export const metadata = { title: "Assign Leads — Staff CRM" };

export default async function StaffLeadsAssignPage() {
  const [leadsRes, staffRes] = await Promise.all([
    getStaffLeadsAction({ status: "NEW", pageSize: 200 }),
    getStaffMembersAction(),
  ]);

  const leads = (leadsRes.success && leadsRes.data) ? leadsRes.data.leads : [];
  const staff = (staffRes.success && staffRes.data) ? staffRes.data.staff : [];

  return <StaffLeadsAssignClient leads={leads} staff={staff} />;
}
