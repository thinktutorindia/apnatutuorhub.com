"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Search, Navigation, Loader2, Check, Map as MapIcon, X } from "lucide-react";
import { OpenStreetMapPickerModal } from "./OpenStreetMapPickerModal";

export type LocationResult = {
  city: string;
  state: string;
  pincode: string;
  area: string;
  fullAddress: string;
  lat?: number;
  lon?: number;
};

interface LocationSearchInputProps {
  onSelectLocation: (result: LocationResult) => void;
  defaultCity?: string;
  defaultState?: string;
  defaultPincode?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// ── Photon API (Komoot) — OpenStreetMap-backed instant autocomplete
async function searchPhoton(query: string): Promise<LocationResult[]> {
  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lang=en&limit=8&bbox=68.7,8.1,97.4,37.1`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const results: LocationResult[] = [];

    for (const feature of data.features ?? []) {
      const p = feature.properties ?? {};
      const [lon, lat] = feature.geometry?.coordinates ?? [null, null];

      // Only accept Indian results
      if (p.country !== "India" && p.countrycode !== "IN") continue;

      const city = p.city || p.name || p.county || p.state_district || "";
      const state = p.state || "";
      const area =
        p.name !== city ? p.name || p.suburb || p.district || "" : p.suburb || p.district || "";
      const pincode = p.postcode || "";

      if (!city && !state) continue;

      const parts = [area, city, state].filter(Boolean);
      const fullAddress = parts.join(", ") + (pincode ? ` - ${pincode}` : "") + ", India";

      results.push({
        city,
        state,
        pincode,
        area,
        fullAddress,
        lat: typeof lat === "number" ? lat : undefined,
        lon: typeof lon === "number" ? lon : undefined,
      });
    }

    // Deduplicate
    return Array.from(
      new Map(results.map((r) => [`${r.city}|${r.area}|${r.pincode}`, r])).values()
    ).slice(0, 7);
  } catch {
    return [];
  }
}

// ── Indian Postal Pincode API — for 6-digit pincode searches
async function searchPincode(pincode: string): Promise<LocationResult[]> {
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (data?.[0]?.Status !== "Success") return [];

    const offices = (data[0].PostOffice ?? []).slice(0, 5);
    const results: LocationResult[] = [];

    for (const po of offices) {
      const city = po.District || po.Block || po.Circle || po.Name || "";
      const state = po.State || "";
      const area = po.Name || "";

      results.push({
        city,
        state,
        pincode,
        area,
        fullAddress: `${area}, ${city}, ${state} - ${pincode}, India`,
        lat: undefined,
        lon: undefined,
      });
    }
    return results;
  } catch {
    return [];
  }
}

// ── Nominatim Reverse Geocode for GPS
async function reverseGeocodeGPS(lat: number, lon: number): Promise<LocationResult | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
      {
        headers: { "Accept-Language": "en" },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const city =
        addr.city ||
        addr.town ||
        addr.city_district ||
        addr.county ||
        addr.state_district ||
        "";
      const state = addr.state || "";
      const pincode = addr.postcode || "";
      const area =
        addr.suburb ||
        addr.neighbourhood ||
        addr.residential ||
        addr.road ||
        "";

      return {
        city: city || area || "City",
        state,
        pincode,
        area,
        fullAddress: data.display_name || `${area}, ${city}, ${state}`,
        lat,
        lon,
      };
    }
  } catch {
    // silent
  }
  return null;
}

export function LocationSearchInput({
  onSelectLocation,
  defaultCity = "",
  defaultState = "",
  defaultPincode = "",
  placeholder = "Search city, area, pincode or landmark…",
  className = "",
  disabled = false,
}: LocationSearchInputProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selectedCoords, setSelectedCoords] = useState<{ lat?: number; lon?: number }>({});
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced live search
  useEffect(() => {
    const trimmed = query.trim();
    if (disabled || trimmed.length < 2) {
      const clearTimer = setTimeout(() => {
        setSuggestions([]);
        setIsOpen(false);
      }, 0);
      return () => clearTimeout(clearTimer);
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        let results: LocationResult[] = [];

        // Priority 1: 6-digit pincode
        if (/^\d{6}$/.test(trimmed)) {
          results = await searchPincode(trimmed);
        }

        // Priority 2: Photon OSM search
        if (results.length === 0) {
          results = await searchPhoton(trimmed);
        }

        setSuggestions(results);
        setIsOpen(results.length > 0);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, disabled]);

  // GPS detection with reverse geocoding
  const handleUseGPS = useCallback(async () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const result = await reverseGeocodeGPS(latitude, longitude);
          if (result) {
            const label = [result.area, result.city, result.pincode].filter(Boolean).join(", ");
            setSelectedText(label);
            setSelectedCoords({ lat: latitude, lon: longitude });
            onSelectLocation(result);
            setIsOpen(false);
            setGpsLoading(false);
            return;
          }
        } catch {
          // silent
        }
        setSelectedText(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setSelectedCoords({ lat: latitude, lon: longitude });
        setGpsLoading(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setGpsLoading(false);
        alert("Location access denied. Please search manually or pick on map.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, [onSelectLocation]);

  const handleSelect = useCallback(
    (item: LocationResult) => {
      const parts = [item.area, item.city, item.pincode].filter(Boolean);
      const label = parts.join(", ");
      setSelectedText(label);
      if (item.lat != null && item.lon != null) {
        setSelectedCoords({ lat: item.lat, lon: item.lon });
      }
      setQuery("");
      setIsOpen(false);
      onSelectLocation(item);
    },
    [onSelectLocation]
  );

  const handleClear = () => {
    setQuery("");
    setSelectedText("");
    setSelectedCoords({});
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className={`relative space-y-2 ${className}`}>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            {loading ? (
              <Loader2 size={18} className="animate-spin text-[#2D9E6B]" />
            ) : (
              <Search size={18} className="text-[#2D9E6B]" />
            )}
          </div>
          <input
            type="text"
            value={selectedText || query}
            disabled={disabled}
            onChange={(e) => {
              setSelectedText("");
              setQuery(e.target.value);
            }}
            onFocus={() => {
              if (selectedText) {
                setQuery(selectedText);
                setSelectedText("");
              }
              if (suggestions.length > 0) setIsOpen(true);
            }}
            placeholder={placeholder}
            autoComplete="off"
            className="w-full h-12 pl-10 pr-10 rounded-2xl border border-gray-300 bg-white focus:border-[#2D9E6B] focus:ring-2 focus:ring-[#2D9E6B]/20 text-xs sm:text-sm font-700 text-gray-900 outline-none transition-all placeholder:text-gray-400 shadow-xs"
          />
          {/* Clear button */}
          {(query || selectedText) && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-col xs:flex-row items-stretch gap-2 shrink-0">
          {/* Pick on Map */}
          <button
            type="button"
            onClick={() => setIsMapModalOpen(true)}
            disabled={disabled}
            className="h-12 w-full xs:w-auto px-3.5 sm:px-4 rounded-2xl bg-[#0F2540] hover:bg-[#1A3C5E] text-white font-800 text-xs flex items-center justify-center gap-2 shrink-0 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs disabled:opacity-50 disabled:pointer-events-none"
          >
            <MapIcon size={15} className="text-[#2D9E6B]" />
            <span>🗺️ Pick on Map</span>
          </button>

          {/* GPS */}
          <button
            type="button"
            onClick={handleUseGPS}
            disabled={disabled || gpsLoading}
            className="h-12 w-full xs:w-auto px-3.5 sm:px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 font-800 text-xs flex items-center justify-center gap-2 shrink-0 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs disabled:opacity-50"
          >
            {gpsLoading ? (
              <Loader2 size={16} className="animate-spin text-emerald-700" />
            ) : (
              <Navigation size={16} className="text-emerald-600 fill-emerald-600" />
            )}
            <span>{gpsLoading ? "Detecting..." : "📍 GPS"}</span>
          </button>
        </div>
      </div>

      {/* OpenStreetMap Picker Modal */}
      <OpenStreetMapPickerModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        initialLat={selectedCoords.lat || 28.6139}
        initialLon={selectedCoords.lon || 77.209}
        onConfirmLocation={(result) => handleSelect(result)}
      />

      {/* Selected location confirmation pill */}
      {selectedText && !query && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-950 border border-emerald-300 text-xs font-800 w-fit animate-in fade-in duration-200">
          <Check size={14} className="text-emerald-600 shrink-0" />
          <span>✓ {selectedText}</span>
          {selectedCoords.lat && (
            <span className="text-[10px] font-700 text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md border border-emerald-200">
              📍 {selectedCoords.lat.toFixed(4)}, {selectedCoords.lon?.toFixed(4)}
            </span>
          )}
        </div>
      )}

      {/* Live Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
          <div className="sticky top-0 px-3.5 py-2 bg-slate-50 border-b border-gray-100 text-[10px] font-800 uppercase tracking-wider text-gray-500 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <MapPin size={11} className="text-[#2D9E6B]" />
              Location Suggestions
            </span>
            <span className="text-[#2D9E6B] font-700">
              OpenStreetMap
            </span>
          </div>

          {suggestions.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full px-4 py-3 text-left hover:bg-emerald-50/70 active:bg-emerald-100 transition-colors flex items-start gap-3 group cursor-pointer border-b border-gray-50 last:border-0"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                <MapPin size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-800 text-[#0F2540] group-hover:text-[#2D9E6B] transition-colors">
                    {item.area ? `${item.area}, ` : ""}
                    {item.city}
                  </p>
                  {item.pincode && (
                    <span className="text-[10px] font-800 bg-amber-100 text-amber-950 px-2 py-0.5 rounded-md border border-amber-200 shrink-0">
                      {item.pincode}
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-600 text-gray-500 truncate mt-0.5">
                  {item.state} · India
                  {item.lat != null && (
                    <span className="ml-2 text-[10px] text-emerald-600 font-700">
                      📍 GPS ready
                    </span>
                  )}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
