import { getStaffCrmManagementHubDataAction } from "@/app/actions/staff-leads.actions";
import { StaffCrmManagementClient } from "@/components/admin/staff-leads/StaffCrmManagementClient";

export const metadata = { title: "Manage Staff CRM — ApnaTutorHub Admin" };

export default async function StaffCrmManagePage() {
  const res = await getStaffCrmManagementHubDataAction();

  const staffStats = (res.success && res.data) ? res.data.staffStats : [];
  const batchStats = (res.success && res.data) ? res.data.batchStats : [];
  const statusBreakdown = (res.success && res.data) ? res.data.statusBreakdown : {};
  const unassignedCount = (res.success && res.data) ? res.data.unassignedCount : 0;
  const dueFollowUpsCount = (res.success && res.data) ? res.data.dueFollowUpsCount : 0;

  return (
    <StaffCrmManagementClient
      staffStats={staffStats}
      batchStats={batchStats}
      statusBreakdown={statusBreakdown}
      unassignedCount={unassignedCount}
      dueFollowUpsCount={dueFollowUpsCount}
    />
  );
}
