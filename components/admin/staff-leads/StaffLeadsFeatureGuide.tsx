"use client";

import React, { useState } from "react";
import {
  X, Zap, MessageCircle, PhoneCall, CheckCircle2, ShieldCheck,
  RefreshCcw, Sparkles, Keyboard, ArrowRight, BookOpen, Clock,
  Users, UserCheck, Flame, HelpCircle, Layers, Check, ChevronRight
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLaunchDialer?: () => void;
}

type GuideTab = "DIALER" | "WHATSAPP" | "CLASSIFIER" | "RETRY" | "SHIELD" | "SHORTCUTS";

export function StaffLeadsFeatureGuide({ isOpen, onClose, onLaunchDialer }: Props) {
  const [activeTab, setActiveTab] = useState<GuideTab>("DIALER");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0F2540] via-[#162D4A] to-[#0F2540] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400 flex items-center justify-center text-slate-950 font-black">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight" style={{ fontFamily: "Poppins, sans-serif" }}>
                Staff Leads CRM — Feature Guide &amp; Cheatsheet
              </h2>
              <p className="text-[11px] text-white/70 font-medium">
                Everything you need to call faster, classify accurately, and convert leads with ease.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Close Guide"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 bg-slate-50 border-b border-slate-200 overflow-x-auto text-xs font-bold shrink-0">
          {[
            { id: "DIALER", label: "⚡ Power Dialer", icon: Zap },
            { id: "WHATSAPP", label: "💬 WhatsApp Templates", icon: MessageCircle },
            { id: "CLASSIFIER", label: "🎯 Smart Classifier", icon: UserCheck },
            { id: "RETRY", label: "🔄 Retry & Follow-ups", icon: RefreshCcw },
            { id: "SHIELD", label: "🛡️ Data Protection", icon: ShieldCheck },
            { id: "SHORTCUTS", label: "⌨️ Keyboard Hotkeys", icon: Keyboard },
          ].map((t) => {
            const Icon = t.icon;
            const isSel = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as GuideTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  isSel
                    ? "bg-[#0F2540] text-white shadow-xs font-extrabold"
                    : "text-slate-600 hover:bg-slate-200/70"
                }`}
              >
                <Icon size={13} className={isSel ? "text-amber-400" : "text-slate-500"} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
          
          {/* TAB 1: POWER DIALER */}
          {activeTab === "DIALER" && (
            <div className="space-y-5 animate-in fade-in-50">
              <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200 p-5 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <PhoneCall size={22} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    High-Velocity Calling
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    What is the Power Dialer?
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    The Power Dialer queues your assigned leads and lets you call, review talking points, and log outcomes with <strong>single clicks or keypresses</strong>. You never have to manually copy phone numbers or re-navigate between pages.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs">
                    1
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-900">Direct Click-to-Dial</h4>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Click <strong>&quot;DIAL NOW&quot;</strong> or press <kbd className="px-1 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono">Space</kbd>. It triggers your mobile/system dialer and automatically starts a live call duration stopwatch.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xs">
                    2
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-900">Interactive Call Scripts</h4>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Toggle between tailored <strong>Tutor Pitch</strong> and <strong>Parent Script</strong> tabs with dynamic placeholders for the contact&apos;s name, locality, and subjects.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs">
                    3
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-900">1-Press Outcome &amp; Auto-Advance</h4>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Press <kbd className="px-1 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono">1</kbd> to <kbd className="px-1 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono">6</kbd> to save the call result. The system updates the lead status and immediately brings up the next lead in queue!
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Flame size={18} className="text-amber-600" />
                  <span className="text-xs font-bold text-amber-950">
                    Pro tip: Use keyboard shortcuts to speed through 40+ calls per hour without touching your mouse!
                  </span>
                </div>
                {onLaunchDialer && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onLaunchDialer();
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#0F2540] hover:bg-slate-800 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Zap size={13} className="text-amber-400" />
                    <span>Launch Power Dialer Now</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: WHATSAPP TEMPLATES */}
          {activeTab === "WHATSAPP" && (
            <div className="space-y-4 animate-in fade-in-50">
              <div>
                <h3 className="text-base font-black text-slate-900">Instant WhatsApp Follow-up Templates</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  When a lead doesn&apos;t answer or requests details on WhatsApp, select one of the 4 pre-built templates:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl border border-teal-200 bg-teal-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-teal-900 flex items-center gap-1.5">
                      <PhoneCall size={13} /> 1. Missed Call Follow-up
                    </span>
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                      No Answer
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded-xl border border-teal-100">
                    &quot;Hello [Name], we tried calling you from ApnaTutorHub regarding tuition matching in [Location]. When is a convenient time to speak for 2 minutes? Thank you!&quot;
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-blue-900 flex items-center gap-1.5">
                      <BookOpen size={13} /> 2. Tuition Requirements in Area
                    </span>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      For Tutors
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded-xl border border-blue-100">
                    &quot;Hello [Name], greetings from ApnaTutorHub! We are actively assigning home &amp; online tuitions in [Location]. Are you available for new student inquiries this week?&quot;
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-purple-900 flex items-center gap-1.5">
                      <Clock size={13} /> 3. Demo Class Trial Schedule
                    </span>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                      Parents &amp; Tutors
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded-xl border border-purple-100">
                    &quot;Hello [Name], we would like to confirm your schedule for a demo class trial for [Subjects]. Please reply with your preferred day and time!&quot;
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 size={13} /> 4. Platform Registration Link
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Onboarding
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded-xl border border-emerald-100">
                    &quot;Hello [Name], please complete your verified profile registration on ApnaTutorHub to receive direct tuition leads: https://apnatutorhub.com&quot;
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SMART CLASSIFIER */}
          {activeTab === "CLASSIFIER" && (
            <div className="space-y-4 animate-in fade-in-50">
              <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200 p-5">
                <h3 className="text-base font-black text-blue-950">How ApnaTutorHub Classifies Leads</h3>
                <p className="text-xs text-blue-800/80 mt-1 leading-relaxed">
                  Raw uploaded data often mixes teacher resumes with parent tuition inquiries. Our system intelligently categorizes them:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-600" />
                    <h4 className="font-extrabold text-sm text-emerald-950">Teacher / Tutor Leads</h4>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-2">
                    <li className="flex items-start gap-1.5">
                      <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span>Tagged as <strong>TUTOR</strong> based on qualifications, experience years, and teaching subjects.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span>Clicking <strong>&quot;Promote to Tutor Profile&quot;</strong> creates a live teacher account in the User Directory and links their subject taxonomy.</span>
                    </li>
                  </ul>
                </div>

                <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-600" />
                    <h4 className="font-extrabold text-sm text-blue-950">Parent / Student Enquiries</h4>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-2">
                    <li className="flex items-start gap-1.5">
                      <Check size={14} className="text-blue-600 shrink-0 mt-0.5" />
                      <span>Tagged as <strong>PARENT</strong> when an inquiry asks for home/online tutors for their child.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Check size={14} className="text-blue-600 shrink-0 mt-0.5" />
                      <span>When converted, they route into <strong>Student Leads</strong> and match with nearby verified tutors.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RETRY ENGINE */}
          {activeTab === "RETRY" && (
            <div className="space-y-4 animate-in fade-in-50">
              <div>
                <h3 className="text-base font-black text-slate-900">Follow-Up &amp; Retry Workspace</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Over 60% of leads require 2 or 3 attempts before answering. Never let an enquiry slip through the cracks:
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 font-black text-xs">
                    🔄
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">Automatic Attempt Counter</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                      Every call log increments the lead&apos;s attempt count (<span className="font-bold text-slate-700">Att #1</span>, <span className="font-bold text-amber-700">Att #2</span>, <span className="font-bold text-rose-700">Att #3+</span>). You can filter specifically for leads that haven&apos;t answered yet.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 font-black text-xs">
                    🚨
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">Due Follow-Up Alerts</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                      When a contact requests a callback, schedule a date/time. When due, an urgent <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">🚨 Due Now</span> tag highlights them at the very top of your queue.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-black text-xs">
                    ⚡
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">One-Click Power Dial Retries</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                      Switch to the <strong>&quot;Retry Workspace&quot;</strong> tab and hit <strong>&quot;⚡ Power Dial Retries&quot;</strong> to cycle through all unanswered contacts in under 10 minutes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DATA PROTECTION */}
          {activeTab === "SHIELD" && (
            <div className="space-y-4 animate-in fade-in-50">
              <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200 p-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={20} className="text-amber-700" />
                  <h3 className="text-base font-black text-amber-950">Anti-Data-Theft &amp; Duty Protection</h3>
                </div>
                <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
                  To protect proprietary tutor databases and customer privacy, phone numbers are protected under strict security controls:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <h4 className="font-extrabold text-xs text-slate-900">1. On-Duty Requirement</h4>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Staff must clock in and be marked <strong>On Duty</strong> from the top global bar to view unmasked contact numbers.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <h4 className="font-extrabold text-xs text-slate-900">2. Idle Masking</h4>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    If an agent is idle or steps away from their desk, contacts are automatically blurred to prevent shoulder-surfing.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <h4 className="font-extrabold text-xs text-slate-900">3. Audited Reveal Logging</h4>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Every time a contact number is revealed, a secure security log records the agent ID, timestamp, and IP address.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <h4 className="font-extrabold text-xs text-slate-900">4. Admin Emergency Lockout</h4>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Super Admins can instantly lock off duty or terminate access for any telecaller from the Presence Board.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: KEYBOARD SHORTCUTS */}
          {activeTab === "SHORTCUTS" && (
            <div className="space-y-4 animate-in fade-in-50">
              <div>
                <h3 className="text-base font-black text-slate-900">Power Dialer &amp; Desk Hotkeys</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Call and navigate with speed using these universal keyboard shortcuts:
                </p>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                    <tr>
                      <th className="py-2.5 px-4 text-left">Key</th>
                      <th className="py-2.5 px-4 text-left">Action</th>
                      <th className="py-2.5 px-4 text-left">Result Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold">
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-4 font-mono font-bold text-slate-800"><kbd className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300">1</kbd></td>
                      <td className="py-2 px-4 text-emerald-700 font-bold">📞 Connected / Spoke</td>
                      <td className="py-2 px-4 text-slate-500 font-mono text-[11px]">CONTACTED</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-4 font-mono font-bold text-slate-800"><kbd className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300">2</kbd></td>
                      <td className="py-2 px-4 text-blue-700 font-bold">🔔 Callback Scheduled</td>
                      <td className="py-2 px-4 text-slate-500 font-mono text-[11px]">FOLLOW_UP</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-4 font-mono font-bold text-slate-800"><kbd className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300">3</kbd></td>
                      <td className="py-2 px-4 text-amber-700 font-bold">⏳ Line Busy</td>
                      <td className="py-2 px-4 text-slate-500 font-mono text-[11px]">NO_ANSWER</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-4 font-mono font-bold text-slate-800"><kbd className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300">4</kbd></td>
                      <td className="py-2 px-4 text-orange-700 font-bold">📵 No Answer / Ringing</td>
                      <td className="py-2 px-4 text-slate-500 font-mono text-[11px]">NO_ANSWER</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-4 font-mono font-bold text-slate-800"><kbd className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300">5</kbd></td>
                      <td className="py-2 px-4 text-emerald-700 font-extrabold">🎉 Enrolled / Converted</td>
                      <td className="py-2 px-4 text-slate-500 font-mono text-[11px]">CONVERTED</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-4 font-mono font-bold text-slate-800"><kbd className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300">6</kbd></td>
                      <td className="py-2 px-4 text-rose-700 font-bold">✕ Not Interested</td>
                      <td className="py-2 px-4 text-slate-500 font-mono text-[11px]">NOT_INTERESTED</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-4 font-mono font-bold text-slate-800"><kbd className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300">Enter</kbd></td>
                      <td className="py-2 px-4 text-slate-700">Save &amp; Advance to Next Lead</td>
                      <td className="py-2 px-4 text-slate-500 text-[11px]">Next Queue Item</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-4 font-mono font-bold text-slate-800"><kbd className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300">Space</kbd></td>
                      <td className="py-2 px-4 text-slate-700">Trigger Dial Now</td>
                      <td className="py-2 px-4 text-slate-500 text-[11px]">Starts Call + Timer</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-4 font-mono font-bold text-slate-800"><kbd className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300">E</kbd></td>
                      <td className="py-2 px-4 text-slate-700">Edit Lead Profile Inline</td>
                      <td className="py-2 px-4 text-slate-500 text-[11px]">Opens inline form</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-4 font-mono font-bold text-slate-800"><kbd className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300">S</kbd> or <kbd className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300">↓</kbd></td>
                      <td className="py-2 px-4 text-slate-700">Skip to Next Lead</td>
                      <td className="py-2 px-4 text-slate-500 text-[11px]">Skips without save</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-2 px-4 font-mono font-bold text-slate-800"><kbd className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300">Esc</kbd></td>
                      <td className="py-2 px-4 text-slate-700">Close Power Dialer or Drawer</td>
                      <td className="py-2 px-4 text-slate-500 text-[11px]">Closes modal</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] font-semibold text-slate-500">
            Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px]">Esc</kbd> to close anytime
          </span>
          <div className="flex items-center gap-2">
            {onLaunchDialer && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLaunchDialer();
                }}
                className="px-4 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                <Zap size={13} />
                <span>Start Calling</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#0F2540] text-white font-extrabold text-xs hover:bg-slate-800 cursor-pointer"
            >
              Got It!
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
