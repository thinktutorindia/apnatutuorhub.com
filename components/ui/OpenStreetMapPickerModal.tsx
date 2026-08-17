"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, MapPin, Check, Loader2, Navigation, Compass, Search } from "lucide-react";
import type { LocationResult } from "./LocationSearchInput";

interface OpenStreetMapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLocation: (result: LocationResult) => void;
  initialLat?: number;
  initialLon?: number;
}

declare global {
  interface Window {
    L?: any;
    leafletInitPromise?: Promise<void>;
  }
}

// ── Dynamically load Leaflet JS & CSS from CDN
function loadLeaflet(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject();
  if (window.L) return Promise.resolve();

  if (window.leafletInitPromise) {
    return window.leafletInitPromise;
  }

  window.leafletInitPromise = new Promise((resolve, reject) => {
    // 1. Inject Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.crossOrigin = "";
      document.head.appendChild(link);
    }

    // 2. Inject Leaflet JS
    if (document.getElementById("leaflet-js") && window.L) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.id = "leaflet-js";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => {
      if (window.L) resolve();
      else reject(new Error("Leaflet failed to attach to window"));
    };
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });

  return window.leafletInitPromise;
}

// ── Reverse Geocode with Nominatim (with timeout & fallback)
async function reverseGeocodeCoords(lat: number, lon: number): Promise<LocationResult> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "en",
        },
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
        state: state || "India",
        pincode,
        area: area || city,
        fullAddress: data.display_name || `${area}, ${city}, ${state}`.replace(/^, |, $/g, ""),
        lat,
        lon,
      };
    }
  } catch (e) {
    console.warn("Reverse geocoding note:", e);
  }

  return {
    city: "City",
    state: "India",
    pincode: "",
    area: "Selected Pin Location",
    fullAddress: `Location at ${lat.toFixed(5)}, ${lon.toFixed(5)}`,
    lat,
    lon,
  };
}

// ── Search locations via Photon API (India-bounded autocomplete)
async function searchLocations(query: string): Promise<any[]> {
  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lang=en&limit=6&bbox=68.7,8.1,97.4,37.1`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const results: any[] = [];

    for (const feature of data.features ?? []) {
      const p = feature.properties ?? {};
      const [lon, lat] = feature.geometry?.coordinates ?? [null, null];
      if (p.country !== "India" && p.countrycode !== "IN") continue;

      const city = p.city || p.name || p.county || p.state_district || "";
      const state = p.state || "";
      const area = p.name !== city ? p.name || p.suburb || "" : p.suburb || "";
      const pincode = p.postcode || "";
      if (!city && !state) continue;

      results.push({
        place_id: `place_${Math.random().toString(36).slice(2)}`,
        description:
          [area, city, state].filter(Boolean).join(", ") +
          (pincode ? ` - ${pincode}` : "") +
          ", India",
        main_text: area || city,
        secondary_text: [city, state, pincode ? `PIN ${pincode}` : ""].filter(Boolean).join(", "),
        lat: typeof lat === "number" ? lat : undefined,
        lon: typeof lon === "number" ? lon : undefined,
        city,
        state,
        pincode,
        area,
      });
    }
    return results;
  } catch {
    return [];
  }
}

export function OpenStreetMapPickerModal({
  isOpen,
  onClose,
  onConfirmLocation,
  initialLat = 28.6139,
  initialLon = 77.209,
}: OpenStreetMapPickerModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [currentLat, setCurrentLat] = useState<number>(initialLat);
  const [currentLon, setCurrentLon] = useState<number>(initialLon);
  const [selectedResult, setSelectedResult] = useState<LocationResult | null>(null);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reverse geocode handler
  const doReverseGeocode = useCallback(async (lat: number, lon: number) => {
    setIsGeocoding(true);
    try {
      const result = await reverseGeocodeCoords(lat, lon);
      setSelectedResult(result);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // Center map on coordinates and update marker
  const setMapCoords = useCallback(
    (lat: number, lon: number) => {
      setCurrentLat(lat);
      setCurrentLon(lon);

      if (mapRef.current && markerRef.current) {
        markerRef.current.setLatLng([lat, lon]);
        mapRef.current.setView([lat, lon], Math.max(mapRef.current.getZoom(), 16), { animate: true });
      }

      doReverseGeocode(lat, lon);
    },
    [doReverseGeocode]
  );

  // Initialize Leaflet Map
  useEffect(() => {
    if (!isOpen) return;

    let isCancelled = false;

    async function init() {
      try {
        await loadLeaflet();
        if (isCancelled || !mapContainerRef.current) return;

        const L = window.L;

        // Cleanup existing map if any
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        // Custom Emerald Pin Icon
        const customPinIcon = L.divIcon({
          className: "custom-leaflet-marker",
          html: `
            <div style="position: relative; width: 36px; height: 44px; display: flex; flex-direction: column; align-items: center; cursor: grab;">
              <div style="background: #2D9E6B; color: white; width: 36px; height: 36px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.35); border: 2.5px solid white;">
                <div style="transform: rotate(45deg); font-size: 14px; font-weight: bold;">📍</div>
              </div>
              <div style="width: 10px; height: 4px; background: rgba(0,0,0,0.3); border-radius: 50%; margin-top: -2px; filter: blur(1px);"></div>
            </div>
          `,
          iconSize: [36, 44],
          iconAnchor: [18, 42],
        });

        // Initialize Leaflet Map
        const map = L.map(mapContainerRef.current, {
          center: [initialLat, initialLon],
          zoom: 16,
          zoomControl: false,
        });

        // Add Zoom Control to top-right
        L.control.zoom({ position: "bottomright" }).addTo(map);

        // Add High-Quality Crisp OSM Tiles
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        // Add Draggable Marker
        const marker = L.marker([initialLat, initialLon], {
          icon: customPinIcon,
          draggable: true,
          autoPan: true,
        }).addTo(map);

        mapRef.current = map;
        markerRef.current = marker;

        // Marker Drag End
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          setCurrentLat(pos.lat);
          setCurrentLon(pos.lng);
          doReverseGeocode(pos.lat, pos.lng);
        });

        // Map Click
        map.on("click", (e: any) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          setCurrentLat(lat);
          setCurrentLon(lng);
          doReverseGeocode(lat, lng);
        });

        // Invalidate map size after modal animation
        setTimeout(() => {
          map.invalidateSize();
        }, 200);

        setCurrentLat(initialLat);
        setCurrentLon(initialLon);
        doReverseGeocode(initialLat, initialLon);
      } catch (err) {
        console.error("Leaflet Map Initialization Error:", err);
      }
    }

    init();

    return () => {
      isCancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isOpen, initialLat, initialLon, doReverseGeocode]);

  // GPS Auto-detect
  const handleGPSDetect = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMapCoords(latitude, longitude);
        setGpsLoading(false);
      },
      (err) => {
        console.error("GPS error:", err);
        setGpsLoading(false);
        alert("Location access denied. You can search or drag the pin manually.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Search input change
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (query.trim().length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchLocations(query);
        setPredictions(results);
        setShowDropdown(results.length > 0);
      } finally {
        setIsSearching(false);
      }
    }, 280);
  };

  // Select place prediction
  const handleSelectPrediction = (prediction: any) => {
    setSearchQuery(prediction.description);
    setShowDropdown(false);

    if (prediction.lat != null && prediction.lon != null) {
      setMapCoords(prediction.lat, prediction.lon);
    }
  };

  const handleConfirm = () => {
    if (selectedResult) {
      onConfirmLocation(selectedResult);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center overflow-y-auto p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#2D9E6B] flex items-center justify-center font-800">
              <Compass size={20} />
            </div>
            <div>
              <h3 className="text-base font-800 text-[#0F2540] flex items-center gap-2">
                <span>Pick Exact Location on Map</span>
                <span className="text-[10px] font-800 bg-emerald-50 text-[#2D9E6B] px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Interactive Pin 📍
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-600">
                Search your society/colony, or drag the green marker pin to your exact building
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-500 text-slate-600 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Map Container Viewport with Search & GPS */}
        <div className="relative w-full flex-1 min-h-[360px] sm:min-h-[420px] bg-slate-100">
          <div ref={mapContainerRef} className="w-full h-full min-h-[360px] sm:min-h-[420px]" />

          {/* Floating Search Bar */}
          <div className="absolute top-3 left-3 right-16 sm:right-auto sm:w-88 z-[1000]">
            <div className="relative">
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-300 shadow-lg focus-within:border-[#2D9E6B] focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                {isSearching ? (
                  <Loader2 size={16} className="animate-spin text-[#2D9E6B] shrink-0" />
                ) : (
                  <Search size={16} className="text-[#2D9E6B] shrink-0" />
                )}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search society, colony, landmark, gali..."
                  className="w-full bg-transparent text-xs font-800 text-slate-900 outline-none placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setShowDropdown(false);
                    }}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Predictions Dropdown */}
              {showDropdown && predictions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 z-[1001] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {predictions.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPrediction(p)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50 transition-colors flex items-start gap-2.5 cursor-pointer"
                    >
                      <MapPin size={15} className="text-[#2D9E6B] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-800 text-slate-900 truncate">
                          {p.main_text}
                        </p>
                        <p className="text-[10px] font-600 text-slate-500 truncate">
                          {p.secondary_text}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Floating GPS Button */}
          <button
            type="button"
            onClick={handleGPSDetect}
            disabled={gpsLoading}
            className="absolute top-3 right-3 z-[1000] px-3 py-2.5 rounded-2xl bg-white/95 backdrop-blur-md hover:bg-emerald-50 text-slate-900 border border-slate-300 font-800 text-xs shadow-lg flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {gpsLoading ? (
              <Loader2 size={14} className="animate-spin text-[#2D9E6B]" />
            ) : (
              <Navigation size={14} className="text-[#2D9E6B] fill-[#2D9E6B]" />
            )}
            <span className="hidden sm:inline">My GPS Location</span>
            <span className="sm:hidden">GPS</span>
          </button>

          {/* Floating Pin Guidance Badge */}
          <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-16 z-[1000] bg-slate-900/85 text-white text-[11px] font-700 px-3.5 py-2 rounded-2xl backdrop-blur-md flex items-center gap-2 border border-white/10 shadow-lg pointer-events-none">
            <MapPin size={13} className="text-[#2D9E6B] shrink-0" />
            <span>Drag green pin or click anywhere to set exact location</span>
          </div>
        </div>

        {/* Selected Address Preview & Footer Actions */}
        <div className="p-3.5 sm:p-5 bg-slate-50 border-t border-slate-200 space-y-3 shrink-0">
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-800 text-slate-500">
              <span className="flex items-center gap-1.5 text-[#0F2540]">
                <MapPin size={14} className="text-[#2D9E6B]" /> Selected Doorstep Location
              </span>
              <div className="flex items-center gap-1.5">
                {isGeocoding ? (
                  <span className="text-[11px] text-[#2D9E6B] flex items-center gap-1 font-700">
                    <Loader2 size={12} className="animate-spin" /> Fetching address...
                  </span>
                ) : (
                  <>
                    {selectedResult?.pincode && (
                      <span className="text-[11px] font-800 bg-amber-100 text-amber-950 px-2 py-0.5 rounded-md border border-amber-300">
                        PIN: {selectedResult.pincode}
                      </span>
                    )}
                    {currentLat && currentLon && (
                      <span className="text-[10px] font-800 bg-emerald-50 text-[#15803D] px-2 py-0.5 rounded-md border border-emerald-200">
                        GPS: {currentLat.toFixed(5)}, {currentLon.toFixed(5)}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            <p className="text-xs sm:text-sm font-800 text-slate-900 leading-snug">
              {selectedResult
                ? selectedResult.fullAddress
                : "Click or drag pin on map to select exact location"}
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-700 text-xs font-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedResult || isGeocoding}
              className="btn-shine px-6 py-2.5 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] !text-white text-xs font-800 flex items-center gap-2 shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Check size={16} className="!text-white" />
              <span className="!text-white">Confirm &amp; Set Exact Location</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
