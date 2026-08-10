"use client";

export type PillOption = { value: string; label: string };

export function OptionPills({
  name,
  options,
  value,
  onChange,
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
  const padding = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-xs";

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
              className={`${padding} font-800 rounded-2xl transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border ${
                isActive
                  ? "bg-[#0F2540] !text-white border-[#0F2540] shadow-2xs"
                  : "bg-white text-slate-800 border-slate-300 hover:bg-slate-100/80"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </>
  );
}
