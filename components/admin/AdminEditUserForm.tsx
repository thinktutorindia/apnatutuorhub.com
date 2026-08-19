"use client";

import React, { useState, useTransition, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  User,
  ShieldCheck,
  MapPin,
  FileText,
  Video,
  GraduationCap,
  ExternalLink,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Camera,
  Coins,
  Map as MapIcon,
  Navigation,
  Check,
  BookOpen,
  Sparkles,
  Award,
  Briefcase,
  Calendar,
  CheckSquare,
  Square,
  Star,
  ChevronRight,
  Sliders,
  UserCheck,
  ChevronDown,
  MessageSquare,
  Bell,
  Clock,
  Send,
  Plus,
  Info,
  History,
  Tag,
  Trash2,
  Edit3,
  X as CloseIcon,
} from "lucide-react";
import { TutorOnboardingWizard } from "@/components/tutor/onboarding/TutorOnboardingWizard";
import { OpenStreetMapPickerModal } from "@/components/ui/OpenStreetMapPickerModal";
import { ProfilePhotoUpload } from "@/components/ui/ProfilePhotoUpload";
import { SubjectPicker } from "@/components/ui/SubjectPicker";
import { CLASS_LEVELS, BOARDS } from "@/lib/validations";
import { ActionOverlay } from "@/components/ui/LoadingState";
import {
  adminUpdateFullUserAction,
  addAdminUserNoteAction,
  sendAdminCustomNotificationAction,
  adminUpsertStudentProfileAction,
  adminDeleteStudentProfileAction,
} from "@/app/actions/admin.actions";
import { maskPhoneNumber } from "@/lib/mask-utils";

interface PresignedUrls {
  idViewUrl: string | null;
  addressViewUrl: string | null;
  selfieViewUrl: string | null;
  introVideoViewUrl: string | null;
}

export interface AdminNoteItem {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
}

interface UserData {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: "PARENT" | "TUTOR" | "SUPER_ADMIN" | "SUB_ADMIN";
  subAdminRole: string | null;
  isActive: boolean;
  image?: string | null;
  createdAt: string;
  parentProfile?: {
    city: string | null;
    state?: string | null;
    pincode: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    students?: Array<{
      id: string;
      name: string;
      classLevel?: string;
      board?: string | null;
      subjects?: string[];
      notes?: string | null;
      image?: string | null;
    }>;
  } | null;
  tutorProfile?: {
    id?: string;
    onboardingStep: number;
    gender: string | null;
    dateOfBirth: string | null;
    maritalStatus: string | null;
    profession: string | null;
    qualification: string | null;
    educationCourse: string | null;
    educationSubjects: string | null;
    educationUniversity: string | null;
    educationYear: string | null;
    teachingStartYear: number | null;
    interestedIn: string[];
    teachingMode: string;
    teachingRadius: number;
    isVerified: boolean;
    isFeatured: boolean;
    subscriptionPlan: string;
    city: string | null;
    state: string | null;
    pincode: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    kycStatus: string;
    kycRejectionNote: string | null;
    kycIdProofUrl: string | null;
    kycAddressUrl: string | null;
    kycSelfieUrl: string | null;
    introVideoUrl: string | null;
    subjects: string[];
    classLevels: string[];
    experience: number | null;
    feeMin: number | null;
    feeMax: number | null;
    bio: string | null;
    wallet?: { balance: number } | null;
  } | null;
}

export function AdminEditUserForm({
  user,
  presignedUrls,
  adminNotes = [],
  isSuperAdmin = false,
}: {
  user: UserData;
  presignedUrls: PresignedUrls;
  adminNotes?: AdminNoteItem[];
  isSuperAdmin?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // User details
  const [role, setRole] = useState<"PARENT" | "TUTOR" | "SUPER_ADMIN" | "SUB_ADMIN">(user.role);

  // Tutor and Parent profiles
  const tutorProfile = user.tutorProfile;
  const parentProfile = user.parentProfile;

  const [onboardingStep, setOnboardingStep] = useState<number>(tutorProfile?.onboardingStep ?? 7);
  const [isVerified, setIsVerified] = useState<boolean>(tutorProfile?.isVerified ?? false);
  const [isFeatured, setIsFeatured] = useState<boolean>(tutorProfile?.isFeatured ?? false);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>(tutorProfile?.subscriptionPlan ?? "NONE");

  // Document view URLs
  const [idViewUrl] = useState<string | null>(presignedUrls.idViewUrl);
  const [addressViewUrl] = useState<string | null>(presignedUrls.addressViewUrl);
  const [selfieViewUrl] = useState<string | null>(presignedUrls.selfieViewUrl);
  const [introVideoViewUrl] = useState<string | null>(presignedUrls.introVideoViewUrl);

  // Parent profile state
  const [parentCity, setParentCity] = useState<string>(parentProfile?.city || "");
  const [parentState, setParentState] = useState<string>(parentProfile?.state || "");
  const [parentPincode, setParentPincode] = useState<string>(parentProfile?.pincode || "");
  const [parentAddress, setParentAddress] = useState<string>(parentProfile?.address || "");
  const [parentLat, setParentLat] = useState<number | null>(parentProfile?.latitude ?? null);
  const [parentLng, setParentLng] = useState<number | null>(parentProfile?.longitude ?? null);
  const [isParentMapOpen, setIsParentMapOpen] = useState(false);

  // Parent Students State
  const [studentsList, setStudentsList] = useState<any[]>(parentProfile?.students || []);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [studentBoard, setStudentBoard] = useState("");
  const [studentSubjects, setStudentSubjects] = useState<string[]>([]);
  const [studentImage, setStudentImage] = useState("");
  const [studentNotes, setStudentNotes] = useState("");
  const [isSavingStudent, setIsSavingStudent] = useState(false);

  const handleOpenAddStudent = () => {
    setEditingStudentId(null);
    setStudentName("");
    setStudentClass("");
    setStudentBoard("");
    setStudentSubjects([]);
    setStudentImage("");
    setStudentNotes("");
    setIsStudentModalOpen(true);
  };

  const handleOpenEditStudent = (s: any) => {
    setEditingStudentId(s.id);
    setStudentName(s.name || "");
    setStudentClass(s.classLevel || "");
    setStudentBoard(s.board || "");
    setStudentSubjects(Array.isArray(s.subjects) ? s.subjects : []);
    setStudentImage(s.image || "");
    setStudentNotes(s.notes || "");
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingStudent(true);

    const res = await adminUpsertStudentProfileAction(user.id, {
      studentId: editingStudentId || undefined,
      name: studentName,
      classLevel: studentClass,
      board: studentBoard,
      subjects: studentSubjects,
      notes: studentNotes,
      image: studentImage || null,
    });

    setIsSavingStudent(false);
    if (!res.success) {
      alert(res.error || "Failed to save student.");
    } else {
      if (editingStudentId) {
        setStudentsList((prev) =>
          prev.map((item) =>
            item.id === editingStudentId
              ? {
                  ...item,
                  name: studentName || "Child",
                  classLevel: studentClass || "General",
                  board: studentBoard || null,
                  subjects: studentSubjects,
                  notes: studentNotes || null,
                  image: studentImage || null,
                }
              : item
          )
        );
      } else {
        setStudentsList((prev) => [
          ...prev,
          {
            id: res.data?.studentId || String(Date.now()),
            name: studentName || "Child",
            classLevel: studentClass || "General",
            board: studentBoard || null,
            subjects: studentSubjects,
            notes: studentNotes || null,
            image: studentImage || null,
          },
        ]);
      }
      setIsStudentModalOpen(false);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm("Are you sure you want to remove this child profile?")) return;
    const res = await adminDeleteStudentProfileAction(studentId, user.id);
    if (!res.success) {
      alert(res.error || "Failed to delete student.");
    } else {
      setStudentsList((prev) => prev.filter((item) => item.id !== studentId));
    }
  };

  // Internal Notes State
  const [notesList, setNotesList] = useState<AdminNoteItem[]>(adminNotes);
  const [newNoteText, setNewNoteText] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Custom Notification State
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifChannel, setNotifChannel] = useState<"WEB" | "EMAIL" | "SMS" | "WHATSAPP" | "PUSH">("WEB");
  const [isScheduleMode, setIsScheduleMode] = useState(false);
  const [scheduledAtDate, setScheduledAtDate] = useState("");

  const isTutor = role === "TUTOR";

  const handleAdminControlsSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    formData.set("isVerified", isVerified ? "true" : "false");
    formData.set("isFeatured", isFeatured ? "true" : "false");

    startTransition(async () => {
      const res = await adminUpdateFullUserAction(formData);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to update admin controls.");
      } else {
        setSuccessMsg("🎉 Super Admin controls & system features saved successfully!");
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    });
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    setIsAddingNote(true);
    startTransition(async () => {
      const res = await addAdminUserNoteAction(user.id, newNoteText);
      setIsAddingNote(false);

      if (!res.success) {
        alert(res.error || "Failed to add internal note.");
      } else {
        setNotesList((prev) => [
          {
            id: res.data?.id || String(Date.now()),
            authorName: "You (Admin Staff)",
            content: newNoteText.trim(),
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        setNewNoteText("");
        setSuccessMsg("📝 Internal admin note added!");
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    });
  };

  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      alert("Please fill in both notification title and message.");
      return;
    }

    startTransition(async () => {
      const res = await sendAdminCustomNotificationAction({
        targetUserId: user.id,
        title: notifTitle,
        message: notifMessage,
        channel: notifChannel,
        scheduledAt: isScheduleMode && scheduledAtDate ? scheduledAtDate : undefined,
      });

      if (!res.success) {
        alert(res.error || "Failed to send notification.");
      } else {
        alert(
          isScheduleMode && scheduledAtDate
            ? `🗓️ Custom notification scheduled for ${new Date(scheduledAtDate).toLocaleString("en-IN")}!`
            : "🚀 Instant notification sent to user successfully!"
        );
        setNotifTitle("");
        setNotifMessage("");
        setScheduledAtDate("");
        setIsScheduleMode(false);
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-7 pb-20">
      <ActionOverlay
        isOpen={isPending}
        title="Updating User Records & Actions"
        subtitle="Saving parameters, internal staff notes, and notification schedules..."
      />

      {/* Header Bar */}
      <div>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-xs font-black transition-colors hover:underline text-[#2D9E6B]"
        >
          <ArrowLeft size={14} /> Back to User Directory
        </Link>
        <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || user.email}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md ring-2 ring-emerald-500/20 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white font-black text-xl flex items-center justify-center border-2 border-white shadow-md shrink-0">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1
                className="text-2xl sm:text-3xl font-black text-[#0F2540] tracking-tight"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                User Management: {user.name || user.email}
              </h1>
              <p className="text-xs text-slate-600 font-bold mt-1 font-mono break-all">
                User ID: <span className="text-[#0F2540] font-black">{user.id}</span> · Joined:{" "}
                <span className="text-[#0F2540] font-black">
                  {new Date(user.createdAt).toLocaleDateString("en-IN")}
                </span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-2xs border ${
                role === "SUPER_ADMIN"
                  ? "bg-purple-100 text-purple-900 border-purple-300"
                  : role === "SUB_ADMIN"
                    ? "bg-amber-100 text-amber-900 border-amber-300"
                    : role === "TUTOR"
                      ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                      : "bg-blue-100 text-blue-900 border-blue-300"
              }`}
            >
              {role}
            </span>
            {isTutor && (
              <span
                className={`px-4 py-1.5 rounded-full text-xs font-black shadow-2xs border ${
                  onboardingStep >= 7
                    ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                    : "bg-amber-100 text-amber-900 border-amber-300"
                }`}
              >
                {onboardingStep >= 7 ? "Step 7/7 (100% Onboarded)" : `Onboarding Step ${onboardingStep}/7`}
              </span>
            )}
            <span
              className={`px-4 py-1.5 rounded-full text-xs font-black shadow-2xs border ${
                user.isActive
                  ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                  : "bg-red-100 text-red-900 border-red-300"
              }`}
            >
              {user.isActive ? "Active Account" : "Suspended"}
            </span>
          </div>
        </div>
      </div>

      {/* Success / Error Banners */}
      {successMsg && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 border border-emerald-300 p-4 text-xs font-black text-emerald-900 shadow-sm animate-in fade-in">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-red-50 border border-red-300 p-4 text-xs font-black text-red-900 shadow-sm animate-in fade-in">
          <AlertCircle size={18} className="shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── CARD 1: SUPER ADMIN GOVERNANCE & ACCOUNT CONTROLS (CLEAN LIGHT CARD) ── */}
      <form onSubmit={handleAdminControlsSubmit} className="space-y-6">
        <input type="hidden" name="userId" value={user.id} />

        <div className="rounded-3xl p-6 sm:p-8 space-y-6 bg-white border border-slate-200 shadow-xl shadow-slate-200/50">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
                <Sliders size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-[#0F2540]">
                  Super Admin Governance &amp; Account Controls
                </h2>
                <p className="text-xs text-slate-500 font-semibold">
                  Manage user roles, access status, badges, onboarding progress, and subscription plans.
                </p>
              </div>
            </div>
            <span className="text-xs font-black text-purple-700 bg-purple-100 px-3.5 py-1.5 rounded-full border border-purple-200">
              Admin Governance
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="mb-1.5 block text-xs font-extrabold text-slate-700">Full Name *</label>
              <input
                name="name"
                defaultValue={user.name || ""}
                required
                className="w-full rounded-2xl px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 transition-all font-bold"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-extrabold text-slate-700">Email Address *</label>
              <input
                name="email"
                type="email"
                defaultValue={user.email}
                required
                className="w-full rounded-2xl px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 transition-all font-bold"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-extrabold text-slate-700">Phone Number</label>
                {!isSuperAdmin && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    🔒 Masked for Staff
                  </span>
                )}
              </div>
              {isSuperAdmin ? (
                <input
                  name="phone"
                  defaultValue={user.phone || ""}
                  placeholder="+91 9876543210"
                  className="w-full rounded-2xl px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 transition-all font-bold"
                />
              ) : (
                <input
                  type="text"
                  readOnly
                  disabled
                  value={user.phone ? maskPhoneNumber(user.phone) || "—" : "—"}
                  className="w-full rounded-2xl px-4 py-3 text-sm text-slate-500 bg-slate-100 border border-slate-200 cursor-not-allowed font-mono font-bold"
                  title="Phone number is masked for staff. Only Super Admin can view or modify raw phone numbers."
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="mb-1.5 block text-xs font-extrabold text-slate-700">User System Role</label>
              <select
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full rounded-2xl px-3.5 py-3 text-sm text-slate-900 outline-none bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#2D9E6B] font-extrabold cursor-pointer"
              >
                <option value="PARENT" className="text-slate-900 font-bold">PARENT (Student / Guardian)</option>
                <option value="TUTOR" className="text-slate-900 font-bold">TUTOR (Educator)</option>
                <option value="SUPER_ADMIN" className="text-slate-900 font-bold">SUPER_ADMIN (Owner / Master)</option>
                <option value="SUB_ADMIN" className="text-slate-900 font-bold">SUB_ADMIN (Staff Member)</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-extrabold text-slate-700">Sub-Admin Department</label>
              <select
                name="subAdminRole"
                defaultValue={user.subAdminRole || ""}
                disabled={role !== "SUB_ADMIN"}
                className="w-full rounded-2xl px-3.5 py-3 text-sm text-slate-900 outline-none bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#2D9E6B] font-extrabold disabled:opacity-40 cursor-pointer"
              >
                <option value="" className="text-slate-900 font-bold">None (Standard User)</option>
                <option value="SUPPORT" className="text-slate-900 font-bold">SUPPORT (User Desk)</option>
                <option value="VERIFICATION" className="text-slate-900 font-bold">VERIFICATION (KYC Team)</option>
                <option value="FINANCE" className="text-slate-900 font-bold">FINANCE (Wallets / Refunds)</option>
                <option value="OPERATIONS" className="text-slate-900 font-bold">OPERATIONS (Leads / Bookings)</option>
                <option value="MARKETING" className="text-slate-900 font-bold">MARKETING (Coupons / Alerts)</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-extrabold text-slate-700">Account Access Status</label>
              <select
                name="isActive"
                defaultValue={user.isActive ? "true" : "false"}
                className="w-full rounded-2xl px-3.5 py-3 text-sm text-slate-900 outline-none bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#2D9E6B] font-extrabold cursor-pointer"
              >
                <option value="true" className="text-slate-900 font-bold">Active (Normal Access)</option>
                <option value="false" className="text-slate-900 font-bold">Suspended (Blocked from Login)</option>
              </select>
            </div>
          </div>

          {isTutor && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-3 border-t border-slate-100">
              <div>
                <label className="mb-1.5 block text-xs font-extrabold text-slate-700">
                  Onboarding Progress Step Override
                </label>
                <select
                  name="onboardingStep"
                  value={onboardingStep}
                  onChange={(e) => setOnboardingStep(Number(e.target.value))}
                  className="w-full rounded-2xl px-3.5 py-3 text-sm text-slate-900 outline-none bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#2D9E6B] font-extrabold cursor-pointer"
                >
                  <option value={0} className="text-slate-900 font-bold">Step 0: Not Started (0%)</option>
                  <option value={1} className="text-slate-900 font-bold">Step 1: Location Address Pinned</option>
                  <option value={2} className="text-slate-900 font-bold">Step 2: Personal Details Entered</option>
                  <option value={3} className="text-slate-900 font-bold">Step 3: Subjects &amp; Classes Selected</option>
                  <option value={4} className="text-slate-900 font-bold">Step 4: Education &amp; Degree Added</option>
                  <option value={5} className="text-slate-900 font-bold">Step 5: Preferences &amp; Rates Set</option>
                  <option value={6} className="text-slate-900 font-bold">Step 6: Bio &amp; Intro Video Submitted</option>
                  <option value={7} className="text-slate-900 font-bold">Step 7: 100% Onboarding Complete ✅</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-extrabold text-slate-700">
                  Subscription Plan Tier
                </label>
                <select
                  name="subscriptionPlan"
                  value={subscriptionPlan}
                  onChange={(e) => setSubscriptionPlan(e.target.value)}
                  className="w-full rounded-2xl px-3.5 py-3 text-sm text-slate-900 outline-none bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#2D9E6B] font-extrabold cursor-pointer"
                >
                  <option value="NONE" className="text-slate-900 font-bold">NONE (Free Tier)</option>
                  <option value="BRONZE" className="text-slate-900 font-bold">BRONZE Plan</option>
                  <option value="SILVER" className="text-slate-900 font-bold">SILVER Plan</option>
                  <option value="GOLD" className="text-slate-900 font-bold">GOLD Plan</option>
                  <option value="PLATINUM" className="text-slate-900 font-bold">PLATINUM Plan</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-extrabold text-slate-700">
                  Wallet Coin Balance
                </label>
                <input
                  name="coinBalance"
                  type="number"
                  defaultValue={tutorProfile?.wallet?.balance ?? 0}
                  placeholder="0"
                  className="w-full rounded-2xl px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#2D9E6B] transition-all font-bold"
                />
              </div>
            </div>
          )}

          {/* ── PARENT ADDRESS & LOCATION CONTROLS ── */}
          {role === "PARENT" && (
            <div className="space-y-4 pt-4 border-t border-slate-100 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#2D9E6B] flex items-center justify-center font-bold">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#0F2540]">
                      Parent Doorstep &amp; Residence Location
                    </h3>
                    <p className="text-[11px] text-slate-500 font-semibold">
                      Edit city, pincode, doorstep address, and GPS coordinates on user's behalf
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsParentMapOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#0F2540] hover:bg-[#1A3C5E] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <MapIcon size={14} className="text-[#2D9E6B]" />
                  <span>🗺️ Pick on Map</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="mb-1.5 block text-xs font-extrabold text-slate-700">City</label>
                  <input
                    name="city"
                    value={parentCity}
                    onChange={(e) => setParentCity(e.target.value)}
                    placeholder="e.g. South Delhi"
                    className="w-full rounded-2xl px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#2D9E6B] font-bold"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-extrabold text-slate-700">State</label>
                  <input
                    name="state"
                    value={parentState}
                    onChange={(e) => setParentState(e.target.value)}
                    placeholder="e.g. Delhi"
                    className="w-full rounded-2xl px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#2D9E6B] font-bold"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-extrabold text-slate-700">Pincode</label>
                  <input
                    name="pincode"
                    value={parentPincode}
                    onChange={(e) => setParentPincode(e.target.value)}
                    placeholder="e.g. 110080"
                    className="w-full rounded-2xl px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#2D9E6B] font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-extrabold text-slate-700">Full Doorstep Address</label>
                <textarea
                  name="address"
                  rows={2}
                  value={parentAddress}
                  onChange={(e) => setParentAddress(e.target.value)}
                  placeholder="House / Flat No., Society / Apartment, Landmark, Locality"
                  className="w-full rounded-2xl px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#2D9E6B] font-bold resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-extrabold text-slate-700">Latitude (GPS)</label>
                  <input
                    name="latitude"
                    value={parentLat !== null ? parentLat : ""}
                    onChange={(e) => setParentLat(e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="e.g. 28.6139"
                    className="w-full rounded-2xl px-4 py-2.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#2D9E6B] font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-extrabold text-slate-700">Longitude (GPS)</label>
                  <input
                    name="longitude"
                    value={parentLng !== null ? parentLng : ""}
                    onChange={(e) => setParentLng(e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="e.g. 77.2090"
                    className="w-full rounded-2xl px-4 py-2.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#2D9E6B] font-mono font-bold"
                  />
                </div>
              </div>

              {/* ── REGISTERED CHILDREN / STUDENT PROFILES LIST ── */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap size={16} className="text-blue-600" />
                    <h4 className="text-xs font-extrabold text-[#0F2540]">
                      Registered Children ({studentsList.length})
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAddStudent}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                  >
                    <Plus size={14} />
                    <span>Add Child Profile</span>
                  </button>
                </div>

                {studentsList.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {studentsList.map((student) => (
                      <div
                        key={student.id}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 relative group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {student.image && student.image.length <= 4 && !student.image.startsWith("http") ? (
                              <span className="text-base">{student.image}</span>
                            ) : student.image ? (
                              <img src={student.image} alt={student.name || "Child"} className="w-6 h-6 rounded-full object-cover border border-slate-200" />
                            ) : (
                              <span>🎓</span>
                            )}
                            <span className="text-xs font-extrabold text-[#0F2540]">{student.name || "Child"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md border border-blue-200">
                              {student.classLevel || "General"}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenEditStudent(student)}
                              className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 flex items-center justify-center transition-colors cursor-pointer"
                              title="Edit Child Details"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStudent(student.id)}
                              className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-300 flex items-center justify-center transition-colors cursor-pointer"
                              title="Delete Child Profile"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        {student.board && (
                          <p className="text-[11px] font-bold text-slate-600">
                            Board: <span className="text-slate-900 font-extrabold">{student.board}</span>
                          </p>
                        )}
                        {student.subjects && student.subjects.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {student.subjects.map((sub: string, i: number) => (
                              <span
                                key={i}
                                className="text-[10px] font-bold bg-emerald-50 text-[#15803D] px-1.5 py-0.5 rounded border border-emerald-200"
                              >
                                {sub}
                              </span>
                            ))}
                          </div>
                        )}
                        {student.notes && (
                          <p className="text-[10px] font-semibold text-slate-500 italic pt-0.5">
                            &ldquo;{student.notes}&rdquo;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-500 font-bold flex flex-col items-center gap-2">
                    <span>No child profiles added yet for this parent.</span>
                    <button
                      type="button"
                      onClick={handleOpenAddStudent}
                      className="text-blue-600 hover:underline font-bold text-xs cursor-pointer inline-flex items-center gap-1"
                    >
                      <Plus size={13} /> Add first child profile (optional)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Badges & KYC Controls for Tutor */}
          {isTutor && (
            <div className="space-y-4 pt-3 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="mb-1.5 block text-xs font-extrabold text-slate-700">KYC Verification Status</label>
                  <select
                    name="kycStatus"
                    defaultValue={tutorProfile?.kycStatus || "NOT_SUBMITTED"}
                    className="w-full rounded-2xl px-3.5 py-3 text-sm text-slate-900 outline-none bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#2D9E6B] font-extrabold cursor-pointer"
                  >
                    <option value="NOT_SUBMITTED" className="text-slate-900 font-bold">NOT_SUBMITTED</option>
                    <option value="PENDING" className="text-slate-900 font-bold">PENDING (In Admin Queue)</option>
                    <option value="APPROVED" className="text-slate-900 font-bold">APPROVED (Verified Badge ✅)</option>
                    <option value="REJECTED" className="text-slate-900 font-bold">REJECTED (Requires Re-submission)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-extrabold text-slate-700">KYC Rejection Reason / Admin Note</label>
                  <input
                    name="kycRejectionNote"
                    defaultValue={tutorProfile?.kycRejectionNote || ""}
                    placeholder="e.g. Blurry ID proof photo."
                    className="w-full rounded-2xl px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#2D9E6B] font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setIsVerified(!isVerified)}
                  className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                    isVerified
                      ? "bg-emerald-50 border-emerald-300 text-emerald-950 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={22} className={isVerified ? "text-[#2D9E6B]" : "text-slate-400"} />
                    <div>
                      <p className="text-xs font-black text-[#0F2540]">Verified Educator Badge ✅</p>
                      <p className="text-[11px] text-slate-500 font-semibold">Shows verified checkmark badge on tutor profile card</p>
                    </div>
                  </div>
                  {isVerified ? <CheckSquare size={20} className="text-[#2D9E6B]" /> : <Square size={20} className="text-slate-400" />}
                </div>

                <div
                  onClick={() => setIsFeatured(!isFeatured)}
                  className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                    isFeatured
                      ? "bg-amber-50 border-amber-300 text-amber-950 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Star size={22} className={isFeatured ? "text-amber-500" : "text-slate-400"} />
                    <div>
                      <p className="text-xs font-black text-[#0F2540]">Featured Tutor Badge ⭐</p>
                      <p className="text-[11px] text-slate-500 font-semibold">Boosts search ranking and homepage placement</p>
                    </div>
                  </div>
                  {isFeatured ? <CheckSquare size={20} className="text-amber-500" /> : <Square size={20} className="text-slate-400" />}
                </div>
              </div>
            </div>
          )}

          {/* Universal Submit Button for All Roles */}
          <div className="pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-xs sm:text-sm font-black text-white transition-all cursor-pointer shadow-lg hover:opacity-95 active:scale-98"
              style={{ background: "linear-gradient(135deg, #2D9E6B, #1A3C5E)" }}
            >
              <Save size={18} />
              <span>Save Super Admin Controls &amp; User Details</span>
            </button>
          </div>
        </div>
      </form>

      {/* ── CARD 2: EXACT TUTOR ONBOARDING WIZARD COMPONENT (1:1 ONBOARD FORM FROM TUTOR/ONBOARD) ── */}
      {isTutor && (
        <div className="space-y-3">
          <div className="p-4 sm:p-5 rounded-3xl bg-[#0F2540] text-white shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  Live Tutor Onboarding Form (Fill on User's Behalf)
                </h3>
                <p className="text-xs text-slate-300 font-semibold">
                  Exact same 7-step wizard component as <code className="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-emerald-300">/tutor/onboarding</code>
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/50 bg-white">
            <TutorOnboardingWizard
              isAdminMode={true}
              targetUserId={user.id}
              profile={{
                id: tutorProfile?.id || "",
                onboardingStep: tutorProfile?.onboardingStep ?? 0,
                city: tutorProfile?.city ?? "",
                state: tutorProfile?.state ?? "",
                pincode: tutorProfile?.pincode ?? "",
                address: tutorProfile?.address ?? "",
                latitude: tutorProfile?.latitude ?? null,
                longitude: tutorProfile?.longitude ?? null,
                gender: tutorProfile?.gender ?? "",
                teachingStartYear: tutorProfile?.teachingStartYear ?? null,
                subjects: tutorProfile?.subjects ?? [],
                classLevels: tutorProfile?.classLevels ?? [],
                teachingMode: tutorProfile?.teachingMode ?? "EITHER",
                teachingRadius: tutorProfile?.teachingRadius ?? 10,
                educationCourse: tutorProfile?.educationCourse ?? "",
                educationSubjects: tutorProfile?.educationSubjects ?? "",
                educationUniversity: tutorProfile?.educationUniversity ?? "",
                educationYear: tutorProfile?.educationYear ?? "",
                interestedIn: tutorProfile?.interestedIn ?? [],
                profession: tutorProfile?.profession ?? "",
                dateOfBirth: tutorProfile?.dateOfBirth ?? "",
                referralSource: "",
                maritalStatus: tutorProfile?.maritalStatus ?? "",
                bio: tutorProfile?.bio ?? "",
                photoUrl: user.name ?? "",
                tutorName: user.name ?? "",
              }}
            />
          </div>
        </div>
      )}

      {/* ── CARD 3: COMPLETE USER PROFILE OVERVIEW (ALL DATA IN ONE PLACE) ── */}
      <div className="rounded-3xl p-6 sm:p-8 space-y-6 bg-white border border-slate-200 shadow-xl shadow-slate-200/50">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-100 border border-cyan-200 flex items-center justify-center text-cyan-700">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#0F2540]">
                Complete User Profile Overview &amp; Master Summary
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                Unified master view of all tutor onboarding data, contact information, and verification files.
              </p>
            </div>
          </div>
          <span className="text-xs font-black text-cyan-700 bg-cyan-100 px-3.5 py-1.5 rounded-full border border-cyan-200">
            Master Summary
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          {/* Box 1: Core Credentials & Account Details */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h3 className="font-black text-[#0F2540] text-sm flex items-center gap-2 border-b border-slate-200 pb-2">
              <User size={16} className="text-blue-600" />
              Account Credentials
            </h3>
            <div className="space-y-2 text-slate-700">
              <p><strong className="text-slate-600 font-extrabold">User ID:</strong> <span className="font-mono text-[#0F2540] font-black">{user.id}</span></p>
              <p><strong className="text-slate-600 font-extrabold">Full Name:</strong> <span className="text-[#0F2540] font-black">{user.name || "N/A"}</span></p>
              <p><strong className="text-slate-600 font-extrabold">Email Address:</strong> <span className="text-[#0F2540] font-black">{user.email}</span></p>
              <p><strong className="text-slate-600 font-extrabold">Phone Number:</strong> <span className="text-[#0F2540] font-black">{user.phone || "Not provided"}</span></p>
              <p><strong className="text-slate-600 font-extrabold">System Role:</strong> <span className="text-[#2D9E6B] font-black uppercase">{user.role}</span></p>
              <p><strong className="text-slate-600 font-extrabold">Registered Date:</strong> <span className="text-slate-900 font-bold">{new Date(user.createdAt).toLocaleString("en-IN")}</span></p>
            </div>
          </div>

          {/* Box 2: Location & Coordinates */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h3 className="font-black text-[#0F2540] text-sm flex items-center gap-2 border-b border-slate-200 pb-2">
              <MapPin size={16} className="text-[#2D9E6B]" />
              Location &amp; Address Details
            </h3>
            <div className="space-y-2 text-slate-700">
              <p><strong className="text-slate-600 font-extrabold">City:</strong> <span className="text-[#0F2540] font-black">{tutorProfile?.city || parentProfile?.city || "N/A"}</span></p>
              <p><strong className="text-slate-600 font-extrabold">State:</strong> <span className="text-[#0F2540] font-black">{tutorProfile?.state || "N/A"}</span></p>
              <p><strong className="text-slate-600 font-extrabold">Pincode:</strong> <span className="text-[#0F2540] font-black">{tutorProfile?.pincode || parentProfile?.pincode || "N/A"}</span></p>
              <p><strong className="text-slate-600 font-extrabold">Full Address:</strong> <span className="text-[#0F2540] font-black">{tutorProfile?.address || parentProfile?.address || "N/A"}</span></p>
              <p><strong className="text-slate-600 font-extrabold">GPS Lat/Lng:</strong> <span className="text-[#2D9E6B] font-black">{tutorProfile?.latitude != null ? `${tutorProfile.latitude.toFixed(4)}, ${tutorProfile.longitude?.toFixed(4)}` : "Not pinned"}</span></p>
            </div>
          </div>

          {/* Box 3: Academic Background & Experience */}
          {isTutor && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <h3 className="font-black text-[#0F2540] text-sm flex items-center gap-2 border-b border-slate-200 pb-2">
                <GraduationCap size={16} className="text-indigo-600" />
                Academic Background &amp; Experience
              </h3>
              <div className="space-y-2 text-slate-700">
                <p><strong className="text-slate-600 font-extrabold">Highest Qualification:</strong> <span className="text-[#0F2540] font-black">{tutorProfile?.qualification || "N/A"}</span></p>
                <p><strong className="text-slate-600 font-extrabold">Degree / Course:</strong> <span className="text-[#0F2540] font-black">{tutorProfile?.educationCourse || "N/A"}</span></p>
                <p><strong className="text-slate-600 font-extrabold">Specialization:</strong> <span className="text-[#0F2540] font-black">{tutorProfile?.educationSubjects || "N/A"}</span></p>
                <p><strong className="text-slate-600 font-extrabold">University:</strong> <span className="text-[#0F2540] font-black">{tutorProfile?.educationUniversity || "N/A"}</span> ({tutorProfile?.educationYear || "N/A"})</p>
                <p><strong className="text-slate-600 font-extrabold">Teaching Experience:</strong> <span className="text-[#2D9E6B] font-black">{tutorProfile?.experience != null ? `${tutorProfile.experience} years` : "N/A"}</span> (Started {tutorProfile?.teachingStartYear || "N/A"})</p>
              </div>
            </div>
          )}

          {/* Box 4: Preferences & Rates */}
          {isTutor && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <h3 className="font-black text-[#0F2540] text-sm flex items-center gap-2 border-b border-slate-200 pb-2">
                <Briefcase size={16} className="text-cyan-600" />
                Preferences &amp; Rate Range
              </h3>
              <div className="space-y-2 text-slate-700">
                <p><strong className="text-slate-600 font-extrabold">Teaching Mode:</strong> <span className="text-cyan-700 font-black">{tutorProfile?.teachingMode}</span></p>
                <p><strong className="text-slate-600 font-extrabold">Travel Radius:</strong> <span className="text-[#0F2540] font-black">{tutorProfile?.teachingRadius} km</span></p>
                <p><strong className="text-slate-600 font-extrabold">Fee Range:</strong> <span className="text-[#2D9E6B] font-black">₹{tutorProfile?.feeMin ?? 0} - ₹{tutorProfile?.feeMax ?? 0} / hr</span></p>
                <p><strong className="text-slate-600 font-extrabold">Options Interested:</strong> <span className="text-slate-900 font-bold">{tutorProfile?.interestedIn?.join(", ") || "None specified"}</span></p>
                <p><strong className="text-slate-600 font-extrabold">Coins Balance:</strong> <span className="text-amber-600 font-black">🪙 {tutorProfile?.wallet?.balance ?? 0} Coins</span></p>
              </div>
            </div>
          )}
        </div>

        {/* Subjects & Class Levels Pill Grid */}
        {isTutor && (
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h3 className="font-black text-[#0F2540] text-xs uppercase tracking-wider flex items-center gap-2">
              <BookOpen size={16} className="text-[#2D9E6B]" />
              Selected Taught Subjects &amp; Class Levels
            </h3>
            <div className="flex flex-wrap gap-2">
              {tutorProfile?.subjects && tutorProfile.subjects.length > 0 ? (
                tutorProfile.subjects.map((sub) => (
                  <span key={sub} className="px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black shadow-2xs">
                    📚 {sub}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 text-xs italic font-semibold">No subjects selected yet</span>
              )}
              {tutorProfile?.classLevels && tutorProfile.classLevels.length > 0 && (
                tutorProfile.classLevels.map((lvl) => (
                  <span key={lvl} className="px-3.5 py-1.5 rounded-xl bg-cyan-100 text-cyan-900 border border-cyan-300 text-xs font-black shadow-2xs">
                    🎯 {lvl}
                  </span>
                ))
              )}
            </div>
          </div>
        )}

        {/* Verification & Document Links Summary */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <h3 className="font-black text-[#0F2540] text-xs uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck size={16} className="text-amber-500" />
            Verification Badges &amp; Document Links
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            {idViewUrl ? (
              <a href={idViewUrl} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-xl bg-blue-100 text-blue-900 hover:bg-blue-200 text-xs font-black flex items-center gap-1.5 border border-blue-300 shadow-2xs">
                <ExternalLink size={14} /> Govt ID Proof
              </a>
            ) : (
              <span className="text-xs text-slate-500 font-semibold">No ID Proof uploaded</span>
            )}
            {addressViewUrl ? (
              <a href={addressViewUrl} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-900 hover:bg-emerald-200 text-xs font-black flex items-center gap-1.5 border border-emerald-300 shadow-2xs">
                <ExternalLink size={14} /> Address Proof
              </a>
            ) : (
              <span className="text-xs text-slate-500 font-semibold">No Address Proof uploaded</span>
            )}
            {selfieViewUrl ? (
              <a href={selfieViewUrl} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-xl bg-amber-100 text-amber-900 hover:bg-amber-200 text-xs font-black flex items-center gap-1.5 border border-amber-300 shadow-2xs">
                <ExternalLink size={14} /> Selfie Photo
              </a>
            ) : (
              <span className="text-xs text-slate-500 font-semibold">No Selfie Photo</span>
            )}
            {introVideoViewUrl && (
              <a href={introVideoViewUrl} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-xl bg-purple-100 text-purple-900 hover:bg-purple-200 text-xs font-black flex items-center gap-1.5 border border-purple-300 shadow-2xs">
                <ExternalLink size={14} /> Intro Video Link
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── CARD 4: INTERNAL STAFF NOTES & AUDIT TRAIL ── */}
      <div className="rounded-3xl p-6 sm:p-8 space-y-6 bg-white border border-slate-200 shadow-xl shadow-slate-200/50">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
              <MessageSquare size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#0F2540]">
                Internal Staff Notes &amp; Handover Instructions
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                Leave notes for sub-admins or staff members to document ongoing status and next tasks.
              </p>
            </div>
          </div>
          <span className="text-xs font-black text-amber-700 bg-amber-100 px-3.5 py-1.5 rounded-full border border-amber-200">
            {notesList.length} Notes Logged
          </span>
        </div>

        {/* Add Note Form */}
        <form onSubmit={handleAddNote} className="space-y-3">
          <textarea
            rows={3}
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            placeholder="Type internal staff note (e.g. 'Spoke to tutor: Aadhaar verified, pending degree certificate upload. Next sub-admin please approve after check.')..."
            className="w-full rounded-2xl p-4 text-xs text-slate-900 outline-none placeholder:text-slate-400 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#2D9E6B] font-bold resize-none"
          />
          <button
            type="submit"
            disabled={isAddingNote || !newNoteText.trim()}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#0F2540] hover:bg-[#1A3C5E] text-white font-black text-xs transition-all cursor-pointer shadow-md active:scale-98 disabled:opacity-50"
          >
            {isAddingNote ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            <span>Post Internal Note to Audit Log</span>
          </button>
        </form>

        {/* Notes Timeline Stream */}
        <div className="space-y-3 pt-2">
          {notesList.length > 0 ? (
            notesList.map((n) => (
              <div key={n.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-[#0F2540] flex items-center gap-1.5">
                    <User size={14} className="text-[#2D9E6B]" /> {n.authorName}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono font-bold">
                    {new Date(n.createdAt).toLocaleString("en-IN")}
                  </span>
                </div>
                <p className="text-xs text-slate-800 whitespace-pre-wrap font-bold leading-relaxed">
                  {n.content}
                </p>
              </div>
            ))
          ) : (
            <div className="p-6 text-center rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 font-bold">
              No internal staff notes posted yet for this user.
            </div>
          )}
        </div>
      </div>

      {/* ── CARD 5: SEND & SCHEDULE CUSTOM NOTIFICATION ── */}
      <div className="rounded-3xl p-6 sm:p-8 space-y-6 bg-white border border-slate-200 shadow-xl shadow-slate-200/50">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700">
              <Bell size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#0F2540]">
                Send or Schedule Custom User Notification / Alert
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                Dispatch an instant push/email alert or schedule a custom reminder for later.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsScheduleMode(!isScheduleMode)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
              isScheduleMode
                ? "bg-purple-600 text-white shadow-md"
                : "bg-blue-100 text-blue-900 border border-blue-300"
            }`}
          >
            {isScheduleMode ? "🗓️ Schedule Mode Active" : "⚡ Instant Mode (Click to Schedule)"}
          </button>
        </div>

        <form onSubmit={handleSendNotification} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="mb-1.5 block text-xs font-extrabold text-slate-700">Notification Title *</label>
              <input
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                placeholder="e.g. Document Update Required or Lead Matched!"
                required
                className="w-full rounded-2xl px-4 py-3 text-xs text-slate-900 outline-none placeholder:text-slate-400 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#2D9E6B] font-bold"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-extrabold text-slate-700">Delivery Channel</label>
              <select
                value={notifChannel}
                onChange={(e) => setNotifChannel(e.target.value as any)}
                className="w-full rounded-2xl px-3.5 py-3 text-xs text-slate-900 outline-none bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#2D9E6B] font-extrabold cursor-pointer"
              >
                <option value="WEB" className="text-slate-900 font-bold">WEB (In-App Notification Bell)</option>
                <option value="EMAIL" className="text-slate-900 font-bold">EMAIL (Direct Email Alert)</option>
                <option value="SMS" className="text-slate-900 font-bold">SMS (Phone SMS Alert)</option>
                <option value="WHATSAPP" className="text-slate-900 font-bold">WHATSAPP (Message Alert)</option>
                <option value="PUSH" className="text-slate-900 font-bold">PUSH (Mobile / Web Push Alert)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-extrabold text-slate-700">Notification Message Body *</label>
            <textarea
              rows={3}
              value={notifMessage}
              onChange={(e) => setNotifMessage(e.target.value)}
              placeholder="Enter custom message to send to user..."
              required
              className="w-full rounded-2xl p-4 text-xs text-slate-900 outline-none placeholder:text-slate-400 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#2D9E6B] font-bold resize-none"
            />
          </div>

          {isScheduleMode && (
            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-2 animate-in fade-in">
              <label className="text-xs font-black text-purple-900 flex items-center gap-2">
                <Clock size={16} />
                Schedule Notification Delivery Date &amp; Time
              </label>
              <input
                type="datetime-local"
                value={scheduledAtDate}
                onChange={(e) => setScheduledAtDate(e.target.value)}
                required={isScheduleMode}
                className="w-full rounded-xl px-4 py-2.5 text-xs text-slate-900 outline-none bg-white border border-purple-200 font-mono font-bold"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || !notifTitle.trim() || !notifMessage.trim()}
            className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm transition-all cursor-pointer shadow-lg shadow-blue-500/20 active:scale-98 disabled:opacity-50"
          >
            {isScheduleMode ? <Clock size={18} /> : <Send size={18} />}
            <span>{isScheduleMode ? "Schedule Notification for Later" : "Send Instant Custom Notification"}</span>
          </button>
        </form>
      </div>

      {/* ── PARENT LEAFLET MAP PICKER MODAL (ADMIN ON-BEHALF) ── */}
      <OpenStreetMapPickerModal
        isOpen={isParentMapOpen}
        onClose={() => setIsParentMapOpen(false)}
        initialLat={parentLat || 28.6139}
        initialLon={parentLng || 77.209}
        onConfirmLocation={(result) => {
          if (result.city) setParentCity(result.city);
          if (result.state) setParentState(result.state);
          if (result.pincode) setParentPincode(result.pincode);
          if (result.fullAddress) setParentAddress(result.fullAddress);
          if (result.lat != null) setParentLat(result.lat);
          if (result.lon != null) setParentLng(result.lon);
        }}
      />

      {/* ── CHILD / STUDENT PROFILE ADD/EDIT MODAL FOR ADMIN ── */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 py-6 sm:py-10 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#0F2540]">
                    {editingStudentId ? "Edit Child / Student Profile" : "Add New Child / Student"}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    All fields below are optional &mdash; fill whatever information you have
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStudentModalOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-5">
              {/* Child Profile Photo / Avatar Picker */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <ProfilePhotoUpload
                  name="studentImage"
                  value={studentImage}
                  onChange={setStudentImage}
                  docType="student-avatar"
                  fallbackName={studentName || "Student"}
                  label="Child Profile Picture / Avatar"
                  showPresets={true}
                />
              </div>

              {/* Student Name */}
              <div>
                <label className="mb-1.5 block text-xs font-extrabold text-[#0F2540]">
                  Child Name <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full rounded-2xl px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#2D9E6B] font-bold"
                />
              </div>

              {/* Class Level & Board Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-extrabold text-[#0F2540]">
                    Class / Grade <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <select
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    className="w-full rounded-2xl px-4 py-3 text-sm text-slate-900 outline-none bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#2D9E6B] font-bold cursor-pointer"
                  >
                    <option value="">Select Class / Grade (Optional)</option>
                    {CLASS_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-extrabold text-[#0F2540]">
                    Educational Board <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <select
                    value={studentBoard}
                    onChange={(e) => setStudentBoard(e.target.value)}
                    className="w-full rounded-2xl px-4 py-3 text-sm text-slate-900 outline-none bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#2D9E6B] font-bold cursor-pointer"
                  >
                    <option value="">Select Board (Optional)</option>
                    {BOARDS.map((board) => (
                      <option key={board} value={board}>
                        {board}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Real Interactive SubjectPicker */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-[#0F2540] flex items-center justify-between">
                  <span>Subjects Needed <span className="text-slate-400 font-normal">(optional)</span></span>
                  <span className="text-[11px] font-bold text-emerald-600">
                    {studentSubjects.length} selected
                  </span>
                </label>
                <SubjectPicker
                  value={studentSubjects}
                  onChange={setStudentSubjects}
                  classLevel={studentClass}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1.5 block text-xs font-extrabold text-[#0F2540]">
                  Notes / Learning Goals <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={studentNotes}
                  onChange={(e) => setStudentNotes(e.target.value)}
                  placeholder="e.g. Preparing for board exams, weak in physics numericals, school name..."
                  className="w-full rounded-2xl px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#2D9E6B] font-bold resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="px-5 py-3 rounded-2xl border border-slate-200 text-xs font-extrabold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingStudent}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-lg shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  {isSavingStudent ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>{editingStudentId ? "Save Child Changes" : "Create Child Profile"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
