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
              className={`${padding} font-800 rounded-xl transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border min-h-11 ${
                isActive
                  ? "bg-[#E8F7F0] !text-[#238357] border-[#2D9E6B] shadow-[0_0_0_3px_rgba(45,158,107,0.14)]"
                  : "bg-white text-[#0F2540] border-[#CBD5E1] hover:border-[#2D9E6B]"
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
