import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getBatchDetailedReportAction } from "@/app/actions/staff-leads.actions";
import { BatchDetailedReportModal } from "@/components/admin/staff-leads/BatchDetailedReportModal";
import Link from "next/link";
import { ArrowLeft, Layers } from "lucide-react";

export const metadata = { title: "Batch Intelligence Report — ApnaTutorHub Admin" };
export const dynamic = "force-dynamic";

export default async function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "SUB_ADMIN"].includes(session.user.role)) {
    notFound();
  }

  const { id } = await params;

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-3 sm:p-6">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/staff-leads/manage"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Back to Manage Batches</span>
        </Link>
      </div>

      <div className="relative">
        <BatchDetailedReportModal
          batchId={id}
          onClose={() => {
            if (typeof window !== "undefined") {
              window.location.href = "/admin/staff-leads/manage";
            }
          }}
        />
      </div>
    </div>
  );
}
