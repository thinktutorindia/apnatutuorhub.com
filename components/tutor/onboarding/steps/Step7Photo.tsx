"use client";

import React, { useState, useRef } from "react";
import { Camera, ArrowLeft, Loader2, CheckCircle, Upload } from "lucide-react";
import Image from "next/image";

interface Props {
  formData: { photoUrl: string };
  onNext: (data: { photoUrl: string }) => void;
  onBack: () => void;
  isLoading: boolean;
  profileId: string;
}

const MAX_SIZE_MB = 2;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];

import { ImageCropModal } from "@/components/ui/ImageCropModal";

export function Step7Photo({ formData, onNext, onBack, isLoading, profileId }: Props) {
  const [photoUrl, setPhotoUrl] = useState(formData.photoUrl || "");
  const [preview, setPreview] = useState<string>(formData.photoUrl || "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploaded, setUploaded] = useState(!!formData.photoUrl);

  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("Only JPG, JPEG, and PNG files are allowed.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploadError(`File must be less than ${MAX_SIZE_MB}MB.`);
      return;
    }

    // Open crop modal with raw selected image
    const localUrl = URL.createObjectURL(file);
    setRawImageSrc(localUrl);
    setCropModalOpen(true);

    // Reset file input so re-selecting same file triggers onChange
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleCropComplete(croppedBlob: Blob) {
    setCropModalOpen(false);

    // Show local cropped preview immediately
    const croppedUrl = URL.createObjectURL(croppedBlob);
    setPreview(croppedUrl);

    setUploading(true);
    try {
      // Get presigned URL from API for cropped image
      const res = await fetch("/api/upload/presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType: "selfie",
          contentType: "image/jpeg",
          fileSize: croppedBlob.size,
          tutorProfileId: profileId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to get upload URL");
      }

      const { uploadUrl, objectKey } = await res.json();

      // Upload cropped blob to storage
      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: croppedBlob,
      });

      // Build public URL
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const publicUrl = objectKey.startsWith("http")
        ? objectKey
        : `${supabaseUrl}/storage/v1/object/public/kyc-documents/${objectKey}`;
      setPhotoUrl(publicUrl);
      setUploaded(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed. Please try again.";
      setUploadError(message);
      setPreview(formData.photoUrl || "");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit() {
    // Photo is optional - tutors can add it from profile later
    onNext({ photoUrl });
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-pink-50 flex items-center justify-center mx-auto">
          <Camera size={28} className="text-pink-500" />
        </div>
        <p className="text-gray-600 text-sm leading-relaxed max-w-sm mx-auto">
          Pictures are the first things people notice. Having a good one helps your chances of getting hired by <strong>double</strong>.
        </p>
      </div>

      {/* Photo preview */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gray-100 flex items-center justify-center">
          {preview ? (
            <Image src={preview} alt="Profile photo" fill className="object-cover" sizes="128px" unoptimized />
          ) : (
            <Camera size={40} className="text-gray-300" />
          )}
          {uploaded && !uploading && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <CheckCircle size={28} className="text-white" />
            </div>
          )}
        </div>

        {/* Upload button */}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="px-6 py-2.5 rounded-2xl bg-[#1A3C5E] text-white text-sm font-700 flex items-center gap-2 hover:bg-[#15304f] transition-all disabled:opacity-60 cursor-pointer"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? "Uploading..." : uploaded ? "Change Photo" : "Select a File"}
        </button>

        {uploaded && !uploading && (
          <p className="text-xs text-[#2D9E6B] font-700 flex items-center gap-1.5">
            <CheckCircle size={14} /> Photo uploaded successfully!
          </p>
        )}
        {uploadError && <p className="text-xs text-red-600 font-600 text-center">{uploadError}</p>}
      </div>

      {/* Guidelines */}
      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 space-y-1.5">
        <p className="text-xs font-800 text-gray-700 flex items-center gap-1.5">
          <Camera size={14} className="text-pink-500" />
          <span>Photo Guidelines:</span>
        </p>
        {[
          "File Size: Maximum 2MB",
          "Format: JPG, JPEG, PNG",
          "Clearly visible face - smiling faces are always attractive",
          "Shall not be a very old, morphed or scanned photo",
          "A good photograph makes a profile look alive",
        ].map((g, i) => (
          <p key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
            <span className="text-[#2D9E6B] shrink-0 font-bold">•</span>
            <span>{g}</span>
          </p>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onBack} disabled={isLoading || uploading} className="flex-1 h-12 rounded-2xl border-2 border-gray-200 bg-white text-gray-600 font-700 text-sm flex items-center justify-center gap-2 hover:border-gray-300 transition-all cursor-pointer">
          <ArrowLeft size={16} /> Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || uploading}
          className="flex-[2] h-12 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white font-800 text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-lg disabled:opacity-60 cursor-pointer"
        >
          {isLoading ? <><Loader2 size={16} className="animate-spin" /> Completing...</> : <><CheckCircle size={16} /> Complete Profile & View Plans</>}
        </button>
      </div>

      <p className="text-center text-xs text-gray-400">You can skip the photo and add it later from your profile.</p>

      {cropModalOpen && rawImageSrc && (
        <ImageCropModal
          imageSrc={rawImageSrc}
          onCropComplete={handleCropComplete}
          onClose={() => setCropModalOpen(false)}
        />
      )}
    </div>
  );
}
