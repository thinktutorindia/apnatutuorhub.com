"use client";

import { useState } from "react";

type Props = {
  name: string;
  label: string;
  defaultValue?: number;
  required?: boolean;
};

const LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

export default function StarRating({
  name,
  label,
  defaultValue = 0,
  required = false,
}: Props) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(defaultValue);

  const display = hovered || selected;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-[#0F172A]">{label}</span>
        {display > 0 && (
          <span className="text-xs font-semibold text-slate-500 transition-all">
            {LABELS[display]}
          </span>
        )}
      </div>

      {/* Hidden input for form submission */}
      <input
        type="hidden"
        name={name}
        value={selected > 0 ? selected : ""}
        required={required}
      />

      <div
        className="flex gap-1"
        onMouseLeave={() => setHovered(0)}
        role="group"
        aria-label={label}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`${star} star${star !== 1 ? "s" : ""}`}
            onClick={() => setSelected(star)}
            onMouseEnter={() => setHovered(star)}
            className={`text-2xl transition-all duration-100 hover:scale-110 focus:outline-none ${
              star <= display
                ? "text-amber-400 drop-shadow-sm"
                : "text-slate-200"
            }`}
          >
            ★
          </button>
        ))}
      </div>

      {required && selected === 0 && (
        <p className="text-[10px] font-semibold text-red-500">
          Please select a rating
        </p>
      )}
    </div>
  );
}
