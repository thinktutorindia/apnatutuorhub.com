"use client";

import { useActionState, useState, useEffect } from "react";
import { Compass, Mail, MapPin, Phone, Save, User, Sparkles, CheckCircle2 } from "lucide-react";
import {
  updateParentProfileAction,
  type ParentProfileState,
} from "@/app/actions/parent.actions";
import { FieldError, FormAlert } from "@/components/ui/FieldError";
import { ProfilePhotoUpload } from "@/components/ui/ProfilePhotoUpload";
import { LocationSearchInput, type LocationResult } from "@/components/ui/LocationSearchInput";
import { INDIAN_STATES } from "@/lib/validations";

const initialState: ParentProfileState = { success: false };

function matchIndianState(rawState: string): string {
  if (!rawState) return "";
  const clean = rawState.trim().toLowerCase();
  if (clean.includes("delhi")) return "Delhi";
  if (clean.includes("jammu") || clean.includes("kashmir")) return "Jammu & Kashmir";
  if (clean.includes("pondicherry") || clean.includes("puducherry")) return "Puducherry";
  if (clean.includes("odisha") || clean.includes("orissa")) return "Odisha";
  if (clean.includes("uttarakhand") || clean.includes("uttaranchal")) return "Uttarakhand";

  const found = INDIAN_STATES.find(
    (s) => s.toLowerCase() === clean || clean.includes(s.toLowerCase()) || s.toLowerCase().includes(clean)
  );
  return found || "";
}

export function ParentProfileForm({
  defaults,
}: {
  defaults: {
    name: string;
    email: string;
    phone: string;
    image?: string | null;
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

  const [name, setName] = useState(defaults.name || "");
  const [phone, setPhone] = useState(defaults.phone || "");
  const [city, setCity] = useState(defaults.city || "");
  const [stateVal, setStateVal] = useState(matchIndianState(defaults.state) || defaults.state || "");
  const [pincode, setPincode] = useState(defaults.pincode || "");
  const [address, setAddress] = useState(defaults.address || "");

  const [coordinates, setCoordinates] = useState({
    latitude: defaults.latitude?.toString() || "",
    longitude: defaults.longitude?.toString() || "",
  });
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  // Reverse geocoding on GPS click
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
            const detectedState = addr.state || "";
            const detectedPincode = addr.postcode || "";
            const detectedArea =
              addr.suburb ||
              addr.neighbourhood ||
              addr.residential ||
              addr.road ||
              "";

            if (detectedCity) setCity(detectedCity);
            if (detectedState) {
              const matched = matchIndianState(detectedState);
              if (matched) setStateVal(matched);
            }
            if (detectedPincode) setPincode(detectedPincode);
            if (detectedArea && !address) {
              setAddress(detectedArea);
            }
            setGeoStatus("success");
            return;
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

  const handleLocationSelect = (result: LocationResult) => {
    if (result.city) setCity(result.city);
    if (result.state) {
      const matched = matchIndianState(result.state);
      if (matched) setStateVal(matched);
    }
    if (result.pincode) setPincode(result.pincode);
    if (result.area && !address) {
      setAddress(result.area);
    }
    if (result.lat && result.lon) {
      setCoordinates({
        latitude: result.lat.toFixed(6),
        longitude: result.lon.toFixed(6),
      });
      setGeoStatus("success");
    }
  };

  // Auto-fill city & state when user enters 6-digit pincode
  const handlePincodeChange = async (newPincode: string) => {
    setPincode(newPincode);
    if (newPincode.length === 6 && /^\d{6}$/.test(newPincode)) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${newPincode}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.[0]?.Status === "Success" && data[0].PostOffice?.length > 0) {
            const po = data[0].PostOffice[0];
            if (po.District && !city) setCity(po.District);
            if (po.State) {
              const matched = matchIndianState(po.State);
              if (matched) setStateVal(matched);
            }
          }
        }
      } catch {
        // Ignore API timeout
      }
    }
  };

  return (
    <form action={formAction} className="space-y-6 text-slate-900">
      <input type="hidden" name="latitude" value={coordinates.latitude} />
      <input type="hidden" name="longitude" value={coordinates.longitude} />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <User size={18} />
          <h2 className="text-xl font-black text-[#0F172A]">Contact & Location Details</h2>
        </div>
        <span className="rounded-full border-2 border-[#0F172A] bg-[#DCFCE7] px-3 py-1 text-xs font-extrabold text-[#0F172A] inline-flex items-center gap-1">
          <Sparkles size={13} className="text-emerald-700" />
          <span>GPS &amp; Auto-Fill Active</span>
        </span>
      </div>

      {state.error && <FormAlert tone="error" message={state.error} />}
      {state.success && (
        <FormAlert tone="success" message="Profile saved successfully" />
      )}

      {/* Profile Photo Uploader */}
      <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200">
        <ProfilePhotoUpload
          name="image"
          value={defaults.image ?? ""}
          docType="avatar"
          fallbackName={name || defaults.name}
          label="Parent Profile Photo"
        />
        <FieldError messages={state.fieldErrors?.image} />
      </div>

      {/* Live Location Search Bar */}
      <div className="p-5 rounded-3xl bg-emerald-50/50 border border-emerald-200 space-y-2">
        <label className="block text-xs font-extrabold text-[#0F172A] flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <MapPin size={14} className="text-[#2D9E6B]" />
            <span>Search &amp; Auto-Fill Address</span>
          </span>
          <span className="text-[11px] font-bold text-[#2D9E6B]">Auto-detects City, State, Pincode &amp; GPS</span>
        </label>
        <LocationSearchInput
          onSelectLocation={handleLocationSelect}
          placeholder="Type locality, colony, sector, city or pincode (e.g. Hauz Khas, Koramangala, 110080)..."
        />
      </div>

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
            value={name}
            onChange={(e) => setName(e.target.value)}
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
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
            City <span className="text-slate-400 font-normal">(optional)</span>
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
              placeholder="e.g. Pune, New Delhi"
              value={city}
              onChange={(e) => setCity(e.target.value)}
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
            State <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <select
            id="profile-state"
            name="state"
            value={stateVal}
            onChange={(e) => setStateVal(e.target.value)}
            className="neu-input"
          >
            <option value="">Select your state (optional)</option>
            {INDIAN_STATES.map((st) => (
              <option key={st} value={st}>
                {st}
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
            Pincode <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="profile-pincode"
            name="pincode"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit pincode"
            value={pincode}
            onChange={(e) => handlePincodeChange(e.target.value)}
            autoComplete="postal-code"
            className="neu-input"
          />
          <FieldError messages={state.fieldErrors?.pincode} />
        </div>
      </div>

      <div className="space-y-1.5 pt-2">
        <label
          htmlFor="profile-address"
          className="block text-xs font-extrabold text-[#0F172A]"
        >
          Address / Locality Details <span className="text-slate-400 font-semibold">(optional house/flat/landmark)</span>
        </label>
        <textarea
          id="profile-address"
          name="address"
          rows={2}
          maxLength={300}
          placeholder="Flat / house number, building name, landmark or street (e.g. Flat 302, Greenview Apts)..."
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="neu-input resize-none"
        />
        <FieldError messages={state.fieldErrors?.address} />
        <p className="text-[11px] font-semibold text-slate-500">
          🔒 Only shared with tutors after they unlock your requirement.
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="neu-btn neu-btn-primary px-6 py-3 text-sm cursor-pointer"
      >
        <Save size={16} />
        <span>{isPending ? "Saving..." : "Save Profile"}</span>
      </button>
    </form>
  );
}

