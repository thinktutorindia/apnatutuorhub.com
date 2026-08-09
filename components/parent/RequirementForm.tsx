"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Compass,
  IndianRupee,
  Lock,
  MapPin,
  Send,
  Sparkles,
} from "lucide-react";
import {
  createRequirementAction,
  updateRequirementAction,
  type RequirementState,
} from "@/app/actions/leads.actions";
import { FieldError, FormAlert } from "@/components/ui/FieldError";
import { ActionOverlay } from "@/components/ui/LoadingState";
import { OptionPills } from "@/components/ui/OptionPills";
import { SubjectPicker } from "@/components/ui/SubjectPicker";
import {
  BOARDS,
  CLASS_LEVELS,
  LANGUAGE_PREFERENCES,
  TEACHING_MODES,
  TIMING_PREFERENCES,
  TUTOR_GENDER_PREFS,
} from "@/lib/validations";
import type { ParentStudent, RequirementFormValues } from "@/types/parent";

const initialState: RequirementState = { success: false };

const CLASS_LEVEL_OPTIONS = CLASS_LEVELS.map((level) => ({
  value: level,
  label: level,
}));

const MODE_OPTIONS = TEACHING_MODES.map((mode) => ({
  value: mode.value,
  label: mode.label,
}));

function SectionCard({
  title,
  description,
  background,
  children,
}: {
  title: string;
  description?: string;
  background: string;
  children: React.ReactNode;
}) {
  return (
    <section className="neu-card space-y-4 bg-white p-6">
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 h-3 w-3 shrink-0 rounded-full border-2 border-[#0F172A]"
          style={{ backgroundColor: background }}
        />
        <div>
          <h2 className="text-lg font-black text-[#0F172A]">{title}</h2>
          {description && (
            <p className="text-xs font-semibold text-slate-500">{description}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

export function RequirementForm({
  mode,
  students,
  defaults,
  leadId,
  locked = false,
}: {
  mode: "create" | "edit";
  students: ParentStudent[];
  defaults: RequirementFormValues;
  leadId?: string;
  locked?: boolean;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    mode === "create" ? createRequirementAction : updateRequirementAction,
    initialState
  );

  const [studentProfileId, setStudentProfileId] = useState(
    defaults.studentProfileId
  );
  const [subjects, setSubjects] = useState<string[]>(defaults.subjects);
  const [classLevel, setClassLevel] = useState(defaults.classLevel);
  const [board, setBoard] = useState(defaults.board);
  const [teachingMode, setTeachingMode] = useState<string>(defaults.mode);
  const [genderPref, setGenderPref] = useState(
    defaults.tutorGenderPref || "ANY"
  );
  const [coordinates, setCoordinates] = useState({
    latitude: defaults.latitude,
    longitude: defaults.longitude,
  });
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    if (state.success) {
      router.push(
        mode === "create" ? "/parent/my-leads?posted=1" : "/parent/my-leads?updated=1"
      );
    }
  }, [state.success, mode, router]);

  const applyStudent = (studentId: string) => {
    setStudentProfileId(studentId);
    const student = students.find((item) => item.id === studentId);
    if (!student || locked) return;
    setClassLevel(student.classLevel);
    setBoard(student.board ?? "");
    setSubjects(student.subjects.slice(0, 6));
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus("error");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        });
        setGeoStatus("idle");
      },
      () => setGeoStatus("error")
    );
  };

  const isOnlineOnly = teachingMode === "ONLINE";

  return (
    <form action={formAction} className="space-y-6">
      <ActionOverlay
        isOpen={isPending}
        title={leadId ? "Updating Requirement" : "Posting Requirement"}
        subtitle={leadId ? "Saving updated tuition details..." : "Matching nearby verified tutors for your subject..."}
      />
      {leadId && <input type="hidden" name="leadId" value={leadId} />}
      <input type="hidden" name="latitude" value={coordinates.latitude} />
      <input type="hidden" name="longitude" value={coordinates.longitude} />

      {locked && (
        <div className="neu-card flex items-start gap-3 bg-[#FFEDD5] p-5">
          <Lock size={18} className="mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h2 className="text-sm font-black text-[#0F172A]">
              Core details are locked
            </h2>
            <p className="text-xs font-semibold text-slate-700">
              A tutor has already paid coins to unlock this requirement, so
              subject, class, mode, budget and location can no longer change. You
              can still update timings, tutor preferences and notes.
            </p>
          </div>
        </div>
      )}

      {state.error && <FormAlert tone="error" message={state.error} />}

      {students.length > 0 && (
        <SectionCard
          title="Which child is this for?"
          description="Optional — picking a saved profile pre-fills class and subjects."
          background="#E0F2FE"
        >
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={studentProfileId === ""}
              onClick={() => setStudentProfileId("")}
              className={`rounded-full border-[2.5px] border-[#0F172A] px-4 py-2 text-xs font-extrabold transition-all ${
                studentProfileId === ""
                  ? "bg-[#E0F2FE] shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]"
                  : "bg-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
              }`}
            >
              Not linked
            </button>
            {students.map((student) => (
              <button
                key={student.id}
                type="button"
                aria-pressed={studentProfileId === student.id}
                onClick={() => applyStudent(student.id)}
                className={`rounded-full border-[2.5px] border-[#0F172A] px-4 py-2 text-xs font-extrabold transition-all ${
                  studentProfileId === student.id
                    ? "bg-[#E0F2FE] shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]"
                    : "bg-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                }`}
              >
                {student.name} · {student.classLevel}
              </button>
            ))}
          </div>
          <input
            type="hidden"
            name="studentProfileId"
            value={studentProfileId}
          />
          <FieldError messages={state.fieldErrors?.studentProfileId} />
        </SectionCard>
      )}

      <SectionCard
        title="What does your child need help with?"
        description="Pick up to 6 subjects and the class or exam track."
        background="#DCFCE7"
      >
        <SubjectPicker
          value={subjects}
          onChange={setSubjects}
          disabled={locked}
        />
        <FieldError messages={state.fieldErrors?.subjects} />

        <div className="space-y-2 pt-2">
          <span className="block text-xs font-extrabold text-[#0F172A]">
            Class / Exam Track
          </span>
          <OptionPills
            name="classLevel"
            options={CLASS_LEVEL_OPTIONS}
            value={classLevel}
            onChange={setClassLevel}
            size="sm"
            activeBackground="#E0F2FE"
            disabled={locked}
          />
          <FieldError messages={state.fieldErrors?.classLevel} />
        </div>

        <div className="max-w-xs space-y-1.5 pt-2">
          <label
            htmlFor="lead-board"
            className="block text-xs font-extrabold text-[#0F172A]"
          >
            Board <span className="text-slate-400">(optional)</span>
          </label>
          <select
            id="lead-board"
            name="board"
            value={board}
            onChange={(event) => setBoard(event.target.value)}
            disabled={locked}
            className="neu-input disabled:cursor-not-allowed disabled:bg-slate-50"
          >
            <option value="">Not specified</option>
            {BOARDS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <FieldError messages={state.fieldErrors?.board} />
        </div>
      </SectionCard>

      <SectionCard
        title="How and at what budget?"
        description="Tutors see this range before applying, so keep it realistic."
        background="#FEF3C7"
      >
        <div className="space-y-2">
          <span className="block text-xs font-extrabold text-[#0F172A]">
            Teaching Mode
          </span>
          <OptionPills
            name="mode"
            options={MODE_OPTIONS}
            value={teachingMode}
            onChange={setTeachingMode}
            activeBackground="#FEF3C7"
            disabled={locked}
          />
          <FieldError messages={state.fieldErrors?.mode} />
        </div>

        <div className="grid gap-4 pt-2 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="lead-budget-min"
              className="block text-xs font-extrabold text-[#0F172A]"
            >
              Minimum Budget (₹ / hour)
            </label>
            <div className="relative">
              <IndianRupee
                size={15}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="lead-budget-min"
                name="budgetMin"
                type="number"
                min={0}
                max={100000}
                step={50}
                placeholder="300"
                defaultValue={defaults.budgetMin}
                disabled={locked}
                className="neu-input pl-11 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>
            <FieldError messages={state.fieldErrors?.budgetMin} />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="lead-budget-max"
              className="block text-xs font-extrabold text-[#0F172A]"
            >
              Maximum Budget (₹ / hour)
            </label>
            <div className="relative">
              <IndianRupee
                size={15}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="lead-budget-max"
                name="budgetMax"
                type="number"
                min={0}
                max={100000}
                step={50}
                placeholder="600"
                defaultValue={defaults.budgetMax}
                disabled={locked}
                className="neu-input pl-11 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>
            <FieldError messages={state.fieldErrors?.budgetMax} />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Where should classes happen?"
        description={
          isOnlineOnly
            ? "Online-only requirements do not need an address."
            : "We match tutors by distance, so an accurate area helps a lot."
        }
        background="#FCE7F3"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="lead-city"
              className="block text-xs font-extrabold text-[#0F172A]"
            >
              City {!isOnlineOnly && <span className="text-[#EC4899]">*</span>}
            </label>
            <div className="relative">
              <MapPin
                size={15}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="lead-city"
                name="city"
                type="text"
                placeholder="e.g. Pune"
                defaultValue={defaults.city}
                disabled={locked}
                className="neu-input pl-11 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>
            <FieldError messages={state.fieldErrors?.city} />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="lead-area"
              className="block text-xs font-extrabold text-[#0F172A]"
            >
              Area / Locality
            </label>
            <input
              id="lead-area"
              name="area"
              type="text"
              placeholder="e.g. Kothrud"
              defaultValue={defaults.area}
              disabled={locked}
              className="neu-input disabled:cursor-not-allowed disabled:bg-slate-50"
            />
            <FieldError messages={state.fieldErrors?.area} />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="lead-pincode"
              className="block text-xs font-extrabold text-[#0F172A]"
            >
              Pincode
            </label>
            <input
              id="lead-pincode"
              name="pincode"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="411038"
              defaultValue={defaults.pincode}
              disabled={locked}
              className="neu-input disabled:cursor-not-allowed disabled:bg-slate-50"
            />
            <FieldError messages={state.fieldErrors?.pincode} />
          </div>

          <div className="space-y-1.5">
            <span className="block text-xs font-extrabold text-[#0F172A]">
              Map Coordinates
            </span>
            <button
              type="button"
              onClick={detectLocation}
              disabled={locked || geoStatus === "loading"}
              className="neu-btn neu-btn-white w-full py-3 text-xs"
            >
              <Compass size={15} />
              <span>
                {geoStatus === "loading"
                  ? "Detecting..."
                  : coordinates.latitude
                    ? "Update pinned location"
                    : "Pin my exact location"}
              </span>
            </button>
            {coordinates.latitude && coordinates.longitude ? (
              <p className="text-[11px] font-bold text-[#22C55E]">
                Pinned at {coordinates.latitude}, {coordinates.longitude}
              </p>
            ) : (
              <p className="text-[11px] font-semibold text-slate-500">
                Improves distance-based tutor matching.
              </p>
            )}
            {geoStatus === "error" && (
              <p className="text-[11px] font-bold text-red-500">
                We could not read your location. Enter city and pincode instead.
              </p>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Preferences"
        description="Always editable, even after tutors apply."
        background="#F3E8FF"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="lead-timing"
              className="block text-xs font-extrabold text-[#0F172A]"
            >
              Preferred Timings
            </label>
            <select
              id="lead-timing"
              name="timingPreference"
              defaultValue={defaults.timingPreference}
              className="neu-input"
            >
              <option value="">No preference</option>
              {TIMING_PREFERENCES.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
            <FieldError messages={state.fieldErrors?.timingPreference} />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="lead-language"
              className="block text-xs font-extrabold text-[#0F172A]"
            >
              Teaching Language
            </label>
            <select
              id="lead-language"
              name="languagePref"
              defaultValue={defaults.languagePref}
              className="neu-input"
            >
              <option value="">No preference</option>
              {LANGUAGE_PREFERENCES.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
            <FieldError messages={state.fieldErrors?.languagePref} />
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <span className="block text-xs font-extrabold text-[#0F172A]">
            Tutor Gender Preference
          </span>
          <OptionPills
            name="tutorGenderPref"
            options={TUTOR_GENDER_PREFS}
            value={genderPref}
            onChange={setGenderPref}
            size="sm"
            activeBackground="#F3E8FF"
          />
          <FieldError messages={state.fieldErrors?.tutorGenderPref} />
        </div>

        <div className="space-y-1.5 pt-2">
          <label
            htmlFor="lead-notes"
            className="block text-xs font-extrabold text-[#0F172A]"
          >
            Anything else tutors should know?
          </label>
          <textarea
            id="lead-notes"
            name="notes"
            rows={4}
            maxLength={500}
            placeholder="Board exam prep, weak in algebra, prefers 3 classes a week..."
            defaultValue={defaults.notes}
            className="neu-input resize-none"
          />
          <FieldError messages={state.fieldErrors?.notes} />
        </div>
      </SectionCard>

      <div className="neu-card flex flex-col gap-4 bg-[#DCFCE7] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <Sparkles size={18} className="mt-0.5 shrink-0 text-amber-500" />
          <p className="text-xs font-bold text-slate-700">
            {mode === "create"
              ? "Once posted, we alert matching verified tutors near you. Up to 5 tutors can unlock your requirement, and it stays live for 48 hours."
              : "Changes are shared with tutors who are still reviewing your requirement."}
          </p>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="neu-btn neu-btn-primary shrink-0 px-7 py-3.5 text-sm"
        >
          <Send size={16} />
          <span>
            {isPending
              ? "Saving..."
              : mode === "create"
                ? "Post Requirement"
                : "Save Changes"}
          </span>
        </button>
      </div>
    </form>
  );
}
