"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Shield,
  UserCheck,
  UserX,
  Trash2,
  X,
  Eye,
  EyeOff,
  CheckCircle2,
  Sliders,
} from "lucide-react";
import {
  createSubAdminAction,
  suspendSubAdminAction,
  reactivateSubAdminAction,
  deleteSubAdminAction,
  updateSubAdminRoleAction,
} from "@/app/actions/sub-admin.actions";
import { ActionOverlay } from "@/components/ui/LoadingState";

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
      <ActionOverlay
        isOpen={isPending}
        title="Processing Sub-Admin Account"
        subtitle="Updating team member access permissions and roles..."
      />
      {/* Toast message */}
      {message && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-800 border ${
            message.type === "success" ? "bg-emerald-100 text-emerald-950 border-emerald-300" : "bg-red-100 text-red-950 border-red-300"
          }`}
        >
          <CheckCircle2 size={16} />
          {message.text}
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-6 flex items-center justify-between gap-4 p-4 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <p className="text-xs font-800 text-slate-900">
          {subAdmins.length} staff account{subAdmins.length !== 1 ? "s" : ""} configured
        </p>
        <button
          onClick={() => {
            setSelectedRole("SUPPORT");
            setActivePermissions(ROLE_MODULE_PERMISSIONS["SUPPORT"]);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-800 text-white bg-[#2D9E6B] hover:bg-[#238357] transition-all shadow-md cursor-pointer"
        >
          <Plus size={16} />
          Create Sub-Admin
        </button>
      </div>

      {/* Sub-Admin Cards Grid */}
      {subAdmins.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl py-20 text-center bg-white border border-slate-200 shadow-xs">
          <Shield size={44} className="text-slate-400 mb-3" />
          <p className="text-base font-800 text-[#0F2540]">No sub-admins configured</p>
          <p className="mt-1 text-xs text-slate-600 font-600 max-w-sm">
            Create custom sub-admin accounts with department-level access controls.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {subAdmins.map((admin) => {
            const badge = roleBadges[admin.subAdminRole ?? ""] || {
              label: admin.subAdminRole ?? "Custom",
              color: "#0284C7",
              bg: "bg-sky-100 text-sky-950 border-sky-300",
            };
            const perms = ROLE_MODULE_PERMISSIONS[admin.subAdminRole ?? ""] || [];

            return (
              <div
                key={admin.id}
                className="rounded-3xl p-6 bg-white border border-slate-200 shadow-xs space-y-4 hover:shadow-md transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-800 text-xs text-white bg-[#0F2540] shadow-2xs">
                      {(admin.name || admin.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-800 text-[#0F2540]">{admin.name || "Staff Member"}</p>
                      <p className="truncate text-xs font-600 text-slate-600">{admin.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {admin.isActive ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-800 bg-emerald-100 text-emerald-950 border border-emerald-300">
                        Active
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-800 bg-red-100 text-red-950 border border-red-300">
                        Suspended
                      </span>
                    )}
                  </div>
                </div>

                {/* Role badge */}
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-800 border ${badge.bg}`}>
                    <Shield size={12} />
                    {badge.label}
                  </span>
                  <span className="text-xs font-700 text-slate-600">
                    {perms.length} Features Granted
                  </span>
                </div>

                {/* Phone */}
                {admin.phone && (
                  <p className="text-xs font-700 text-slate-700">
                    📞 {admin.phone}
                  </p>
                )}

                {/* Feature Permissions toggle */}
                <button
                  onClick={() => setShowPermissions(showPermissions === admin.id ? null : admin.id)}
                  className="flex items-center gap-1.5 text-xs font-800 text-[#2563EB] hover:underline transition-colors"
                >
                  {showPermissions === admin.id ? <EyeOff size={13} /> : <Eye size={13} />}
                  {showPermissions === admin.id ? "Hide Granted Features" : "View Granted Features"}
                </button>

                {showPermissions === admin.id && (
                  <div className="rounded-2xl p-3 bg-slate-50 border border-slate-200 space-y-1.5">
                    {perms.map((p) => (
                      <div key={p} className="flex items-center gap-2 text-xs font-700 text-slate-800">
                        <CheckCircle2 size={13} className="text-[#2D9E6B] shrink-0" />
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Created Date */}
                <p className="text-xs font-600 text-slate-500">
                  Created {new Date(admin.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedAdmin(admin)}
                    disabled={isPending}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 text-xs font-800 cursor-pointer"
                  >
                    Edit Role
                  </button>
                  {admin.isActive ? (
                    <button
                      onClick={() => handleSuspend(admin.id)}
                      disabled={isPending}
                      className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 text-xs font-800 cursor-pointer"
                    >
                      Suspend
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivate(admin.id)}
                      disabled={isPending}
                      className="px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border border-emerald-300 text-xs font-800 cursor-pointer"
                    >
                      Reactivate
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(admin.id)}
                    disabled={isPending}
                    className="px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-950 border border-red-300 text-xs font-800 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Sub-Admin Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 space-y-5 border border-slate-300 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-xl font-800 text-[#0F2540]">Create Sub-Admin Staff</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-black">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-800 text-slate-900 mb-1">Full Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Ramesh Verma"
                  className="w-full h-11 px-4 rounded-2xl border border-slate-300 text-xs font-700 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-800 text-slate-900 mb-1">Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ramesh@apnatutorhub.com"
                  className="w-full h-11 px-4 rounded-2xl border border-slate-300 text-xs font-700 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-800 text-slate-900 mb-1">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full h-11 px-4 rounded-2xl border border-slate-300 text-xs font-700 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-800 text-slate-900 mb-1">Department Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="w-full h-11 px-4 rounded-2xl border border-slate-300 text-xs font-800 bg-white outline-none"
                >
                  {Object.keys(ROLE_MODULE_PERMISSIONS).map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-5 py-2.5 rounded-2xl border border-slate-300 text-xs font-800 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isPending}
                className="px-6 py-2.5 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-xs font-800 cursor-pointer shadow-md"
              >
                Create Staff Account
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
