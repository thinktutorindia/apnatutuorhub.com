import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getInterestedLeadsAction } from "@/app/actions/interested-leads.actions";
import { InterestedLeadsPanel } from "@/components/admin/staff-leads/InterestedLeadsPanel";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Interested Leads — Staff CRM | ApnaTutorHub Admin",
};
export const dynamic = "force-dynamic";

export default async function InterestedLeadsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SUB_ADMIN") {
    redirect("/admin/dashboard");
  }

  const res = await getInterestedLeadsAction({ limit: 200 });
  const leads = res.success && res.data ? res.data.leads : [];
  const total = res.success && res.data ? res.data.total : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link
          href="/admin/staff-leads"
          className="flex items-center gap-1 hover:text-[#0F2540] font-bold transition-colors"
        >
          <ArrowLeft size={12} /> Staff CRM
        </Link>
        <span>/</span>
        <span className="font-bold text-[#0F2540]">Interested Leads</span>
      </div>

      <InterestedLeadsPanel initialLeads={leads as any} initialTotal={total} />
    </div>
  );
}
