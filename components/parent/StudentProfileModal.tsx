"use client";

import { useActionState, useEffect, useState } from "react";
import { GraduationCap, X } from "lucide-react";
import {
  upsertStudentProfileAction,
  type StudentProfileState,
} from "@/app/actions/parent.actions";
import { FieldError, FormAlert } from "@/components/ui/FieldError";
import { ProfilePhotoUpload } from "@/components/ui/ProfilePhotoUpload";
import { SubjectPicker } from "@/components/ui/SubjectPicker";
import { BOARDS } from "@/lib/validations";
import type { ParentStudent } from "@/types/parent";

const initialState: StudentProfileState = { success: false };

export function StudentProfileModal({
  student,
  onClose,
}: {
  student: ParentStudent | null;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    upsertStudentProfileAction,
    initialState
  );
  const [classLevel, setClassLevel] = useState(student?.classLevel ?? "");
  const [subjects, setSubjects] = useState<string[]>(student?.subjects ?? []);
  const [image, setImage] = useState<string>(student?.image ?? "");

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0F172A]/40 p-4 py-4 sm:py-10 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close dialog"
        className="fixed inset-0 cursor-default"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-modal-title"
        className="neu-card relative z-10 w-full max-w-2xl bg-white p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#0F172A] bg-[#E0F2FE]">
              <GraduationCap size={18} />
            </div>
            <div>
              <h2
                id="student-modal-title"
                className="text-xl font-black text-[#0F172A]"
              >
                {student ? "Edit Student" : "Add Student"}
              </h2>
              <p className="text-[11px] font-semibold text-slate-500">
                Reuse this profile when posting requirements for this child.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="neu-btn neu-btn-white h-9 w-9 !p-0"
          >
            <X size={16} />
          </button>
        </div>

        <form action={formAction} className="space-y-5">
          {student && <input type="hidden" name="studentId" value={student.id} />}

          {state.error && <FormAlert tone="error" message={state.error} />}

          {/* Child Profile Photo / Avatar */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <ProfilePhotoUpload
              name="image"
              value={image}
              onChange={setImage}
              docType="student-avatar"
              fallbackName={student?.name || "Student"}
              label="Child Profile Picture / Avatar"
              showPresets={true}
            />
            <FieldError messages={state.fieldErrors?.image} />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="student-name"
              className="block text-xs font-extrabold text-[#0F172A]"
            >
              Student Name <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="student-name"
              name="name"
              type="text"
              placeholder="e.g. Child / Aarav Sharma"
              defaultValue={student?.name ?? ""}
              className="neu-input"
            />
            <FieldError messages={state.fieldErrors?.name} />
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-extrabold text-[#0F172A]">
              Subjects Needed
            </span>
            <SubjectPicker value={subjects} onChange={setSubjects} />
            <FieldError messages={state.fieldErrors?.subjects} />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="student-board"
              className="block text-xs font-extrabold text-[#0F172A]"
            >
              Board <span className="text-slate-400">(optional)</span>
            </label>
            <select
              id="student-board"
              name="board"
              defaultValue={student?.board ?? ""}
              className="neu-input"
            >
              <option value="">Not specified</option>
              {BOARDS.map((board) => (
                <option key={board} value={board}>
                  {board}
                </option>
              ))}
            </select>
            <FieldError messages={state.fieldErrors?.board} />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="student-notes"
              className="block text-xs font-extrabold text-[#0F172A]"
            >
              Notes <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              id="student-notes"
              name="notes"
              rows={3}
              maxLength={500}
              placeholder="Learning goals, weak areas, school name..."
              defaultValue={student?.notes ?? ""}
              className="neu-input resize-none"
            />
            <FieldError messages={state.fieldErrors?.notes} />
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="neu-btn neu-btn-primary px-6 py-3 text-sm"
            >
              {isPending ? "Saving..." : student ? "Save Changes" : "Add Student"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="neu-btn neu-btn-white px-6 py-3 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
