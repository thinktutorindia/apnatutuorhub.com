"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Shield,
  UserCheck,
  UserX,
  RefreshCw,
  Trash2,
  X,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import {
  createSubAdminAction,
  suspendSubAdminAction,
  reactivateSubAdminAction,
  deleteSubAdminAction,
  updateSubAdminRoleAction,
} from "@/app/actions/sub-admin.actions";

type SubAdmin = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  subAdminRole: string | null;
  isActive: boolean;
  createdAt: string;
};

type RoleBadge = {
  label: string;
  color: string;
  bg: string;
};

interface SubAdminManagementProps {
  initialSubAdmins: SubAdmin[];
  roleBadges: Record<string, RoleBadge>;
}

// Preset permissions per role
const ROLE_MODULE_PERMISSIONS: Record<string, string[]> = {
  SUPPORT: [
    "User Management & Account Controls",
    "Support Chat & Message Moderation",
    "Parent Requirements Overview",
    "Reviews & Ratings Moderation",
    "Audit Logs & Governance",
  ],
  VERIFICATION: [
    "Tutor KYC Review & Approval",
    "User Profile Verification",
    "Audit Logs & Governance",
  ],
  FINANCE: [
    "Wallet & Coin Transactions",
    "Tutor Refund Requests",
    "Audit Logs & Governance",
  ],
  OPERATIONS: [
    "Parent Requirements & Lead Operations",
    "Bookings & Trial Class Overview",
    "Support Chat & Message Moderation",
    "User Accounts Overview",
    "Audit Logs & Governance",
  ],
  MARKETING: [
    "Promotions & Coupon Management",
    "Broadcast Notifications & Alerts",
    "Platform Settings & Coin Pricing",
    "Audit Logs & Governance",
  ],
};

const ALL_GRANULAR_PERMISSIONS = [
  { id: "kyc", label: "Tutor KYC Review & Approval", roles: ["VERIFICATION"] },
  { id: "users", label: "User Management & Account Controls", roles: ["SUPPORT", "OPERATIONS", "VERIFICATION"] },
  { id: "leads", label: "Parent Requirements & Lead Operations", roles: ["OPERATIONS", "SUPPORT", "MARKETING"] },
  { id: "bookings", label: "Bookings & Trial Class Overview", roles: ["OPERATIONS", "SUPPORT"] },
  { id: "chat", label: "Support Chat & Message Moderation", roles: ["SUPPORT", "OPERATIONS"] },
  { id: "reviews", label: "Reviews & Ratings Moderation", roles: ["SUPPORT"] },
  { id: "wallets", label: "Wallets & Coin Transactions", roles: ["FINANCE"] },
  { id: "notifications", label: "Broadcast Notifications & Alerts", roles: ["MARKETING"] },
  { id: "coupons", label: "Promotions & Coupon Management", roles: ["MARKETING"] },
  { id: "settings", label: "Platform Settings & Pricing Controls", roles: ["MARKETING"] },
];

export function SubAdminManagement({ initialSubAdmins, roleBadges }: SubAdminManagementProps) {
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>(initialSubAdmins);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<SubAdmin | null>(null);
  const [showPermissions, setShowPermissions] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Custom Feature Selection State
  const [selectedRole, setSelectedRole] = useState<string>("SUPPORT");
  const [activePermissions, setActivePermissions] = useState<string[]>(ROLE_MODULE_PERMISSIONS["SUPPORT"]);

  // Create modal state
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  function showMsg(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  function handleRoleChange(role: string) {
    setSelectedRole(role);
    setActivePermissions(ROLE_MODULE_PERMISSIONS[role] || []);
  }

  function togglePermission(permLabel: string) {
    if (activePermissions.includes(permLabel)) {
      setActivePermissions(activePermissions.filter((p) => p !== permLabel));
    } else {
      setActivePermissions([...activePermissions, permLabel]);
    }
  }

  function handleCreate() {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("email", form.email);
      fd.append("phone", form.phone);
      fd.append("password", form.password);
      fd.append("subAdminRole", selectedRole);

      const result = await createSubAdminAction(fd);
      if (result.success) {
        showMsg("success", "Sub-admin account created successfully!");
        setShowCreateModal(false);
        setForm({ name: "", email: "", phone: "", password: "" });
        window.location.reload();
      } else {
        showMsg("error", result.error || "Failed to create sub-admin");
      }
    });
  }

  function handleSuspend(id: string) {
    startTransition(async () => {
      const result = await suspendSubAdminAction(id);
      if (result.success) {
        setSubAdmins((prev) => prev.map((u) => u.id === id ? { ...u, isActive: false } : u));
        showMsg("success", "Sub-admin suspended.");
      } else {
        showMsg("error", result.error || "Failed to suspend");
      }
    });
  }

  function handleReactivate(id: string) {
    startTransition(async () => {
      const result = await reactivateSubAdminAction(id);
      if (result.success) {
        setSubAdmins((prev) => prev.map((u) => u.id === id ? { ...u, isActive: true } : u));
        showMsg("success", "Sub-admin reactivated.");
      } else {
        showMsg("error", result.error || "Failed to reactivate");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Permanently delete this sub-admin account? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteSubAdminAction(id);
      if (result.success) {
        setSubAdmins((prev) => prev.filter((u) => u.id !== id));
        showMsg("success", "Sub-admin account deleted.");
      } else {
        showMsg("error", result.error || "Failed to delete");
      }
    });
  }

  function handleRoleUpdate(id: string, role: string) {
    startTransition(async () => {
      const result = await updateSubAdminRoleAction(id, role);
      if (result.success) {
        setSubAdmins((prev) => prev.map((u) => u.id === id ? { ...u, subAdminRole: role } : u));
        showMsg("success", "Sub-admin role updated.");
        setSelectedAdmin(null);
      } else {
        showMsg("error", result.error || "Failed to update role");
      }
    });
  }

  return (
    <>
      {/* Toast message */}
      {message && (
        <div
          className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium"
          style={{
            background: message.type === "success" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
            color: message.type === "success" ? "#22C55E" : "#EF4444",
            border: `1px solid ${message.type === "success" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
          }}
        >
          <CheckCircle2 size={16} />
          {message.text}
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-sm font-mono text-slate-400">
          {subAdmins.length} staff account{subAdmins.length !== 1 ? "s" : ""} configured
        </p>
        <button
          onClick={() => {
            setSelectedRole("SUPPORT");
            setActivePermissions(ROLE_MODULE_PERMISSIONS["SUPPORT"]);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95"
          style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)", boxShadow: "0 4px 15px rgba(34,197,94,0.3)" }}
        >
          <Plus size={16} />
          Create Sub-Admin
        </button>
      </div>

      {/* Sub-Admin Cards Grid */}
      {subAdmins.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl py-20 text-center"
          style={{ background: "rgba(15,23,42,0.6)", border: "1px solid #1E293B" }}
        >
          <Shield size={40} style={{ color: "#334155" }} className="mb-3" />
          <p className="text-sm font-medium text-white">No sub-admins yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Create custom sub-admin accounts with department-level or custom features.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {subAdmins.map((admin) => {
            const badge = roleBadges[admin.subAdminRole ?? ""] || {
              label: admin.subAdminRole ?? "Custom",
              color: "#38BDF8",
              bg: "rgba(56,189,248,0.12)",
            };
            const perms = ROLE_MODULE_PERMISSIONS[admin.subAdminRole ?? ""] || [];

            return (
              <div
                key={admin.id}
                className="rounded-2xl p-5 transition-all hover:border-slate-700"
                style={{
                  background: "rgba(15,23,42,0.8)",
                  border: `1px solid ${admin.isActive ? "#1E293B" : "rgba(239,68,68,0.25)"}`,
                }}
              >
                {/* Header */}
                <div className="mb-4 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                      style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.color}33` }}
                    >
                      {(admin.name || admin.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{admin.name || "Staff Member"}</p>
                      <p className="truncate text-xs font-mono text-slate-400">{admin.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {admin.isActive ? (
                      <span
                        className="inline-flex h-2 w-2 rounded-full"
                        style={{ background: "#22C55E", boxShadow: "0 0 6px rgba(34,197,94,0.6)" }}
                        title="Active Account"
                      />
                    ) : (
                      <span className="text-xs font-bold text-red-400 font-mono">Suspended</span>
                    )}
                  </div>
                </div>

                {/* Role badge */}
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                    style={{ color: badge.color, background: badge.bg }}
                  >
                    <Shield size={11} />
                    {badge.label}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {perms.length} Features Granted
                  </span>
                </div>

                {/* Phone */}
                {admin.phone && (
                  <p className="mb-3 text-xs font-mono text-slate-400">
                    📞 {admin.phone}
                  </p>
                )}

                {/* Feature Permissions toggle */}
                <button
                  onClick={() => setShowPermissions(showPermissions === admin.id ? null : admin.id)}
                  className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  {showPermissions === admin.id ? <EyeOff size={12} /> : <Eye size={12} />}
                  {showPermissions === admin.id ? "Hide Features" : "View Granted Features"}
                </button>

                {showPermissions === admin.id && (
                  <div className="mb-3 rounded-xl p-3 bg-slate-900/60 border border-slate-800 space-y-1.5">
                    {perms.map((p) => (
                      <div key={p} className="flex items-center gap-2 text-xs text-slate-300">
                        <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Created Date */}
                <p className="mb-4 text-xs font-mono text-slate-500">
                  Created {new Date(admin.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedAdmin(admin)}
                    disabled={isPending}
                    className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all hover:brightness-110"
                    style={{ background: "rgba(56,189,248,0.12)", color: "#38BDF8", border: "1px solid rgba(56,189,248,0.25)" }}
                  >
                    <Sliders size={12} />
                    Customize Features
                  </button>

                  {admin.isActive ? (
                    <button
                      onClick={() => handleSuspend(admin.id)}
                      disabled={isPending}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:opacity-80"
                      style={{ background: "rgba(251,146,60,0.1)", color: "#FB923C", border: "1px solid rgba(251,146,60,0.2)" }}
                    >
                      <UserX size={11} />
                      Suspend
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivate(admin.id)}
                      disabled={isPending}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:opacity-80"
                      style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.2)" }}
                    >
                      <UserCheck size={11} />
                      Reactivate
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(admin.id)}
                    disabled={isPending}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:opacity-80"
                    style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}
                  >
                    <Trash2 size={11} />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create Sub-Admin Modal with Custom Feature Selector ──────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
          <div
            className="w-full max-w-lg rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            style={{ background: "#0F172A", border: "1px solid #1E293B" }}
          >
            <div className="mb-5 flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  Create Sub-Admin & Assign Features
                </h2>
                <p className="text-xs text-slate-400">Choose department preset or customize features</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {[
                { label: "Full Name", key: "name", type: "text", placeholder: "Aakash Mehta" },
                { label: "Email Address", key: "email", type: "email", placeholder: "aakash@apnatutorhub.com" },
                { label: "Phone Number", key: "phone", type: "tel", placeholder: "+91 9876543210" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-semibold text-white">{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={(form as Record<string, string>)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-emerald-500"
                    style={{ background: "#1E293B", border: "1px solid #334155" }}
                  />
                </div>
              ))}

              {/* Password */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-white">Temporary Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className="w-full rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-slate-500 outline-none"
                    style={{ background: "#1E293B", border: "1px solid #334155" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Department Role Selector */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-white">Department Role Preset</label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {["SUPPORT", "VERIFICATION", "FINANCE", "OPERATIONS", "MARKETING"].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleRoleChange(role)}
                      className={`rounded-xl px-3 py-2 text-xs font-bold transition-all border ${
                        selectedRole === role
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                          : "bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white"
                      }`}
                    >
                      {role.charAt(0) + role.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feature Checklist */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-semibold text-white">Feature Permissions Granted</label>
                  <span className="text-[11px] font-mono text-slate-400">{activePermissions.length} Enabled</span>
                </div>

                <div className="space-y-1.5 rounded-xl p-3 bg-slate-900/80 border border-slate-800 max-h-48 overflow-y-auto">
                  {ALL_GRANULAR_PERMISSIONS.map((perm) => {
                    const isChecked = activePermissions.includes(perm.label);
                    return (
                      <button
                        key={perm.id}
                        type="button"
                        onClick={() => togglePermission(perm.label)}
                        className="flex items-center gap-2.5 w-full text-left rounded-lg p-2 transition-colors hover:bg-slate-800/60"
                      >
                        {isChecked ? (
                          <CheckSquare size={16} className="text-emerald-400 shrink-0" />
                        ) : (
                          <Square size={16} className="text-slate-600 shrink-0" />
                        )}
                        <span className={`text-xs ${isChecked ? "font-semibold text-white" : "text-slate-400"}`}>
                          {perm.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3 border-t border-slate-800 pt-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white transition-all hover:bg-slate-800"
                style={{ background: "#1E293B", border: "1px solid #334155" }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isPending || !form.name || !form.email || !form.phone || !form.password}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)" }}
              >
                {isPending ? "Creating..." : "Create Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Customize Role / Features Modal ────────────────────────────── */}
      {selectedAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
          <div
            className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            style={{ background: "#0F172A", border: "1px solid #1E293B" }}
          >
            <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
                Customize Sub-Admin Role
              </h2>
              <button onClick={() => setSelectedAdmin(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <p className="mb-4 text-xs text-slate-400">
              Staff Member: <span className="font-semibold text-white">{selectedAdmin.name || selectedAdmin.email}</span>
            </p>

            <div className="space-y-2">
              {["SUPPORT", "VERIFICATION", "FINANCE", "OPERATIONS", "MARKETING"].map((role) => {
                const badge = roleBadges[role];
                const isCurrentRole = selectedAdmin.subAdminRole === role;
                return (
                  <button
                    key={role}
                    onClick={() => handleRoleUpdate(selectedAdmin.id, role)}
                    disabled={isPending || isCurrentRole}
                    className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-50"
                    style={{
                      background: isCurrentRole ? badge.bg : "rgba(30,41,59,0.6)",
                      color: isCurrentRole ? badge.color : "#94A3B8",
                      border: `1px solid ${isCurrentRole ? badge.color + "40" : "#1E293B"}`,
                    }}
                  >
                    <span>{badge.label}</span>
                    {isCurrentRole && <span className="text-xs font-mono">(active)</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
