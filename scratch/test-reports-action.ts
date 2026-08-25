import { getStaffDailyWorkReportsAction } from "@/app/actions/staff-leads.actions";

async function main() {
  try {
    const res = await getStaffDailyWorkReportsAction();
    console.log("getStaffDailyWorkReportsAction returned:", res.success);
    if (res.data) {
      console.log("Daily count:", res.data.dailyBreakdown.length);
      console.log("Staff count:", res.data.staffWeeklyMatrix.length);
      console.log("Summary:", res.data.periodSummary);
    }
  } catch (e) {
    console.error("Action error:", e);
  }
}

main();
