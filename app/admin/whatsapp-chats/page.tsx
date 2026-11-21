import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { WhatsAppChatInbox } from "@/components/admin/whatsapp/WhatsAppChatInbox";
import { getAllowedSubAdminModules } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "WhatsApp Live Chats & Inbox — Admin & Staff | ApnaTutorHub",
  description: "Permanent WhatsApp chat history log and live two-way staff messaging inbox.",
};

export default async function AdminWhatsAppChatsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SUB_ADMIN") {
    redirect("/admin/dashboard");
  }

  // Defence in depth: the sidebar/middleware use this same module map. If a
  // staff account was created with stale/empty permissions, show a clear
  // explanation instead of a blank or broken inbox.
  if (session.user.role === "SUB_ADMIN") {
    const allowed = getAllowedSubAdminModules(session.user);
    if (!allowed.includes("/admin/whatsapp-chats")) {
      return (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950">
          <h1 className="text-lg font-bold">WhatsApp access is not enabled for this account</h1>
          <p className="mt-2 text-sm">
            Ask a Super Admin to grant the <strong>WhatsApp Live Chats</strong> module to this
            staff account. Once granted, reload this page.
          </p>
        </div>
      );
    }
  }

  return (
    <div className="space-y-4 text-slate-900">
      <WhatsAppChatInbox />
    </div>
  );
}
