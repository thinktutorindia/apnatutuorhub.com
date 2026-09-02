import { getWhatsAppSupportLink, SUPPORT_PHONE_DISPLAY } from "@/lib/support";

type Role = "PARENT" | "TUTOR" | "PUBLIC";

const PRESET: Record<Role, string> = {
  PARENT: "Hi ApnaTutorHub Support, I am a parent and need help.",
  TUTOR: "Hi ApnaTutorHub Support, I am a tutor and need help.",
  PUBLIC: "Hi ApnaTutorHub Support, I need help.",
};

export function WhatsAppHelpLink({
  role = "PUBLIC",
  compact = false,
  className = "",
}: {
  role?: Role;
  compact?: boolean;
  className?: string;
}) {
  return (
    <a
      href={getWhatsAppSupportLink(PRESET[role])}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`WhatsApp support ${SUPPORT_PHONE_DISPLAY}`}
      className={
        className ||
        (compact
          ? "hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-800 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 transition-all"
          : "inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-800 bg-[#2D9E6B] hover:bg-[#238357] !text-white transition-all")
      }
    >
      <span aria-hidden>💬</span>
      {compact ? (
        <span className="hidden lg:inline">{SUPPORT_PHONE_DISPLAY}</span>
      ) : (
        <span>WhatsApp {SUPPORT_PHONE_DISPLAY}</span>
      )}
    </a>
  );
}
