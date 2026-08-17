"use client";

import { useActionState, useState } from "react";
import { Pencil, PlusCircle, Trash2, Users } from "lucide-react";
import {
  deleteStudentProfileAction,
  type StudentProfileState,
} from "@/app/actions/parent.actions";
import { StudentProfileModal } from "@/components/parent/StudentProfileModal";
import { FieldError } from "@/components/ui/FieldError";
import { getMediaUrl } from "@/lib/s3";
import type { ParentStudent } from "@/types/parent";

const initialState: StudentProfileState = { success: false };

function DeleteStudentButton({ studentId }: { studentId: string }) {
  const [state, formAction, isPending] = useActionState(
    deleteStudentProfileAction,
    initialState
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm("Remove this student profile?")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="studentId" value={studentId} />
      <button
        type="submit"
        disabled={isPending}
        className="neu-btn bg-[#FCE7F3] px-3 py-2 text-[11px]"
      >
        <Trash2 size={13} />
        <span>{isPending ? "Removing..." : "Remove"}</span>
      </button>
      <FieldError messages={state.error ? [state.error] : undefined} />
    </form>
  );
}

export function StudentProfilesSection({
  students,
}: {
  students: ParentStudent[];
}) {
  const [editing, setEditing] = useState<ParentStudent | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openModal = (student: ParentStudent | null) => {
    setEditing(student);
    setIsOpen(true);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users size={18} />
          <h2 className="text-xl font-black text-[#0F172A]">Student Profiles</h2>
          <span className="neu-badge bg-[#FEF3C7] text-[11px]">
            {students.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => openModal(null)}
          className="neu-btn neu-btn-secondary px-5 py-2.5 text-xs"
        >
          <PlusCircle size={15} />
          <span>Add Student</span>
        </button>
      </div>

      {students.length === 0 ? (
        <div className="neu-card space-y-3 bg-white p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-[2.5px] border-[#0F172A] bg-[#E0F2FE] text-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            👦
          </div>
          <h3 className="text-lg font-black text-[#0F172A]">
            No student profiles yet
          </h3>
          <p className="mx-auto max-w-md text-sm font-semibold text-slate-600">
            Add a profile for each child so you can post requirements in seconds
            without re-entering their class and subjects.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {students.map((student) => {
            const isEmoji = student.image && student.image.length <= 4 && !student.image.startsWith("http");
            return (
              <article key={student.id} className="neu-card space-y-3 bg-white p-5">
                <div className="flex items-start gap-3.5">
                  {/* Student Avatar / Photo */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-[#0F172A] bg-slate-100 text-xl font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] overflow-hidden">
                    {isEmoji ? (
                      <span className="text-2xl select-none">{student.image}</span>
                    ) : student.image ? (
                      <img
                        src={getMediaUrl(student.image)}
                        alt={student.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-base font-black text-[#0F2540]">
                        {student.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black text-[#0F172A] truncate">
                      {student.name}
                    </h3>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className="neu-badge bg-[#E0F2FE] text-[11px]">
                        {student.classLevel}
                      </span>
                      {student.board && (
                        <span className="neu-badge bg-[#F3E8FF] text-[11px]">
                          {student.board}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

              <p className="text-xs font-bold text-slate-600">
                {student.subjects.join(" · ")}
              </p>

              {student.notes && (
                <p className="border-t-2 border-slate-100 pt-3 text-xs font-semibold text-slate-500">
                  {student.notes}
                </p>
              )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => openModal(student)}
                    className="neu-btn neu-btn-white px-3 py-2 text-[11px]"
                  >
                    <Pencil size={13} />
                    <span>Edit</span>
                  </button>
                  <DeleteStudentButton studentId={student.id} />
                </div>
              </article>
            );
          })}
        </div>
      )}

      {isOpen && (
        <StudentProfileModal
          key={editing?.id ?? "new"}
          student={editing}
          onClose={() => setIsOpen(false)}
        />
      )}
    </section>
  );
}
