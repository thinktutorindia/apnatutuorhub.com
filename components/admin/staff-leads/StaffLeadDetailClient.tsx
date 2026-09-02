"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Phone, Mail, MapPin, GraduationCap, BookOpen, Users, Clock, Star,
  CheckCircle2, XCircle, PhoneOff, PhoneMissed, RefreshCcw, AlertTriangle,
  Sparkles, ArrowUpRight, ChevronLeft, Save, Loader2, PhoneCall, AlertCircle
} from "lucide-react";
import {
  updateStaffLeadAction, logCallAction, promoteLeadToProfileAction,
  reParseLeadWithAIAction
} from "@/app/actions/staff-leads.actions";
import type { StaffLeadStatus, CallOutcome } from "@prisma/client";
import { CreateLeadModal } from "@/components/admin/CreateLeadModal";
import { StaffLeadTypeControl } from "@/components/admin/staff-leads/StaffLeadTypeControl";
import { StaffLeadWorkPlan } from "@/components/admin/staff-leads/StaffLeadWorkPlan";
import { getStaffRecordType, staffNotesWithoutTypeTags, type StaffRecordType } from "@/lib/staff-lead-type";
import { LocationSearchInput } from "@/components/ui/LocationSearchInput";
import { SubjectPicker } from "@/components/ui/SubjectPicker";
import { classesFromTaxonomySubjects } from "@/lib/validations";

type StringFieldKey =
  | "name"
  | "phone"
  | "altPhone"
  | "email"
  | "location"
  | "fullAddress"
  | "pincode"
  | "qualification"
  | "experienceYears"
  | "staffNotes";

const STATUS_STYLES: Record<StaffLeadStatus, { label: string; bg: string; text: string }> = {
  NEW:            { label: "New",            bg: "bg-slate-100",   text: "text-slate-600"   },
  ASSIGNED:       { label: "Assigned",       bg: "bg-blue-100",    text: "text-blue-700"    },
  CONTACTED:      { label: "Contacted",      bg: "bg-teal-100",    text: "text-teal-700"    },
  FOLLOW_UP:      { label: "Follow Up",      bg: "bg-amber-100",   text: "text-amber-700"   },
  INTERESTED:     { label: "Interested",     bg: "bg-emerald-100", text: "text-emerald-700" },
  NOT_INTERESTED: { label: "Not Interested", bg: "bg-red-100",     text: "text-red-700"     },
  NO_ANSWER:      { label: "No Answer",      bg: "bg-orange-100",  text: "text-orange-700"  },
  CONVERTED:      { label: "Converted ✓",   bg: "bg-green-100",   text: "text-green-700"   },
  REJECTED:       { label: "Rejected",       bg: "bg-red-100",     text: "text-red-700"     },
  DUPLICATE:      { label: "Duplicate",      bg: "bg-slate-100",   text: "text-slate-500"   },
};

const OUTCOME_BUTTONS: { outcome: CallOutcome; label: string; icon: React.ReactNode; cls: string }[] = [
  { outcome: "ANSWERED",           label: "Answered",        icon: <CheckCircle2 size={14} />,  cls: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" },
  { outcome: "NO_ANSWER",          label: "No Answer",       icon: <PhoneMissed size={14} />,   cls: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100" },
  { outcome: "CALLBACK_REQUESTED", label: "Callback Later",  icon: <RefreshCcw size={14} />,    cls: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" },
  { outcome: "NOT_INTERESTED",     label: "Not Interested",  icon: <XCircle size={14} />,       cls: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100" },
  { outcome: "BUSY",               label: "Busy",            icon: <PhoneOff size={14} />,      cls: "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100" },
  { outcome: "CONVERTED",          label: "Plan Purchased!",  icon: <Star size={14} />,         cls: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100" },
];

type Lead = {
  id: string; rawText: string | null; name: string | null; phone: string | null;
  altPhone: string | null; whatsapp: string | null; email: string | null;
  location: string | null; pincode: string | null; fullAddress: string | null;
  subjects: string[]; classes: string[]; board: string | null;
  qualification: string | null; experienceYears: number | null; gender: string | null;
  status: StaffLeadStatus; staffNotes: string | null; isPromoted: boolean;
  promotedTutorProfileId: string | null; nextFollowUpAt: Date | null;
  createdAt: Date; assignedTo: { name: string | null; email: string } | null;
  callLogs: Array<{ id: string; outcome: CallOutcome; notes: string | null; calledAt: Date; calledBy: { name: string | null } }>;
};

function MissingBadge({ label }: { label: string }) {
  return <span className="text-xs bg-red-50 text-red-500 border border-red-200 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><AlertTriangle size={10} /> {label} missing</span>;
}

function Field({ label, value, children }: { label: string; value?: string | null; children?: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1">{label}</label>
      {children ?? (value ? <p className="text-sm font-semibold text-slate-800">{value}</p> : <p className="text-sm text-slate-300 italic">Not provided</p>)}
    </div>
  );
}

export function StaffLeadDetailClient({ lead: initialLead }: { lead: Lead }) {
  const [lead, setLead] = useState(initialLead);
  const [isPending, startTransition] = useTransition();
  const [showLogCall, setShowLogCall] = useState(false);
  const [callOutcome, setCallOutcome] = useState<CallOutcome>("ANSWERED");
  const [callNotes, setCallNotes] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [promoteConfirm, setPromoteConfirm] = useState(false);
  const [recordType, setRecordType] = useState<StaffRecordType>(getStaffRecordType(initialLead.staffNotes));

  // Editable fields
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: lead.name ?? "", phone: lead.phone ?? "", altPhone: lead.altPhone ?? "",
    email: lead.email ?? "", location: lead.location ?? "", fullAddress: lead.fullAddress ?? "",
    pincode: lead.pincode ?? "", qualification: lead.qualification ?? "",
    experienceYears: lead.experienceYears?.toString() ?? "",
    staffNotes: lead.staffNotes ?? "",
    subjects: lead.subjects,
  });

  const missingFields = [
    !lead.phone && "Phone",
    recordType !== "PARENT" && !lead.email && "Email",
    !lead.location && "Location",
    !lead.subjects.length && "Subjects",
  ].filter(Boolean) as string[];

  const handleSave = () => {
    startTransition(async () => {
      const res = await updateStaffLeadAction(lead.id, {
        name: form.name,
        phone: form.phone,
        altPhone: form.altPhone,
        email: form.email,
        location: form.location,
        fullAddress: form.fullAddress,
        pincode: form.pincode,
        qualification: form.qualification,
        experienceYears: form.experienceYears ? parseInt(form.experienceYears) : undefined,
        staffNotes: form.staffNotes,
        subjects: form.subjects,
        classes: classesFromTaxonomySubjects(form.subjects),
      });
      if (res.success) {
        setMessage({ type: "success", text: "Lead updated!" });
        setEditing(false);
        setLead((prev) => ({
          ...prev,
          name: form.name || null,
          phone: form.phone || null,
          altPhone: form.altPhone || null,
          email: form.email || null,
          location: form.location || null,
          fullAddress: form.fullAddress || null,
          pincode: form.pincode || null,
          qualification: form.qualification || null,
          experienceYears: form.experienceYears ? parseInt(form.experienceYears) : null,
          staffNotes: form.staffNotes || null,
          subjects: form.subjects,
          classes: classesFromTaxonomySubjects(form.subjects),
        }));
      } else {
        setMessage({ type: "error", text: res.error ?? "Update failed" });
      }
    });
  };

  const handleLogCall = () => {
    startTransition(async () => {
      const res = await logCallAction(lead.id, callOutcome, callNotes, nextFollowUp || null);
      if (res.success) {
        setMessage({ type: "success", text: "Call logged!" });
        setShowLogCall(false);
        setCallNotes("");
        setNextFollowUp("");
        // Refresh lead status locally
        setLead((prev) => ({
          ...prev,
          status: callOutcome === "ANSWERED" ? "CONTACTED" : callOutcome === "NO_ANSWER" ? "NO_ANSWER" : callOutcome === "NOT_INTERESTED" ? "NOT_INTERESTED" : callOutcome === "CONVERTED" ? "CONVERTED" : "FOLLOW_UP",
          lastContactedAt: new Date(),
        }));
      } else {
        setMessage({ type: "error", text: res.error ?? "Log failed" });
      }
    });
  };

  const handlePromote = () => {
    startTransition(async () => {
      const res = await promoteLeadToProfileAction(lead.id);
      if (res.success && res.data) {
        const pwdNote = res.data.temporaryPassword
          ? ` Temporary password: ${res.data.temporaryPassword} (KYC still required).`
          : "";
        setMessage({ type: "success", text: `✓ Profile created! User ID: ${res.data.userId}.${pwdNote}` });
        setLead((prev) => ({ ...prev, isPromoted: true, status: "CONVERTED", promotedTutorProfileId: res.data!.tutorProfileId }));
        setPromoteConfirm(false);
      } else {
        setMessage({ type: "error", text: res.error ?? "Promotion failed" });
        setPromoteConfirm(false);
      }
    });
  };

  const handleReparse = () => {
    startTransition(async () => {
      const res = await reParseLeadWithAIAction(lead.id);
      if (res.success) setMessage({ type: "success", text: "Re-parsed with AI! Refresh to see updates." });
      else setMessage({ type: "error", text: res.error ?? "Re-parse failed" });
    });
  };

  const statusStyle = STATUS_STYLES[lead.status];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="ath-panel flex items-start justify-between flex-wrap gap-3 p-5 sm:p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/staff-leads" className="text-slate-400 hover:text-[#0F2540]">
              <ChevronLeft size={18} />
            </Link>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
              {statusStyle.label}
            </span>
            {missingFields.length > 0 && (
              <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded-full font-semibold">
                {missingFields.length} fields missing
              </span>
            )}
          </div>
          <h1 className="text-2xl font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>{lead.name ?? "Unknown contact"}</h1>
          <p className="text-sm text-slate-600 mt-0.5 font-600">
            {lead.phone ?? "No phone"} · {lead.location ?? "Unknown location"}
            {lead.assignedTo && <> · Assigned to <strong>{lead.assignedTo.name ?? lead.assignedTo.email}</strong></>}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-800 text-slate-500">This row is a</span>
            <StaffLeadTypeControl
              leadId={lead.id}
              type={recordType}
              onChanged={(next, notes) => {
                setRecordType(next);
                setLead((prev) => ({ ...prev, staffNotes: notes }));
                setForm((prev) => ({ ...prev, staffNotes: notes }));
              }}
            />
            <span className="text-[11px] font-600 text-slate-500">Wrong dump? Switch Parent ↔ Tutor before converting.</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {lead.rawText && (
            <button onClick={handleReparse} disabled={isPending}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
              <Sparkles size={14} /> Re-parse AI
            </button>
          )}
          <button onClick={() => setEditing(!editing)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold ${editing ? "border-emerald-400 text-emerald-700 bg-emerald-50" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            {editing ? <><Save size={14} /> Save Mode</> : <><Save size={14} /> Edit</>}
          </button>
          <button onClick={() => setShowLogCall(!showLogCall)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#2563EB] text-white text-sm font-800 hover:bg-[#1d4ed8]">
            <PhoneCall size={14} /> Log Call
          </button>
          {!lead.isPromoted && recordType === "PARENT" ? (
            <CreateLeadModal
              triggerLabel="Post to Student Leads"
              triggerClassName="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2563EB] !text-white text-sm font-800 hover:bg-[#1d4ed8]"
              defaults={{
                parentName: lead.name ?? undefined,
                parentPhone: lead.phone ?? undefined,
                parentEmail: lead.email ?? undefined,
                classLevel: lead.classes[0] ?? undefined,
                board: lead.board ?? undefined,
                subjects: lead.subjects,
                city: lead.location ?? undefined,
                pincode: lead.pincode ?? undefined,
                notes: staffNotesWithoutTypeTags(lead.staffNotes) || undefined,
              }}
            />
          ) : !lead.isPromoted ? (
            <button onClick={() => setPromoteConfirm(true)} disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#2D9E6B] text-white text-sm font-800 hover:bg-[#238357]">
              <ArrowUpRight size={14} /> Promote to tutor
            </button>
          ) : (
            <Link href={`/admin/users`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-100 text-emerald-700 text-sm font-bold">
              <CheckCircle2 size={14} /> Promoted ✓
            </Link>
          )}
        </div>
      </div>

      <StaffLeadWorkPlan
        type={recordType}
        status={lead.status}
        isPromoted={lead.isPromoted}
        hasPhone={Boolean(lead.phone)}
        nextFollowUpAt={lead.nextFollowUpAt}
        lastContactedAt={lead.callLogs[0]?.calledAt}
        callCount={lead.callLogs.length}
        assignedTo={lead.assignedTo?.name ?? lead.assignedTo?.email}
      />

      {message && (
        <div className={`rounded-xl p-4 flex items-center gap-2 text-sm ${message.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
          {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto text-slate-400">×</button>
        </div>
      )}

      {/* Missing fields banner */}
      {missingFields.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <AlertTriangle size={13} /> Ask for these during the call
          </p>
          <div className="flex flex-wrap gap-2">
            {missingFields.map((f) => <MissingBadge key={f} label={f} />)}
          </div>
        </div>
      )}

      {/* Log Call Modal */}
      {showLogCall && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-lg space-y-4">
          <h3 className="font-extrabold text-slate-900">Log Call Outcome</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {OUTCOME_BUTTONS.map(({ outcome, label, icon, cls }) => (
              <button key={outcome} onClick={() => setCallOutcome(outcome)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-all ${callOutcome === outcome ? "ring-2 ring-offset-1 ring-emerald-400 " + cls : cls}`}>
                {icon} {label}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Call Notes</label>
            <textarea value={callNotes} onChange={(e) => setCallNotes(e.target.value)}
              placeholder="What was discussed? Any missing info collected?" rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Next Follow-Up Date</label>
            <input type="datetime-local" value={nextFollowUp} onChange={(e) => setNextFollowUp(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="flex gap-3">
            <button onClick={handleLogCall} disabled={isPending}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Save Call Log
            </button>
            <button onClick={() => setShowLogCall(false)} className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Promote confirm */}
      {promoteConfirm && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 space-y-3">
          <h3 className="font-extrabold text-emerald-900">Create a tutor account from this row?</h3>
          <p className="text-sm text-emerald-700">
            Use this only if they want to teach. Parent tuition needs should be posted to Student Leads instead.
            This creates a <strong>User</strong> + <strong>TutorProfile</strong>.
            {lead.email ? <> Email: <code className="font-mono bg-emerald-100 px-1 rounded">{lead.email}</code></> : <> No email — will use <code className="font-mono bg-emerald-100 px-1 rounded">{lead.phone}@apnatutorhub.com</code></>}
            . Default password: <code className="font-mono bg-emerald-100 px-1 rounded">Apnatutor@123</code>
          </p>
          <div className="flex gap-3">
            <button onClick={handlePromote} disabled={isPending}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50">
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpRight size={14} />}
              Yes, Promote
            </button>
            <button onClick={() => setPromoteConfirm(false)} className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Main fields grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <h3 className="font-extrabold text-slate-900 flex items-center gap-2"><Phone size={16} className="text-emerald-600" /> Contact Information</h3>
          {editing ? (
            <div className="space-y-3">
              {(recordType === "PARENT"
                ? ([
                    { key: "name", label: "Parent name", placeholder: "e.g. Mrs Sharma" },
                    { key: "phone", label: "Phone", placeholder: "10 digit number" },
                    { key: "altPhone", label: "WhatsApp / Alt Phone", placeholder: "Alternative number" },
                  ] satisfies { key: StringFieldKey; label: string; placeholder: string }[])
                : ([
                    { key: "name", label: "Name", placeholder: "Full name" },
                    { key: "phone", label: "Phone", placeholder: "10 digit number" },
                    { key: "altPhone", label: "Alt Phone", placeholder: "Alternative number" },
                    { key: "email", label: "Email", placeholder: "email@example.com" },
                  ] satisfies { key: StringFieldKey; label: string; placeholder: string }[])
              ).map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-slate-500 mb-1">{label}</label>
                  <input value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <Field label="Name" value={lead.name} />
              <Field label="Phone">
                {lead.phone ? (
                  <a href={`tel:+91${lead.phone}`} className="text-sm font-bold text-blue-600 flex items-center gap-1 hover:underline">
                    <Phone size={13} /> +91 {lead.phone}
                  </a>
                ) : <MissingBadge label="Phone" />}
              </Field>
              <Field label="Alt Phone" value={lead.altPhone} />
              <Field label="Email">
                {lead.email ? (
                  <a href={`mailto:${lead.email}`} className="text-sm text-blue-600 flex items-center gap-1 hover:underline">
                    <Mail size={13} /> {lead.email}
                  </a>
                ) : <MissingBadge label="Email" />}
              </Field>
            </div>
          )}
        </div>

        {/* Location */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <h3 className="font-extrabold text-slate-900 flex items-center gap-2"><MapPin size={16} className="text-blue-600" /> Location</h3>
          {editing ? (
            <div className="space-y-3">
              <LocationSearchInput
                key={lead.id}
                initialDisplay={[form.location, form.pincode].filter(Boolean).join(", ")}
                defaultCity={form.location}
                defaultPincode={form.pincode}
                placeholder="Search area, landmark or pincode…"
                onSelectLocation={(result) => {
                  const locLabel = [result.area, result.city].filter(Boolean).join(", ") || result.city;
                  setForm((f) => ({
                    ...f,
                    location: locLabel || f.location,
                    pincode: result.pincode || f.pincode,
                    fullAddress: result.fullAddress || f.fullAddress,
                  }));
                }}
              />
              {([
                { key: "location", label: "Area / City", placeholder: "Filled from search or map" },
                { key: "pincode", label: "Pincode", placeholder: "6-digit pincode" },
                { key: "fullAddress", label: "Full Address", placeholder: "Exact address from map" },
              ] satisfies { key: StringFieldKey; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-slate-500 mb-1">{label}</label>
                  <input value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <Field label="Area / City">{lead.location ? <p className="text-sm font-semibold text-slate-800">{lead.location}</p> : <MissingBadge label="Location" />}</Field>
              <Field label="Pincode" value={lead.pincode} />
              <Field label="Full Address" value={lead.fullAddress} />
            </div>
          )}
        </div>

        {/* Teaching profile */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <h3 className="font-extrabold text-slate-900 flex items-center gap-2"><BookOpen size={16} className="text-purple-600" /> {recordType === "PARENT" ? "Tuition needed" : "Teaching Profile"}</h3>
          {editing ? (
            <div className="space-y-3">
              <SubjectPicker
                value={form.subjects}
                onChange={(subjects) => setForm((f) => ({ ...f, subjects }))}
                hintText={recordType === "PARENT" ? "What subjects does this parent need?" : "Pick subjects from the class taxonomy. Grade is already in the subject name."}
              />
              {recordType !== "PARENT" && ([
                { key: "qualification", label: "Qualification", placeholder: "B.Ed, B.Tech, etc." },
                { key: "experienceYears", label: "Experience (years)", placeholder: "5" },
              ] satisfies { key: StringFieldKey; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-slate-500 mb-1">{label}</label>
                  <input value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <Field label="Subjects">
                {lead.subjects.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {lead.subjects.map((s) => <span key={s} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-semibold">{s}</span>)}
                  </div>
                ) : <MissingBadge label="Subjects" />}
              </Field>
              {recordType !== "PARENT" && (
                <>
                  <Field label="Qualification" value={lead.qualification} />
                  <Field label="Experience" value={lead.experienceYears ? `${lead.experienceYears} years` : null} />
                </>
              )}
            </div>
          )}
        </div>

        {/* Staff Notes */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <h3 className="font-extrabold text-slate-900 flex items-center gap-2"><GraduationCap size={16} className="text-amber-600" /> Staff Notes</h3>
          <textarea
            value={form.staffNotes}
            onChange={(e) => setForm((f) => ({ ...f, staffNotes: e.target.value }))}
            placeholder="Add notes about this lead — e.g. 'Very interested, said will buy in 2 days', 'Number not working'"
            rows={5}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
          />
          {editing && (
            <button onClick={handleSave} disabled={isPending}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50">
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save All Changes
            </button>
          )}
        </div>
      </div>

      {/* Call History */}
      {lead.callLogs.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-extrabold text-slate-900 mb-4 flex items-center gap-2"><Clock size={16} className="text-slate-600" /> Call History</h3>
          <div className="space-y-3">
            {lead.callLogs.map((log) => {
              const outcomeStyle: Record<CallOutcome, string> = {
                ANSWERED: "bg-emerald-100 text-emerald-700",
                NO_ANSWER: "bg-orange-100 text-orange-700",
                BUSY: "bg-slate-100 text-slate-600",
                WRONG_NUMBER: "bg-red-100 text-red-700",
                CALLBACK_REQUESTED: "bg-amber-100 text-amber-700",
                CONVERTED: "bg-purple-100 text-purple-700",
                NOT_INTERESTED: "bg-red-100 text-red-700",
              };
              return (
                <div key={log.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${outcomeStyle[log.outcome]}`}>
                    {log.outcome.replace("_", " ")}
                  </span>
                  <div className="flex-1">
                    {log.notes && <p className="text-sm text-slate-700">{log.notes}</p>}
                    <p className="text-xs text-slate-400 mt-0.5">
                      by {log.calledBy.name} · {new Date(log.calledAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Raw Text */}
      {lead.rawText && (
        <details className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <summary className="cursor-pointer text-sm font-bold text-slate-500 hover:text-slate-800">Original Raw Text (click to expand)</summary>
          <pre className="mt-4 text-xs font-mono text-slate-500 bg-slate-50 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap">
            {lead.rawText}
          </pre>
        </details>
      )}
    </div>
  );
}
