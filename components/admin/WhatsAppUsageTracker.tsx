import { MessageSquare, Coins, CheckCircle2, PhoneCall, ShieldCheck, Clock } from "lucide-react";
import type { AquaWhatsAppStatus } from "@/lib/aqua-whatsapp";

export type WhatsAppLogItem = {
  id: string;
  recipient: string;
  details: string;
  status: string;
  cost: number;
  messageId?: string;
  createdAt: Date;
};

export function WhatsAppUsageTracker({
  status,
  logs,
}: {
  status: AquaWhatsAppStatus;
  logs: WhatsAppLogItem[];
}) {
  const utilityCost = status.estimatedUtilityInr;
  const spentToday = (status.dailyUsed * utilityCost).toFixed(2);

  return (
    <div className="ath-panel p-6 space-y-6 bg-white border border-slate-200 rounded-3xl shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-[#2D9E6B]">
            <MessageSquare size={22} />
          </div>
          <div>
            <h2 className="text-lg font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
              WhatsApp Usage & Cost Tracker
            </h2>
            <p className="text-xs font-600 text-slate-500">
              Live per-message billing, recipient delivery logs &amp; wallet safety controls
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-800 bg-emerald-50 text-emerald-800 border border-emerald-300">
          <ShieldCheck size={14} />
          <span>Meta Utility Tier (Lowest Rate)</span>
        </div>
      </div>

      {/* Pricing & Usage Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Cost per Message */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-800 uppercase tracking-wider text-slate-500">
            <Coins size={14} className="text-amber-500" />
            <span>Cost / Msg</span>
          </div>
          <p className="text-xl font-900 text-[#0F2540]">
            ₹{utilityCost.toFixed(3)}
          </p>
          <p className="text-[10px] font-600 text-emerald-600">
            Lowest Utility Tier (~15p)
          </p>
        </div>

        {/* Today's Sent Count */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-800 uppercase tracking-wider text-slate-500">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span>Sent Today</span>
          </div>
          <p className="text-xl font-900 text-[#0F2540]">
            {status.dailyUsed} <span className="text-xs font-700 text-slate-400">/ {status.dailyTestCap} cap</span>
          </p>
          <p className="text-[10px] font-600 text-slate-500">
            {status.dailyRemaining} remaining today
          </p>
        </div>

        {/* Spent Today */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-800 uppercase tracking-wider text-slate-500">
            <Coins size={14} className="text-emerald-600" />
            <span>Spent Today</span>
          </div>
          <p className="text-xl font-900 text-emerald-700">
            ₹{spentToday}
          </p>
          <p className="text-[10px] font-600 text-slate-500">
            Wallet Balance Protected
          </p>
        </div>

        {/* Inbound Chatbot */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-800 uppercase tracking-wider text-slate-500">
            <PhoneCall size={14} className="text-blue-500" />
            <span>Chatbot &quot;Hi&quot;</span>
          </div>
          <p className="text-xl font-900 text-blue-700">
            FREE (₹0)
          </p>
          <p className="text-[10px] font-600 text-slate-500">
            1,000 free Meta chats/mo
          </p>
        </div>
      </div>

      {/* Delivery Logs Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-800 uppercase tracking-wider text-slate-700">
            Recent WhatsApp Dispatches &amp; Costs
          </h3>
          <span className="text-[11px] font-600 text-slate-400">
            Showing last {logs.length} deliveries
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="py-8 text-center rounded-2xl bg-slate-50 border border-slate-200">
            <p className="text-xs font-700 text-slate-500">No WhatsApp messages dispatched yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-800 uppercase tracking-wider text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-600 text-slate-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-slate-400" />
                        {new Date(log.createdAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-800 text-[#0F2540]">
                      {log.recipient}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-[11px] text-slate-600" title={log.details}>
                      {log.details}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-800 bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 size={10} />
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right font-800 text-emerald-700">
                      ₹{log.cost.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
