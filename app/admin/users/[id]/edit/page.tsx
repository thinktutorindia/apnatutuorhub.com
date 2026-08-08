import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Save, User, ShieldCheck, MapPin, FileText, Video, GraduationCap } from "lucide-react";
import { adminUpdateFullUserAction } from "@/app/actions/admin.actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit User & Documents — Admin" };

export default async function AdminEditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      parentProfile: true,
      tutorProfile: { include: { wallet: true } },
    },
  });

  if (!user) notFound();

  const currentRole = user.role;
  const parentCity = user.parentProfile?.city ?? "";
  const parentPincode = user.parentProfile?.pincode ?? "";
  const tutorCity = user.tutorProfile?.city ?? "";
  const tutorState = user.tutorProfile?.state ?? "";
  const tutorPincode = user.tutorProfile?.pincode ?? "";
  const tutorKyc = user.tutorProfile?.kycStatus ?? "NOT_SUBMITTED";
  const tutorWalletBalance = user.tutorProfile?.wallet?.balance ?? 0;

  const kycIdUrl = user.tutorProfile?.kycIdProofUrl ?? "";
  const kycAddrUrl = user.tutorProfile?.kycAddressUrl ?? "";
  const kycSelfieUrl = user.tutorProfile?.kycSelfieUrl ?? "";
  const introVidUrl = user.tutorProfile?.introVideoUrl ?? "";

  const subjectsStr = user.tutorProfile?.subjects?.join(", ") ?? "";
  const classLevelsStr = user.tutorProfile?.classLevels?.join(", ") ?? "";
  const experienceYears = user.tutorProfile?.experience ?? "";
  const hourlyRateVal = user.tutorProfile?.feeMin ?? user.tutorProfile?.feeMax ?? "";
  const bioText = user.tutorProfile?.bio ?? "";

  return (
    <div className="max-w-3xl space-y-6" style={{ color: "#F8FAFC" }}>
      {/* Back button */}
      <div>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-xs font-semibold hover:underline"
          style={{ color: "#22C55E" }}
        >
          <ArrowLeft size={14} /> Back to User Directory
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white" style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: "-0.04em" }}>
          Edit User & Documents: {user.name || user.email}
        </h1>
        <p className="text-xs" style={{ color: "#475569" }}>
          User ID: {user.id} · Registered: {new Date(user.createdAt).toLocaleDateString("en-IN")}
        </p>
      </div>

      <form
        action={async (formData: FormData) => {
          "use server";
          await adminUpdateFullUserAction(formData);
        }}
        className="space-y-6"
      >
        <input type="hidden" name="userId" value={user.id} />

        {/* Account Details Section */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: "#0F172A", border: "1px solid #1E293B" }}>
          <div className="flex items-center gap-2 text-white font-semibold border-b border-[#1E293B] pb-3">
            <User size={18} style={{ color: "#3B82F6" }} />
            <span>Account Credentials & Role</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">Full Name</label>
              <input
                name="name"
                defaultValue={user.name || ""}
                required
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
                style={{ background: "#1E293B", border: "1px solid #334155" }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">Email Address</label>
              <input
                name="email"
                type="email"
                defaultValue={user.email}
                required
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
                style={{ background: "#1E293B", border: "1px solid #334155" }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">Phone Number</label>
              <input
                name="phone"
                defaultValue={user.phone || ""}
                placeholder="+91 9876543210"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
                style={{ background: "#1E293B", border: "1px solid #334155" }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">User Role</label>
              <select
                name="role"
                defaultValue={currentRole}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                style={{ background: "#1E293B", border: "1px solid #334155" }}
              >
                <option value="PARENT">PARENT</option>
                <option value="TUTOR">TUTOR</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                <option value="SUB_ADMIN">SUB_ADMIN</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">Sub-Admin Department</label>
              <select
                name="subAdminRole"
                defaultValue={user.subAdminRole || ""}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                style={{ background: "#1E293B", border: "1px solid #334155" }}
              >
                <option value="">None</option>
                <option value="SUPPORT">SUPPORT</option>
                <option value="VERIFICATION">VERIFICATION</option>
                <option value="FINANCE">FINANCE</option>
                <option value="OPERATIONS">OPERATIONS</option>
                <option value="MARKETING">MARKETING</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-white">Account Status</label>
            <select
              name="isActive"
              defaultValue={user.isActive ? "true" : "false"}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
              style={{ background: "#1E293B", border: "1px solid #334155" }}
            >
              <option value="true">Active (Normal Access)</option>
              <option value="false">Suspended (Blocked Access)</option>
            </select>
          </div>
        </div>

        {/* Location & Address Section */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: "#0F172A", border: "1px solid #1E293B" }}>
          <div className="flex items-center gap-2 text-white font-semibold border-b border-[#1E293B] pb-3">
            <MapPin size={18} style={{ color: "#22C55E" }} />
            <span>Location & Address Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">City</label>
              <input
                name="city"
                defaultValue={tutorCity || parentCity}
                placeholder="e.g. Mumbai"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
                style={{ background: "#1E293B", border: "1px solid #334155" }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">State</label>
              <input
                name="state"
                defaultValue={tutorState}
                placeholder="e.g. Maharashtra"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
                style={{ background: "#1E293B", border: "1px solid #334155" }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">Pincode</label>
              <input
                name="pincode"
                defaultValue={tutorPincode || parentPincode}
                placeholder="e.g. 400001"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
                style={{ background: "#1E293B", border: "1px solid #334155" }}
              />
            </div>
          </div>
        </div>

        {/* Professional & Academic Details (Tutor) */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: "#0F172A", border: "1px solid #1E293B" }}>
          <div className="flex items-center gap-2 text-white font-semibold border-b border-[#1E293B] pb-3">
            <GraduationCap size={18} style={{ color: "#8B5CF6" }} />
            <span>Tutor Professional & Academic Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">Taught Subjects (comma separated)</label>
              <input
                name="subjects"
                defaultValue={subjectsStr}
                placeholder="e.g. Mathematics, Physics, Chemistry"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
                style={{ background: "#1E293B", border: "1px solid #334155" }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">Class Levels (comma separated)</label>
              <input
                name="classLevels"
                defaultValue={classLevelsStr}
                placeholder="e.g. Class 10, CBSE, Class 12"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
                style={{ background: "#1E293B", border: "1px solid #334155" }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">Experience (Years)</label>
              <input
                name="experience"
                type="number"
                defaultValue={experienceYears}
                placeholder="e.g. 5"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
                style={{ background: "#1E293B", border: "1px solid #334155" }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">Hourly Rate (₹ / hr)</label>
              <input
                name="hourlyRate"
                type="number"
                defaultValue={hourlyRateVal}
                placeholder="e.g. 500"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
                style={{ background: "#1E293B", border: "1px solid #334155" }}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-white">Tutor Biography / Summary</label>
            <textarea
              name="bio"
              rows={3}
              defaultValue={bioText}
              placeholder="Write a brief professional summary of teaching background…"
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
              style={{ background: "#1E293B", border: "1px solid #334155" }}
            />
          </div>
        </div>

        {/* KYC Verification & S3 Document Keys */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: "#0F172A", border: "1px solid #1E293B" }}>
          <div className="flex items-center gap-2 text-white font-semibold border-b border-[#1E293B] pb-3">
            <FileText size={18} style={{ color: "#F59E0B" }} />
            <span>KYC Verification & Document Storage Links</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">KYC Verification Status</label>
              <select
                name="kycStatus"
                defaultValue={tutorKyc}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                style={{ background: "#1E293B", border: "1px solid #334155" }}
              >
                <option value="NOT_SUBMITTED">NOT_SUBMITTED</option>
                <option value="PENDING">PENDING (In Queue)</option>
                <option value="APPROVED">APPROVED (Verified Tutor)</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">Wallet Coin Balance</label>
              <input
                name="coinBalance"
                type="number"
                defaultValue={tutorWalletBalance}
                placeholder="0"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"
                style={{ background: "#1E293B", border: "1px solid #334155" }}
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">ID Proof S3 Key / Document URL</label>
              <input
                name="kycIdProofUrl"
                defaultValue={kycIdUrl}
                placeholder="kyc/id-proofs/..."
                className="w-full rounded-xl px-4 py-2 text-xs text-white outline-none placeholder:text-slate-600 font-mono"
                style={{ background: "#1E293B", border: "1px solid #334155" }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">Address Proof S3 Key / Document URL</label>
              <input
                name="kycAddressUrl"
                defaultValue={kycAddrUrl}
                placeholder="kyc/address-proofs/..."
                className="w-full rounded-xl px-4 py-2 text-xs text-white outline-none placeholder:text-slate-600 font-mono"
                style={{ background: "#1E293B", border: "1px solid #334155" }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">Selfie Photo S3 Key / Document URL</label>
              <input
                name="kycSelfieUrl"
                defaultValue={kycSelfieUrl}
                placeholder="kyc/selfies/..."
                className="w-full rounded-xl px-4 py-2 text-xs text-white outline-none placeholder:text-slate-600 font-mono"
                style={{ background: "#1E293B", border: "1px solid #334155" }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white">Introduction Video Link (YouTube / Vimeo / S3)</label>
              <input
                name="introVideoUrl"
                defaultValue={introVidUrl}
                placeholder="https://..."
                className="w-full rounded-xl px-4 py-2 text-xs text-white outline-none placeholder:text-slate-600 font-mono"
                style={{ background: "#1E293B", border: "1px solid #334155" }}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all hover:opacity-90 active:scale-98"
          style={{ background: "#22C55E", color: "#0F172A" }}
        >
          <Save size={18} /> Save All User & Document Changes
        </button>
      </form>
    </div>
  );
}
