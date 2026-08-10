"use client";

import { useState, useTransition } from "react";
import { UserPlus, X, AlertCircle, CheckCircle2, Copy, Key, Shield, User } from "lucide-react";
import { adminCreateUserAction } from "@/app/actions/admin.actions";

import type { SubAdminRole } from "@prisma/client";

export function CreateUserModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"PARENT" | "TUTOR" | "SUB_ADMIN" | "SUPER_ADMIN">("TUTOR");
  const [subAdminRole, setSubAdminRole] = useState<SubAdminRole>("SUPPORT");
  const [city, setCity] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<{ email: string; temporaryPassword?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setRole("TUTOR");
    setSubAdminRole("SUPPORT");
    setCity("");
    setErrorMsg(null);
    setCreatedResult(null);
  };

  const handleOpen = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setCreatedResult(null);

    startTransition(async () => {
      const res = await adminCreateUserAction({
        name,
        email,
        phone,
        password: password.trim() || undefined,
        role,
        subAdminRole: role === "SUB_ADMIN" ? subAdminRole : undefined,
        city: city.trim() || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error ?? "Failed to create user account.");
      } else {
        setCreatedResult({
          email: res.data?.email ?? email,
          temporaryPassword: res.data?.temporaryPassword,
        });
      }
    });
  };

  const handleCopyCredentials = () => {
    if (!createdResult) return;
    const text = `ApnaTutorHub Login Credentials:\nEmail: ${createdResult.email}\nPassword: ${createdResult.temporaryPassword ?? password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all cursor-pointer shadow-md text-white hover:opacity-90 active:scale-95"
        style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)", boxShadow: "0 4px 12px rgba(34,197,94,0.3)" }}
      >
        <UserPlus size={15} />
        <span>Create User</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            role="dialog"
            aria-modal="true"
            className="neu-card relative z-10 w-full max-w-lg bg-[#0F172A] p-6 space-y-5 border border-[#1E293B] shadow-2xl text-white rounded-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    Create New User Account
                  </h3>
                  <p className="text-xs text-slate-400">
                    Manually add a Tutor, Parent, Sub-Admin, or Super Admin account
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-[#1E293B] hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs font-bold text-red-400">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success View */}
            {createdResult ? (
              <div className="space-y-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-5 text-emerald-300">
                <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm">
                  <CheckCircle2 size={18} />
                  <span>User Account Created Successfully! 🎉</span>
                </div>

                <div className="space-y-2 rounded-xl bg-[#0A0F1E] p-4 text-xs border border-emerald-500/20 font-mono text-slate-200">
                  <p><strong className="text-slate-400">Email:</strong> {createdResult.email}</p>
                  {createdResult.temporaryPassword ? (
                    <p><strong className="text-amber-400">Temp Password:</strong> {createdResult.temporaryPassword}</p>
                  ) : (
                    <p><strong className="text-slate-400">Password:</strong> Custom password set</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCopyCredentials}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-[#0F172A] hover:bg-emerald-400 cursor-pointer"
                  >
                    <Copy size={14} />
                    <span>{copied ? "Copied to Clipboard!" : "Copy Login Info"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-xl bg-[#1E293B] px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="mb-1 block font-semibold text-slate-300">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full rounded-xl px-3.5 py-2.5 bg-[#1E293B] border border-slate-700 text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-semibold text-slate-300">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full rounded-xl px-3.5 py-2.5 bg-[#1E293B] border border-slate-700 text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-300">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full rounded-xl px-3.5 py-2.5 bg-[#1E293B] border border-slate-700 text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-semibold text-slate-300">Account Role *</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full rounded-xl px-3 py-2.5 bg-[#1E293B] border border-slate-700 text-white outline-none cursor-pointer"
                    >
                      <option value="TUTOR">Tutor (Teacher)</option>
                      <option value="PARENT">Parent (Student)</option>
                      <option value="SUB_ADMIN">Sub Admin</option>
                      <option value="SUPER_ADMIN">Super Admin</option>
                    </select>
                  </div>

                  {role === "SUB_ADMIN" ? (
                    <div>
                      <label className="mb-1 block font-semibold text-slate-300">Department Role *</label>
                      <select
                        value={subAdminRole}
                        onChange={(e) => setSubAdminRole(e.target.value as SubAdminRole)}
                        className="w-full rounded-xl px-3 py-2.5 bg-[#1E293B] border border-slate-700 text-white outline-none cursor-pointer"
                      >
                        <option value="SUPPORT">Support</option>
                        <option value="VERIFICATION">Verification (KYC)</option>
                        <option value="FINANCE">Finance</option>
                        <option value="OPERATIONS">Operations</option>
                        <option value="MARKETING">Marketing</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="mb-1 block font-semibold text-slate-300">City (Optional)</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Delhi, Mumbai"
                        className="w-full rounded-xl px-3.5 py-2.5 bg-[#1E293B] border border-slate-700 text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-300">
                    Password <span className="text-slate-500 font-normal">(Leave blank to auto-generate)</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Auto-generated if empty"
                    className="w-full rounded-xl px-3.5 py-2.5 bg-[#1E293B] border border-slate-700 text-white outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 rounded-xl bg-[#1E293B] py-3 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 rounded-xl py-3 text-xs font-bold text-[#0F172A] bg-[#22C55E] hover:bg-[#1ea34d] disabled:opacity-50 cursor-pointer"
                  >
                    {isPending ? "Creating Account..." : "Create User"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
