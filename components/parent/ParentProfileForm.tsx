"use client";

import { useActionState, useState } from "react";
import { Compass, Mail, MapPin, Phone, Save, User } from "lucide-react";
import {
  updateParentProfileAction,
  type ParentProfileState,
} from "@/app/actions/parent.actions";
import { FieldError, FormAlert } from "@/components/ui/FieldError";
import { INDIAN_STATES } from "@/lib/validations";

const initialState: ParentProfileState = { success: false };

export function ParentProfileForm({
  defaults,
}: {
  defaults: {
    name: string;
    email: string;
    phone: string;
    city: string;
    state: string;
    pincode: string;
    address: string;
    latitude?: number | null;
    longitude?: number | null;
  };
}) {
  const [state, formAction, isPending] = useActionState(
    updateParentProfileAction,
    initialState
  );

  const [coordinates, setCoordinates] = useState({
    latitude: defaults.latitude?.toString() || "",
    longitude: defaults.longitude?.toString() || "",
  });
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "error">("idle");

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

  return (
    <form action={formAction} className="space-y-6 text-slate-900">
      <input type="hidden" name="latitude" value={coordinates.latitude} />
      <input type="hidden" name="longitude" value={coordinates.longitude} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User size={18} />
          <h2 className="text-xl font-black text-[#0F172A]">Contact & Location Details</h2>
        </div>
        <span className="rounded-full border-2 border-[#0F172A] bg-[#DCFCE7] px-3 py-1 text-xs font-extrabold text-[#0F172A]">
          📍 GPS Matching Enabled
        </span>
      </div>

      {state.error && <FormAlert tone="error" message={state.error} />}
      {state.success && (
        <FormAlert tone="success" message="Profile saved successfully" />
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-1.5">
          <label
            htmlFor="profile-name"
            className="block text-xs font-extrabold text-[#0F172A]"
          >
            Full Name
          </label>
          <input
            id="profile-name"
            name="name"
            type="text"
            required
            defaultValue={defaults.name}
            autoComplete="name"
            className="neu-input"
          />
          <FieldError messages={state.fieldErrors?.name} />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="profile-email"
            className="block text-xs font-extrabold text-[#0F172A]"
          >
            Email Address
          </label>
          <div className="relative">
            <Mail
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id="profile-email"
              type="email"
              value={defaults.email}
              readOnly
              disabled
              className="neu-input cursor-not-allowed bg-slate-50 pl-11 text-slate-500"
            />
          </div>
          <p className="text-[11px] font-semibold text-slate-500">
            Your email is your login identity and cannot be changed here.
          </p>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="profile-phone"
            className="block text-xs font-extrabold text-[#0F172A]"
          >
            Mobile Number
          </label>
          <div className="relative">
            <Phone
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id="profile-phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              placeholder="10-digit mobile number"
              defaultValue={defaults.phone}
              autoComplete="tel-national"
              className="neu-input pl-11"
            />
          </div>
          <FieldError messages={state.fieldErrors?.phone} />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="profile-city"
            className="block text-xs font-extrabold text-[#0F172A]"
          >
            City
          </label>
          <div className="relative">
            <MapPin
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id="profile-city"
              name="city"
              type="text"
              required
              placeholder="e.g. Pune"
              defaultValue={defaults.city}
              className="neu-input pl-11"
            />
          </div>
          <FieldError messages={state.fieldErrors?.city} />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="profile-state"
            className="block text-xs font-extrabold text-[#0F172A]"
          >
            State
          </label>
          <select
            id="profile-state"
            name="state"
            required
            defaultValue={defaults.state}
            className="neu-input"
          >
            <option value="">Select your state</option>
            {INDIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          <FieldError messages={state.fieldErrors?.state} />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="profile-pincode"
            className="block text-xs font-extrabold text-[#0F172A]"
          >
            Pincode
          </label>
          <input
            id="profile-pincode"
            name="pincode"
            type="text"
            required
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit pincode"
            defaultValue={defaults.pincode}
            autoComplete="postal-code"
            className="neu-input"
          />
          <FieldError messages={state.fieldErrors?.pincode} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 pt-2">
        <div className="space-y-1.5">
          <label
            htmlFor="profile-address"
            className="block text-xs font-extrabold text-[#0F172A]"
          >
            Address <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            id="profile-address"
            name="address"
            rows={3}
            maxLength={300}
            placeholder="Flat / house, street, landmark"
            defaultValue={defaults.address}
            className="neu-input resize-none"
          />
          <FieldError messages={state.fieldErrors?.address} />
          <p className="text-[11px] font-semibold text-slate-500">
            Only shared with tutors after they unlock your requirement.
          </p>
        </div>

        <div className="space-y-1.5 flex flex-col justify-between">
          <div>
            <span className="block text-xs font-extrabold text-[#0F172A] mb-1">
              Exact GPS Location
            </span>
            <button
              type="button"
              onClick={detectLocation}
              disabled={geoStatus === "loading"}
              className="neu-btn neu-btn-white w-full py-3 text-xs flex items-center justify-center gap-2"
            >
              <Compass size={15} />
              <span>
                {geoStatus === "loading"
                  ? "Detecting..."
                  : coordinates.latitude
                    ? "Update pinned location"
                    : "Pin my live location"}
              </span>
            </button>
          </div>
          {coordinates.latitude && coordinates.longitude ? (
            <p className="text-[11px] font-bold text-[#22C55E]">
              📍 Pinned at {coordinates.latitude}, {coordinates.longitude}
            </p>
          ) : (
            <p className="text-[11px] font-semibold text-slate-500">
              Improves exact distance calculation when tutors apply.
            </p>
          )}
          {geoStatus === "error" && (
            <p className="text-[11px] font-bold text-red-500">
              Could not detect location. Pincode and city will be used instead.
            </p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="neu-btn neu-btn-primary px-6 py-3 text-sm"
      >
        <Save size={16} />
        <span>{isPending ? "Saving..." : "Save Profile"}</span>
      </button>
    </form>
  );
}
