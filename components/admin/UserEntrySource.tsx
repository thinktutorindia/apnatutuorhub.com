import { Globe, UserPlus, PenLine, Pencil, MessageCircle } from "lucide-react";

export type EntryStaff = { name: string; role: string; email?: string };

export function resolveEntrySource({
  isGenuineEmail,
  createdBy,
  signupSource,
}: {
  isGenuineEmail: boolean;
  createdBy?: EntryStaff;
  signupSource?: string | null;
}): {
  kind: "DIRECT" | "STAFF" | "MANUAL" | "WHATSAPP";
  title: string;
  detail: string;
} {
  if (createdBy) {
    return {
      kind: "STAFF",
      title: "Staff added",
      detail: `${createdBy.name} · ${createdBy.role}`,
    };
  }
  if (signupSource === "WHATSAPP" || (!isGenuineEmail && !signupSource)) {
    // Either explicitly tagged WHATSAPP, or auto-email without any known source → treat as WhatsApp onboard
    return {
      kind: "WHATSAPP",
      title: "WhatsApp signup",
      detail: "Registered via WhatsApp bot",
    };
  }
  if (isGenuineEmail) {
    return {
      kind: "DIRECT",
      title: "Direct signup",
      detail: "Registered on the website",
    };
  }
  return {
    kind: "MANUAL",
    title: "Staff manual onboard",
    detail: "Created from admin / CRM",
  };
}

const KIND_STYLE = {
  DIRECT: "bg-[#E8F1FB] text-[#1D4ED8] border-[#BFDBFE]",
  STAFF: "bg-[#E8F7F0] text-[#166534] border-emerald-200",
  MANUAL: "bg-[#FFF3DC] text-[#92400E] border-amber-200",
  WHATSAPP: "bg-[#E8FDF0] text-[#075E54] border-[#25D366]/40",
};

const KIND_ICON = {
  DIRECT: Globe,
  STAFF: UserPlus,
  MANUAL: PenLine,
  WHATSAPP: MessageCircle,
};

export function UserEntrySource({
  isGenuineEmail,
  createdBy,
  lastEditedBy,
  signupSource,
}: {
  isGenuineEmail: boolean;
  createdBy?: EntryStaff;
  lastEditedBy?: EntryStaff & { action?: string };
  signupSource?: string | null;
}) {
  const source = resolveEntrySource({ isGenuineEmail, createdBy, signupSource });
  const Icon = KIND_ICON[source.kind];

  return (
    <div className="min-w-[168px] space-y-1">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-800 ${KIND_STYLE[source.kind]}`}
        title={createdBy ? `Added by ${createdBy.name} (${createdBy.role})` : source.detail}
      >
        <Icon size={12} />
        {source.title}
      </span>
      <p className="text-[11px] font-700 text-[#0F2540] leading-snug">{source.detail}</p>
      {lastEditedBy ? (
        <p className="inline-flex items-center gap-1 text-[10px] font-600 text-slate-500">
          <Pencil size={10} />
          Updated by {lastEditedBy.name}
        </p>
      ) : null}
    </div>
  );
}
