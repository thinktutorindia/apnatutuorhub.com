import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { WhatsAppChatInbox } from "@/components/admin/whatsapp/WhatsAppChatInbox";

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

  return (
    <div className="space-y-4 text-slate-900">
      <WhatsAppChatInbox />
    </div>
  );
}
