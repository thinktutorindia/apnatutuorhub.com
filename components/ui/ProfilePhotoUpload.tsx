"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Camera, Trash2, Loader2, Upload, Sparkles, User } from "lucide-react";
import { ImageCropModal } from "@/components/ui/ImageCropModal";
import { getMediaUrl } from "@/lib/s3";

interface ProfilePhotoUploadProps {
  name?: string;
  value?: string | null;
  onChange?: (url: string) => void;
  docType?: "avatar" | "student-avatar";
  fallbackName?: string;
  showPresets?: boolean;
  label?: string;
}

const PRESET_AVATARS = [
  { label: "Boy 1", icon: "👦" },
  { label: "Girl 1", icon: "👧" },
  { label: "Student", icon: "🧑‍🎓" },
  { label: "Smart", icon: "🤓" },
  { label: "Science", icon: "🧪" },
  { label: "Art", icon: "🎨" },
  { label: "Rocket", icon: "🚀" },
];

export function ProfilePhotoUpload({
  name = "image",
  value = "",
  onChange,
  docType = "avatar",
  fallbackName = "User",
  showPresets = false,
  label = "Profile Photo",
}: ProfilePhotoUploadProps) {
  const initialUrl = getMediaUrl(value) || value || "";
  const [photoUrl, setPhotoUrl] = useState<string>(initialUrl);
  const [preview, setPreview] = useState<string>(initialUrl);
  const [imgError, setImgError] = useState<boolean>(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const updated = getMediaUrl(value) || value || "";
    setPhotoUrl(updated);
    setPreview(updated);
    setImgError(false);
  }, [value]);

  const isEmojiAvatar = photoUrl && photoUrl.length <= 4 && !photoUrl.startsWith("http") && !photoUrl.startsWith("/api");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please select a valid image (JPG, PNG, or WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be under 5 MB.");
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setRawImageSrc(localUrl);
    setCropModalOpen(true);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropModalOpen(false);

    const croppedPreview = URL.createObjectURL(croppedBlob);
    setPreview(croppedPreview);
    setUploading(true);
    setError("");
    setImgError(false);

    try {
      // 1. Get presigned upload URL
      const res = await fetch("/api/upload/presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType,
          contentType: "image/jpeg",
          fileSize: croppedBlob.size,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to initiate upload");
      }

      const { uploadUrl, objectKey } = await res.json();

      // 2. Upload file to Supabase storage
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: croppedBlob,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload image to storage");
      }

      // 3. Set canonical media proxy URL
      const finalUrl = `/api/media/${objectKey}`;

      setPhotoUrl(finalUrl);
      setPreview(finalUrl);
      onChange?.(finalUrl);
    } catch (err: any) {
      setError(err?.message || "Upload failed. Please try again.");
      setPreview(value || "");
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUrl("");
    setPreview("");
    setError("");
    setImgError(false);
    onChange?.("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSelectPreset = (emoji: string) => {
    setPhotoUrl(emoji);
    setPreview(emoji);
    setError("");
    setImgError(false);
    onChange?.(emoji);
  };

  const initials = fallbackName
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  return (
    <div className="space-y-3">
      {/* Hidden input for Form submission */}
      <input type="hidden" name={name} value={photoUrl} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      <label className="block text-xs font-extrabold text-[#0F172A]">
        {label}
      </label>

      <div className="flex flex-wrap items-center gap-4">
        {/* Avatar Display Circle */}
        <div className="relative group">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border-2 border-[#0F172A] bg-gradient-to-tr from-slate-100 to-slate-200 text-2xl font-black shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] overflow-hidden">
            {uploading ? (
              <Loader2 className="animate-spin text-[#2D9E6B]" size={28} />
            ) : isEmojiAvatar ? (
              <span className="text-3xl select-none">{photoUrl}</span>
            ) : preview && !imgError ? (
              <img
                src={preview}
                alt={fallbackName}
                onError={() => setImgError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-[#0F2540] text-xl font-black tracking-wider">
                {initials}
              </span>
            )}
          </div>

          {/* Quick Camera Overlay Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-xl border-2 border-[#0F172A] bg-[#2D9E6B] text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:bg-[#238357] transition-transform active:scale-90 cursor-pointer"
            title="Upload Photo"
          >
            <Camera size={13} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="neu-btn neu-btn-primary px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5"
            >
              <Upload size={13} />
              <span>{photoUrl ? "Change Photo" : "Upload Photo"}</span>
            </button>

            {photoUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={uploading}
                className="neu-btn bg-[#FEE2E2] hover:bg-[#FCA5A5] px-3 py-1.5 text-xs text-rose-900 border-[#0F172A] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Remove</span>
              </button>
            )}
          </div>
          <p className="text-[11px] font-semibold text-slate-500">
            JPG, PNG or WebP up to 5MB. Photo will be automatically centered and cropped.
          </p>
        </div>
      </div>

      {/* Optional Preset Avatars / Emoji picker */}
      {showPresets && (
        <div className="pt-1">
          <span className="block text-[11px] font-bold text-slate-600 mb-1.5 flex items-center gap-1">
            <Sparkles size={12} className="text-amber-500" />
            <span>Or select a child avatar:</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESET_AVATARS.map((p) => {
              const isSelected = photoUrl === p.icon;
              return (
                <button
                  key={p.icon}
                  type="button"
                  onClick={() => handleSelectPreset(p.icon)}
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl border-2 transition-all cursor-pointer text-lg ${
                    isSelected
                      ? "border-[#0F172A] bg-[#DCFCE7] shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] scale-105"
                      : "border-slate-300 bg-white hover:border-[#0F172A] hover:bg-slate-50"
                  }`}
                  title={p.label}
                >
                  {p.icon}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-2.5">
          {error}
        </p>
      )}

      {/* Interactive Crop Modal */}
      {cropModalOpen && rawImageSrc && (
        <ImageCropModal
          imageSrc={rawImageSrc}
          onCropComplete={handleCropComplete}
          onClose={() => {
            setCropModalOpen(false);
            setRawImageSrc(null);
          }}
        />
      )}
    </div>
  );
}
