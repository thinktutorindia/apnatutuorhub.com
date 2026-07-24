import React from "react";

export function AuthIllustration({ className }: { className?: string }) {
  return (
    <div className={`relative w-full max-w-sm aspect-square flex items-center justify-center ${className}`}>
      {/* Background Bubbly Card */}
      <div className="absolute inset-0 bg-[#E0F2FE] border-[3px] border-[#0F172A] rounded-3xl shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]" />

      {/* Playful Floating Education Vectors */}
      <div className="relative z-10 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-24 h-24 rounded-2xl bg-[#22C55E] border-[3px] border-[#0F172A] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex items-center justify-center text-5xl rotate-3">
          🎓
        </div>

        <div className="neu-badge bg-[#FEF3C7] text-[#0F172A]">
          ★ 100% Verified Tutors
        </div>

        <h3 className="font-black text-2xl text-[#0F172A] tracking-tight">
          Smart Tutor Matching
        </h3>

        <p className="text-sm font-semibold text-slate-700 leading-relaxed">
          Connect with top-rated tutors for home & online classes in under 2 minutes.
        </p>

        {/* Floating pill tags */}
        <div className="flex gap-2 pt-2">
          <span className="neu-badge bg-[#FCE7F3] text-xs">📐 Maths</span>
          <span className="neu-badge bg-[#DCFCE7] text-xs">🔬 Science</span>
          <span className="neu-badge bg-[#F3E8FF] text-xs">💻 Coding</span>
        </div>
      </div>
    </div>
  );
}

export function SuccessIllustration({
  size = 100,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center justify-center bg-[#DCFCE7] border-[3px] border-[#0F172A] rounded-full shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] ${className}`}
      style={{ width: size, height: size }}
    >
      <span className="text-4xl">🎉</span>
    </div>
  );
}
