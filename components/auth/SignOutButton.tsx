"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton({
  className = "neu-btn neu-btn-white text-xs px-3 py-1.5",
}: {
  className?: string;
}) {
  const handleSignOut = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    signOut({ callbackUrl: `${origin}/login` });
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={className}
    >
      <LogOut size={14} />
      <span>Sign Out</span>
    </button>
  );
}
