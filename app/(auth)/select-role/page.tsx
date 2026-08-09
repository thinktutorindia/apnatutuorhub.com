"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Users, ArrowRight, Loader2, Sparkles, Check } from "lucide-react";
import { selectUserRoleAction } from "@/app/actions/auth.actions";

export default function SelectRolePage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<"PARENT" | "TUTOR">("PARENT");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirmRole = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      const res = await selectUserRoleAction(selectedRole);
      if (res.success && res.redirectTo) {
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
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="neu-badge bg-[#DCFCE7] text-[#0F172A] inline-flex items-center gap-1.5 px-3 py-1 text-xs">
          <Sparkles size={14} className="text-amber-500" />
          <span>Account Setup</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
          How do you want to use ApnaTutorHub? 🤔
        </h1>
        <p className="text-sm font-semibold text-slate-600 max-w-sm mx-auto">
          Choose your primary account role below. You can change this anytime later.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border-2 border-red-500 rounded-xl text-red-600 text-xs font-extrabold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Parent / Student Option */}
        <button
          type="button"
          onClick={() => setSelectedRole("PARENT")}
          className={`neu-card text-left p-5 transition-all relative flex flex-col justify-between ${
            selectedRole === "PARENT"
              ? "bg-[#DCFCE7] border-4 border-[#0F172A] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
              : "bg-white opacity-80 hover:opacity-100"
          }`}
        >
          {selectedRole === "PARENT" && (
            <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-[#22C55E] border-2 border-[#0F172A] flex items-center justify-center text-white">
              <Check size={14} strokeWidth={3} />
            </div>
          )}
          <div className="space-y-3">
            <div className="h-12 w-12 rounded-2xl border-2 border-[#0F172A] bg-white flex items-center justify-center text-2xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              👨‍👩‍👧
            </div>
            <div>
              <h3 className="text-lg font-black text-[#0F172A]">Parent / Student</h3>
              <p className="text-xs font-semibold text-slate-600 mt-1 leading-relaxed">
                I want to post tuition requirements and hire verified home & online tutors.
              </p>
            </div>
          </div>
        </button>

        {/* Tutor Option */}
        <button
          type="button"
          onClick={() => setSelectedRole("TUTOR")}
          className={`neu-card text-left p-5 transition-all relative flex flex-col justify-between ${
            selectedRole === "TUTOR"
              ? "bg-[#FEF3C7] border-4 border-[#0F172A] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
              : "bg-white opacity-80 hover:opacity-100"
          }`}
        >
          {selectedRole === "TUTOR" && (
            <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-[#F59E0B] border-2 border-[#0F172A] flex items-center justify-center text-white">
              <Check size={14} strokeWidth={3} />
            </div>
          )}
          <div className="space-y-3">
            <div className="h-12 w-12 rounded-2xl border-2 border-[#0F172A] bg-white flex items-center justify-center text-2xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              🎓
            </div>
            <div>
              <h3 className="text-lg font-black text-[#0F172A]">Tutor / Teacher</h3>
              <p className="text-xs font-semibold text-slate-600 mt-1 leading-relaxed">
                I want to find tuition leads, connect with parents, and earn money teaching.
              </p>
            </div>
          </div>
        </button>
      </div>

      <button
        type="button"
        onClick={handleConfirmRole}
        disabled={isSubmitting}
        className="neu-btn neu-btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <Loader2 size={18} className="animate-spin" />
            Setting up your account...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            Continue to {selectedRole === "PARENT" ? "Parent" : "Tutor"} Dashboard <ArrowRight size={18} />
          </span>
        )}
      </button>
    </div>
  );
}
