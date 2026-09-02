"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, Loader2 } from "lucide-react";

export interface SignOutButtonProps {
  className?: string;
  text?: string;
  iconSize?: number;
  showIcon?: boolean;
  variant?: "default" | "danger" | "ghost" | "full" | "link";
}

export function SignOutButton({
  className,
  text = "Sign Out",
  iconSize = 14,
  showIcon = true,
  variant = "default",
}: SignOutButtonProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      await signOut({ callbackUrl: `${origin}/login` });
    } catch {
      setIsSigningOut(false);
    }
  };

  // Default variants if custom className is not provided
  let variantClass = "";
  if (variant === "default") {
    variantClass =
      "neu-btn neu-btn-white text-xs px-3.5 py-1.5 hover:bg-red-50/90 hover:text-red-600 hover:border-red-200 shadow-2xs hover:shadow-md hover:shadow-red-500/10 border border-gray-200/80 text-gray-700";
  } else if (variant === "danger") {
    variantClass =
      "bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200/80 hover:border-red-300 shadow-2xs hover:shadow-md hover:shadow-red-500/15 text-xs px-4 py-2";
  } else if (variant === "ghost") {
    variantClass =
      "bg-transparent hover:bg-red-50 text-gray-600 hover:text-red-600 text-xs px-3 py-1.5";
  } else if (variant === "full") {
    variantClass =
      "w-full bg-red-50/80 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200/80 hover:border-red-300 shadow-2xs hover:shadow-md hover:shadow-red-500/10 text-sm font-700 px-4 py-3";
  } else if (variant === "link") {
    variantClass =
      "bg-transparent text-[#0F2540] hover:text-[#2D9E6B] text-[15px] font-700 px-0 h-11 whitespace-nowrap shrink-0";
  }

  const combinedClass = className
    ? className
    : `rounded-xl font-600 ${variantClass}`;

  const motionClass =
    variant === "link"
      ? "hover:scale-100 active:scale-100"
      : "active:scale-95 active:duration-100 hover:scale-[1.04]";

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className={`group relative inline-flex items-center justify-center gap-1.5 transition-colors duration-200 select-none cursor-pointer disabled:pointer-events-none disabled:opacity-75 ${variant === "link" ? "" : "overflow-hidden"} ${motionClass} ${combinedClass}`}
      title="Sign Out"
    >
      {/* Click ripple animation overlay */}
      {isSigningOut && (
        <span className="absolute inset-0 rounded-xl bg-red-500/20 animate-ping pointer-events-none" />
      )}

      {/* Icon with slide, tilt and scale animation on hover */}
      {showIcon && (
        <span className="relative flex items-center justify-center transition-transform duration-300 ease-out group-hover:translate-x-1 group-hover:-rotate-12 group-hover:scale-110">
          {isSigningOut ? (
            <Loader2 size={iconSize} className="animate-spin text-red-600" />
          ) : (
            <LogOut
              size={iconSize}
              className="transition-colors duration-200 group-hover:text-red-600"
            />
          )}
        </span>
      )}

      {/* Text label with transition */}
      <span className="relative font-700 whitespace-nowrap transition-colors duration-200 group-hover:text-red-600">
        {isSigningOut ? "Signing out..." : text}
      </span>
    </button>
  );
}

