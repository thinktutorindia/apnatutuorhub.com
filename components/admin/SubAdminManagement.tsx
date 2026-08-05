"use client";

import { useState, useTransition } from "react";
import { Plus, Shield, UserCheck, UserX, RefreshCw, Trash2, X, Eye, EyeOff } from "lucide-react";
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

const PERMISSION_DESCRIPTIONS: Record<string, string[]> = {
  SUPPORT: ["View users & contact info", "Suspend / reactivate accounts", "Read audit logs"],
  VERIFICATION: ["KYC document review", "Approve / reject tutors", "View user profiles", "Read audit logs"],
  FINANCE: ["Wallet management", "Credit / debit coins", "View transactions", "Read audit logs"],
  OPERATIONS: ["Lead management", "Close / expire leads", "Expand radius", "View users", "Read audit logs"],
  MARKETING: ["Platform settings", "Coin package pricing", "Campaign analytics", "Read audit logs"],
};

export function SubAdminManagement({ initialSubAdmins, roleBadges }: SubAdminManagementProps) {
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>(initialSubAdmins);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<SubAdmin | null>(null);
  const [showPermissions, setShowPermissions] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Create modal state
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    subAdminRole: "SUPPORT",
  });
  const [showPassword, setShowPassword] = useState(false);

  function showMsg(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  function handleCreate() {
    startTransition(async () => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      const result = await createSubAdminAction(fd);
      if (result.success) {
        showMsg("success", "Sub-admin account created successfully!");
        setShowCreateModal(false);
        setForm({ name: "", email: "", phone: "", password: "", subAdminRole: "SUPPORT" });
        // Re-fetch by adding to local state
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
        showMsg("success", "Role updated.");
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
          {message.text}
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-sm" style={{ color: "#64748B" }}>
          {subAdmins.length} staff member{subAdmins.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
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
          <p className="mt-1 text-xs" style={{ color: "#64748B" }}>
            Create staff accounts with department-level access to manage the platform.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {subAdmins.map((admin) => {
            const badge = roleBadges[admin.subAdminRole ?? ""] || {
              label: admin.subAdminRole ?? "—",
              color: "#94A3B8",
              bg: "rgba(148,163,184,0.1)",
            };
            const perms = PERMISSION_DESCRIPTIONS[admin.subAdminRole ?? ""] || [];

            return (
              <div
                key={admin.id}
                className="rounded-2xl p-5 transition-all"
                style={{
                  background: "rgba(15,23,42,0.8)",
                  border: `1px solid ${admin.isActive ? "#1E293B" : "rgba(239,68,68,0.2)"}`,
                }}
              >
                {/* Header */}
                <div className="mb-4 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
                      style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.color}33` }}
                    >
                      {(admin.name || admin.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{admin.name || "—"}</p>
                      <p className="text-xs" style={{ color: "#64748B" }}>{admin.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {admin.isActive ? (
                      <span
                        className="inline-flex h-2 w-2 rounded-full"
                        style={{ background: "#22C55E", boxShadow: "0 0 6px rgba(34,197,94,0.6)" }}
                      />
                    ) : (
                      <span className="text-xs font-semibold" style={{ color: "#EF4444" }}>Suspended</span>
                    )}
                  </div>
                </div>

                {/* Role badge */}
                <div className="mb-3">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                    style={{ color: badge.color, background: badge.bg }}
                  >
                    <Shield size={10} />
                    {badge.label}
                  </span>
                </div>

                {/* Phone */}
                {admin.phone && (
                  <p className="mb-3 text-xs" style={{ color: "#475569" }}>
                    📞 {admin.phone}
                  </p>
                )}

                {/* Permissions toggle */}
                <button
                  onClick={() => setShowPermissions(showPermissions === admin.id ? null : admin.id)}
                  className="mb-3 flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                  style={{ color: "#64748B" }}
                >
                  {showPermissions === admin.id ? <EyeOff size={12} /> : <Eye size={12} />}
                  {showPermissions === admin.id ? "Hide" : "Show"} permissions
                </button>

                {showPermissions === admin.id && perms.length > 0 && (
                  <ul className="mb-3 space-y-1">
                    {perms.map((p) => (
                      <li key={p} className="flex items-center gap-2 text-xs" style={{ color: "#94A3B8" }}>
                        <span className="h-1 w-1 rounded-full" style={{ background: badge.color }} />
                        {p}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Joined at */}
                <p className="mb-4 text-xs" style={{ color: "#334155" }}>
                  Created {new Date(admin.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedAdmin(admin)}
                    disabled={isPending}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all hover:opacity-80"
                    style={{ background: "rgba(56,189,248,0.1)", color: "#38BDF8", border: "1px solid rgba(56,189,248,0.2)" }}
                  >
                    <RefreshCw size={11} />
                    Change Role
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

      {/* ── Create Sub-Admin Modal ──────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}>
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{ background: "#0F172A", border: "1px solid #1E293B" }}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
                Create Sub-Admin
              </h2>
              <button onClick={() => setShowCreateModal(false)} style={{ color: "#64748B" }}>
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {[
                { label: "Full Name", key: "name", type: "text", placeholder: "Anjali Sharma" },
                { label: "Email Address", key: "email", type: "email", placeholder: "anjali@apnatutorhub.com" },
                { label: "Phone Number", key: "phone", type: "tel", placeholder: "+91 9876543210" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-semibold text-white">{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={(form as Record<string, string>)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all"
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
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: "#64748B" }}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Department Role */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-white">Department Role</label>
                <select
                  value={form.subAdminRole}
                  onChange={(e) => setForm((f) => ({ ...f, subAdminRole: e.target.value }))}
                  className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                  style={{ background: "#1E293B", border: "1px solid #334155" }}
                >
                  {["SUPPORT", "VERIFICATION", "FINANCE", "OPERATIONS", "MARKETING"].map((role) => (
                    <option key={role} value={role}>{role.charAt(0) + role.slice(1).toLowerCase()}</option>
                  ))}
                </select>

                {/* Permission preview */}
                {PERMISSION_DESCRIPTIONS[form.subAdminRole] && (
                  <div className="mt-2 rounded-xl p-3" style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.1)" }}>
                    <p className="mb-1.5 text-xs font-semibold" style={{ color: "#22C55E" }}>Access granted:</p>
                    <ul className="space-y-1">
                      {PERMISSION_DESCRIPTIONS[form.subAdminRole].map((p) => (
                        <li key={p} className="flex items-center gap-2 text-xs" style={{ color: "#94A3B8" }}>
                          <span className="h-1 w-1 rounded-full" style={{ background: "#22C55E" }} />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white transition-all hover:opacity-80"
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

      {/* ── Change Role Modal ──────────────────────────────────────────── */}
      {selectedAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}>
          <div
            className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            style={{ background: "#0F172A", border: "1px solid #1E293B" }}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-bold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
                Change Department Role
              </h2>
              <button onClick={() => setSelectedAdmin(null)} style={{ color: "#64748B" }}>
                <X size={18} />
              </button>
            </div>

            <p className="mb-4 text-sm" style={{ color: "#64748B" }}>
              Updating role for: <span className="font-medium text-white">{selectedAdmin.name || selectedAdmin.email}</span>
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
                    className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50"
                    style={{
                      background: isCurrentRole ? badge.bg : "rgba(30,41,59,0.6)",
                      color: isCurrentRole ? badge.color : "#94A3B8",
                      border: `1px solid ${isCurrentRole ? badge.color + "40" : "#1E293B"}`,
                    }}
                  >
                    <span>{badge.label}</span>
                    {isCurrentRole && <span className="text-xs">(current)</span>}
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
