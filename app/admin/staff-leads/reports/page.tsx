import { auth } from "@/auth";
import { getStaffDailyWorkReportsAction } from "@/app/actions/staff-leads.actions";
import { StaffCrmReportsClient } from "@/components/admin/staff-leads/StaffCrmReportsClient";

export const metadata = { title: "Daily & Weekly CRM Reports & Timesheets — ApnaTutorHub Admin" };
export const dynamic = "force-dynamic";

export default async function StaffCrmReportsPage() {
  const session = await auth();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const res = await getStaffDailyWorkReportsAction();

  const workSessions = res.success && res.data ? res.data.workSessions : [];
  const dailyBreakdown = res.success && res.data ? res.data.dailyBreakdown : [];
  const staffWeeklyMatrix = res.success && res.data ? res.data.staffWeeklyMatrix : [];
  const periodSummary = res.success && res.data ? res.data.periodSummary : {
    totalCalls: 0,
    totalAnswered: 0,
    totalConverted: 0,
    totalCallbacks: 0,
    totalNoAnswer: 0,
    totalHoursWorked: 0,
    totalShifts: 0,
    answerRate: 0,
    conversionRate: 0,
  };
  const staffList = res.success && res.data ? res.data.staffList : [];

  return (
    <StaffCrmReportsClient
      initialWorkSessions={workSessions}
      initialDailyBreakdown={dailyBreakdown}
      initialStaffWeeklyMatrix={staffWeeklyMatrix}
      initialPeriodSummary={periodSummary}
      staffList={staffList}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
