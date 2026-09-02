"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowRight, Loader2, Check } from "lucide-react";
import { selectUserRoleAction } from "@/app/actions/auth.actions";

export default function SelectRolePage() {
  const { data: session, update } = useSession();
  const [selectedRole, setSelectedRole] = useState<"PARENT" | "TUTOR">("PARENT");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirmRole = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      const res = await selectUserRoleAction(selectedRole);
      if (res.success && res.redirectTo) {
        try {
          await update({ role: selectedRole });
        } catch {
          // Continue even if update throws
        }
        window.location.href = res.redirectTo;
      } else {
        setError(res.error || "Failed to set role. Please try again.");
        setIsSubmitting(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-lg space-y-6">
      <div className="text-center space-y-2">
        <div className="ath-verified inline-flex">Choose how you want to use ApnaTutorHub</div>
        <h1
          className="text-2xl sm:text-3xl font-800 text-[#0F2540] tracking-tight"
          style={{ fontFamily: "Poppins, sans-serif" }}
        >
          Namaste{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-[15px] font-500 text-[#64748B] max-w-sm mx-auto">
          Parents post requirements. Teachers find nearby students. You can add the other role later.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-[#B91C1C] text-sm font-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setSelectedRole("PARENT")}
          aria-pressed={selectedRole === "PARENT"}
          className={`ath-choice text-left p-5 h-auto flex-col items-start min-h-[160px] ${
            selectedRole === "PARENT" ? "" : ""
          }`}
          data-selected={selectedRole === "PARENT" ? "true" : "false"}
        >
          {selectedRole === "PARENT" && (
            <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-[#2D9E6B] flex items-center justify-center text-white relative">
              <Check size={14} strokeWidth={3} />
            </div>
          )}
          <div className="space-y-3 w-full">
            <div className="h-12 w-12 rounded-2xl bg-[#E8F7F0] flex items-center justify-center text-2xl">
              👨‍👩‍👧
            </div>
            <div>
              <h3 className="text-lg font-800 text-[#0F2540]">I am a Parent</h3>
              <p className="text-xs font-500 text-[#64748B] mt-1 leading-relaxed">
                Post what your child needs and get verified home or online tutors.
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRole("TUTOR")}
          aria-pressed={selectedRole === "TUTOR"}
          className="ath-choice text-left p-5 h-auto flex-col items-start min-h-[160px]"
          data-selected={selectedRole === "TUTOR" ? "true" : "false"}
        >
          <div className="space-y-3 w-full">
            {selectedRole === "TUTOR" && (
              <div className="h-6 w-6 rounded-full bg-[#F5A623] flex items-center justify-center text-white ml-auto">
                <Check size={14} strokeWidth={3} />
              </div>
            )}
            <div className="h-12 w-12 rounded-2xl bg-[#FFF3DC] flex items-center justify-center text-2xl">
              🎓
            </div>
            <div>
              <h3 className="text-lg font-800 text-[#0F2540]">I am a Tutor</h3>
              <p className="text-xs font-500 text-[#64748B] mt-1 leading-relaxed">
                Unlock nearby student enquiries and teach after a free demo class.
              </p>
            </div>
          </div>
        </button>
      </div>

      <button
        type="button"
        onClick={handleConfirmRole}
        disabled={isSubmitting}
        className="neu-btn neu-btn-primary w-full py-3.5 text-sm min-h-12 flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <Loader2 size={18} className="animate-spin" />
            Setting up your account...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            Continue as {selectedRole === "PARENT" ? "Parent" : "Tutor"} <ArrowRight size={18} />
          </span>
        )}
      </button>
    </div>
  );
}
