import { notFound } from "next/navigation";
import { getStaffLeadDetailAction } from "@/app/actions/staff-leads.actions";
import { StaffLeadDetailClient } from "@/components/admin/staff-leads/StaffLeadDetailClient";

export const metadata = { title: "Lead Detail — Staff CRM" };
export const dynamic = "force-dynamic";

export default async function StaffLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await getStaffLeadDetailAction(id);
  if (!res.success || !res.data) notFound();

  return <StaffLeadDetailClient lead={res.data.lead} />;
}
