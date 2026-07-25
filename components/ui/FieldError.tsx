export function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;

  return (
    <p className="text-[11px] font-bold text-red-500">{messages[0]}</p>
  );
}

export function FormAlert({
  tone,
  message,
}: {
  tone: "error" | "success";
  message: string;
}) {
  const styles =
    tone === "error"
      ? "border-red-500 bg-red-50 text-red-600"
      : "border-[#22C55E] bg-[#DCFCE7] text-[#0F172A]";

  return (
    <div
      role="status"
      className={`rounded-xl border-2 px-3 py-2.5 text-xs font-extrabold ${styles}`}
    >
      {message}
    </div>
  );
}
