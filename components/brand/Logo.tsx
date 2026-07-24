import React from "react";

export function Logo({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center justify-center bg-[#DCFCE7] border-[2.5px] border-[#0F172A] rounded-xl shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.65}
        height={size * 0.65}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="ThinkTutor icon"
      >
        {/* Book / Mortarboard icon */}
        <path
          d="M12 3L2 8L12 13L22 8L12 3Z"
          fill="#22C55E"
          stroke="#0F172A"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M5 10.5V16.5C5 16.5 8 19 12 19C16 19 19 16.5 19 16.5V10.5"
          stroke="#0F172A"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={`font-black text-[#0F172A] tracking-tight ${className}`}
      style={{
        fontFamily: "'Poppins', sans-serif",
        fontSize: "inherit",
      }}
    >
      Think<span className="text-[#22C55E]">Tutor</span>
    </span>
  );
}

export function LogoBrand({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <a
      href="/"
      className={`inline-flex items-center gap-2.5 no-underline ${className}`}
      style={{ fontSize: `${size * 0.65}px` }}
    >
      <Logo size={size} />
      <Wordmark />
    </a>
  );
}
