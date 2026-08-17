"use client";

import React, { useState, useRef, useEffect } from "react";
import { ZoomIn, RotateCw, Check, X, Move } from "lucide-react";

interface ImageCropModalProps {
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  onClose: () => void;
  aspectRatio?: number; // 1 for square/circle
}

export function ImageCropModal({
  imageSrc,
  onCropComplete,
  onClose,
  aspectRatio = 1,
}: ImageCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  // Load Image and calculate optimal base scale to fill 260px crop viewport
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
      setImage(img);
      const minDim = Math.min(img.width, img.height);
      const initialFit = minDim > 0 ? 260 / minDim : 1;
      setBaseScale(initialFit);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setRotation(0);
    };
  }, [imageSrc]);

  // Draw Interactive Crop Canvas
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Save context
    ctx.save();

    // 1. Move to center of canvas + current pan
    ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
    // 2. Rotate
    ctx.rotate((rotation * Math.PI) / 180);
    // 3. Scale by baseScale * zoom
    const currentScale = baseScale * zoom;
    ctx.scale(currentScale, currentScale);

    // 4. Draw image centered
    ctx.drawImage(image, -image.width / 2, -image.height / 2);

    ctx.restore();

    // Draw Circular/Square Mask Overlay
    ctx.save();

    // Semi-transparent dark overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, width, height);

    // Cut out crop circle at center (size 260x260, radius 130)
    const cropRadius = 130;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, cropRadius, 0, Math.PI * 2, true);
    ctx.fill();

    ctx.restore();

    // Draw Crop Ring Outline
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, cropRadius, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#2D9E6B";
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.restore();
  };

  useEffect(() => {
    drawCanvas();
  }, [image, baseScale, zoom, rotation, pan]);

  // Mouse / Touch Dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleDragEnd = () => setIsDragging(false);

  // Perform Final High-Res Crop
  const handleApplyCrop = async () => {
    if (!image) return;
    setIsProcessing(true);

    try {
      // Offscreen canvas at 400x400 output resolution
      const outputCanvas = document.createElement("canvas");
      outputCanvas.width = 400;
      outputCanvas.height = 400;
      const ctx = outputCanvas.getContext("2d");

      if (!ctx) return;

      const cropDiameter = 260; // Diameter on 340px canvas
      const ratio = 400 / cropDiameter;
      const outputScale = baseScale * zoom * ratio;

      ctx.save();
      // 1. Move to center of 400x400 canvas + pan scaled by ratio
      ctx.translate(200 + pan.x * ratio, 200 + pan.y * ratio);
      // 2. Rotate
      ctx.rotate((rotation * Math.PI) / 180);
      // 3. Scale
      ctx.scale(outputScale, outputScale);
      // 4. Draw image
      ctx.drawImage(image, -image.width / 2, -image.height / 2);
      ctx.restore();

      // Convert to Blob
      outputCanvas.toBlob(
        (blob) => {
          if (blob) {
            onCropComplete(blob);
          }
          setIsProcessing(false);
        },
        "image/jpeg",
        0.92
      );
    } catch (err) {
      console.error("Crop error:", err);
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl w-full max-w-lg relative overflow-hidden flex flex-col space-y-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <h3 className="text-base font-900 text-gray-900 flex items-center gap-2">
            <Move size={18} className="text-[#2D9E6B]" />
            Adjust &amp; Crop Profile Photo
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Canvas Display */}
        <div className="relative mx-auto bg-gray-900 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={340}
            height={340}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleDragEnd}
            className="cursor-move touch-none"
          />
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] font-700 px-3 py-1 rounded-full pointer-events-none whitespace-nowrap">
            🖐️ Drag to position · Slider to zoom
          </div>
        </div>

        {/* Zoom & Rotate Controls */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-3">
            <ZoomIn size={16} className="text-gray-500 shrink-0" />
            <span className="text-xs font-800 text-gray-700 w-12">Zoom</span>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full h-2 rounded-lg bg-gray-200 accent-[#2D9E6B] cursor-pointer"
            />
            <span className="text-xs font-800 text-[#2D9E6B] w-10 text-right">
              {zoom.toFixed(1)}x
            </span>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setRotation((prev) => (prev + 90) % 360)}
              className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCw size={14} />
              <span>Rotate 90°</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setRotation(0);
                setPan({ x: 0, y: 0 });
              }}
              className="text-xs font-700 text-gray-500 hover:text-gray-900 underline cursor-pointer"
            >
              Reset Controls
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl border border-gray-300 text-gray-700 text-xs font-800 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            disabled={isProcessing}
            className="px-6 py-2.5 rounded-2xl bg-[#2D9E6B] hover:bg-[#238357] !text-white text-xs font-800 flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <Check size={16} className="!text-white" />
            <span>{isProcessing ? "Processing..." : "Crop & Save Photo"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
