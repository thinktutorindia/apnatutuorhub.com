"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, MapPin, Check, Loader2, Navigation, Compass } from "lucide-react";
import type { LocationResult } from "./LocationSearchInput";

interface OpenStreetMapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLocation: (result: LocationResult) => void;
  initialLat?: number;
  initialLon?: number;
}

export function OpenStreetMapPickerModal({
  isOpen,
  onClose,
  onConfirmLocation,
  initialLat = 28.6139, // Default New Delhi
  initialLon = 77.209,
}: OpenStreetMapPickerModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);

  const [currentLat, setCurrentLat] = useState<number>(initialLat);
  const [currentLon, setCurrentLon] = useState<number>(initialLon);
  const [reverseLoading, setReverseLoading] = useState<boolean>(false);
  const [selectedResult, setSelectedResult] = useState<LocationResult | null>(null);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);

  // Load Leaflet CSS dynamically
  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
  }, []);

  // Initialize Leaflet Map on modal open
  // Reverse Geocode Coords to Address
  const fetchAddressFromCoords = async (lat: number, lon: number) => {
    setReverseLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`
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
        const area = addr.suburb || addr.neighbourhood || addr.road || addr.residential || "";

        const result: LocationResult = {
          city: city || "City",
          state: state || "India",
          pincode: pincode,
          area: area || city,
          fullAddress: data.display_name || `${area}, ${city}, ${state}`,
          lat: lat,
          lon: lon,
        };

        setSelectedResult(result);
      }
    } catch (e) {
      console.error("OpenStreetMap Reverse Geocoding Error:", e);
    } finally {
      setReverseLoading(false);
    }
  };

  // Inject Leaflet CSS dynamically + essential inline fallback styles
  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    if (!document.getElementById("leaflet-inline-fallback-css")) {
      const style = document.createElement("style");
      style.id = "leaflet-inline-fallback-css";
      style.textContent = `
        .leaflet-container { width: 100%; height: 100%; position: relative; z-index: 1; outline: none; }
        .leaflet-pane, .leaflet-tile, .leaflet-marker-icon, .leaflet-marker-shadow, .leaflet-tile-container, .leaflet-layer { position: absolute; left: 0; top: 0; }
        .leaflet-tile { width: 256px !important; height: 256px !important; }
        .leaflet-tile-container { pointer-events: none; }
        .leaflet-marker-icon, .leaflet-marker-shadow { display: block; pointer-events: auto; }
        .leaflet-zoom-animated { transition: transform 0.25s cubic-bezier(0,0,0.25,1); }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Initialize Leaflet Map ONCE when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function initLeafletMap() {
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

        // Ensure container exists
        setTimeout(() => {
          if (!mapContainerRef.current || !isMounted) return;

          if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
          }

          const map = L.map(mapContainerRef.current, {
            center: [initialLat, initialLon],
            zoom: 15,
            zoomControl: true,
          });

          // Esri World Street Map tiles (Unblocked, fast, high-res in India)
          L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
            {
              attribution: "Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012",
              maxZoom: 19,
            }
          ).addTo(map);

          const marker = L.marker([initialLat, initialLon], { draggable: true }).addTo(map);

          mapInstanceRef.current = map;
          markerInstanceRef.current = marker;

          // Multiple invalidateSize calls to ensure map renders smoothly after modal animation
          map.invalidateSize();
          setTimeout(() => map.invalidateSize(), 150);
          setTimeout(() => map.invalidateSize(), 400);

          // Handle Marker Drag
          marker.on("dragend", (e: any) => {
            const { lat, lng } = e.target.getLatLng();
            setCurrentLat(lat);
            setCurrentLon(lng);
            fetchAddressFromCoords(lat, lng);
          });

          // Handle Map Click
          map.on("click", (e: any) => {
            const { lat, lng } = e.latlng;
            marker.setLatLng([lat, lng]);
            setCurrentLat(lat);
            setCurrentLon(lng);
            fetchAddressFromCoords(lat, lng);
          });

          // Initial reverse geocode
          fetchAddressFromCoords(initialLat, initialLon);
        }, 100);
      } catch (err) {
        console.error("Leaflet Map init error:", err);
      }
    }

    initLeafletMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  // GPS My Location in Modal
  const handleGPSDetect = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentLat(latitude);
        setCurrentLon(longitude);
        if (mapInstanceRef.current && markerInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 16);
          markerInstanceRef.current.setLatLng([latitude, longitude]);
        }
        fetchAddressFromCoords(latitude, longitude);
        setGpsLoading(false);
      },
      (err) => {
        console.error("GPS error:", err);
        setGpsLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
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
              <h3 className="text-base font-800 text-[#0F2540] flex flex-wrap items-center gap-2 gap-y-1">
                <span>Pick Location on Map</span>
                <span className="text-[10px] font-800 bg-emerald-50 text-[#2D9E6B] px-2.5 py-0.5 rounded-full border border-emerald-200">
                  OpenStreetMap 🗺️
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-600">
                Click anywhere or drag the red pin to set your exact home/teaching location
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

        {/* Map Container Viewport */}
        <div className="relative w-full flex-1 min-h-[280px] sm:min-h-[340px] bg-slate-100">
          <div ref={mapContainerRef} className="w-full h-full z-10 min-h-[280px] sm:min-h-[340px]" />

          {/* Floating GPS Button */}
          <button
            type="button"
            onClick={handleGPSDetect}
            disabled={gpsLoading}
            className="absolute top-4 right-4 z-20 px-3.5 py-2 rounded-2xl bg-white hover:bg-emerald-50 text-slate-900 border border-slate-300 font-800 text-xs shadow-md flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {gpsLoading ? (
              <Loader2 size={15} className="animate-spin text-[#2D9E6B]" />
            ) : (
              <Navigation size={15} className="text-[#2D9E6B] fill-[#2D9E6B]" />
            )}
            <span>My GPS Location</span>
          </button>

          {/* Floating Instruction Banner */}
          <div className="absolute bottom-14 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-20 bg-slate-900/80 text-white text-[11px] font-700 px-3.5 py-2 rounded-2xl backdrop-blur-xs flex items-center gap-2 border border-white/10 shadow-lg">
            <MapPin size={14} className="text-[#2D9E6B] shrink-0" />
            <span>Click map or drag marker pin to update location</span>
          </div>
        </div>

        {/* Selected Address Preview & Footer Actions */}
        <div className="p-3.5 sm:p-5 bg-slate-50 border-t border-slate-200 space-y-3 shrink-0">
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1">
            <div className="flex items-center justify-between text-xs font-800 text-slate-500">
              <span className="flex items-center gap-1.5 text-[#0F2540]">
                <MapPin size={14} className="text-[#2D9E6B]" /> Selected Location
              </span>
              {reverseLoading ? (
                <span className="text-[11px] text-[#2D9E6B] flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" /> Geocoding address...
                </span>
              ) : selectedResult?.pincode ? (
                <span className="text-[11px] font-800 bg-amber-100 text-amber-950 px-2 py-0.5 rounded-md border border-amber-300">
                  PIN: {selectedResult.pincode}
                </span>
              ) : null}
            </div>

            <p className="text-xs sm:text-sm font-800 text-slate-900 leading-snug">
              {selectedResult
                ? selectedResult.fullAddress
                : "Click on map to select exact location"}
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
              disabled={!selectedResult || reverseLoading}
              className="btn-shine px-6 py-2.5 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] !text-white text-xs font-800 flex items-center gap-2 shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Check size={16} className="!text-white" />
              <span className="!text-white">Confirm &amp; Set Location</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
