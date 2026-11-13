"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Edit3,
  Send,
  ChevronDown,
  Lock,
  Unlock,
  KeyRound,
  Trash2,
  Coins,
  Bell,
  BellOff,
  MessageCircle,
  ShieldAlert,
  Loader2,
  AlertTriangle,
  Check,
  X,
} from "lucide-react";
import {
  suspendUserAction,
  reactivateUserAction,
  adminResetUserPasswordAction,
  adminDeleteUserAction,
  adminToggleUserTopupAction,
  adminToggleIncompleteUserAction,
} from "@/app/actions/admin.actions";
import { toggleTutorMarketingNotifsAction } from "@/app/actions/tutor.actions";

interface UserRowActionsProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    phone?: string | null;
    isActive: boolean;
    customPermissions?: string[] | null;
    tutorProfile?: {
      kycStatus: string;
      averageRating: number;
      marketingNotifsEnabled?: boolean;
      canTopup?: boolean;
    } | null;
  };
  isSuperAdmin?: boolean;
}

export function UserRowActions({ user, isSuperAdmin = false }: UserRowActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
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
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const updateMenuPosition = () => {
    if (typeof window === "undefined") return;
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    if (!mobile && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 260;
      const right = Math.max(12, Math.min(window.innerWidth - menuWidth - 12, window.innerWidth - rect.right));
      const estimatedHeight = 380;
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

  // Close dropdown on outside click (for desktop floating menu)
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

  const whatsappUrl = user.phone
    ? `https://wa.me/91${user.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hello ${user.name || "User"}! Greeting from ApnaTutorHub Admin Team.`
      )}`
    : null;

  const actionBtnClass =
    "inline-flex items-center justify-center gap-1 min-h-9 px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl font-bold text-[11px] sm:text-xs border shadow-2xs transition-colors cursor-pointer";

  // Menu action items list (shared between desktop floating popover and mobile bottom sheet)
  const menuContent = (
    <>
      {/* WhatsApp Direct (Super Admin Only) */}
      {whatsappUrl && isSuperAdmin && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-emerald-800 font-semibold cursor-pointer transition-colors"
        >
          <MessageCircle size={15} className="text-[#2D9E6B] shrink-0" />
          <span className="whitespace-nowrap flex-1 text-left">WhatsApp Message</span>
        </a>
      )}

      {/* Edit Full Profile */}
      <Link
        href={`/admin/users/${user.id}/edit`}
        onClick={() => setIsOpen(false)}
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer transition-colors"
      >
        <Edit3 size={15} className="text-slate-500 shrink-0" />
        <span className="whitespace-nowrap flex-1 text-left">Edit Full Profile</span>
      </Link>

      {/* Toggle Incomplete User Status */}
      {user.customPermissions?.includes("tag:incomplete") ? (
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setConfirmDialog({
              title: "Mark as Complete User",
              message: `Remove the Incomplete User tag for ${user.name || user.email}? This will mark their profile as complete in the user directory.`,
              action: () => adminToggleIncompleteUserAction(user.id, false),
            });
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-emerald-800 font-semibold text-left cursor-pointer transition-colors"
        >
          <Check size={15} className="text-emerald-600 shrink-0" />
          <span className="whitespace-nowrap flex-1 text-left">Mark as Complete (Untag)</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setConfirmDialog({
              title: "Tag as Incomplete User",
              message: `Tag ${user.name || user.email} as Incomplete User? They will be highlighted in amber and selectable via the Incomplete Users filter.`,
              action: () => adminToggleIncompleteUserAction(user.id, true, "Marked incomplete via quick action"),
              danger: true,
            });
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-amber-50 text-amber-800 font-semibold text-left cursor-pointer transition-colors"
        >
          <AlertTriangle size={15} className="text-amber-600 shrink-0" />
          <span className="whitespace-nowrap flex-1 text-left">Tag as Incomplete User</span>
        </button>
      )}

      {/* Suspend / Reactivate */}
      {user.isActive ? (
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setConfirmDialog({
              title: "Suspend User Account",
              message: `Are you sure you want to suspend ${user.name || user.email}? Their login access will be disabled until reactivated.`,
              action: () => suspendUserAction(user.id),
              danger: true,
            });
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-amber-50 text-amber-800 font-semibold text-left cursor-pointer transition-colors"
        >
          <Lock size={15} className="text-amber-600 shrink-0" />
          <span className="whitespace-nowrap flex-1 text-left">Suspend Account</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setConfirmDialog({
              title: "Reactivate User Account",
              message: `Reactivate account for ${user.name || user.email}? Their login access will be restored immediately.`,
              action: () => reactivateUserAction(user.id),
            });
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-emerald-800 font-semibold text-left cursor-pointer transition-colors"
        >
          <Unlock size={15} className="text-[#2D9E6B] shrink-0" />
          <span className="whitespace-nowrap flex-1 text-left">Reactivate Account</span>
        </button>
      )}

      {/* Tutor Specific Privileges */}
      {user.tutorProfile && (
        <>
          <div className="my-1 border-t border-slate-100" />

          {/* Toggle Top-Up Access */}
          {user.tutorProfile.canTopup !== false ? (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setConfirmDialog({
                  title: "Restrict Wallet Top-Up",
                  message: `Restrict coin top-up access for ${user.name || user.email}?`,
                  action: () => adminToggleUserTopupAction(user.id, false),
                  danger: true,
                });
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-amber-50 text-amber-800 font-semibold text-left cursor-pointer transition-colors"
            >
              <Coins size={15} className="text-amber-600 shrink-0" />
              <span className="whitespace-nowrap flex-1 text-left">Restrict Coin Top-Up</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => runAction(() => adminToggleUserTopupAction(user.id, true))}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-emerald-800 font-semibold text-left cursor-pointer transition-colors"
            >
              <Coins size={15} className="text-[#2D9E6B] shrink-0" />
              <span className="whitespace-nowrap flex-1 text-left">Allow Coin Top-Up</span>
            </button>
          )}

          {/* Toggle Marketing Notifications */}
          {user.tutorProfile.marketingNotifsEnabled !== false ? (
            <button
              type="button"
              onClick={() => runAction(() => toggleTutorMarketingNotifsAction(user.id, false))}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold text-left cursor-pointer transition-colors"
            >
              <BellOff size={15} className="text-slate-500 shrink-0" />
              <span className="whitespace-nowrap flex-1 text-left">Opt Out Notifications</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => runAction(() => toggleTutorMarketingNotifsAction(user.id, true))}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-emerald-800 font-semibold text-left cursor-pointer transition-colors"
            >
              <Bell size={15} className="text-[#2D9E6B] shrink-0" />
              <span className="whitespace-nowrap flex-1 text-left">Enable Notifications</span>
            </button>
          )}
        </>
      )}

      <div className="my-1 border-t border-slate-100" />

      {/* Reset Password */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(false);
          setConfirmDialog({
            title: "Reset Password to 12345678",
            message: `Reset password for ${user.email} to default '12345678'?`,
            action: () => adminResetUserPasswordAction(user.id),
          });
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold text-left cursor-pointer transition-colors"
      >
        <KeyRound size={15} className="text-slate-500 shrink-0" />
        <span className="whitespace-nowrap flex-1 text-left">Reset Password</span>
      </button>

      {/* Delete User (Super Admin Only) */}
      {isSuperAdmin && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setConfirmDialog({
              title: "Permanently Delete User",
              message: `Are you sure you want to PERMANENTLY DELETE ${user.name || user.email}? All associated data, bookings, and profiles will be erased. This action CANNOT be undone.`,
              action: () => adminDeleteUserAction(user.id),
              danger: true,
            });
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-rose-50 text-rose-700 font-bold text-left cursor-pointer transition-colors"
        >
          <Trash2 size={15} className="text-rose-600 shrink-0" />
          <span className="whitespace-nowrap flex-1 text-left">Delete User</span>
        </button>
      )}
    </>
  );

  return (
    <div className="relative w-full sm:w-auto min-w-0">
      {/* Action Buttons in Table Row */}
      <div className="grid grid-cols-3 gap-1 sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-1.5">
        <Link
          href={`/admin/users/${user.id}/edit`}
          className={`${actionBtnClass} bg-slate-100 hover:bg-slate-200 text-[#0F2540] border-slate-200`}
          title={`Edit ${user.name || "User"}`}
        >
          <Edit3 size={13} className="text-[#2D9E6B] shrink-0" />
          <span className="hidden sm:inline truncate">Edit</span>
        </Link>

        <Link
          href={`/admin/users/${user.id}/edit?channel=WHATSAPP#admin-notify`}
          className={`${actionBtnClass} bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200`}
          title="Send notification (WhatsApp, email, in-app)"
        >
          <Send size={13} className="text-[#2D9E6B] shrink-0" />
          <span className="hidden sm:inline truncate">Send</span>
        </Link>

        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          className={`${actionBtnClass} bg-white hover:bg-slate-50 text-slate-700 border-slate-200 cursor-pointer`}
          title="More Account Actions"
        >
          {isPending ? (
            <Loader2 size={13} className="animate-spin text-[#2D9E6B]" />
          ) : (
            <>
              <span className="hidden sm:inline truncate">Actions</span>
              <ChevronDown size={13} className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </>
          )}
        </button>
      </div>

      {/* Floating Actions Menu / Mobile Bottom Sheet rendered via Portal to escape table stacking context */}
      {mounted &&
        isOpen &&
        createPortal(
          isMobile ? (
            /* Mobile Bottom Sheet Drawer */
            <div className="fixed inset-0 z-[9999] flex flex-col justify-end isolate">
              {/* Dark backdrop */}
              <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
                onClick={() => setIsOpen(false)}
              />
              {/* Slide-up Sheet */}
              <div className="relative z-10 w-full max-h-[85vh] overflow-y-auto bg-white rounded-t-3xl border-t border-slate-200 shadow-2xl p-4 pb-8 space-y-1 animate-in slide-in-from-bottom duration-200 text-slate-800">
                {/* Drag pill */}
                <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
                {/* Header */}
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 px-1">
                  <div className="min-w-0 pr-3">
                    <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">Account Management</p>
                    <p className="text-sm font-bold text-[#0F2540] truncate">{user.name || user.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    aria-label="Close menu"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Full-width action items */}
                <div className="space-y-0.5 text-xs">{menuContent}</div>

                {/* Cancel button */}
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
            <>
              <div
                className="fixed inset-0 z-[9998] bg-transparent"
                onClick={() => setIsOpen(false)}
              />
              <div
                ref={dropdownRef}
                style={{
                  position: "fixed",
                  top: `${menuCoords?.top ?? 0}px`,
                  right: `${menuCoords?.right ?? 12}px`,
                  zIndex: 9999,
                }}
                className="w-64 min-w-[260px] rounded-2xl bg-white border border-slate-200 shadow-2xl p-1.5 space-y-0.5 text-xs animate-in fade-in zoom-in-95 duration-150 text-slate-800 isolate"
              >
                <div className="px-3 py-1.5 text-[10px] uppercase font-extrabold tracking-wider text-slate-400 border-b border-slate-100">
                  Account Management
                </div>
                {menuContent}
              </div>
            </>
          ),
          document.body
        )}

      {/* Confirmation Modal Dialog rendered via Portal */}
      {mounted &&
        confirmDialog &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
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
