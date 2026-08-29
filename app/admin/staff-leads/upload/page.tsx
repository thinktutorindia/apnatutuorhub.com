import { StaffLeadsUploadClient } from "@/components/admin/staff-leads/StaffLeadsUploadClient";

export const metadata = { title: "Upload Raw Leads — Staff CRM" };
export const dynamic = "force-dynamic";

export default function StaffLeadsUploadPage() {
  return <StaffLeadsUploadClient />;
}

