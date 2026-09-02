import { Globe, UserPlus, PenLine, Pencil } from "lucide-react";

export type EntryStaff = { name: string; role: string; email?: string };

export function resolveEntrySource({
  isGenuineEmail,
  createdBy,
}: {
  isGenuineEmail: boolean;
  createdBy?: EntryStaff;
}): {
  kind: "DIRECT" | "STAFF" | "MANUAL";
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
};

const KIND_ICON = {
  DIRECT: Globe,
  STAFF: UserPlus,
  MANUAL: PenLine,
};

export function UserEntrySource({
  isGenuineEmail,
  createdBy,
  lastEditedBy,
}: {
  isGenuineEmail: boolean;
  createdBy?: EntryStaff;
  lastEditedBy?: EntryStaff & { action?: string };
}) {
  const source = resolveEntrySource({ isGenuineEmail, createdBy });
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
