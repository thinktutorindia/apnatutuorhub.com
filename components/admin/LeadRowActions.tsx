"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import {
  Edit3,
  ChevronDown,
  Maximize2,
  X,
  Clock,
  Trash2,
  MessageCircle,
  Send,
  Loader2,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import {
  forceCloseLeadAction,
  forceExpireLeadAction,
  forceRadiusExpandAction,
  adminDeleteLeadAction,
} from "@/app/actions/admin.actions";
import { EditLeadModal } from "@/components/admin/EditLeadModal";
import { SendLeadToTutorModal } from "@/components/admin/SendLeadToTutorModal";

export interface LeadRowActionsProps {
  lead: {
    id: string;
    subjects: string[];
    classLevel: string;
    board?: string | null;
    mode: any;
    budgetMin?: number | null;
    budgetMax?: number | null;
    city?: string | null;
    area?: string | null;
    pincode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    timingPreference?: string | null;
    tutorGenderPref?: string | null;
    languagePref?: string | null;
    notes?: string | null;
    status: any;
    coinCost: number;
    maxTutors: number;
    radiusKm: number;
    parentProfile?: {
      user?: {
        name?: string | null;
        email?: string | null;
        phone?: string | null;
      } | null;
    } | null;
  };
  isSuperAdmin?: boolean;
}

export function LeadRowActions({ lead, isSuperAdmin = false }: LeadRowActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    action: () => Promise<any>;
    danger?: boolean;
  } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const runAction = (actionFn: () => Promise<any>) => {
    setIsOpen(false);
    startTransition(async () => {
      await actionFn();
    });
  };

  const parentPhone = lead.parentProfile?.user?.phone;
  const whatsappUrl = parentPhone
    ? `https://wa.me/91${parentPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hello ${lead.parentProfile?.user?.name || "Parent"}! Greeting from ApnaTutorHub Admin regarding your requirement for ${lead.classLevel} (${lead.subjects.join(", ")}).`
      )}`
    : null;

  const leadTitle = `${lead.classLevel} - ${lead.subjects.join(", ")}`;
  const isLeadActive = lead.status === "ACTIVE" || lead.status === "MATCHING";

  return (
    <div className="relative inline-flex items-center gap-2" ref={menuRef}>
      {/* 1. Primary Edit Button */}
      <button
        type="button"
        onClick={() => setIsEditModalOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0F2540] font-bold text-xs border border-slate-200 transition-colors shadow-2xs cursor-pointer"
        title="Edit Lead Requirement"
      >
        <Edit3 size={13} className="text-[#2D9E6B]" />
        <span>Edit</span>
      </button>

      {/* 2. Direct Send to Tutors Trigger */}
      <SendLeadToTutorModal
        leadId={lead.id}
        leadTitle={leadTitle}
        triggerClassName="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#2D9E6B] to-[#1F8255] hover:from-[#238357] hover:to-[#186843] text-white text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
        triggerText="Send"
      />

      {/* 3. Actions Dropdown Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-2xs transition-colors cursor-pointer"
        title="More Lead Actions"
      >
        {isPending ? (
          <Loader2 size={13} className="animate-spin text-[#2D9E6B]" />
        ) : (
          <>
            <span>Actions</span>
            <ChevronDown size={13} className={`transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
          </>
        )}
      </button>

      {/* Floating Actions Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-9 z-40 w-56 rounded-2xl bg-white border border-slate-200 shadow-2xl p-1.5 space-y-0.5 text-xs animate-in fade-in zoom-in-95 duration-150 text-slate-800">
          <div className="px-3 py-1.5 text-[10px] uppercase font-extrabold tracking-wider text-slate-400 border-b border-slate-100">
            Lead #{lead.id.slice(-6).toUpperCase()} Actions
          </div>

          {/* Edit Lead */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setIsEditModalOpen(true);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold text-left cursor-pointer transition-colors"
          >
            <Edit3 size={14} className="text-[#2D9E6B]" />
            <span>Edit Requirement</span>
          </button>

          {/* Expand Radius */}
          <button
            type="button"
            onClick={() => {
              runAction(() => forceRadiusExpandAction(lead.id));
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-emerald-50 text-emerald-900 font-semibold text-left cursor-pointer transition-colors"
          >
            <Maximize2 size={14} className="text-[#2D9E6B]" />
            <span>Expand Radius (+5km)</span>
          </button>

          {/* WhatsApp Parent */}
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-emerald-50 text-emerald-800 font-semibold cursor-pointer transition-colors"
            >
              <MessageCircle size={14} className="text-[#2D9E6B]" />
              <span>WhatsApp Parent</span>
            </a>
          )}

          {/* Force Close Requirement */}
          {isLeadActive && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setConfirmDialog({
                  title: "Close Tuition Requirement",
                  message: `Are you sure you want to mark this enquiry for "${leadTitle}" as CLOSED? Tutors will no longer be able to unlock or apply for it.`,
                  action: () => forceCloseLeadAction(lead.id),
                  danger: true,
                });
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-amber-50 text-amber-900 font-semibold text-left cursor-pointer transition-colors"
            >
              <X size={14} className="text-amber-600" />
              <span>Force Close Lead</span>
            </button>
          )}

          {/* Force Expire Requirement */}
          {isLeadActive && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setConfirmDialog({
                  title: "Expire Tuition Requirement",
                  message: `Mark this requirement for "${leadTitle}" as EXPIRED?`,
                  action: () => forceExpireLeadAction(lead.id),
                });
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold text-left cursor-pointer transition-colors"
            >
              <Clock size={14} className="text-slate-500" />
              <span>Force Expire Lead</span>
            </button>
          )}

          {/* Delete Lead (Super Admin Only) */}
          {isSuperAdmin && (
            <>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setConfirmDialog({
                    title: "Permanently Delete Lead",
                    message: `Are you sure you want to PERMANENTLY DELETE this requirement for "${leadTitle}"? All tutor unlock records, applications, and bookings associated with this lead will be erased. This action CANNOT be undone.`,
                    action: () => adminDeleteLeadAction(lead.id),
                    danger: true,
                  });
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-700 font-bold text-left cursor-pointer transition-colors"
              >
                <Trash2 size={14} className="text-rose-600" />
                <span>Delete Lead</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Edit Lead Modal */}
      <EditLeadModal
        lead={lead}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4 text-slate-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div
                className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  confirmDialog.danger ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-800"
                }`}
              >
                <ShieldAlert size={22} />
              </div>
              <div>
                <h4 className="font-bold text-base text-[#0F2540]">{confirmDialog.title}</h4>
                <p className="text-xs text-slate-500 font-medium">Please confirm to proceed</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              {confirmDialog.message}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const act = confirmDialog.action;
                  setConfirmDialog(null);
                  runAction(act);
                }}
                className={`px-5 py-2 rounded-xl font-bold text-xs text-white shadow-md active:scale-95 transition-all cursor-pointer ${
                  confirmDialog.danger
                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20"
                    : "bg-[#2D9E6B] hover:bg-[#238357] shadow-emerald-500/20"
                }`}
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
