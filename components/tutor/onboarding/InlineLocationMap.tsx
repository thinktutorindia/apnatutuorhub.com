"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, MapPin, Navigation, Compass } from "lucide-react";

export type LocationResult = {
  city: string;
  state: string;
  pincode: string;
  area: string;
  fullAddress: string;
  lat: number;
  lon: number;
};

interface InlineLocationMapProps {
  lat: number;
  lon: number;
  onLocationChange: (result: LocationResult) => void;
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

// ── Reverse Geocode with Nominatim (with fallback)
async function reverseGeocodeCoords(lat: number, lon: number): Promise<LocationResult> {
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
        state: state || "India",
        pincode,
        area: area || city,
        fullAddress: data.display_name || `${area}, ${city}, ${state}`.replace(/^, |, $/g, ""),
        lat,
        lon,
      };
    }
  } catch (e) {
    console.warn("Inline reverse geocoding note:", e);
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

export function InlineLocationMap({ lat, lon, onLocationChange }: InlineLocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [loadingAddress, setLoadingAddress] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lon: number }>({ lat, lon });
  const [detectedAddress, setDetectedAddress] = useState<string>("Pin Location on Map");

  // Reverse Geocode handler
  const doReverseGeocode = useCallback(
    async (latitude: number, longitude: number, isUserAction = false) => {
      setLoadingAddress(true);
      try {
        const result = await reverseGeocodeCoords(latitude, longitude);
        setDetectedAddress(result.fullAddress);
        if (isUserAction) {
          onLocationChange(result);
        }
      } finally {
        setLoadingAddress(false);
      }
    },
    [onLocationChange]
  );

  // Initialize Leaflet Map
  useEffect(() => {
    let isCancelled = false;

    async function init() {
      try {
        await loadLeaflet();
        if (isCancelled || !containerRef.current) return;

        const L = window.L;

        // Cleanup previous instance if any
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        // Custom Emerald Pin Icon
        const customPinIcon = L.divIcon({
          className: "custom-leaflet-marker-inline",
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

        // Initialize Map
        const map = L.map(containerRef.current, {
          center: [lat, lon],
          zoom: 16,
          zoomControl: false,
        });

        L.control.zoom({ position: "bottomright" }).addTo(map);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        const marker = L.marker([lat, lon], {
          icon: customPinIcon,
          draggable: true,
          autoPan: true,
        }).addTo(map);

        mapRef.current = map;
        markerRef.current = marker;

        // Marker Drag
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          setCurrentCoords({ lat: pos.lat, lon: pos.lng });
          doReverseGeocode(pos.lat, pos.lng, true);
        });

        // Map Click
        map.on("click", (e: any) => {
          const { lat: clickLat, lng: clickLng } = e.latlng;
          marker.setLatLng([clickLat, clickLng]);
          setCurrentCoords({ lat: clickLat, lon: clickLng });
          doReverseGeocode(clickLat, clickLng, true);
        });

        setTimeout(() => {
          map.invalidateSize();
        }, 200);

        doReverseGeocode(lat, lon, false);
      } catch (err) {
        console.error("Leaflet Inline Map Init Error:", err);
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
  }, [lat, lon, doReverseGeocode]);

  return (
    <div className="rounded-2xl border-2 border-emerald-300 bg-white overflow-hidden shadow-sm space-y-0">
      {/* Header Bar */}
      <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between">
        <div className="flex items-center gap-2 text-emerald-950 text-xs font-800">
          <Compass size={15} className="text-emerald-600 shrink-0" />
          <span>Interactive Map Pinpoint</span>
        </div>
        <div className="flex items-center gap-2">
          {loadingAddress ? (
            <span className="text-[11px] font-700 text-emerald-700 flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" /> Pinpointing address...
            </span>
          ) : (
            <span className="text-[10px] font-800 bg-white text-emerald-900 px-2.5 py-0.5 rounded-full border border-emerald-300">
              📍 {currentCoords.lat.toFixed(5)}° N, {currentCoords.lon.toFixed(5)}° E
            </span>
          )}
        </div>
      </div>

      {/* Map Element */}
      <div className="h-64 sm:h-72 w-full relative bg-slate-100">
        <div ref={containerRef} className="w-full h-full min-h-[256px]" />

        {/* Live Reverse Geocoded Street & Landmark Banner */}
        <div className="absolute top-3 left-3 right-3 z-[1000] bg-white/95 text-gray-900 text-xs font-700 px-3.5 py-2 rounded-xl backdrop-blur-xs flex items-center justify-between border border-emerald-200 shadow-md">
          <div className="flex items-center gap-2 line-clamp-1">
            <MapPin size={15} className="text-emerald-600 shrink-0" />
            <span className="truncate">{detectedAddress}</span>
          </div>
        </div>

        {/* Floating Drag Instruction */}
        <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-slate-900/80 text-white text-[11px] font-700 px-3 py-1.5 rounded-xl backdrop-blur-xs flex items-center gap-2 shadow-md pointer-events-none">
          <Navigation size={13} className="text-emerald-400 shrink-0" />
          <span>Click map or drag marker pin to update your precise residence location</span>
        </div>
      </div>

      {/* Prominent Live GPS Coordinates Verification Badge */}
      <div className="p-3 bg-emerald-50 border-t border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-800 shrink-0">
            ✓
          </div>
          <span className="font-800 text-emerald-950">Captured GPS Coordinates:</span>
        </div>
        <div className="font-800 text-emerald-900 bg-white px-3 py-1 rounded-xl border border-emerald-300 shadow-2xs font-mono text-[11px]">
          📍 Latitude: {currentCoords.lat.toFixed(5)}° N | Longitude: {currentCoords.lon.toFixed(5)}° E
        </div>
      </div>
    </div>
  );
}
