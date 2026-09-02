import type { ReactNode } from "react";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
  icon: Icon,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="ath-panel flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
      <div className="flex min-w-0 items-start gap-3.5">
        {Icon ? (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E8F1FB] text-[#2563EB]">
            <Icon size={20} strokeWidth={1.75} />
          </div>
        ) : null}
        <div className="min-w-0 space-y-1">
          {eyebrow ? (
            <span className="text-[11px] font-800 uppercase tracking-widest text-[#2D9E6B]">{eyebrow}</span>
          ) : null}
          <h1
            className="text-xl font-800 tracking-tight text-[#0F2540] sm:text-2xl"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            {title}
          </h1>
          {description ? <p className="text-xs font-600 text-slate-600 sm:text-sm">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div> : null}
    </div>
  );
}
