import { auth } from "@/auth";
import {
  getStaffDailyWorkReportsAction,
  getStaffLiveStatusAction,
  getStaffLeadActivityFeedAction,
} from "@/app/actions/staff-leads.actions";
import { StaffCrmReportsClient } from "@/components/admin/staff-leads/StaffCrmReportsClient";

export const metadata = { title: "Staff Shifts, Timesheets & Live Operations — ApnaTutorHub Admin" };
export const dynamic = "force-dynamic";

export default async function StaffCrmReportsPage() {
  const session = await auth();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const [reportsRes, liveStatusRes, activityRes] = await Promise.all([
    getStaffDailyWorkReportsAction().catch(() => ({ success: false, data: null })),
    getStaffLiveStatusAction().catch(() => ({ success: false, data: null })),
    getStaffLeadActivityFeedAction({ limit: 40 }).catch(() => ({ success: false, data: null })),
  ]);

  const workSessions = (reportsRes.success && reportsRes.data) ? reportsRes.data.workSessions : [];
  const dailyBreakdown = (reportsRes.success && reportsRes.data) ? reportsRes.data.dailyBreakdown : [];
  const staffWeeklyMatrix = (reportsRes.success && reportsRes.data) ? reportsRes.data.staffWeeklyMatrix : [];
  const periodSummary = (reportsRes.success && reportsRes.data) ? reportsRes.data.periodSummary : {
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
  const staffList = (reportsRes.success && reportsRes.data) ? reportsRes.data.staffList : [];
  const liveStatus = (liveStatusRes.success && liveStatusRes.data) ? liveStatusRes.data : null;
  const rawActivity = (activityRes.success && activityRes.data) ? activityRes.data.logs : [];

  const activityFeed = rawActivity.map((a: any) => ({
    ...a,
    calledAt: a.calledAt ? new Date(a.calledAt).toISOString() : new Date().toISOString(),
  }));

  return (
    <StaffCrmReportsClient
      initialWorkSessions={workSessions}
      initialDailyBreakdown={dailyBreakdown}
      initialStaffWeeklyMatrix={staffWeeklyMatrix}
      initialPeriodSummary={periodSummary}
      staffList={staffList}
      liveStatus={liveStatus as any}
      initialActivityFeed={activityFeed as any}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
