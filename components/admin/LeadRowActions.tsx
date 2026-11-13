"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import { createPortal } from "react-dom";
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
  History,
  Users,
} from "lucide-react";
import {
  forceCloseLeadAction,
  forceExpireLeadAction,
  forceRadiusExpandAction,
  adminDeleteLeadAction,
} from "@/app/actions/admin.actions";
import { EditLeadModal } from "@/components/admin/EditLeadModal";
import { SendLeadToTutorModal } from "@/components/admin/SendLeadToTutorModal";
import { LeadHistoryModal } from "@/components/admin/LeadHistoryModal";
import { TargetedTutorsModal } from "@/components/admin/TargetedTutorsModal";
import { getInquiryDisplayCode, getInquiryHashTag } from "@/lib/lead-utils";

export interface LeadRowActionsProps {
  lead: {
    id: string;
    inquiryNumber?: number | null;
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
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isTargetedModalOpen, setIsTargetedModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; right: number } | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    action: () => Promise<any>;
    danger?: boolean;
  } | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const updateMenuPosition = () => {
    if (typeof window === "undefined") return;
    const mobile = window.innerWidth < 640;
    setIsMobile(mobile);
    if (!mobile && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const right = Math.max(12, window.innerWidth - rect.right);
      const estimatedHeight = 320;
      const spaceBelow = window.innerHeight - rect.bottom;
      const fitsBelow = spaceBelow >= estimatedHeight || spaceBelow >= rect.top;
      const top = fitsBelow ? rect.bottom + 6 : Math.max(12, rect.top - estimatedHeight - 6);
      setMenuCoords({ top, right });
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      updateMenuPosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    function handleScrollOrResize() {
      if (window.innerWidth < 640) return;
      updateMenuPosition();
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
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

  const menuContent = (
    <>
      {/* Edit Lead */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(false);
          setIsEditModalOpen(true);
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold text-left cursor-pointer transition-colors"
      >
        <Edit3 size={15} className="text-[#2D9E6B] shrink-0" />
        <span className="truncate">Edit Requirement</span>
      </button>

      {/* View Targeted & Notified Tutors */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(false);
          setIsTargetedModalOpen(true);
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-blue-50 text-blue-900 font-semibold text-left cursor-pointer transition-colors"
      >
        <Users size={15} className="text-blue-600 shrink-0" />
        <span className="truncate">Targeted Tutors &amp; Dispatch</span>
      </button>

      {/* View Audit & Edit History */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(false);
          setIsHistoryModalOpen(true);
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-indigo-50 text-indigo-900 font-semibold text-left cursor-pointer transition-colors"
      >
        <History size={15} className="text-indigo-600 shrink-0" />
        <span className="truncate">Activity &amp; Correction History</span>
      </button>

      {/* Expand Radius */}
      <button
        type="button"
        onClick={() => {
          runAction(() => forceRadiusExpandAction(lead.id));
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-emerald-900 font-semibold text-left cursor-pointer transition-colors"
      >
        <Maximize2 size={15} className="text-[#2D9E6B] shrink-0" />
        <span className="truncate">Expand Radius (+5km)</span>
      </button>

      {/* WhatsApp Parent */}
      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-emerald-800 font-semibold cursor-pointer transition-colors"
        >
          <MessageCircle size={15} className="text-[#2D9E6B] shrink-0" />
          <span className="truncate">WhatsApp Parent</span>
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
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-amber-50 text-amber-900 font-semibold text-left cursor-pointer transition-colors"
        >
          <X size={15} className="text-amber-600 shrink-0" />
          <span className="truncate">Force Close Lead</span>
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
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold text-left cursor-pointer transition-colors"
        >
          <Clock size={15} className="text-slate-500 shrink-0" />
          <span className="truncate">Force Expire Lead</span>
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
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-rose-50 text-rose-700 font-bold text-left cursor-pointer transition-colors"
          >
            <Trash2 size={15} className="text-rose-600 shrink-0" />
            <span className="truncate">Delete Lead</span>
          </button>
        </>
      )}
    </>
  );

  return (
    <div className="relative inline-flex items-center gap-1.5 sm:gap-2">
      {/* 1. Primary Edit Button */}
      <button
        type="button"
        onClick={() => setIsEditModalOpen(true)}
        className="inline-flex items-center justify-center gap-1 min-h-9 px-2 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0F2540] font-bold text-xs border border-slate-200 transition-colors shadow-2xs cursor-pointer"
        title="Edit Lead Requirement"
      >
        <Edit3 size={13} className="text-[#2D9E6B] shrink-0" />
        <span className="hidden sm:inline truncate">Edit</span>
      </button>

      {/* 2. Direct Send to Tutors Trigger */}
      <SendLeadToTutorModal
        leadId={lead.id}
        leadTitle={leadTitle}
        triggerClassName="inline-flex items-center justify-center gap-1 min-h-9 px-2 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#2D9E6B] to-[#1F8255] hover:from-[#238357] hover:to-[#186843] text-white text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
        triggerText="Send"
      />

      {/* 3. Actions Dropdown Toggle Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className="inline-flex items-center justify-center gap-1 min-h-9 px-2 sm:px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-2xs transition-colors cursor-pointer"
        title="More Lead Actions"
      >
        {isPending ? (
          <Loader2 size={13} className="animate-spin text-[#2D9E6B]" />
        ) : (
          <>
            <span className="hidden sm:inline truncate">Actions</span>
            <ChevronDown size={13} className={`shrink-0 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
          </>
        )}
      </button>

      {/* Floating Actions Menu / Mobile Bottom Sheet rendered via Portal */}
      {mounted &&
        isOpen &&
        createPortal(
          isMobile ? (
            /* Mobile Bottom Sheet */
            <div className="fixed inset-0 z-50 flex flex-col justify-end">
              <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
                onClick={() => setIsOpen(false)}
              />
              <div className="relative z-10 w-full max-h-[85vh] overflow-y-auto bg-white rounded-t-3xl border-t border-slate-200 shadow-2xl p-4 pb-8 space-y-1 animate-in slide-in-from-bottom duration-200 text-slate-800">
                <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 px-1">
                  <div className="min-w-0 pr-3">
                    <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">Lead Actions</p>
                    <p className="text-sm font-bold text-[#0F2540] truncate">
                      {getInquiryHashTag(lead)} · {leadTitle}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-0.5 text-xs">{menuContent}</div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-full mt-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs text-center transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Desktop Floating Menu anchored to button */
            <div
              ref={dropdownRef}
              style={{
                position: "fixed",
                top: `${menuCoords?.top ?? 0}px`,
                right: `${menuCoords?.right ?? 12}px`,
                zIndex: 50,
              }}
              className="w-60 rounded-2xl bg-white border border-slate-200 shadow-2xl p-1.5 space-y-0.5 text-xs animate-in fade-in zoom-in-95 duration-150 text-slate-800"
            >
              <div className="px-3 py-1.5 text-[10px] uppercase font-extrabold tracking-wider text-slate-400 border-b border-slate-100">
                Lead {getInquiryHashTag(lead)} Actions
              </div>
              {menuContent}
            </div>
          ),
          document.body
        )}

      {/* Edit Lead Modal */}
      <EditLeadModal
        lead={lead}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      {/* Lead History & Correction Modal */}
      <LeadHistoryModal
        leadId={lead.id}
        leadCode={getInquiryDisplayCode(lead)}
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />

      {/* Targeted & Notified Tutors Modal */}
      <TargetedTutorsModal
        leadId={lead.id}
        leadCode={getInquiryDisplayCode(lead)}
        leadTitle={leadTitle}
        isOpen={isTargetedModalOpen}
        onClose={() => setIsTargetedModalOpen(false)}
      />

      {/* Confirmation Dialog */}
      {mounted &&
        confirmDialog &&
        createPortal(
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
          </div>,
          document.body
        )}
    </div>
  );
}
