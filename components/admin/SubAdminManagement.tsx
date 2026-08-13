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
  CheckSquare,
  Square,
  Lock,
  Phone,
  Mail,
  User as UserIcon,
  ShieldCheck,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import {
  createSubAdminAction,
  suspendSubAdminAction,
  reactivateSubAdminAction,
  deleteSubAdminAction,
  updateSubAdminPermissionsAction,
} from "@/app/actions/sub-admin.actions";
import { ActionOverlay } from "@/components/ui/LoadingState";
import {
  ALL_ADMIN_FEATURES,
  DEFAULT_ROLE_FEATURES,
  type AdminFeatureKey,
  type AdminFeatureDef,
} from "@/lib/rbac";

type SubAdmin = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  subAdminRole: string | null;
  customPermissions: string[];
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

export function SubAdminManagement({ initialSubAdmins, roleBadges }: SubAdminManagementProps) {
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>(initialSubAdmins);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<SubAdmin | null>(null);
  const [showPermissionsFor, setShowPermissionsFor] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Create form state
  const [selectedRole, setSelectedRole] = useState<string>("SUPPORT");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    DEFAULT_ROLE_FEATURES["SUPPORT"] || []
  );
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  // Edit form state
  const [editRole, setEditRole] = useState<string>("SUPPORT");
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

  function showMsg(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }

  // Handle department base role change during creation
  function handleCreateRoleChange(role: string) {
    setSelectedRole(role);
    setSelectedPermissions(DEFAULT_ROLE_FEATURES[role] || []);
  }

  // Toggle individual feature in creation modal
  function toggleCreatePermission(key: string) {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  // Toggle individual feature in edit modal
  function toggleEditPermission(key: string) {
    setEditPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  // Helper: check if sub-admin has permission (either custom or default role fallback)
  function getEffectivePermissions(admin: SubAdmin): string[] {
    if (admin.customPermissions && admin.customPermissions.length > 0) {
      return admin.customPermissions;
    }
    const role = admin.subAdminRole || "SUPPORT";
    return DEFAULT_ROLE_FEATURES[role] || [];
  }

  function handleCreate() {
    if (!form.name.trim() || form.name.trim().length < 2) {
      showMsg("error", "Please enter a valid full name (at least 2 characters)");
      return;
    }
    if (!form.email.trim() || !form.email.includes("@")) {
      showMsg("error", "Please enter a valid email address");
      return;
    }
    if (!form.password || form.password.length < 6) {
      showMsg("error", "Password must be at least 6 characters long");
      return;
    }
    if (form.phone.trim() && (form.phone.trim().length < 10 || form.phone.trim().length > 15)) {
      showMsg("error", "Phone number must be between 10 and 15 digits if provided");
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("email", form.email.trim());
      if (form.phone.trim()) fd.append("phone", form.phone.trim());
      fd.append("password", form.password);
      fd.append("subAdminRole", selectedRole);
      fd.append("customPermissions", JSON.stringify(selectedPermissions));

      const result = await createSubAdminAction(fd);
      if (result.success) {
        showMsg("success", "Sub-admin staff account created successfully!");
        setShowCreateModal(false);
        setForm({ name: "", email: "", phone: "", password: "" });
        window.location.reload();
      } else {
        showMsg("error", result.error || "Failed to create sub-admin");
      }
    });
  }

  function openEditModal(admin: SubAdmin) {
    setEditingAdmin(admin);
    setEditRole(admin.subAdminRole || "SUPPORT");
    setEditPermissions(getEffectivePermissions(admin));
  }

  function handleSavePermissions() {
    if (!editingAdmin) return;

    startTransition(async () => {
      const result = await updateSubAdminPermissionsAction(
        editingAdmin.id,
        editPermissions,
        editRole
      );
      if (result.success) {
        setSubAdmins((prev) =>
          prev.map((u) =>
            u.id === editingAdmin.id
              ? { ...u, subAdminRole: editRole, customPermissions: editPermissions }
              : u
          )
        );
        showMsg("success", "Sub-admin features & permissions updated successfully!");
        setEditingAdmin(null);
      } else {
        showMsg("error", result.error || "Failed to update permissions");
      }
    });
  }

  function handleSuspend(id: string) {
    startTransition(async () => {
      const result = await suspendSubAdminAction(id);
      if (result.success) {
        setSubAdmins((prev) => prev.map((u) => (u.id === id ? { ...u, isActive: false } : u)));
        showMsg("success", "Sub-admin suspended successfully.");
      } else {
        showMsg("error", result.error || "Failed to suspend");
      }
    });
  }

  function handleReactivate(id: string) {
    startTransition(async () => {
      const result = await reactivateSubAdminAction(id);
      if (result.success) {
        setSubAdmins((prev) => prev.map((u) => (u.id === id ? { ...u, isActive: true } : u)));
        showMsg("success", "Sub-admin reactivated successfully.");
      } else {
        showMsg("error", result.error || "Failed to reactivate");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Permanently delete this sub-admin account? This action cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteSubAdminAction(id);
      if (result.success) {
        setSubAdmins((prev) => prev.filter((u) => u.id !== id));
        showMsg("success", "Sub-admin account deleted permanently.");
      } else {
        showMsg("error", result.error || "Failed to delete");
      }
    });
  }

  // Feature Categories for grouped display
  const featureCategories = Array.from(new Set(ALL_ADMIN_FEATURES.map((f) => f.category)));

  return (
    <>
      <ActionOverlay
        isOpen={isPending}
        title="Processing Sub-Admin Account"
        subtitle="Updating team member access permissions and roles..."
      />

      {/* Toast alert notification */}
      {message && (
        <div
          className={`mb-5 flex items-center justify-between rounded-2xl px-4 py-3 text-xs font-800 border shadow-md ${
            message.type === "success"
              ? "bg-emerald-100 text-emerald-950 border-emerald-300"
              : "bg-rose-100 text-rose-950 border-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="opacity-70 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Toolbar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-800 text-[#0F2540]">Active Sub-Admin Roster</h2>
          <p className="text-xs text-slate-500 font-600">
            {subAdmins.length} staff account{subAdmins.length !== 1 ? "s" : ""} configured with custom features
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedRole("SUPPORT");
            setSelectedPermissions(DEFAULT_ROLE_FEATURES["SUPPORT"] || []);
            setForm({ name: "", email: "", phone: "", password: "" });
            setShowCreateModal(true);
          }}
          className="flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-xs font-800 text-white bg-[#2D9E6B] hover:bg-[#238357] transition-all shadow-md cursor-pointer"
        >
          <Plus size={18} />
          Create Sub-Admin Account
        </button>
      </div>

      {/* Sub-Admin Cards Grid */}
      {subAdmins.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl py-20 text-center bg-white border border-slate-200 shadow-xs">
          <Shield size={48} className="text-slate-300 mb-3" />
          <p className="text-lg font-800 text-[#0F2540]">No sub-admins configured</p>
          <p className="mt-1 text-xs text-slate-500 font-600 max-w-sm">
            Create custom sub-admin staff accounts with granular department feature controls.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {subAdmins.map((admin) => {
            const badge = roleBadges[admin.subAdminRole ?? ""] || {
              label: admin.subAdminRole ?? "Custom",
              color: "#0284C7",
              bg: "bg-sky-100 text-sky-950 border-sky-300",
            };
            const activePerms = getEffectivePermissions(admin);

            return (
              <div
                key={admin.id}
                className="rounded-3xl p-6 bg-white border border-slate-200 shadow-xs space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-800 text-sm text-white bg-[#0F2540] shadow-2xs">
                        {(admin.name || admin.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-800 text-[#0F2540]">
                          {admin.name || "Staff Member"}
                        </p>
                        <p className="truncate text-xs font-600 text-slate-500">{admin.email}</p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {admin.isActive ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-800 bg-emerald-100 text-emerald-950 border border-emerald-300">
                          Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-800 bg-rose-100 text-rose-950 border border-rose-300">
                          Suspended
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Role & Permissions Info */}
                  <div className="flex items-center justify-between pt-1">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-800 border ${badge.bg}`}>
                      <Shield size={12} />
                      {badge.label} Base
                    </span>
                    <span className="text-xs font-700 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                      {activePerms.length} / {ALL_ADMIN_FEATURES.length} Features Granted
                    </span>
                  </div>

                  {/* Contact Phone */}
                  {admin.phone ? (
                    <p className="text-xs font-700 text-slate-600 flex items-center gap-1.5">
                      <Phone size={13} className="text-slate-400" />
                      {admin.phone}
                    </p>
                  ) : (
                    <p className="text-xs font-600 text-slate-400 italic">No phone provided</p>
                  )}

                  {/* Feature Permissions details toggle */}
                  <div>
                    <button
                      onClick={() =>
                        setShowPermissionsFor(showPermissionsFor === admin.id ? null : admin.id)
                      }
                      className="flex items-center gap-1.5 text-xs font-800 text-[#2563EB] hover:underline transition-colors cursor-pointer"
                    >
                      {showPermissionsFor === admin.id ? <EyeOff size={14} /> : <Eye size={14} />}
                      {showPermissionsFor === admin.id ? "Hide Granted Features" : "View Granted Features"}
                    </button>

                    {showPermissionsFor === admin.id && (
                      <div className="mt-2.5 rounded-2xl p-3.5 bg-slate-50 border border-slate-200 space-y-2 max-h-48 overflow-y-auto">
                        {ALL_ADMIN_FEATURES.map((feat) => {
                          const isGranted = activePerms.includes(feat.key);
                          return (
                            <div
                              key={feat.key}
                              className={`flex items-center justify-between text-xs py-1 px-2 rounded-xl ${
                                isGranted ? "bg-white border border-slate-200 text-slate-900 font-700" : "text-slate-400 font-500 line-through opacity-60"
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                {isGranted ? (
                                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                                ) : (
                                  <X size={13} className="text-slate-400 shrink-0" />
                                )}
                                {feat.label}
                              </span>
                              <span className="text-[10px] text-slate-500 font-600">{feat.route}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <p className="text-[11px] font-600 text-slate-400">
                    Created {new Date(admin.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => openEditModal(admin)}
                      disabled={isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-800 cursor-pointer shadow-xs"
                    >
                      <Sliders size={13} />
                      Manage Access
                    </button>

                    {admin.isActive ? (
                      <button
                        onClick={() => handleSuspend(admin.id)}
                        disabled={isPending}
                        className="px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 text-xs font-800 cursor-pointer"
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(admin.id)}
                        disabled={isPending}
                        className="px-3 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border border-emerald-300 text-xs font-800 cursor-pointer"
                      >
                        Reactivate
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(admin.id)}
                      disabled={isPending}
                      className="px-2.5 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-950 border border-rose-300 text-xs font-800 cursor-pointer"
                      title="Delete account"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE SUB-ADMIN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-white border border-slate-300 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2D9E6B] text-white">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-800 text-[#0F2540]">Create Sub-Admin Staff</h3>
                  <p className="text-xs text-slate-500 font-600">Configure account details & choose feature access</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl p-2 text-slate-400 hover:text-black hover:bg-slate-200 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Account Credentials */}
              <div className="space-y-4">
                <h4 className="text-xs font-800 text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <UserIcon size={14} className="text-[#2D9E6B]" />
                  Staff Account Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-800 text-slate-900 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Ramesh Verma"
                      className="w-full h-11 px-4 rounded-2xl border border-slate-300 text-xs font-700 outline-none focus:border-[#2D9E6B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-800 text-slate-900 mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="ramesh@apnatutorhub.com"
                      className="w-full h-11 px-4 rounded-2xl border border-slate-300 text-xs font-700 outline-none focus:border-[#2D9E6B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-800 text-slate-900 mb-1">
                      Phone Number <span className="text-slate-400 font-500">(Optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="e.g. 9876543210"
                      className="w-full h-11 px-4 rounded-2xl border border-slate-300 text-xs font-700 outline-none focus:border-[#2D9E6B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-800 text-slate-900 mb-1">
                      Login Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="Min 6 characters"
                        className="w-full h-11 pl-4 pr-10 rounded-2xl border border-slate-300 text-xs font-700 outline-none focus:border-[#2D9E6B]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Department Role Preset */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-800 text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Shield size={14} className="text-[#2D9E6B]" />
                    Base Department Preset
                  </h4>
                  <span className="text-[11px] font-600 text-slate-500">
                    Pre-fills feature checklist below
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {Object.keys(DEFAULT_ROLE_FEATURES).map((role) => {
                    const badge = roleBadges[role] || { label: role, bg: "" };
                    const isSelected = selectedRole === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => handleCreateRoleChange(role)}
                        className={`px-3 py-2.5 rounded-2xl text-xs font-800 border text-center transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#0F2540] text-white border-[#0F2540] shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {badge.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Granular Features Selection Grid */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-800 text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles size={14} className="text-[#2D9E6B]" />
                      Custom Feature Permissions
                    </h4>
                    <p className="text-[11px] text-slate-500 font-600 mt-0.5">
                      Check or uncheck features to grant or remove specific permissions
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPermissions(ALL_ADMIN_FEATURES.map((f) => f.key))}
                      className="text-[11px] font-800 text-[#2563EB] hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedPermissions(["dashboard"])}
                      className="text-[11px] font-800 text-rose-600 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Categories */}
                <div className="space-y-4">
                  {featureCategories.map((cat) => {
                    const catFeatures = ALL_ADMIN_FEATURES.filter((f) => f.category === cat);
                    return (
                      <div key={cat} className="space-y-2">
                        <p className="text-[11px] font-800 text-slate-600 tracking-wider uppercase">
                          {cat}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {catFeatures.map((feat) => {
                            const checked = selectedPermissions.includes(feat.key);
                            return (
                              <div
                                key={feat.key}
                                onClick={() => toggleCreatePermission(feat.key)}
                                className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                                  checked
                                    ? "bg-emerald-50/60 border-emerald-300 shadow-2xs"
                                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                <div className="mt-0.5 shrink-0">
                                  {checked ? (
                                    <CheckSquare size={16} className="text-[#2D9E6B]" />
                                  ) : (
                                    <Square size={16} className="text-slate-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <p className={`text-xs font-800 ${checked ? "text-[#0F2540]" : "text-slate-600"}`}>
                                      {feat.label}
                                    </p>
                                  </div>
                                  <p className="text-[10px] text-slate-500 font-600 line-clamp-1">
                                    {feat.description}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl border border-slate-300 text-xs font-800 hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isPending}
                className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-xs font-800 cursor-pointer shadow-md"
              >
                Create Staff Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PERMISSIONS / ROLE MODAL */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-white border border-slate-300 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <Sliders size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-800 text-[#0F2540]">
                    Manage Access: {editingAdmin.name || editingAdmin.email}
                  </h3>
                  <p className="text-xs text-slate-500 font-600">Grant or remove features for this sub-admin account</p>
                </div>
              </div>
              <button
                onClick={() => setEditingAdmin(null)}
                className="rounded-xl p-2 text-slate-400 hover:text-black hover:bg-slate-200 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Department Role Selector */}
              <div className="space-y-3">
                <label className="block text-xs font-800 text-slate-900 uppercase tracking-wider">
                  Base Department Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => {
                    const r = e.target.value;
                    setEditRole(r);
                    setEditPermissions(DEFAULT_ROLE_FEATURES[r] || []);
                  }}
                  className="w-full h-11 px-4 rounded-2xl border border-slate-300 text-xs font-800 bg-white outline-none"
                >
                  {Object.keys(DEFAULT_ROLE_FEATURES).map((role) => (
                    <option key={role} value={role}>
                      {roleBadges[role]?.label || role} Department
                    </option>
                  ))}
                </select>
              </div>

              {/* Granular Feature Checkboxes */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-800 text-slate-900 uppercase tracking-wider">
                      Granted Platform Features ({editPermissions.length} of {ALL_ADMIN_FEATURES.length})
                    </h4>
                    <p className="text-[11px] text-slate-500 font-600 mt-0.5">
                      Check a feature to grant access, uncheck to remove access
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditPermissions(ALL_ADMIN_FEATURES.map((f) => f.key))}
                      className="text-[11px] font-800 text-[#2563EB] hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setEditPermissions(["dashboard"])}
                      className="text-[11px] font-800 text-rose-600 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Feature checklist by category */}
                <div className="space-y-4">
                  {featureCategories.map((cat) => {
                    const catFeatures = ALL_ADMIN_FEATURES.filter((f) => f.category === cat);
                    return (
                      <div key={cat} className="space-y-2">
                        <p className="text-[11px] font-800 text-slate-600 tracking-wider uppercase">
                          {cat}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {catFeatures.map((feat) => {
                            const checked = editPermissions.includes(feat.key);
                            return (
                              <div
                                key={feat.key}
                                onClick={() => toggleEditPermission(feat.key)}
                                className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                                  checked
                                    ? "bg-emerald-50/60 border-emerald-300 shadow-2xs"
                                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                <div className="mt-0.5 shrink-0">
                                  {checked ? (
                                    <CheckSquare size={16} className="text-[#2D9E6B]" />
                                  ) : (
                                    <Square size={16} className="text-slate-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className={`text-xs font-800 ${checked ? "text-[#0F2540]" : "text-slate-600"}`}>
                                    {feat.label}
                                  </p>
                                  <p className="text-[10px] text-slate-500 font-600 line-clamp-1">
                                    {feat.description}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setEditingAdmin(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl border border-slate-300 text-xs font-800 hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={isPending}
                className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-slate-900 hover:bg-black text-white text-xs font-800 cursor-pointer shadow-md"
              >
                Save Permission Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
