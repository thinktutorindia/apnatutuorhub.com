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
} from "lucide-react";
import { LocationSearchInput, type LocationResult } from "@/components/ui/LocationSearchInput";
import { OpenStreetMapPickerModal } from "@/components/ui/OpenStreetMapPickerModal";
import { ActionOverlay } from "@/components/ui/LoadingState";
import { adminUpdateFullUserAction } from "@/app/actions/admin.actions";
import { INDIAN_STATES } from "@/lib/validations";

interface PresignedUrls {
  idViewUrl: string | null;
  addressViewUrl: string | null;
  selfieViewUrl: string | null;
  introVideoViewUrl: string | null;
}

interface UserData {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: "PARENT" | "TUTOR" | "SUPER_ADMIN" | "SUB_ADMIN";
  subAdminRole: string | null;
  isActive: boolean;
  createdAt: string;
  parentProfile?: {
    city: string | null;
    pincode: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  tutorProfile?: {
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
}: {
  user: UserData;
  presignedUrls: PresignedUrls;
}) {
  const [isPending, startTransition] = useTransition();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // User details
  const [role, setRole] = useState<"PARENT" | "TUTOR" | "SUPER_ADMIN" | "SUB_ADMIN">(user.role);

  // Location controlled state
  const initialCity = user.tutorProfile?.city || user.parentProfile?.city || "";
  const initialState = user.tutorProfile?.state || "";
  const initialPincode = user.tutorProfile?.pincode || user.parentProfile?.pincode || "";
  const initialAddress = user.tutorProfile?.address || user.parentProfile?.address || "";
  const initialLat = user.tutorProfile?.latitude ?? user.parentProfile?.latitude ?? null;
  const initialLng = user.tutorProfile?.longitude ?? user.parentProfile?.longitude ?? null;

  const [city, setCity] = useState(initialCity);
  const [stateVal, setStateVal] = useState(initialState);
  const [pincode, setPincode] = useState(initialPincode);
  const [address, setAddress] = useState(initialAddress);
  const [coordLat, setCoordLat] = useState<string>(initialLat != null ? String(initialLat) : "");
  const [coordLng, setCoordLng] = useState<string>(initialLng != null ? String(initialLng) : "");

  // Document keys / URLs
  const [kycIdProofUrl, setKycIdProofUrl] = useState(user.tutorProfile?.kycIdProofUrl || "");
  const [kycAddressUrl, setKycAddressUrl] = useState(user.tutorProfile?.kycAddressUrl || "");
  const [kycSelfieUrl, setKycSelfieUrl] = useState(user.tutorProfile?.kycSelfieUrl || "");
  const [introVideoUrl, setIntroVideoUrl] = useState(user.tutorProfile?.introVideoUrl || "");

  // View URLs (generated presigned or direct link)
  const [idViewUrl, setIdViewUrl] = useState<string | null>(presignedUrls.idViewUrl);
  const [addressViewUrl, setAddressViewUrl] = useState<string | null>(presignedUrls.addressViewUrl);
  const [selfieViewUrl, setSelfieViewUrl] = useState<string | null>(presignedUrls.selfieViewUrl);
  const [videoViewUrl, setVideoViewUrl] = useState<string | null>(presignedUrls.introVideoViewUrl);

  // Document upload state
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // Map Picker Modal
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  // File input refs
  const idFileInputRef = useRef<HTMLInputElement>(null);
  const addressFileInputRef = useRef<HTMLInputElement>(null);
  const selfieFileInputRef = useRef<HTMLInputElement>(null);

  // Location select handler
  const handleLocationSelect = (res: LocationResult) => {
    if (res.city) setCity(res.city);
    if (res.state) setStateVal(res.state);
    if (res.pincode) setPincode(res.pincode);
    if (res.area || res.fullAddress) setAddress(res.fullAddress || res.area);
    if (res.lat != null) setCoordLat(String(res.lat));
    if (res.lon != null) setCoordLng(String(res.lon));
  };

  // Direct file upload handler
  const handleFileUpload = async (
    docType: "id-proof" | "address-proof" | "selfie",
    file: File
  ) => {
    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5 MB limit.");
      return;
    }
    setUploadingField(docType);
    try {
      const resp = await fetch("/api/upload/presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType,
          contentType: file.type,
        }),
      });

      if (!resp.ok) {
        throw new Error("Failed to generate upload URL");
      }

      const { uploadUrl, objectKey } = await resp.json();

      const uploadResp = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResp.ok) {
        throw new Error("Upload failed to storage server");
      }

      // Update state
      if (docType === "id-proof") {
        setKycIdProofUrl(objectKey);
        setIdViewUrl(uploadUrl.split("?")[0]);
      } else if (docType === "address-proof") {
        setKycAddressUrl(objectKey);
        setAddressViewUrl(uploadUrl.split("?")[0]);
      } else if (docType === "selfie") {
        setKycSelfieUrl(objectKey);
        setSelfieViewUrl(uploadUrl.split("?")[0]);
      }
    } catch (err: any) {
      alert(err.message || "Failed to upload document");
    } finally {
      setUploadingField(null);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await adminUpdateFullUserAction(formData);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to update user profile.");
      } else {
        setSuccessMsg("🎉 User profile & document details saved successfully!");
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    });
  };

  const isTutor = role === "TUTOR";
  const tutorProfile = user.tutorProfile;
  const parentProfile = user.parentProfile;

  return (
    <div className="max-w-4xl space-y-6" style={{ color: "#F8FAFC" }}>
      <ActionOverlay
        isOpen={isPending}
        title="Saving User Changes"
        subtitle="Updating profile records, KYC status, and location coordinates..."
      />

      {/* Header Bar */}
      <div>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-xs font-bold transition-colors hover:underline text-[#22C55E]"
        >
          <ArrowLeft size={14} /> Back to User Directory
        </Link>
        <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1
              className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              Edit User & Documents: {user.name || user.email}
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              User ID: {user.id} · Registered: {new Date(user.createdAt).toLocaleDateString("en-IN")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                role === "SUPER_ADMIN"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                  : role === "SUB_ADMIN"
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                    : role === "TUTOR"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
              }`}
            >
              {role}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-black ${
                user.isActive
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "bg-red-500/10 text-red-400 border border-red-500/30"
              }`}
            >
              {user.isActive ? "Active Account" : "Suspended"}
            </span>
          </div>
        </div>
      </div>

      {/* Success / Error Banners */}
      {successMsg && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 p-4 text-xs font-extrabold text-emerald-300 animate-in fade-in">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-red-500/20 border border-red-500/40 p-4 text-xs font-extrabold text-red-300 animate-in fade-in">
          <AlertCircle size={18} className="shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <input type="hidden" name="userId" value={user.id} />
        <input type="hidden" name="latitude" value={coordLat} />
        <input type="hidden" name="longitude" value={coordLng} />

        {/* ── SECTION 1: ACCOUNT CREDENTIALS & ROLE ── */}
        <div className="rounded-3xl p-6 sm:p-7 space-y-5 bg-[#0F172A] border border-[#1E293B] shadow-xl">
          <div className="flex items-center gap-2.5 text-white font-extrabold text-base border-b border-[#1E293B] pb-3.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <User size={18} />
            </div>
            <span>Account Credentials & System Role</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">Full Name</label>
              <input
                name="name"
                defaultValue={user.name || ""}
                required
                className="w-full rounded-2xl px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 bg-[#1E293B] border border-[#334155] focus:border-blue-500 transition-all font-semibold"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">Email Address</label>
              <input
                name="email"
                type="email"
                defaultValue={user.email}
                required
                className="w-full rounded-2xl px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 bg-[#1E293B] border border-[#334155] focus:border-blue-500 transition-all font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">Phone Number</label>
              <input
                name="phone"
                defaultValue={user.phone || ""}
                placeholder="+91 9876543210"
                className="w-full rounded-2xl px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 bg-[#1E293B] border border-[#334155] focus:border-blue-500 transition-all font-semibold"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">User Role</label>
              <select
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full rounded-2xl px-3.5 py-3 text-sm text-white outline-none bg-[#1E293B] border border-[#334155] focus:border-blue-500 font-bold"
              >
                <option value="PARENT">PARENT (Student / Guardian)</option>
                <option value="TUTOR">TUTOR (Educator)</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN (Owner / Master)</option>
                <option value="SUB_ADMIN">SUB_ADMIN (Staff Member)</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">Sub-Admin Department</label>
              <select
                name="subAdminRole"
                defaultValue={user.subAdminRole || ""}
                disabled={role !== "SUB_ADMIN"}
                className="w-full rounded-2xl px-3.5 py-3 text-sm text-white outline-none bg-[#1E293B] border border-[#334155] focus:border-blue-500 font-bold disabled:opacity-40"
              >
                <option value="">None (Standard User)</option>
                <option value="SUPPORT">SUPPORT (User Desk)</option>
                <option value="VERIFICATION">VERIFICATION (KYC Team)</option>
                <option value="FINANCE">FINANCE (Wallets / Refunds)</option>
                <option value="OPERATIONS">OPERATIONS (Leads / Bookings)</option>
                <option value="MARKETING">MARKETING (Coupons / Alerts)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-300">Account Access Status</label>
            <select
              name="isActive"
              defaultValue={user.isActive ? "true" : "false"}
              className="w-full rounded-2xl px-3.5 py-3 text-sm text-white outline-none bg-[#1E293B] border border-[#334155] focus:border-blue-500 font-bold"
            >
              <option value="true">Active (Normal Platform Access)</option>
              <option value="false">Suspended (Blocked from Login & Services)</option>
            </select>
          </div>
        </div>

        {/* ── SECTION 2: LOCATION & ADDRESS DETAILS (LIVE AUTOCOMPLETE, MAP PICKER, GPS) ── */}
        <div className="rounded-3xl p-6 sm:p-7 space-y-5 bg-[#0F172A] border border-[#1E293B] shadow-xl">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-3.5">
            <div className="flex items-center gap-2.5 text-white font-extrabold text-base">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <MapPin size={18} />
              </div>
              <span>Location & Address Details</span>
            </div>
            <span className="text-[11px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              Live Auto-Fill ✨
            </span>
          </div>

          {/* Live Search & Autocomplete Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              Search Location via Live API / Autocomplete
            </label>
            <LocationSearchInput
              onSelectLocation={handleLocationSelect}
              placeholder="Type City, Area, Pincode or Landmark (e.g. Koramangala, Sector 56 Gurgaon)..."
            />
          </div>

          {/* Text input fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">City *</label>
              <input
                name="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mumbai / Pune"
                required
                className="w-full rounded-2xl px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 bg-[#1E293B] border border-[#334155] focus:border-emerald-500 transition-all font-semibold"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">State</label>
              <select
                name="state"
                value={stateVal}
                onChange={(e) => setStateVal(e.target.value)}
                className="w-full rounded-2xl px-3.5 py-3 text-sm text-white outline-none bg-[#1E293B] border border-[#334155] focus:border-emerald-500 font-bold"
              >
                <option value="">Select State</option>
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">Pincode</label>
              <input
                name="pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                maxLength={6}
                placeholder="e.g. 400001"
                className="w-full rounded-2xl px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 bg-[#1E293B] border border-[#334155] focus:border-emerald-500 transition-all font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-300">Area / Locality / Full Address</label>
            <input
              name="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Flat 402, Green Valley Apartments, Bandra West"
              className="w-full rounded-2xl px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 bg-[#1E293B] border border-[#334155] focus:border-emerald-500 transition-all font-semibold"
            />
          </div>

          {/* GPS Location Pin display badge */}
          {coordLat && coordLng ? (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-extrabold text-emerald-300">
              <span className="flex items-center gap-2">
                <Check size={16} className="text-emerald-400" />
                📍 GPS Coordinates Pinned: {parseFloat(coordLat).toFixed(5)}, {parseFloat(coordLng).toFixed(5)}
              </span>
              <button
                type="button"
                onClick={() => setIsMapModalOpen(true)}
                className="text-[11px] font-black text-emerald-400 hover:underline cursor-pointer"
              >
                Change Pin on Map
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs font-extrabold text-amber-300">
              <span>⚠️ No exact GPS coordinates pinned yet</span>
              <button
                type="button"
                onClick={() => setIsMapModalOpen(true)}
                className="text-[11px] font-black text-amber-400 hover:underline cursor-pointer"
              >
                🗺️ Pick on Map
              </button>
            </div>
          )}

          {/* Map Picker Modal */}
          <OpenStreetMapPickerModal
            isOpen={isMapModalOpen}
            onClose={() => setIsMapModalOpen(false)}
            initialLat={coordLat ? parseFloat(coordLat) : 28.6139}
            initialLon={coordLng ? parseFloat(coordLng) : 77.2090}
            onConfirmLocation={(res) => handleLocationSelect(res)}
          />
        </div>

        {/* ── SECTION 3: TUTOR ACADEMIC & PROFESSIONAL DETAILS (Shown when Tutor) ── */}
        {isTutor && (
          <div className="rounded-3xl p-6 sm:p-7 space-y-5 bg-[#0F172A] border border-[#1E293B] shadow-xl">
            <div className="flex items-center gap-2.5 text-white font-extrabold text-base border-b border-[#1E293B] pb-3.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <GraduationCap size={18} />
              </div>
              <span>Tutor Academic &amp; Professional Profile</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300">Taught Subjects (comma separated)</label>
                <input
                  name="subjects"
                  defaultValue={tutorProfile?.subjects?.join(", ") || ""}
                  placeholder="e.g. Mathematics, Physics, Chemistry"
                  className="w-full rounded-2xl px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 bg-[#1E293B] border border-[#334155] focus:border-purple-500 transition-all font-semibold"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300">Target Class Levels (comma separated)</label>
                <input
                  name="classLevels"
                  defaultValue={tutorProfile?.classLevels?.join(", ") || ""}
                  placeholder="e.g. Class 10, CBSE, Class 12, JEE"
                  className="w-full rounded-2xl px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 bg-[#1E293B] border border-[#334155] focus:border-purple-500 transition-all font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300">Experience (Years)</label>
                <input
                  name="experience"
                  type="number"
                  defaultValue={tutorProfile?.experience ?? ""}
                  placeholder="e.g. 5"
                  className="w-full rounded-2xl px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 bg-[#1E293B] border border-[#334155] focus:border-purple-500 transition-all font-semibold"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300">Hourly Rate Fee (₹ / hr)</label>
                <input
                  name="hourlyRate"
                  type="number"
                  defaultValue={tutorProfile?.feeMin ?? tutorProfile?.feeMax ?? ""}
                  placeholder="e.g. 500"
                  className="w-full rounded-2xl px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 bg-[#1E293B] border border-[#334155] focus:border-purple-500 transition-all font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">Tutor Biography / Self Introduction</label>
              <textarea
                name="bio"
                rows={3}
                defaultValue={tutorProfile?.bio || ""}
                placeholder="Write a brief overview of teaching experience, exam results, and pedagogy..."
                className="w-full rounded-2xl p-4 text-sm text-white outline-none placeholder:text-slate-600 bg-[#1E293B] border border-[#334155] focus:border-purple-500 transition-all font-semibold resize-none"
              />
            </div>
          </div>
        )}

        {/* ── SECTION 4: KYC VERIFICATION & DOCUMENT STORAGE (VIEW + UPLOAD) ── */}
        <div className="rounded-3xl p-6 sm:p-7 space-y-5 bg-[#0F172A] border border-[#1E293B] shadow-xl">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-3.5">
            <div className="flex items-center gap-2.5 text-white font-extrabold text-base">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <FileText size={18} />
              </div>
              <span>KYC Verification &amp; Document Management</span>
            </div>
            {isTutor && (
              <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30">
                Wallet Balance: 🪙 {tutorProfile?.wallet?.balance ?? 0} coins
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-300">KYC Verification Status</label>
              <select
                name="kycStatus"
                defaultValue={tutorProfile?.kycStatus || "NOT_SUBMITTED"}
                className="w-full rounded-2xl px-3.5 py-3 text-sm text-white outline-none bg-[#1E293B] border border-[#334155] focus:border-amber-500 font-bold"
              >
                <option value="NOT_SUBMITTED">NOT_SUBMITTED (No docs uploaded)</option>
                <option value="PENDING">PENDING (Submitted &amp; In Admin Queue)</option>
                <option value="APPROVED">APPROVED (Verified Tutor Badge ✅)</option>
                <option value="REJECTED">REJECTED (Requires Re-submission)</option>
              </select>
            </div>
            {isTutor && (
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300">Wallet Coin Balance</label>
                <input
                  name="coinBalance"
                  type="number"
                  defaultValue={tutorProfile?.wallet?.balance ?? 0}
                  placeholder="0"
                  className="w-full rounded-2xl px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 bg-[#1E293B] border border-[#334155] focus:border-amber-500 transition-all font-semibold"
                />
              </div>
            )}
          </div>

          {/* Rejection Note */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-300">
              KYC Rejection Reason / Admin Note
            </label>
            <input
              name="kycRejectionNote"
              defaultValue={tutorProfile?.kycRejectionNote || ""}
              placeholder="e.g. Aadhaar image is blurry or expired ID card."
              className="w-full rounded-2xl px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 bg-[#1E293B] border border-[#334155] focus:border-amber-500 transition-all font-semibold"
            />
          </div>

          {/* ── 4 DOCUMENT MANAGEMENT CARDS (VIEW + UPLOAD) ── */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              Verification Documents &amp; Media Links
            </h3>

            {/* Hidden file inputs for direct uploading */}
            <input
              ref={idFileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload("id-proof", f);
              }}
            />
            <input
              ref={addressFileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload("address-proof", f);
              }}
            />
            <input
              ref={selfieFileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload("selfie", f);
              }}
            />

            {/* Document 1: Government ID Proof */}
            <div className="p-4 rounded-2xl bg-[#1E293B] border border-[#334155] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-extrabold text-white">
                  <FileText size={16} className="text-blue-400" />
                  <span>1. Government ID Proof</span>
                </div>
                <div className="flex items-center gap-2">
                  {idViewUrl && (
                    <a
                      href={idViewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 text-xs font-extrabold flex items-center gap-1 border border-blue-500/40 transition-all cursor-pointer"
                    >
                      <ExternalLink size={13} />
                      <span>👁️ View Document</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => idFileInputRef.current?.click()}
                    disabled={uploadingField === "id-proof"}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-extrabold flex items-center gap-1 border border-emerald-500/40 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {uploadingField === "id-proof" ? (
                      <Loader2 size={13} className="animate-spin text-emerald-400" />
                    ) : (
                      <Upload size={13} />
                    )}
                    <span>{uploadingField === "id-proof" ? "Uploading..." : "📤 Upload File"}</span>
                  </button>
                </div>
              </div>
              <input
                name="kycIdProofUrl"
                value={kycIdProofUrl}
                onChange={(e) => setKycIdProofUrl(e.target.value)}
                placeholder="kyc/id-proofs/... or https://..."
                className="w-full rounded-xl px-3.5 py-2 text-xs text-white outline-none placeholder:text-slate-600 bg-[#0F172A] border border-[#334155] font-mono"
              />
            </div>

            {/* Document 2: Address Proof */}
            <div className="p-4 rounded-2xl bg-[#1E293B] border border-[#334155] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-extrabold text-white">
                  <MapPin size={16} className="text-emerald-400" />
                  <span>2. Address Proof Document</span>
                </div>
                <div className="flex items-center gap-2">
                  {addressViewUrl && (
                    <a
                      href={addressViewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-extrabold flex items-center gap-1 border border-emerald-500/40 transition-all cursor-pointer"
                    >
                      <ExternalLink size={13} />
                      <span>👁️ View Document</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => addressFileInputRef.current?.click()}
                    disabled={uploadingField === "address-proof"}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-extrabold flex items-center gap-1 border border-emerald-500/40 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {uploadingField === "address-proof" ? (
                      <Loader2 size={13} className="animate-spin text-emerald-400" />
                    ) : (
                      <Upload size={13} />
                    )}
                    <span>{uploadingField === "address-proof" ? "Uploading..." : "📤 Upload File"}</span>
                  </button>
                </div>
              </div>
              <input
                name="kycAddressUrl"
                value={kycAddressUrl}
                onChange={(e) => setKycAddressUrl(e.target.value)}
                placeholder="kyc/address-proofs/... or https://..."
                className="w-full rounded-xl px-3.5 py-2 text-xs text-white outline-none placeholder:text-slate-600 bg-[#0F172A] border border-[#334155] font-mono"
              />
            </div>

            {/* Document 3: Live Selfie Photo */}
            <div className="p-4 rounded-2xl bg-[#1E293B] border border-[#334155] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-extrabold text-white">
                  <Camera size={16} className="text-amber-400" />
                  <span>3. Live Selfie Photo</span>
                </div>
                <div className="flex items-center gap-2">
                  {selfieViewUrl && (
                    <a
                      href={selfieViewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-extrabold flex items-center gap-1 border border-amber-500/40 transition-all cursor-pointer"
                    >
                      <ExternalLink size={13} />
                      <span>👁️ View Photo</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => selfieFileInputRef.current?.click()}
                    disabled={uploadingField === "selfie"}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-extrabold flex items-center gap-1 border border-emerald-500/40 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {uploadingField === "selfie" ? (
                      <Loader2 size={13} className="animate-spin text-emerald-400" />
                    ) : (
                      <Upload size={13} />
                    )}
                    <span>{uploadingField === "selfie" ? "Uploading..." : "📤 Upload Photo"}</span>
                  </button>
                </div>
              </div>
              <input
                name="kycSelfieUrl"
                value={kycSelfieUrl}
                onChange={(e) => setKycSelfieUrl(e.target.value)}
                placeholder="kyc/selfies/... or https://..."
                className="w-full rounded-xl px-3.5 py-2 text-xs text-white outline-none placeholder:text-slate-600 bg-[#0F172A] border border-[#334155] font-mono"
              />
            </div>

            {/* Document 4: Intro Video URL */}
            <div className="p-4 rounded-2xl bg-[#1E293B] border border-[#334155] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-extrabold text-white">
                  <Video size={16} className="text-purple-400" />
                  <span>4. Introduction Video Link (YouTube / Vimeo / Drive)</span>
                </div>
                {introVideoUrl && (
                  <a
                    href={introVideoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 text-xs font-extrabold flex items-center gap-1 border border-purple-500/40 transition-all cursor-pointer shrink-0"
                  >
                    <ExternalLink size={13} />
                    <span>🔗 Open Video Link</span>
                  </a>
                )}
              </div>
              <input
                name="introVideoUrl"
                value={introVideoUrl}
                onChange={(e) => setIntroVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=... or https://drive.google.com/..."
                className="w-full rounded-xl px-3.5 py-2 text-xs text-white outline-none placeholder:text-slate-600 bg-[#0F172A] border border-[#334155] font-mono"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2.5 rounded-2xl py-4 text-base font-extrabold transition-all hover:opacity-90 active:scale-98 cursor-pointer shadow-xl text-[#0F172A] disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)" }}
        >
          {isPending ? (
            <>
              <Loader2 size={20} className="animate-spin text-[#0F172A]" />
              <span>Saving Changes to Profile...</span>
            </>
          ) : (
            <>
              <Save size={20} />
              <span>Save All Profile, Location &amp; Document Changes</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
