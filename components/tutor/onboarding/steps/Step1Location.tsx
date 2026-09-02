"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  MapPin,
  Search,
  Navigation,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Building,
  ArrowRight,
} from "lucide-react";
import { InlineLocationMap, type LocationResult } from "../InlineLocationMap";

interface Props {
  formData: {
    city: string;
    state: string;
    pincode: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
  };
  onNext: (data: Partial<Props["formData"]>) => void;
  onBack?: () => void;
  isLoading: boolean;
  isAdminMode?: boolean;
}

interface SearchResult {
  display_name: string;
  lat: number;
  lon: number;
  city: string;
  state: string;
  pincode: string;
  area: string;
}

export function Step1Location({
  formData,
  onNext,
  onBack,
  isLoading,
  isAdminMode = false,
}: Props) {
  const [city, setCity] = useState(formData.city || "");
  const [state, setState] = useState(formData.state || "");
  const [pincode, setPincode] = useState(formData.pincode || "");
  const [address, setAddress] = useState(formData.address || "");
  const [latitude, setLatitude] = useState<number>(formData.latitude ?? 28.6139);
  const [longitude, setLongitude] = useState<number>(formData.longitude ?? 77.209);

  const [searchQuery, setSearchQuery] = useState(
    formData.city ? [formData.city, formData.state].filter(Boolean).join(", ") : ""
  );
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search Photon (OpenStreetMap Autocomplete for India)
  const searchLocations = useCallback(async (query: string) => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lang=en&limit=6&bbox=68.7,8.1,97.4,37.1`
      );
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      const results: SearchResult[] = [];

      for (const feature of data.features ?? []) {
        const p = feature.properties ?? {};
        const [lon, lat] = feature.geometry?.coordinates ?? [null, null];
        if (p.country !== "India" && p.countrycode !== "IN") continue;

        const c = p.city || p.name || p.county || p.state_district || "";
        const st = p.state || "";
        const ar = p.name !== c ? p.name || p.suburb || "" : p.suburb || "";
        const pc = p.postcode || "";

        if (c || st) {
          const parts = [ar, c, st].filter(Boolean);
          results.push({
            display_name: parts.join(", ") + (pc ? ` - ${pc}` : ""),
            lat: parseFloat(lat),
            lon: parseFloat(lon),
            city: c,
            state: st,
            pincode: pc,
            area: ar || c,
          });
        }
      }
      setSuggestions(results);
      setShowDropdown(results.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  function handleSearchInput(val: string) {
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchLocations(val), 350);
  }

  function handleSelectResult(r: SearchResult) {
    setCity(r.city);
    setState(r.state);
    if (r.pincode) setPincode(r.pincode);
    setLatitude(r.lat);
    setLongitude(r.lon);
    setSearchQuery(r.display_name);
    setShowDropdown(false);
    if (!address) setAddress(r.display_name);
    setErrors({});
  }

  // Handle map click/drag location selection
  function handleMapLocationSelected(res: LocationResult) {
    setCity(res.city);
    setState(res.state);
    if (res.pincode) setPincode(res.pincode);
    if (res.fullAddress) {
      setSearchQuery(res.fullAddress);
      setAddress(res.fullAddress);
    }
    setLatitude(res.lat);
    setLongitude(res.lon);
    setErrors({});
  }

  // Auto-Detect GPS Location
  function handleDetectGPS() {
    if (!navigator.geolocation) {
      setErrors({ locality: "Geolocation is not supported by your browser." });
      return;
    }
    setIsGpsLoading(true);
    setErrors({});

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lon);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const c = addr.city || addr.town || addr.suburb || addr.county || "";
            const st = addr.state || "";
            const pc = addr.postcode || "";
            const displayName = data.display_name?.split(",").slice(0, 3).join(",").trim() || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

            if (c) setCity(c);
            if (st) setState(st);
            if (pc) setPincode(pc);
            setSearchQuery(displayName);
            if (!address) setAddress(displayName);
          }
        } catch {
          setSearchQuery(`GPS Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`);
        } finally {
          setIsGpsLoading(false);
        }
      },
      (err) => {
        console.warn("GPS detection note:", err.message || err.code || err);
        setIsGpsLoading(false);
        const userMsg =
          err.code === 1
            ? "GPS permission denied. Please search your locality or pick a location on the map."
            : err.code === 3
            ? "GPS request timed out. Please search your locality or pick a location on the map."
            : "GPS location unavailable. Please search your locality or pick a location on the map.";
        setErrors({ locality: userMsg });
      },
      { timeout: 15000, enableHighAccuracy: false, maximumAge: 60000 }
    );
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!city.trim() && latitude == null) {
      errs.locality = "Please search your locality or select a pin on the map.";
    }
    if (!address.trim()) {
      errs.address = "Please enter your House/Flat No. & Street address for exact lead matching.";
    }
    if (!pincode.trim() || pincode.length < 6) {
      errs.pincode = "Please enter a valid 6-digit Pincode.";
    }
    return errs;
  }

  function handleSubmit() {
    if (!isAdminMode) {
      const errs = validate();
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        return;
      }
    }
    onNext({
      city: city || searchQuery.split(",")[0] || "Delhi",
      state: state || "Delhi",
      pincode,
      address,
      latitude,
      longitude,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-[#1A3C5E]/8 flex items-center justify-center mx-auto">
          <MapPin size={28} className="text-[#1A3C5E]" />
        </div>
        <h2 className="text-lg font-800 text-[#1A3C5E]">Your Exact Residence / Teaching Location</h2>
        <p className="text-gray-600 text-xs leading-relaxed max-w-md mx-auto">
          Search your locality below, click on the map pin picker, or use 1-click GPS detection.
        </p>
        <div className="inline-flex items-center gap-1.5 text-xs text-emerald-800 font-600 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-1.5">
          <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
          <span>Quality Guarantee: Exact location coordinates ensure you receive relevant nearby leads.</span>
        </div>
      </div>

      {/* Auto-Detect GPS Button */}
      <button
        type="button"
        onClick={handleDetectGPS}
        disabled={isGpsLoading}
        className="w-full py-3 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border-2 border-emerald-300 text-emerald-900 font-800 text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
      >
        {isGpsLoading ? (
          <>
            <Loader2 size={16} className="animate-spin text-emerald-600" />
            <span>Detecting precise GPS coordinates...</span>
          </>
        ) : (
          <>
            <Navigation size={16} className="text-emerald-600 fill-emerald-600" />
            <span>📍 Auto-Detect My Current GPS Location</span>
          </>
        )}
      </button>

      {/* Locality Autocomplete Search */}
      <div className="space-y-1.5" ref={dropdownRef}>
        <label className="text-xs font-700 text-gray-700 flex items-center gap-1">
          <Search size={13} className="text-[#2D9E6B]" />
          Search Locality / Area / Colony <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            placeholder="Search colony or area (e.g. Sangam Vihar, Lajpat Nagar, Koramangala)..."
            className={`w-full h-12 pl-4 pr-10 rounded-2xl border text-xs font-600 text-gray-900 placeholder:text-gray-400 outline-none transition-all ${
              errors.locality
                ? "border-red-400 bg-red-50"
                : "border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20"
            }`}
          />
          {isSearching && (
            <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#2D9E6B] animate-spin" />
          )}

          {/* Autocomplete Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden max-h-56 overflow-y-auto">
              {suggestions.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectResult(r)}
                  className="w-full text-left px-4 py-3 text-xs text-gray-700 hover:bg-emerald-50 hover:text-[#1A3C5E] transition-colors border-b border-gray-50 last:border-0 flex items-start gap-2 cursor-pointer"
                >
                  <MapPin size={14} className="text-[#2D9E6B] mt-0.5 shrink-0" />
                  <div>
                    <div className="font-700 text-gray-900">{r.display_name}</div>
                    <div className="text-[10px] text-gray-400 font-500">
                      Coordinates captured: {r.lat.toFixed(4)}° N, {r.lon.toFixed(4)}° E
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        {errors.locality && <p className="text-xs text-red-600 font-600 mt-1">{errors.locality}</p>}
      </div>

      {/* Interactive Inline Leaflet Map Pin Picker (Directly in page) */}
      <InlineLocationMap
        lat={latitude}
        lon={longitude}
        onLocationChange={handleMapLocationSelected}
      />

      {/* House / Flat No., Building & Street Address - REQUIRED */}
      <div className="space-y-1.5">
        <label className="text-xs font-700 text-gray-700 flex items-center gap-1">
          <Building size={13} className="text-[#2D9E6B]" />
          House / Flat No., Building Name & Street <span className="text-red-500">*</span>
        </label>
        <textarea
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            setErrors((prev) => ({ ...prev, address: "" }));
          }}
          placeholder="e.g. House No. C-142, 2nd Floor, Block C, Sangam Vihar, Near Batra Hospital"
          rows={3}
          className={`w-full px-4 py-3 rounded-2xl border text-xs font-500 text-gray-900 placeholder:text-gray-400 outline-none transition-all resize-none ${
            errors.address
              ? "border-red-400 bg-red-50"
              : "border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20"
          }`}
        />
        {errors.address && <p className="text-xs text-red-600 font-600">{errors.address}</p>}
      </div>

      {/* Pincode & City/State Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-700 text-gray-700">
            6-Digit Pincode <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={pincode}
            maxLength={6}
            onChange={(e) => {
              setPincode(e.target.value.replace(/\D/g, ""));
              setErrors((prev) => ({ ...prev, pincode: "" }));
            }}
            placeholder="e.g. 110062"
            className={`w-full h-11 px-3.5 rounded-xl border text-xs font-600 text-gray-900 outline-none transition-all ${
              errors.pincode
                ? "border-red-400 bg-red-50"
                : "border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#2D9E6B]"
            }`}
          />
          {errors.pincode && <p className="text-[11px] text-red-600 font-600">{errors.pincode}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-700 text-gray-700">City / District</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Delhi"
            className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#2D9E6B] text-xs font-600 text-gray-900 outline-none"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="flex-1 h-13 rounded-2xl border-2 border-gray-200 bg-white text-gray-700 font-800 text-xs flex items-center justify-center gap-2 hover:bg-gray-50 transition-all cursor-pointer"
          >
            &larr; Back
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
          className={`${onBack ? "flex-[2]" : "w-full"} h-13 rounded-2xl bg-[#0F2540] hover:bg-[#1A3C5E] text-white font-800 text-xs sm:text-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer`}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Saving Location...
            </>
          ) : (
            <>
              Save Location &amp; Continue <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}


