"use client";

import React, { useEffect, useRef, useState } from "react";
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

export function InlineLocationMap({ lat, lon, onLocationChange }: InlineLocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [loadingAddress, setLoadingAddress] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lon: number }>({ lat, lon });
  const [detectedAddress, setDetectedAddress] = useState<string>("Pin Location on Map");

  // Reverse Geocode Coords to Exact Street/Colony/Landmark Name
  const reverseGeocode = async (latitude: number, longitude: number, isUserAction = false) => {
    setLoadingAddress(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const city =
          addr.city ||
          addr.town ||
          addr.suburb ||
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
          addr.amenity ||
          "";

        const formattedLabel = data.display_name
          ? data.display_name.split(",").slice(0, 4).join(",").trim()
          : `${area}, ${city}, ${state}`;

        setDetectedAddress(formattedLabel);

        // Only notify parent form when user explicitly moves or clicks on map
        if (isUserAction) {
          onLocationChange({
            city: city || "Delhi",
            state: state || "Delhi",
            pincode: pincode,
            area: area || city,
            fullAddress: formattedLabel,
            lat: latitude,
            lon: longitude,
          });
        }
      }
    } catch (e) {
      console.error("Reverse geocoding error:", e);
    } finally {
      setLoadingAddress(false);
    }
  };

  // Initialize Map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      try {
        const LModule = await import("leaflet");
        const L = LModule.default || LModule;

        // Fix default Leaflet icon paths
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });

        setTimeout(() => {
          if (!containerRef.current || !isMounted) return;

          if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
          }

          const map = L.map(containerRef.current, {
            center: [lat, lon],
            zoom: 16, // High detail zoom showing colony names & streets
            zoomControl: true,
          });

          // Standard OpenStreetMap tiles showing full English street & landmark labels
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            subdomains: ["a", "b", "c"],
            maxZoom: 19,
          }).addTo(map);

          const marker = L.marker([lat, lon], { draggable: true }).addTo(map);

          map.invalidateSize();
          setTimeout(() => map.invalidateSize(), 200);

          marker.on("dragend", (e: any) => {
            const newLat = e.target.getLatLng().lat;
            const newLng = e.target.getLatLng().lng;
            setCurrentCoords({ lat: newLat, lon: newLng });
            reverseGeocode(newLat, newLng, true);
          });

          map.on("click", (e: any) => {
            const newLat = e.latlng.lat;
            const newLng = e.latlng.lng;
            marker.setLatLng([newLat, newLng]);
            setCurrentCoords({ lat: newLat, lon: newLng });
            reverseGeocode(newLat, newLng, true);
          });

          mapRef.current = map;
          markerRef.current = marker;

          // Initial reverse geocode (visual badge only, do NOT trigger parent onLocationChange)
          reverseGeocode(lat, lon, false);
        }, 150);
      } catch (err) {
        console.error("Leaflet init error:", err);
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync map center & reverse geocode address banner when external lat/lon changes
  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      mapRef.current.setView([lat, lon], 16);
      markerRef.current.setLatLng([lat, lon]);
      setCurrentCoords({ lat, lon });
      reverseGeocode(lat, lon, false);
    }
  }, [lat, lon]);

  return (
    <div className="rounded-2xl border-2 border-emerald-300 bg-white overflow-hidden shadow-sm space-y-0">
      {/* Header Bar */}
      <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between">
        <div className="flex items-center gap-2 text-emerald-950 text-xs font-800">
          <Compass size={15} className="text-emerald-600 shrink-0" />
          <span>Interactive Pin Location Picker</span>
        </div>
        <div className="flex items-center gap-2">
          {loadingAddress ? (
            <span className="text-[11px] font-700 text-emerald-700 flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" /> Pinpointing address...
            </span>
          ) : (
            <span className="text-[10px] font-800 bg-white text-emerald-900 px-2.5 py-0.5 rounded-full border border-emerald-300">
              📍 {currentCoords.lat.toFixed(4)}° N, {currentCoords.lon.toFixed(4)}° E
            </span>
          )}
        </div>
      </div>

      {/* Map Element */}
      <div className="h-64 sm:h-72 w-full relative bg-slate-100">
        <div ref={containerRef} className="w-full h-full z-10" />

        {/* Live Reverse Geocoded Street & Landmark Banner */}
        <div className="absolute top-3 left-3 right-3 z-20 bg-white/95 text-gray-900 text-xs font-700 px-3.5 py-2 rounded-xl backdrop-blur-xs flex items-center justify-between border border-emerald-200 shadow-md">
          <div className="flex items-center gap-2 line-clamp-1">
            <MapPin size={15} className="text-emerald-600 shrink-0" />
            <span className="truncate">{detectedAddress}</span>
          </div>
        </div>

        {/* Floating Drag Instruction */}
        <div className="absolute bottom-3 left-3 right-3 z-20 bg-slate-900/80 text-white text-[11px] font-700 px-3 py-1.5 rounded-xl backdrop-blur-xs flex items-center gap-2 shadow-md">
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

