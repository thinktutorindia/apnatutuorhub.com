import { auth } from "@/auth";
import { getMyStaffLeadsAction } from "@/app/actions/staff-leads.actions";
import { MyStaffLeadsClient } from "@/components/admin/staff-leads/MyStaffLeadsClient";

export const metadata = { title: "My Leads — Staff CRM" };
export const dynamic = "force-dynamic";

export default async function MyStaffLeadsPage() {
  const session = await auth();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const res = await getMyStaffLeadsAction();
  const rawLeads = res.success && res.data ? res.data.leads : [];

  const leads = rawLeads.map((l) => ({
    ...l,
    createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : new Date().toISOString(),
    lastContactedAt: l.lastContactedAt ? new Date(l.lastContactedAt).toISOString() : null,
    nextFollowUpAt: l.nextFollowUpAt ? new Date(l.nextFollowUpAt).toISOString() : null,
  }));

  return <MyStaffLeadsClient leads={leads as any} isSuperAdmin={isSuperAdmin} />;
}
