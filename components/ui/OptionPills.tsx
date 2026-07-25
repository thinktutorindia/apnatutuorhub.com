"use client";

export type PillOption = { value: string; label: string };

export function OptionPills({
  name,
  options,
  value,
  onChange,
  activeBackground = "#DCFCE7",
  disabled = false,
  size = "md",
}: {
  name: string;
  options: readonly PillOption[];
  value: string;
  onChange: (value: string) => void;
  activeBackground?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const padding = size === "sm" ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-xs";

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              aria-pressed={isActive}
              onClick={() => onChange(option.value)}
              className={`${padding} font-extrabold rounded-full border-[2.5px] border-[#0F172A] transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                isActive
                  ? "shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] -translate-x-[1px] -translate-y-[1px]"
                  : "bg-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:bg-slate-50"
              }`}
              style={isActive ? { backgroundColor: activeBackground } : undefined}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </>
  );
}
