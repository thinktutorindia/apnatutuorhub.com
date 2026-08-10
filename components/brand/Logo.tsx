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
      src="/icons/Gemini_Generated_Image_k81306k81306k813_no_bg.png"
      alt="ApnaTutorHub Logo Mark"
      width={size}
      height={size}
      className={`object-contain shrink-0 ${className}`}
      priority
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
      className={`inline-flex items-center no-underline shrink-0 ${className}`}
    >
      <Image
        src="/icons/Gemini_Generated_Image_f4d61ef4d61ef4d6_no_bg.png"
        alt="ApnaTutorHub"
        width={360}
        height={80}
        className={`${heightClass} w-auto object-contain ${light ? "brightness-0 invert" : ""
          }`}
        priority
      />
    </Link>
  );
}
