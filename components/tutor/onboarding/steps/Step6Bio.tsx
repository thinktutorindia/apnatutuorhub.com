"use client";

import React, { useState } from "react";
import { FileText, ArrowRight, ArrowLeft, Loader2, Sparkles } from "lucide-react";

interface Props {
  formData: { bio: string };
  onNext: (data: { bio: string }) => void;
  onBack: () => void;
  isLoading: boolean;
  isAdminMode?: boolean;
}

const BIO_PROMPTS = [
  "Who are you? 3 words to describe you. (Do not include name)",
  "Show off your interests which give you an opportunity to stand out from other tutors teaching similar subjects",
  "Write a brief account of your achievements",
  "If you have a passion, talk about it!",
  "A bio is interesting if it conveys something unique about you",
];

const MIN_LENGTH = 100;

export function Step6Bio({ formData, onNext, onBack, isLoading, isAdminMode = false }: Props) {
  const [bio, setBio] = useState(formData.bio || "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const charCount = bio.trim().length;

  function validate() {
    const errs: Record<string, string> = {};
    if (charCount < MIN_LENGTH) errs.bio = `Please write at least ${MIN_LENGTH} characters (${MIN_LENGTH - charCount} more needed).`;
    return errs;
  }

  function handleSubmit() {
    if (!isAdminMode) {
      const errs = validate();
      if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    }
    onNext({ bio });
  }

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto">
          <FileText size={28} className="text-blue-600" />
        </div>
        <p className="text-gray-600 text-sm leading-relaxed max-w-md mx-auto">
          This is your chance to tell students about yourself. Showcase your skills. Think of it as an introduction, resume, and personal marketing brochure rolled into one.
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-700 text-gray-700">
            Professional Bio <span className="text-red-500">*</span>
          </label>
          <span className={`text-xs font-700 ${charCount >= MIN_LENGTH ? "text-[#2D9E6B]" : "text-gray-400"}`}>
            {charCount} chars {charCount >= MIN_LENGTH ? "✓ Valid" : `(min ${MIN_LENGTH})`}
          </span>
        </div>
        <textarea
          value={bio}
          onChange={(e) => {
            setBio(e.target.value);
            setErrors({});
          }}
          placeholder="Write a Professional Bio, a Solid Introduction & a Perfect Portfolio here..."
          rows={7}
          className={`w-full px-4 py-3 rounded-2xl border text-xs font-500 text-gray-900 placeholder:text-gray-400 outline-none transition-all resize-none ${
            errors.bio
              ? "border-red-400 bg-red-50"
              : "border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20"
          }`}
        />
        {errors.bio && <p className="text-xs text-red-600 font-600">{errors.bio}</p>}
        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#2D9E6B] to-emerald-400 transition-all duration-300"
            style={{ width: `${Math.min(100, (charCount / MIN_LENGTH) * 100)}%` }}
          />
        </div>
      </div>

      {/* Prompts */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-2">
        <p className="text-xs font-800 text-blue-700 flex items-center gap-1.5">
          <Sparkles size={14} className="text-blue-600" />
          <span>Take help of this questionnaire:</span>
        </p>
        <ul className="space-y-1.5">
          {BIO_PROMPTS.map((p, i) => (
            <li key={i} className="text-xs text-blue-700 flex items-start gap-1.5">
              <span className="shrink-0 mt-0.5">•</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onBack} disabled={isLoading} className="flex-1 h-12 rounded-2xl border-2 border-gray-200 bg-white text-gray-600 font-700 text-sm flex items-center justify-center gap-2 hover:border-gray-300 transition-all cursor-pointer">
          <ArrowLeft size={16} /> Back
        </button>
        <button type="button" onClick={handleSubmit} disabled={isLoading} className="flex-[2] h-12 rounded-2xl bg-[#1A3C5E] hover:bg-[#15304f] text-white font-800 text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 cursor-pointer">
          {isLoading ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <>Next <ArrowRight size={16} /></>}
        </button>
      </div>
    </div>
  );
}
