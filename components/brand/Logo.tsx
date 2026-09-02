import React from "react";
import Link from "next/link";
import Image from "next/image";

const LOGO_SRC = "/icons/logo.png";
const MARK_SRC = "/icons/logo-mark.png";

export function Logo({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
  light?: boolean;
}) {
  return (
    <Image
      src={MARK_SRC}
      alt="ApnaTutorHub"
      width={size}
      height={size}
      className={`object-contain shrink-0 ${className}`}
      priority
      unoptimized
    />
  );
}

export function Wordmark({
  light = false,
  className = "",
}: {
  light?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`font-800 tracking-tight leading-none ${light ? "text-white" : "text-[#0F2540]"} ${className}`}
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      ApnaTutorHub
    </span>
  );
}

export function LogoBrand({
  size: _size = 44,
  className = "",
  href = "/",
  heightClass = "h-9 sm:h-11",
  hideWordmarkOnMobile: _hideWordmarkOnMobile,
  light = false,
}: {
  size?: number;
  className?: string;
  href?: string;
  heightClass?: string;
  hideWordmarkOnMobile?: boolean;
  light?: boolean;
}) {
  const frame = (
    <span className={`relative block h-10 w-[200px] sm:h-11 sm:w-[240px] max-w-[52vw]`}>
      <Image
        src={LOGO_SRC}
        alt="ApnaTutorHub"
        fill
        sizes="240px"
        className="object-contain object-left"
        priority
        unoptimized
      />
    </span>
  );

  return (
    <Link
      href={href}
      className={`inline-flex items-center no-underline shrink-0 min-w-0 ${className}`}
      aria-label="ApnaTutorHub home"
    >
      {light ? (
        <span className="inline-flex items-center rounded-xl bg-white px-2 py-1">{frame}</span>
      ) : (
        frame
      )}
    </Link>
  );
}
