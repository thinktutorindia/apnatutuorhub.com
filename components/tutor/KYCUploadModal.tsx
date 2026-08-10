"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Shield,
  Upload,
  X,
  Loader2,
  Zap,
} from "lucide-react";
import { submitKYCAction, type KycState } from "@/app/actions/kyc.actions";
import { FieldError, FormAlert } from "@/components/ui/FieldError";
import { ActionOverlay } from "@/components/ui/LoadingState";
import { compressFile, formatFileSize } from "@/lib/compression";

const initialState: KycState = { success: false };

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED = ".jpg,.jpeg,.png,.pdf";

type DocField = {
  key: "kycIdProofUrl" | "kycAddressUrl" | "kycSelfieUrl";
  docType: string;
  label: string;
  hint: string;
  bg: string;
};

const DOC_FIELDS: DocField[] = [
  {
    key: "kycIdProofUrl",
    docType: "id-proof",
    label: "Government ID Proof",
    hint: "Aadhaar card, PAN card, or Passport (JPG/PNG/PDF, max 5 MB)",
    bg: "bg-blue-50/80 border-blue-200/80",
  },
  {
    key: "kycAddressUrl",
    docType: "address-proof",
    label: "Address Proof",
    hint: "Utility bill, bank statement, or Aadhaar (JPG/PNG/PDF, max 5 MB)",
    bg: "bg-emerald-50/80 border-emerald-200/80",
  },
  {
    key: "kycSelfieUrl",
    docType: "selfie",
    label: "Live Selfie",
    hint: "Clear selfie holding your Government ID card (JPG/PNG, max 5 MB)",
    bg: "bg-amber-50/80 border-amber-200/80",
  },
];

type UploadStatus = "idle" | "compressing" | "uploading" | "done" | "error";

type DocState = {
  objectKey: string;
  status: UploadStatus;
  progress: number;
  error: string | null;
  filename: string | null;
  savedPercent: number | null;
  originalSizeKB: number | null;
  compressedSizeKB: number | null;
};

const emptyDoc = (): DocState => ({
  objectKey: "",
  status: "idle",
  progress: 0,
  error: null,
  filename: null,
  savedPercent: null,
  originalSizeKB: null,
  compressedSizeKB: null,
});

export function KYCUploadModal({
  existingKeys,
  rejectionNote,
  onClose,
}: {
  existingKeys: {
    kycIdProofUrl: string | null;
    kycAddressUrl: string | null;
    kycSelfieUrl: string | null;
  };
  rejectionNote?: string | null;
  onClose: () => void;
}) {
  const [kycState, formAction, isPending] = useActionState(
    submitKYCAction,
    initialState
  );

  const [docs, setDocs] = useState<Record<string, DocState>>({
    kycIdProofUrl: { ...emptyDoc(), objectKey: existingKeys.kycIdProofUrl ?? "" },
    kycAddressUrl: { ...emptyDoc(), objectKey: existingKeys.kycAddressUrl ?? "" },
    kycSelfieUrl: { ...emptyDoc(), objectKey: existingKeys.kycSelfieUrl ?? "" },
  });

  useEffect(() => {
    if (kycState.success) {
      setTimeout(onClose, 1200);
    }
  }, [kycState.success, onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileSelect = async (field: DocField, file: File) => {
    if (file.size > MAX_BYTES) {
      setDocs((prev) => ({
        ...prev,
        [field.key]: {
          ...prev[field.key],
          status: "error",
          progress: 0,
          error: "File exceeds 5 MB limit.",
          savedPercent: null,
          originalSizeKB: null,
          compressedSizeKB: null,
        },
      }));
      return;
    }

    // ── Stage 1: Compressing ──────────────────────────────────────────────
    setDocs((prev) => ({
      ...prev,
      [field.key]: {
        ...prev[field.key],
        status: "compressing",
        progress: 15,
        error: null,
        filename: file.name,
        savedPercent: null,
        originalSizeKB: null,
        compressedSizeKB: null,
      },
    }));

    let fileToUpload = file;
    let savedPercent = 0;
    let originalSizeKB = file.size / 1024;
    let compressedSizeKB = originalSizeKB;

    try {
      const result = await compressFile(file);
      fileToUpload = result.file;
      savedPercent = result.savedPercent;
      originalSizeKB = result.originalSizeKB;
      compressedSizeKB = result.compressedSizeKB;
    } catch {
      // Fallback: upload original
    }

    // ── Stage 2: Uploading ────────────────────────────────────────────────
    setDocs((prev) => ({
      ...prev,
      [field.key]: {
        ...prev[field.key],
        status: "uploading",
        progress: 45,
        savedPercent,
        originalSizeKB,
        compressedSizeKB,
      },
    }));

    try {
      const resp = await fetch("/api/upload/presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType: field.docType,
          contentType: fileToUpload.type,
        }),
      });

      if (!resp.ok) {
        throw new Error("Failed to get upload URL");
      }

      setDocs((prev) => ({
        ...prev,
        [field.key]: { ...prev[field.key], progress: 70 },
      }));

      const { uploadUrl, objectKey } = await resp.json();

      const uploadResp = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": fileToUpload.type },
        body: fileToUpload,
      });

      if (!uploadResp.ok) {
        throw new Error("Upload failed. Please try again.");
      }

      setDocs((prev) => ({
        ...prev,
        [field.key]: {
          objectKey,
          status: "done",
          progress: 100,
          error: null,
          filename: file.name,
          savedPercent,
          originalSizeKB,
          compressedSizeKB,
        },
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setDocs((prev) => ({
        ...prev,
        [field.key]: {
          ...prev[field.key],
          status: "error",
          progress: 0,
          error: message,
        },
      }));
    }
  };

  const allDone = Boolean(
    docs.kycIdProofUrl.objectKey &&
      docs.kycAddressUrl.objectKey &&
      docs.kycSelfieUrl.objectKey
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop overlay click handler */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="kyc-modal-title"
        className="relative z-10 w-full max-w-xl bg-white rounded-3xl border border-gray-100 shadow-2xl p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#2D9E6B] flex items-center justify-center shrink-0">
              <Shield size={20} />
            </div>
            <div>
              <h2
                id="kyc-modal-title"
                className="text-xl font-800 text-gray-900 tracking-tight"
              >
                KYC Verification Upload
              </h2>
              <p className="text-xs text-gray-500 font-500">
                Documents stored securely in private storage · Reviewed within 24 hours
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {rejectionNote && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-950 space-y-1">
            <p className="font-800 text-red-800 uppercase tracking-wider text-[10px]">
              Admin Rejection Reason — Please Re-upload Updated Document(s):
            </p>
            <p className="font-600">&quot;{rejectionNote}&quot;</p>
          </div>
        )}

        {kycState.error && (
          <FormAlert tone="error" message={kycState.error} />
        )}
        {kycState.success && (
          <FormAlert
            tone="success"
            message="Documents submitted! We will review them within 24 hours."
          />
        )}

        {/* Upload slots */}
        <div className="space-y-3">
          {DOC_FIELDS.map((field) => {
            const doc = docs[field.key];
            const isCompressing = doc.status === "compressing";
            const isUploading = doc.status === "uploading";
            const isBusy = isCompressing || isUploading;
            const isDone = Boolean(doc.objectKey && doc.status !== "error");

            return (
              <div
                key={field.key}
                className={`p-4 rounded-2xl border transition-all ${field.bg}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-800 text-gray-900">
                      {field.label}
                    </p>
                    <p className="text-[11px] font-500 text-gray-600">
                      {field.hint}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {isDone && (
                      <span className="inline-flex items-center gap-1 text-xs font-700 text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 size={13} /> Uploaded
                      </span>
                    )}
                    {isDone && doc.savedPercent !== null && doc.savedPercent > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-700 text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                        <Zap size={10} className="text-blue-500" />
                        {doc.savedPercent}% smaller · {Math.round(doc.compressedSizeKB!)} KB
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="file"
                    accept={ACCEPTED}
                    ref={(el) => {
                      fileInputRefs.current[field.key] = el;
                    }}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelect(field, f);
                    }}
                  />

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => fileInputRefs.current[field.key]?.click()}
                    className="px-4 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-xs font-700 text-gray-800 flex items-center gap-2 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    {isCompressing ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-blue-500" />
                        <span>Compressing...</span>
                      </>
                    ) : isUploading ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-[#2D9E6B]" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        <span>{isDone ? "Replace File" : "Choose File"}</span>
                      </>
                    )}
                  </button>

                  {doc.filename && (
                    <span className="text-xs font-600 text-gray-600 truncate max-w-[200px]">
                      {doc.filename}
                    </span>
                  )}
                </div>

                {doc.error && (
                  <p className="mt-2 text-xs font-600 text-red-600 flex items-center gap-1">
                    <AlertCircle size={13} /> {doc.error}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Submit action */}
        <form action={formAction} className="pt-3 border-t border-gray-100 space-y-3">
          <input
            type="hidden"
            name="kycIdProofUrl"
            value={docs.kycIdProofUrl.objectKey}
          />
          <input
            type="hidden"
            name="kycAddressUrl"
            value={docs.kycAddressUrl.objectKey}
          />
          <input
            type="hidden"
            name="kycSelfieUrl"
            value={docs.kycSelfieUrl.objectKey}
          />

          {!allDone && (
            <p className="text-center text-xs font-600 text-gray-500">
              Please upload all 3 documents to submit for verification.
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-5 py-2.5 rounded-2xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !allDone}
              className="px-6 py-2.5 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-xs font-700 flex items-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin text-white" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Shield size={16} />
                  <span>Submit for Verification</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
