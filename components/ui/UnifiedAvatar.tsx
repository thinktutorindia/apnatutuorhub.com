"use client";

import React, { useState, useEffect } from "react";

export interface UnifiedAvatarProps {
  src?: string | null;
  name?: string | null;
  gender?: string | null;
  size?: number;
  className?: string;
  alt?: string;
}

// Known dead / paused storage domains or placeholder markers
const INVALID_DOMAINS = [
  "awfgtylndntipblgmmll.supabase.co",
  "placeholder.com",
  "example.com",
  "via.placeholder.com",
];

const COMMON_FEMALE_PATTERNS = [
  /\b(mrs|miss|ms|dr\.\s*mrs)\b/i,
  /(priya|pooja|puja|anjali|neha|kanika|mahima|anchal|kajal|himani|swati|shreya|divya|kavita|sunita|manvi|ananya|aarti|arti|deepa|geeta|jyoti|meena|neetu|payal|radha|rekha|ritu|roopa|rupa|sapna|seema|shalu|sheetal|shikha|shweta|simran|sonam|sonia|soni|tanu|tanya|vandana|varsha|kiran|preeti|priti|shalini|monika|bhavna|alka|mamta|poonam|sangeeta|usha|nisha|komal|alka|pallavi|richa|namrata|megha|garima|tripti|sakshi|sneha|isha|ishita|dimple|chhavi|parul|rashmi|surabhi|shruti|vidhi)\b/i,
];

export function getCuteAvatarUrl(gender?: string | null, name?: string | null): string {
  const g = gender?.trim().toUpperCase();
  if (g === "FEMALE" || g === "WOMAN" || g === "GIRL" || g === "F") {
    return "/avatars/tutor-female.svg";
  }
  if (g === "MALE" || g === "MAN" || g === "BOY" || g === "M") {
    return "/avatars/tutor-male.svg";
  }

  // If gender unspecified or empty, check name heuristics
  if (name && typeof name === "string") {
    const cleanName = name.trim().toLowerCase();
    for (const pattern of COMMON_FEMALE_PATTERNS) {
      if (pattern.test(cleanName)) {
        return "/avatars/tutor-female.svg";
      }
    }
    // Female names commonly end in 'a', 'i', 'ee' in India (with common exceptions)
    const firstName = cleanName.split(/\s+/)[0] || "";
    if (
      (firstName.endsWith("a") && !/^(krishna|shiva|surya|rishi|aditya|sharma|gupta|verma)$/i.test(firstName)) ||
      firstName.endsWith("i") ||
      firstName.endsWith("ee") ||
      firstName.endsWith("ya") ||
      firstName.endsWith("ka")
    ) {
      return "/avatars/tutor-female.svg";
    }

    // Otherwise default male avatar
    return "/avatars/tutor-male.svg";
  }

  return "/avatars/tutor-male.svg";
}

export function UnifiedAvatar({
  src,
  name,
  gender,
  size = 80,
  className = "",
  alt,
}: UnifiedAvatarProps) {
  const [imgError, setImgError] = useState(false);

  // Reset error when src changes
  useEffect(() => {
    setImgError(false);
  }, [src]);

  const cleanAlt = alt || name || "Verified Tutor";
  const cuteFallback = getCuteAvatarUrl(gender, name);

  // Validate src: must be valid http(s) or relative URL, no spaces, no invalid hosts
  const isCandidateUrl =
    Boolean(src) &&
    typeof src === "string" &&
    (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/")) &&
    !src.includes(" ") &&
    src.length > 8 &&
    !INVALID_DOMAINS.some((d) => src.includes(d));

  const displaySrc = !imgError && isCandidateUrl ? (src as string) : cuteFallback;

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-slate-100 shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={displaySrc}
        alt={cleanAlt}
        className="w-full h-full object-cover"
        onError={(e) => {
          if (!imgError) {
            setImgError(true);
          } else {
            // Emergency local SVG
            e.currentTarget.src = "/avatars/tutor-neutral.svg";
          }
        }}
        loading="lazy"
      />
    </div>
  );
}
