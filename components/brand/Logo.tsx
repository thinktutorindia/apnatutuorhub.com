import React from "react";
import Link from "next/link";
import Image from "next/image";

export function Logo({
  size = 60,
  className = "",
}: {
  size?: number;
  className?: string;
  light?: boolean;
}) {
  return (
    <Image
      src="/icons/icon-192x192.svg"
      alt="ApnaTutorHub Logo Mark"
      width={size}
      height={size}
      className={`object-contain shrink-0 ${className}`}
      priority
      unoptimized
    />
  );
}

export function Wordmark() {
  return null;
}

export function LogoBrand({
  size,
  className = "",
  href = "/",
  heightClass = "h-16 sm:h-20 md:h-22",
  hideWordmarkOnMobile,
  light = false,
}: {
  size?: number;
  className?: string;
  href?: string;
  heightClass?: string;
  hideWordmarkOnMobile?: boolean;
  light?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center no-underline shrink-0 transition-transform duration-300 ease-out hover:scale-105 active:scale-95 ${className}`}
    >
      {/* Compact square mark — shown on mobile when the wide wordmark would overflow */}
      {hideWordmarkOnMobile && (
        <Image
          src="/icons/icon-192x192.svg"
          alt="ApnaTutorHub"
          width={80}
          height={80}
          className={`${heightClass} w-auto object-contain sm:hidden transition-transform duration-300 group-hover:drop-shadow-md ${light ? "brightness-0 invert" : ""}`}
          priority
          unoptimized
        />
      )}
      <Image
        src="/icons/icon-192x192.svg"
        alt="ApnaTutorHub"
        width={360}
        height={80}
        className={`${heightClass} w-auto object-contain transition-transform duration-300 group-hover:drop-shadow-md ${light ? "brightness-0 invert" : ""} ${hideWordmarkOnMobile ? "hidden sm:block" : ""}`}
        priority
        unoptimized
      />
    </Link>
  );
}
