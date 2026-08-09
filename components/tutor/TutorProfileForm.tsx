"use client";

import { useActionState, useState } from "react";
import {
  BookOpen,
  GraduationCap,
  IndianRupee,
  MapPin,
  Save,
  Video,
} from "lucide-react";
import {
  saveTutorProfileAction,
  saveAvailabilityAction,
  type TutorProfileState,
  type AvailabilityState,
} from "@/app/actions/tutor.actions";
import { FieldError, FormAlert } from "@/components/ui/FieldError";
import { ActionOverlay } from "@/components/ui/LoadingState";
import { OptionPills } from "@/components/ui/OptionPills";
import { SubjectPicker } from "@/components/ui/SubjectPicker";
import { AvailabilityGrid } from "@/components/tutor/AvailabilityGrid";
import {
  CLASS_LEVELS,
  TEACHING_MODES,
  INDIAN_STATES,
} from "@/lib/validations";

const CLASS_LEVEL_OPTIONS = CLASS_LEVELS.map((l) => ({ value: l, label: l }));
const MODE_OPTIONS = TEACHING_MODES.map((m) => ({ value: m.value, label: m.label }));

const profileInitial: TutorProfileState = { success: false };
const availInitial: AvailabilityState = { success: false };

type Defaults = {
  bio: string;
  qualification: string;
  experience: string;
  subjects: string[];
  classLevels: string[];
  teachingMode: string;
  teachingRadius: string;
  feeMin: string;
  feeMax: string;
  city: string;
  state: string;
  pincode: string;
  address: string;
  introVideoUrl: string;
  availability: { dayOfWeek: number; startTime: string; endTime: string }[];
};

function SectionCard({
  title,
  bg,
  children,
}: {
  title: string;
  bg: string;
  children: React.ReactNode;
}) {
  return (
    <section className="neu-card space-y-5 bg-white p-6">
      <div
        className="inline-flex items-center rounded-xl border-2 border-[#0F172A] px-4 py-1.5 text-sm font-black"
        style={{ backgroundColor: bg }}
      >
        {title}
      </div>
      {children}
    </section>
  );
}

export function TutorProfileForm({ defaults }: { defaults: Defaults }) {
  const [profileState, profileAction, profilePending] = useActionState(
    saveTutorProfileAction,
    profileInitial
  );
  const [availState, availAction, availPending] = useActionState(
    saveAvailabilityAction,
    availInitial
  );

  const [subjects, setSubjects] = useState<string[]>(defaults.subjects);
  const [classLevels, setClassLevels] = useState<string[]>(defaults.classLevels);
  const [teachingMode, setTeachingMode] = useState(defaults.teachingMode || "EITHER");
  const [radius, setRadius] = useState(Number(defaults.teachingRadius) || 10);

  return (
    <div className="space-y-6">
      <ActionOverlay
        isOpen={profilePending}
        title="Saving Tutor Profile"
        subtitle="Updating subjects, fees, location, and bio..."
      />
      <ActionOverlay
        isOpen={availPending}
        title="Saving Availability"
        subtitle="Updating weekly teaching schedule..."
      />

      {/* ── Profile form ── */}
      <form action={profileAction} className="space-y-6">
        {profileState.error && <FormAlert tone="error" message={profileState.error} />}
        {profileState.success && (
          <FormAlert tone="success" message="Profile saved successfully!" />
        )}

        <SectionCard title="📚 What do you teach?" bg="#DCFCE7">
          <div className="space-y-2">
            <span className="block text-xs font-extrabold text-[#0F172A]">
              Subjects
            </span>
            <SubjectPicker value={subjects} onChange={setSubjects} />
            <FieldError messages={profileState.fieldErrors?.subjects} />
          </div>

          <div className="space-y-2 pt-2">
            <span className="block text-xs font-extrabold text-[#0F172A]">
              Class Levels
            </span>
            <div className="flex flex-wrap gap-2">
              {CLASS_LEVEL_OPTIONS.map((option) => {
                const isActive = classLevels.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() =>
                      setClassLevels((prev) =>
                        isActive
                          ? prev.filter((v) => v !== option.value)
                          : [...prev, option.value]
                      )
                    }
                    className={`rounded-full border-[2.5px] border-[#0F172A] px-3 py-1.5 text-[11px] font-extrabold transition-all ${
                      isActive
                        ? "bg-[#E0F2FE] shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] -translate-x-[1px] -translate-y-[1px]"
                        : "bg-[#FAF8F5] shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            {classLevels.map((level) => (
              <input key={level} type="hidden" name="classLevels" value={level} />
            ))}
            <FieldError messages={profileState.fieldErrors?.classLevels} />
          </div>
        </SectionCard>

        <SectionCard title="🧑‍🏫 About You" bg="#E0F2FE">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="tp-qualification"
                className="block text-xs font-extrabold text-[#0F172A]"
              >
                Highest Qualification *
              </label>
              <div className="relative">
                <GraduationCap
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="tp-qualification"
                  name="qualification"
                  type="text"
                  required
                  placeholder="e.g. B.Tech, M.Sc Mathematics"
                  defaultValue={defaults.qualification}
                  className="neu-input pl-11"
                />
              </div>
              <FieldError messages={profileState.fieldErrors?.qualification} />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="tp-experience"
                className="block text-xs font-extrabold text-[#0F172A]"
              >
                Years of Teaching Experience *
              </label>
              <input
                id="tp-experience"
                name="experience"
                type="number"
                min={0}
                max={50}
                required
                placeholder="e.g. 3"
                defaultValue={defaults.experience}
                className="neu-input"
              />
              <FieldError messages={profileState.fieldErrors?.experience} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="tp-bio"
              className="block text-xs font-extrabold text-[#0F172A]"
            >
              Teaching Bio{" "}
              <span className="text-slate-400">(min 80 chars for full points)</span>
            </label>
            <textarea
              id="tp-bio"
              name="bio"
              rows={5}
              maxLength={2000}
              placeholder="Introduce yourself — teaching style, achievements, why students love your classes..."
              defaultValue={defaults.bio}
              className="neu-input resize-none"
            />
            <FieldError messages={profileState.fieldErrors?.bio} />
          </div>
        </SectionCard>

        <SectionCard title="🗺️ Where & How You Teach" bg="#FEF3C7">
          <div className="rounded-xl border-2 border-[#0F172A] bg-[#FEF3C7] px-4 py-2.5 text-xs font-bold text-[#0F172A]">
            📍 <strong>Exact Location Matching</strong> — Providing your Pincode and Locality ensures the matching engine accurately pairs you with nearby parents within your teaching radius.
          </div>

          <div className="space-y-2 pt-1">
            <span className="block text-xs font-extrabold text-[#0F172A]">
              Teaching Mode
            </span>
            <OptionPills
              name="teachingMode"
              options={MODE_OPTIONS}
              value={teachingMode}
              onChange={setTeachingMode}
              activeBackground="#FEF3C7"
            />
            <FieldError messages={profileState.fieldErrors?.teachingMode} />
          </div>

          {teachingMode !== "ONLINE" && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#0F172A]">
                  Teaching Radius (Offline)
                </span>
                <span className="rounded-full border-2 border-[#0F172A] bg-[#FEF3C7] px-3 py-0.5 text-xs font-black">
                  {radius} km
                </span>
              </div>
              <input
                type="range"
                name="teachingRadius"
                min={1}
                max={25}
                step={1}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full accent-[#22C55E]"
              />
              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                <span>1 km</span>
                <span>25 km</span>
              </div>
            </div>
          )}

          <div className="grid gap-4 pt-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="tp-city"
                className="block text-xs font-extrabold text-[#0F172A]"
              >
                City
              </label>
              <div className="relative">
                <MapPin
                  size={15}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="tp-city"
                  name="city"
                  type="text"
                  placeholder="e.g. Pune"
                  defaultValue={defaults.city}
                  className="neu-input pl-11"
                />
              </div>
              <FieldError messages={profileState.fieldErrors?.city} />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="tp-state"
                className="block text-xs font-extrabold text-[#0F172A]"
              >
                State
              </label>
              <select
                id="tp-state"
                name="state"
                defaultValue={defaults.state}
                className="neu-input"
              >
                <option value="">Select state</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <FieldError messages={profileState.fieldErrors?.state} />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="tp-pincode"
                className="block text-xs font-extrabold text-[#0F172A]"
              >
                Pincode <span className="text-slate-400">(for exact distance matching)</span>
              </label>
              <input
                id="tp-pincode"
                name="pincode"
                type="text"
                maxLength={6}
                inputMode="numeric"
                placeholder="6-digit pincode e.g. 110080"
                defaultValue={defaults.pincode}
                className="neu-input"
              />
              <FieldError messages={profileState.fieldErrors?.pincode} />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="tp-address"
                className="block text-xs font-extrabold text-[#0F172A]"
              >
                Locality / Area / Address
              </label>
              <input
                id="tp-address"
                name="address"
                type="text"
                placeholder="e.g. Sangam Vihar, Sector 62"
                defaultValue={defaults.address}
                className="neu-input"
              />
              <FieldError messages={profileState.fieldErrors?.address} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="💰 Fee Expectations" bg="#FCE7F3">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="tp-fee-min"
                className="block text-xs font-extrabold text-[#0F172A]"
              >
                Minimum Fee (₹ / hour)
              </label>
              <div className="relative">
                <IndianRupee
                  size={15}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="tp-fee-min"
                  name="feeMin"
                  type="number"
                  min={0}
                  max={100000}
                  step={50}
                  placeholder="300"
                  defaultValue={defaults.feeMin}
                  className="neu-input pl-11"
                />
              </div>
              <FieldError messages={profileState.fieldErrors?.feeMin} />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="tp-fee-max"
                className="block text-xs font-extrabold text-[#0F172A]"
              >
                Maximum Fee (₹ / hour)
              </label>
              <div className="relative">
                <IndianRupee
                  size={15}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="tp-fee-max"
                  name="feeMax"
                  type="number"
                  min={0}
                  max={100000}
                  step={50}
                  placeholder="600"
                  defaultValue={defaults.feeMax}
                  className="neu-input pl-11"
                />
              </div>
              <FieldError messages={profileState.fieldErrors?.feeMax} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="🎬 Intro Video" bg="#F3E8FF">
          <div className="space-y-1.5">
            <label
              htmlFor="tp-intro-video"
              className="block text-xs font-extrabold text-[#0F172A]"
            >
              YouTube / Loom URL{" "}
              <span className="text-slate-400">(optional — earns +5 ranking pts)</span>
            </label>
            <div className="relative">
              <Video
                size={15}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="tp-intro-video"
                name="introVideoUrl"
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                defaultValue={defaults.introVideoUrl}
                className="neu-input pl-11"
              />
            </div>
            <FieldError messages={profileState.fieldErrors?.introVideoUrl} />
            <p className="text-[11px] font-semibold text-slate-500">
              A 1–2 min intro video dramatically increases parent trust and
              profile clicks.
            </p>
          </div>
        </SectionCard>

        <div className="neu-card flex flex-col items-start gap-4 bg-[#DCFCE7] p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold text-slate-700">
            Your profile is visible to parents once you complete KYC
            verification.
          </p>
          <button
            type="submit"
            disabled={profilePending}
            className="neu-btn neu-btn-primary shrink-0 px-7 py-3.5 text-sm"
          >
            <Save size={16} />
            <span>{profilePending ? "Saving..." : "Save Profile"}</span>
          </button>
        </div>
      </form>

      {/* ── Availability form ── */}
      <form action={availAction}>
        <section className="neu-card space-y-5 bg-white p-6">
          <div
            className="inline-flex items-center rounded-xl border-2 border-[#0F172A] px-4 py-1.5 text-sm font-black"
            style={{ backgroundColor: "#FEF3C7" }}
          >
            📅 Weekly Availability
          </div>

          {availState.error && <FormAlert tone="error" message={availState.error} />}
          {availState.success && (
            <FormAlert tone="success" message="Availability updated!" />
          )}

          <AvailabilityGrid defaultSlots={defaults.availability} />

          <button
            type="submit"
            disabled={availPending}
            className="neu-btn neu-btn-primary px-7 py-3.5 text-sm"
          >
            <BookOpen size={16} />
            <span>{availPending ? "Saving..." : "Save Availability"}</span>
          </button>
        </section>
      </form>
    </div>
  );
}
