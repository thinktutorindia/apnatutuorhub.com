"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton({
  className = "neu-btn neu-btn-white text-xs px-3 py-1.5",
}: {
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className={className}
    >
      <LogOut size={14} />
      <span>Sign Out</span>
    </button>
  );
}
