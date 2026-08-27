import { auth } from "@/auth";
import { getStaffDashboardDataAction } from "@/app/actions/staff-leads.actions";
import { StaffCommandCenter } from "@/components/admin/staff-leads/StaffCommandCenter";
import { redirect } from "next/navigation";

export const metadata = { title: "My Dashboard — Staff CRM Pro" };
export const dynamic = "force-dynamic";

export default async function StaffDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");
  
  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  const res = await getStaffDashboardDataAction();

  if (!res.success || !res.data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="text-5xl">⚠️</div>
          <h2 className="text-lg font-bold text-slate-800">Unable to load dashboard</h2>
          <p className="text-sm text-slate-500">{res.error || "Please try again"}</p>
        </div>
      </div>
    );
  }

  return (
    <StaffCommandCenter
      data={res.data as any}
      staffName={session.user.name ?? session.user.email ?? "Staff"}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
