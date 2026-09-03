"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowRight, Loader2, Check, Users, GraduationCap } from "lucide-react";
import { selectUserRoleAction } from "@/app/actions/auth.actions";
import { AuthShell } from "@/components/auth/AuthShell";

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
        setError(res.error || "Could not save. Please try again.");
        setIsSubmitting(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  const firstName = session?.user?.name?.split(" ")[0];

  return (
    <AuthShell variant={selectedRole === "TUTOR" ? "tutor" : "parent"}>
      <div className="space-y-6 rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-8">
        <div>
          <h2
            className="text-2xl font-800 text-[#0F2540] sm:text-[28px]"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            {firstName ? `Namaste, ${firstName}` : "One last step"}
          </h2>
          <p className="mt-1 text-[16px] font-500 text-[#64748B]">
            How do you want to use ApnaTutorHub? Pick one. You can add the other later.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-[15px] font-700 text-red-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setSelectedRole("PARENT")}
            aria-pressed={selectedRole === "PARENT"}
            className={`min-h-[150px] rounded-2xl border-2 p-5 text-left ${
              selectedRole === "PARENT" ? "border-[#2D9E6B] bg-[#E8F7F0]" : "border-[#E2E8F0] bg-white"
            }`}
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white">
              <Users size={22} className="text-[#2D9E6B]" />
            </div>
            <p className="flex items-center gap-2 text-[18px] font-800 text-[#0F2540]">
              I am a Parent
              {selectedRole === "PARENT" ? <Check size={16} className="text-[#2D9E6B]" /> : null}
            </p>
            <p className="mt-1 text-sm font-500 leading-relaxed text-[#64748B]">
              Post what your child needs. Verified home or online tutors will reach out.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole("TUTOR")}
            aria-pressed={selectedRole === "TUTOR"}
            className={`min-h-[150px] rounded-2xl border-2 p-5 text-left ${
              selectedRole === "TUTOR" ? "border-[#2D9E6B] bg-[#E8F7F0]" : "border-[#E2E8F0] bg-white"
            }`}
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white">
              <GraduationCap size={22} className="text-[#F5A623]" />
            </div>
            <p className="flex items-center gap-2 text-[18px] font-800 text-[#0F2540]">
              I am a Teacher
              {selectedRole === "TUTOR" ? <Check size={16} className="text-[#2D9E6B]" /> : null}
            </p>
            <p className="mt-1 text-sm font-500 leading-relaxed text-[#64748B]">
              Unlock nearby student enquiries and teach after a free demo.
            </p>
          </button>
        </div>

        <button
          type="button"
          onClick={handleConfirmRole}
          disabled={isSubmitting}
          className="flex h-13 min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#2D9E6B] text-base font-800 !text-white hover:bg-[#238357] disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Saving…
            </>
          ) : (
            <>
              Continue as {selectedRole === "PARENT" ? "Parent" : "Teacher"}
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
    </AuthShell>
  );
}
