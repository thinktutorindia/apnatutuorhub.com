"use client";

import { useActionState, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Compass,
  IndianRupee,
  Lock,
  MapPin,
  Send,
  Sparkles,
  Check,
  BookOpen,
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
import { LocationSearchInput, type LocationResult } from "@/components/ui/LocationSearchInput";
import { getMediaUrl } from "@/lib/s3";
import {
  BOARDS,
  LANGUAGE_PREFERENCES,
  TEACHING_MODES,
  TIMING_PREFERENCES,
  TUTOR_GENDER_PREFS,
} from "@/lib/validations";
import type { ParentStudent, RequirementFormValues } from "@/types/parent";

const initialState: RequirementState = { success: false };

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
    <section className="rounded-3xl border border-slate-200 shadow-xs bg-white p-6 md:p-8 space-y-5">
      <div className="flex items-start gap-3 border-b border-slate-200 pb-4">
        <div
          className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white shadow-2xs"
          style={{ backgroundColor: background }}
        />
        <div>
          <h2 className="text-lg font-800 text-[#0F2540]" style={{ fontFamily: "Poppins, sans-serif" }}>
            {title}
          </h2>
          {description && (
            <p className="text-xs font-600 text-slate-600 mt-0.5">{description}</p>
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

  useEffect(() => {
    if (state.success && state.data?.leadId) {
      if (mode === "create") {
        router.push("/parent/my-leads?posted=true");
      } else {
        router.push("/parent/my-leads?updated=true");
      }
    }
  }, [state, mode, router]);

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
    latitude: defaults.latitude?.toString() || "",
    longitude: defaults.longitude?.toString() || "",
  });
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "error">("idle");

  const [city, setCity] = useState(defaults.city || "");
  const [area, setArea] = useState(defaults.area || "");
  const [pincode, setPincode] = useState(defaults.pincode || "");
  const [address, setAddress] = useState("");
  // Tutor search radius — only relevant for OFFLINE/EITHER mode
  const [radiusKm, setRadiusKm] = useState(defaults.radiusKm || 10);

  const applyStudent = (id: string) => {
    setStudentProfileId(id);
    const target = students.find((s) => s.id === id);
    if (!target) return;
    if (target.classLevel) setClassLevel(target.classLevel);
    if (target.board) setBoard(target.board);
    if (target.subjects.length > 0) setSubjects(target.subjects);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus("error");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setCoordinates({
          latitude: lat.toFixed(6),
          longitude: lon.toFixed(6),
        });

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const detectedCity =
              addr.city ||
              addr.town ||
              addr.suburb ||
              addr.city_district ||
              addr.county ||
              addr.state_district ||
              "";
            const detectedPincode = addr.postcode || "";
            const detectedArea =
              addr.suburb ||
              addr.neighbourhood ||
              addr.residential ||
              addr.road ||
              "";

            if (detectedCity && !city) setCity(detectedCity);
            if (detectedArea && !area) setArea(detectedArea);
            if (detectedPincode && !pincode) setPincode(detectedPincode);
            if (data.display_name && !address) {
              setAddress(data.display_name);
            }
          }
        } catch (e) {
          console.warn("Reverse geocode warning:", e);
        }

        setGeoStatus("idle");
      },
      () => setGeoStatus("error"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const isOnlineOnly = teachingMode === "ONLINE";

  return (
    <form action={formAction} className="space-y-6 text-slate-900">
      <ActionOverlay
        isOpen={isPending}
        title={leadId ? "Updating Requirement" : "Posting Requirement"}
        subtitle={leadId ? "Saving updated tuition details..." : "Matching nearby verified tutors for your subject..."}
      />
      {leadId && <input type="hidden" name="leadId" value={leadId} />}
      <input type="hidden" name="classLevel" value={classLevel} />
      <input type="hidden" name="latitude" value={coordinates.latitude} />
      <input type="hidden" name="longitude" value={coordinates.longitude} />
      {!isOnlineOnly && <input type="hidden" name="radiusKm" value={radiusKm} />}

      {locked && (
        <div className="flex items-start gap-3 p-5 rounded-3xl bg-amber-50 border border-amber-300 text-amber-950 shadow-2xs">
          <Lock size={18} className="mt-0.5 shrink-0 text-amber-700" />
          <div className="space-y-1">
            <h2 className="text-sm font-800 text-amber-950">
              Core details are locked
            </h2>
            <p className="text-xs font-600 text-amber-900">
              A tutor has already unlocked this requirement, so subject, class, mode, budget, and location are locked. You can still update timings, gender preference, and notes.
            </p>
          </div>
        </div>
      )}

      {state.error && <FormAlert tone="error" message={state.error} />}

      {students.length > 0 && (
        <SectionCard
          title="Which child is this requirement for?"
          description="Optional — picking a saved child profile pre-fills their class and subjects."
          background="#2563EB"
        >
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={studentProfileId === ""}
              onClick={() => setStudentProfileId("")}
              className={`px-4 py-2 rounded-2xl text-xs font-800 transition-all cursor-pointer border ${
                studentProfileId === ""
                  ? "bg-[#0F2540] !text-white border-[#0F2540] shadow-xs"
                  : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
              }`}
            >
              Not linked
            </button>
            {students.map((student) => {
              const isEmoji = student.image && student.image.length <= 4 && !student.image.startsWith("http");
              return (
                <button
                  key={student.id}
                  type="button"
                  aria-pressed={studentProfileId === student.id}
                  onClick={() => applyStudent(student.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-800 transition-all cursor-pointer border ${
                    studentProfileId === student.id
                      ? "bg-[#0F2540] !text-white border-[#0F2540] shadow-xs"
                      : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {isEmoji ? (
                    <span className="text-sm">{student.image}</span>
                  ) : student.image ? (
                    <img
                      src={getMediaUrl(student.image)}
                      alt={student.name}
                      className="w-4 h-4 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <span>👦</span>
                  )}
                  <span>{student.name} · {student.classLevel}</span>
                </button>
              );
            })}
          </div>
          <input
            type="hidden"
            name="studentProfileId"
            value={studentProfileId}
          />
          <FieldError messages={state.fieldErrors?.studentProfileId} />
        </SectionCard>
      )}

      {/* 1. Subjects Needed */}
      <SectionCard
        title="What does your child need help with?"
        description="Pick up to 6 subjects for your child."
        background="#2D9E6B"
      >
        {/* Quick Stream Shortcuts */}
        {!locked && (
          <div className="space-y-2 pb-2">
            <span className="block text-[11px] font-800 uppercase tracking-wider text-slate-500">
              ⚡ Quick Select Popular Subjects:
            </span>
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-800 uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">Science:</span>
              {["Chemistry", "Physics", "Mathematics", "Biology", "Science"].map((s) => {
                const isSel = subjects.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      if (isSel) {
                        setSubjects(subjects.filter((item) => item !== s));
                      } else if (subjects.length < 6) {
                        setSubjects([...subjects, s]);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isSel
                        ? "bg-[#2D9E6B] text-white border-[#2D9E6B] shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {isSel ? "✓" : "+"} {s}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-800 uppercase text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">Commerce &amp; Arts:</span>
              {["Accounts", "Economics", "Business Studies", "English", "Hindi", "Computer Science", "Social Science"].map((s) => {
                const isSel = subjects.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      if (isSel) {
                        setSubjects(subjects.filter((item) => item !== s));
                      } else if (subjects.length < 6) {
                        setSubjects([...subjects, s]);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isSel
                        ? "bg-[#2D9E6B] text-white border-[#2D9E6B] shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {isSel ? "✓" : "+"} {s}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <SubjectPicker
          value={subjects}
          onChange={setSubjects}
          hintText="Browse categories or search to pick subjects your child needs help with."
          disabled={locked}
          max={6}
        />
        <FieldError messages={state.fieldErrors?.subjects} />

        <div className="max-w-xs space-y-1.5 pt-3">
          <label
            htmlFor="lead-board"
            className="block text-xs font-800 uppercase tracking-wider text-slate-700"
          >
            School Board <span className="text-slate-400 font-600">(Optional)</span>
          </label>
          <select
            id="lead-board"
            name="board"
            value={board}
            onChange={(event) => setBoard(event.target.value)}
            disabled={locked}
            className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-xs font-800 text-slate-900 shadow-2xs focus:border-[#2D9E6B] outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
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

      {/* 2. Mode & Budget Range */}
      <SectionCard
        title="Teaching Mode & Monthly Budget Range"
        description="Verified tutors review your budget quote before connecting."
        background="#D97706"
      >
        <div className="space-y-2">
          <span className="block text-xs font-800 uppercase tracking-wider text-slate-700">
            Teaching Mode
          </span>
          <OptionPills
            name="mode"
            options={MODE_OPTIONS}
            value={teachingMode}
            onChange={setTeachingMode}
            disabled={locked}
          />
          <FieldError messages={state.fieldErrors?.mode} />
        </div>

        <div className="grid gap-4 pt-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="lead-budget-min"
              className="block text-xs font-800 uppercase tracking-wider text-slate-700"
            >
              Minimum Budget (₹ / Month)
            </label>
            <div className="relative">
              <IndianRupee
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="lead-budget-min"
                name="budgetMin"
                type="number"
                min={0}
                max={100000}
                step={500}
                placeholder="3000"
                defaultValue={defaults.budgetMin}
                disabled={locked}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-slate-300 text-xs font-800 text-slate-900 shadow-2xs focus:border-[#2D9E6B] outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
            </div>
            <FieldError messages={state.fieldErrors?.budgetMin} />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="lead-budget-max"
              className="block text-xs font-800 uppercase tracking-wider text-slate-700"
            >
              Maximum Budget (₹ / Month)
            </label>
            <div className="relative">
              <IndianRupee
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="lead-budget-max"
                name="budgetMax"
                type="number"
                min={0}
                max={100000}
                step={500}
                placeholder="8000"
                defaultValue={defaults.budgetMax}
                disabled={locked}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-slate-300 text-xs font-800 text-slate-900 shadow-2xs focus:border-[#2D9E6B] outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
            </div>
            <FieldError messages={state.fieldErrors?.budgetMax} />
          </div>
        </div>
      </SectionCard>

      {/* 3. Location Details */}
      <SectionCard
        title="Location & Address Details"
        description={
          isOnlineOnly
            ? "Online classes do not require home address matching."
            : "We rank nearby tutors based on physical distance in kilometers."
        }
        background="#EA580C"
      >
        <div className="space-y-1.5 pb-2">
          <label className="block text-xs font-800 uppercase tracking-wider text-[#0F2540] flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span>Search Location via API / GPS</span>
            <span className="text-[11px] font-700 text-[#2D9E6B]">Live Auto-Fill ✨</span>
          </label>
          <LocationSearchInput
            onSelectLocation={(res) => {
              if (res.city) setCity(res.city);
              if (res.area) setArea(res.area);
              if (res.pincode) setPincode(res.pincode);
              if (res.fullAddress) setAddress(res.fullAddress);
              if (res.lat && res.lon) {
                setCoordinates({ latitude: res.lat.toString(), longitude: res.lon.toString() });
              }
            }}
            placeholder="Type City, Area, Pincode or Landmark (e.g. Koramangala, Sector 56 Gurgaon, 400001)..."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="lead-city"
              className="block text-xs font-800 uppercase tracking-wider text-slate-700"
            >
              City {!isOnlineOnly && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <MapPin
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="lead-city"
                name="city"
                type="text"
                placeholder="e.g. Pune, Delhi, Mumbai"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={locked}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-slate-300 text-xs font-800 text-slate-900 shadow-2xs focus:border-[#2D9E6B] outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
            </div>
            <FieldError messages={state.fieldErrors?.city} />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="lead-area"
              className="block text-xs font-800 uppercase tracking-wider text-slate-700"
            >
              Area / Locality
            </label>
            <input
              id="lead-area"
              name="area"
              type="text"
              placeholder="e.g. Kothrud, Bandra West"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              disabled={locked}
              className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-xs font-800 text-slate-900 shadow-2xs focus:border-[#2D9E6B] outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
            <FieldError messages={state.fieldErrors?.area} />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="lead-pincode"
              className="block text-xs font-800 uppercase tracking-wider text-slate-700"
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
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              disabled={locked}
              className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-xs font-800 text-slate-900 shadow-2xs focus:border-[#2D9E6B] outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
            <FieldError messages={state.fieldErrors?.pincode} />
          </div>

          <div className="space-y-1.5">
            <span className="block text-xs font-800 uppercase tracking-wider text-slate-700">
              GPS Map Location
            </span>
            <button
              type="button"
              onClick={detectLocation}
              disabled={locked || geoStatus === "loading"}
              className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-800 text-slate-800 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Compass size={16} />
              <span>
                {geoStatus === "loading"
                  ? "Detecting GPS..."
                  : coordinates.latitude
                    ? "Update GPS Pin"
                    : "Pin Exact GPS Location"}
              </span>
            </button>
            {coordinates.latitude && coordinates.longitude ? (
              <p className="text-[11px] font-800 text-emerald-600 break-all">
                ✓ Pinned at {coordinates.latitude}, {coordinates.longitude}
              </p>
            ) : (
              <p className="text-[11px] font-600 text-slate-500">
                Improves distance matching for local home tutors.
              </p>
            )}
          </div>
        </div>

        {/* Tutor Search Radius Slider — OFFLINE/EITHER only */}
        {!isOnlineOnly && !locked && (
          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-800 uppercase tracking-wider text-slate-700">
                Tutor Search Radius (Distance)
              </label>
              <span className="text-sm font-800 text-[#2D9E6B] bg-[#2D9E6B]/10 px-3 py-0.5 rounded-full border border-[#2D9E6B]/20">
                {radiusKm} km radius
              </span>
            </div>

            {/* Quick Radius Preset Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-800 uppercase text-slate-400">Quick Distance:</span>
              {[5, 10, 15, 25, 50].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRadiusKm(r)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    radiusKm === r
                      ? "bg-[#2D9E6B] text-white border-[#2D9E6B] shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {r} km {r === 50 ? "(Metro/NCR)" : r === 5 ? "(Nearby)" : ""}
                </button>
              ))}
            </div>

            <input
              type="range"
              min={1}
              max={50}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-full h-2.5 rounded-lg bg-slate-200 accent-[#2D9E6B] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-700 text-slate-400">
              <span>1 km (hyper-local)</span>
              <span>25 km (city-wide)</span>
              <span>50 km (entire NCR / metro)</span>
            </div>
            <p className="text-[11px] font-600 text-slate-500 leading-relaxed">
              Only verified tutors within <strong className="text-[#0F2540]">{radiusKm} km</strong> of your location will receive notifications.
              {radiusKm <= 5 && " 🎯 Highly local — nearest neighborhood tutors."}
              {radiusKm > 5 && radiusKm <= 20 && " ✅ Balanced — excellent reach of verified local tutors."}
              {radiusKm > 20 && " 📍 Wide search — encompasses extensive metro & NCR coverage."}
            </p>
          </div>
        )}
      </SectionCard>

      {/* 4. Preferences & Notes */}
      <SectionCard
        title="Schedule & Tutor Preferences"
        description="Always editable — helps match tutors with your timing expectations."
        background="#7C3AED"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="lead-timing"
              className="block text-xs font-800 uppercase tracking-wider text-slate-700"
            >
              Preferred Timings
            </label>
            <select
              id="lead-timing"
              name="timingPreference"
              defaultValue={defaults.timingPreference}
              className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-xs font-800 text-slate-900 shadow-2xs focus:border-[#2D9E6B] outline-none"
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
              className="block text-xs font-800 uppercase tracking-wider text-slate-700"
            >
              Teaching Language
            </label>
            <select
              id="lead-language"
              name="languagePref"
              defaultValue={defaults.languagePref}
              className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-xs font-800 text-slate-900 shadow-2xs focus:border-[#2D9E6B] outline-none"
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

        <div className="space-y-2 pt-3">
          <span className="block text-xs font-800 uppercase tracking-wider text-slate-700">
            Tutor Gender Preference
          </span>
          <OptionPills
            name="tutorGenderPref"
            options={TUTOR_GENDER_PREFS}
            value={genderPref}
            onChange={setGenderPref}
            size="sm"
          />
          <FieldError messages={state.fieldErrors?.tutorGenderPref} />
        </div>

        <div className="space-y-1.5 pt-3">
          <label
            htmlFor="lead-notes"
            className="block text-xs font-800 uppercase tracking-wider text-slate-700"
          >
            Additional Student Notes for Tutors
          </label>
          <textarea
            id="lead-notes"
            name="notes"
            rows={4}
            maxLength={500}
            placeholder="Board exam prep, weak in algebra, prefers 3 classes a week..."
            defaultValue={defaults.notes}
            className="w-full p-4 rounded-2xl bg-white border border-slate-300 text-xs font-800 text-slate-900 shadow-2xs focus:border-[#2D9E6B] outline-none resize-none"
          />
          <FieldError messages={state.fieldErrors?.notes} />
        </div>
      </SectionCard>

      {/* Live Requirement Summary Preview Card */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-blue-50 border border-emerald-200/80 p-5 sm:p-6 space-y-2 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#2D9E6B]">
          <Sparkles size={14} />
          <span>Requirement Summary Preview (What Tutors Will See)</span>
        </div>
        <div className="text-xs text-slate-800 space-y-1.5 font-semibold">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-extrabold text-[#0F2540]">
              {subjects.length > 0 ? subjects.join(", ") : "Select Subject(s)"}
            </span>
            <span className="text-slate-400">•</span>
            <span>{classLevel || "Class Level"}{board ? ` (${board})` : ""}</span>
            <span className="text-slate-400">•</span>
            <span className="text-emerald-800 font-bold bg-emerald-100/90 px-2.5 py-0.5 rounded-md">
              {teachingMode === "OFFLINE" ? "Home Tuition" : teachingMode === "ONLINE" ? "Online Only" : "Home / Online"} ({radiusKm} km radius)
            </span>
          </div>
          <div className="text-slate-600 text-xs flex flex-wrap items-center gap-2 font-medium">
            <span>📍 Location: {[area, city].filter(Boolean).join(", ") || "Location details"}</span>
            <span>•</span>
            <span>Budget: ₹{defaults.budgetMin || "3,000"} - ₹{defaults.budgetMax || "8,000"}/mo</span>
            {genderPref !== "ANY" && (
              <>
                <span>•</span>
                <span className="text-purple-700 font-bold">{genderPref === "FEMALE" ? "Female Tutor Preferred" : "Male Tutor Preferred"}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Form Submission Action Card */}
      <div className="rounded-3xl bg-emerald-50 border border-emerald-300 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#2D9E6B] shrink-0 shadow-2xs border border-emerald-200">
            <Sparkles size={20} />
          </div>
          <p className="text-xs font-700 text-emerald-950 max-w-lg leading-relaxed">
            {mode === "create"
              ? "Once posted, we instantly notify matching verified tutors in your locality. Up to 5 tutors can review your requirement."
              : "Updates will be immediately visible to tutors reviewing your tuition post."}
          </p>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="px-8 py-3.5 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] text-white text-xs font-800 shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0 w-full sm:w-auto"
        >
          <Send size={16} />
          <span>
            {isPending
              ? "Saving..."
              : mode === "create"
                ? "Post Tuition Requirement"
                : "Save Requirement Changes"}
          </span>
        </button>
      </div>
    </form>
  );
}
