"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  Edit3,
  MoreVertical,
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
  Check,
} from "lucide-react";
import {
  suspendUserAction,
  reactivateUserAction,
  adminResetUserPasswordAction,
  adminDeleteUserAction,
  adminToggleUserTopupAction,
} from "@/app/actions/admin.actions";
import { toggleTutorMarketingNotifsAction } from "@/app/actions/tutor.actions";

interface UserRowActionsProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    phone?: string | null;
    isActive: boolean;
    tutorProfile?: {
      kycStatus: string;
      averageRating: number;
      marketingNotifsEnabled?: boolean;
      canTopup?: boolean;
    } | null;
  };
}

export function UserRowActions({ user }: UserRowActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
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

  const whatsappUrl = user.phone
    ? `https://wa.me/91${user.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hello ${user.name || "User"}! Greeting from ApnaTutorHub Admin Team.`
      )}`
    : null;

  return (
    <div className="relative inline-flex items-center gap-2" ref={menuRef}>
      {/* Primary Edit Button */}
      <Link
        href={`/admin/users/${user.id}/edit`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0F2540] font-bold text-xs border border-slate-200 transition-colors shadow-2xs"
      >
        <Edit3 size={13} className="text-[#2D9E6B]" />
        <span>Edit</span>
      </Link>

      {/* Actions Dropdown Toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-2xs transition-colors cursor-pointer"
        title="More Account Actions"
      >
        {isPending ? (
          <Loader2 size={13} className="animate-spin text-[#2D9E6B]" />
        ) : (
          <>
            <span>Actions</span>
            <ChevronDown size={13} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </>
        )}
      </button>

      {/* Floating Actions Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-9 z-40 w-56 rounded-2xl bg-white border border-slate-200 shadow-2xl p-1.5 space-y-0.5 text-xs animate-in fade-in zoom-in-95 duration-150 text-slate-800">
          <div className="px-3 py-1.5 text-[10px] uppercase font-extrabold tracking-wider text-slate-400 border-b border-slate-100">
            Account Management
          </div>

          {/* WhatsApp Direct */}
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-emerald-50 text-emerald-800 font-semibold cursor-pointer transition-colors"
            >
              <MessageCircle size={14} className="text-[#2D9E6B]" />
              <span>WhatsApp Message</span>
            </a>
          )}

          {/* Edit Full Profile */}
          <Link
            href={`/admin/users/${user.id}/edit`}
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer transition-colors"
          >
            <Edit3 size={14} className="text-slate-500" />
            <span>Edit Full Profile</span>
          </Link>

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
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-amber-50 text-amber-800 font-semibold text-left cursor-pointer transition-colors"
            >
              <Lock size={14} className="text-amber-600" />
              <span>Suspend Account</span>
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
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-emerald-50 text-emerald-800 font-semibold text-left cursor-pointer transition-colors"
            >
              <Unlock size={14} className="text-[#2D9E6B]" />
              <span>Reactivate Account</span>
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
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-amber-50 text-amber-800 font-semibold text-left cursor-pointer transition-colors"
                >
                  <Coins size={14} className="text-amber-600" />
                  <span>Restrict Coin Top-Up</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => runAction(() => adminToggleUserTopupAction(user.id, true))}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-emerald-50 text-emerald-800 font-semibold text-left cursor-pointer transition-colors"
                >
                  <Coins size={14} className="text-[#2D9E6B]" />
                  <span>Allow Coin Top-Up</span>
                </button>
              )}

              {/* Toggle Marketing Notifications */}
              {user.tutorProfile.marketingNotifsEnabled !== false ? (
                <button
                  type="button"
                  onClick={() => runAction(() => toggleTutorMarketingNotifsAction(user.id, false))}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold text-left cursor-pointer transition-colors"
                >
                  <BellOff size={14} className="text-slate-500" />
                  <span>Opt Out Notifications</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => runAction(() => toggleTutorMarketingNotifsAction(user.id, true))}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-emerald-50 text-emerald-800 font-semibold text-left cursor-pointer transition-colors"
                >
                  <Bell size={14} className="text-[#2D9E6B]" />
                  <span>Enable Notifications</span>
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
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold text-left cursor-pointer transition-colors"
          >
            <KeyRound size={14} className="text-slate-500" />
            <span>Reset Password</span>
          </button>

          {/* Delete User */}
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
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-700 font-bold text-left cursor-pointer transition-colors"
          >
            <Trash2 size={14} className="text-rose-600" />
            <span>Delete User</span>
          </button>
        </div>
      )}

      {/* Confirmation Modal Dialog */}
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
