"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Shield,
  Upload,
  X,
} from "lucide-react";
import { submitKYCAction, type KycState } from "@/app/actions/kyc.actions";
import { FieldError, FormAlert } from "@/components/ui/FieldError";

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
    bg: "#E0F2FE",
  },
  {
    key: "kycAddressUrl",
    docType: "address-proof",
    label: "Address Proof",
    hint: "Utility bill, bank statement, or Aadhaar (JPG/PNG/PDF, max 5 MB)",
    bg: "#DCFCE7",
  },
  {
    key: "kycSelfieUrl",
    docType: "selfie",
    label: "Live Selfie",
    hint: "Clear selfie holding your Government ID card (JPG/PNG, max 5 MB)",
    bg: "#FEF3C7",
  },
];

type UploadStatus = "idle" | "uploading" | "done" | "error";

type DocState = {
  objectKey: string;
  status: UploadStatus;
  error: string | null;
  filename: string | null;
};

const emptyDoc = (): DocState => ({
  objectKey: "",
  status: "idle",
  error: null,
  filename: null,
});

export function KYCUploadModal({
  existingKeys,
  onClose,
}: {
  existingKeys: {
    kycIdProofUrl: string | null;
    kycAddressUrl: string | null;
    kycSelfieUrl: string | null;
  };
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
      setTimeout(onClose, 1500);
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
          error: "File exceeds 5 MB limit.",
        },
      }));
      return;
    }

    setDocs((prev) => ({
      ...prev,
      [field.key]: { ...prev[field.key], status: "uploading", error: null, filename: file.name },
    }));

    try {
      // Step 1 — Get a presigned URL from our API
      const resp = await fetch("/api/upload/presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType: field.docType,
          contentType: file.type,
        }),
      });

      if (!resp.ok) {
        const body = (await resp.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to get upload URL");
      }

      const { uploadUrl, objectKey } = (await resp.json()) as {
        uploadUrl: string;
        objectKey: string;
      };

      // Step 2 — PUT directly to S3
      const uploadResp = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResp.ok) {
        throw new Error("Upload to S3 failed.");
      }

      setDocs((prev) => ({
        ...prev,
        [field.key]: { objectKey, status: "done", error: null, filename: file.name },
      }));
    } catch (err) {
      setDocs((prev) => ({
        ...prev,
        [field.key]: {
          ...prev[field.key],
          status: "error",
          error: err instanceof Error ? err.message : "Upload failed.",
        },
      }));
    }
  };

  const allDone = DOC_FIELDS.every(
    (f) =>
      docs[f.key].objectKey.length > 0 &&
      docs[f.key].status !== "error"
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0F172A]/40 p-4 py-10 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close dialog"
        className="fixed inset-0 cursor-default"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="kyc-modal-title"
        className="neu-card relative z-10 w-full max-w-xl bg-white p-6"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#0F172A] bg-[#DCFCE7]">
              <Shield size={20} />
            </div>
            <div>
              <h2
                id="kyc-modal-title"
                className="text-xl font-black text-[#0F172A]"
              >
                KYC Verification
              </h2>
              <p className="text-[11px] font-semibold text-slate-500">
                Documents stored securely in private AWS S3 · Admin-reviewed within 24 hours
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="neu-btn neu-btn-white h-9 w-9 !p-0"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {kycState.error && (
          <FormAlert tone="error" message={kycState.error} />
        )}
        {kycState.success && (
          <FormAlert
            tone="success"
            message="Documents submitted! We'll review them within 24 hours."
          />
        )}

        {/* Upload slots */}
        <div className="space-y-4">
          {DOC_FIELDS.map((field) => {
            const doc = docs[field.key];
            const isUploading = doc.status === "uploading";
            const isDone = doc.objectKey && doc.status !== "error";

            return (
              <div
                key={field.key}
                className="rounded-2xl border-[2.5px] border-[#0F172A] p-4"
                style={{ backgroundColor: field.bg }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-extrabold text-[#0F172A]">
                      {field.label}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-600">
                      {field.hint}
                    </p>
                  </div>
                  {isDone && (
                    <CheckCircle2
                      size={18}
                      className="shrink-0 text-[#22C55E]"
                    />
                  )}
                </div>

                {doc.error && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-red-500">
                    <AlertCircle size={13} />
                    <span>{doc.error}</span>
                  </div>
                )}

                {doc.filename && doc.status === "done" && (
                  <p className="mt-2 text-[11px] font-bold text-[#22C55E]">
                    ✓ {doc.filename}
                  </p>
                )}

                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRefs.current[field.key]?.click()}
                  className={`mt-3 neu-btn neu-btn-white w-full py-2 text-xs ${
                    isUploading ? "opacity-60" : ""
                  }`}
                >
                  <Upload size={14} />
                  <span>
                    {isUploading
                      ? "Uploading..."
                      : isDone
                        ? "Replace file"
                        : "Choose file"}
                  </span>
                </button>

                <input
                  ref={(el) => {
                    fileInputRefs.current[field.key] = el;
                  }}
                  type="file"
                  accept={ACCEPTED}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(field, file);
                    e.target.value = "";
                  }}
                />

                <FieldError
                  messages={kycState.fieldErrors?.[field.key]}
                />
              </div>
            );
          })}
        </div>

        {/* Submit — sends the S3 object keys via a Server Action */}
        <form action={formAction} className="mt-6 space-y-4">
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
            <p className="text-center text-[11px] font-bold text-slate-500">
              Upload all 3 documents to enable submission.
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isPending || !allDone}
              className="neu-btn neu-btn-primary flex-1 py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Shield size={16} />
              <span>{isPending ? "Submitting..." : "Submit for Verification"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="neu-btn neu-btn-white px-6 py-3.5 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
