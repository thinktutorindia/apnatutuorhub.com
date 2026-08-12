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
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  // Load Image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => setImage(img);
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

    // Move to center of canvas
    ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Draw image centered
    ctx.drawImage(image, -image.width / 2, -image.height / 2);

    ctx.restore();

    // Draw Circular/Square Mask Overlay
    ctx.save();

    // Semi-transparent dark overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, width, height);

    // Cut out crop circle at center (size 260x260)
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
  }, [image, zoom, rotation, pan]);

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

  const handleMouseUp = () => setIsDragging(false);

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

      const displayCanvas = canvasRef.current;
      if (!displayCanvas) return;

      const cropRadius = 130;
      const scaleFactor = 400 / (cropRadius * 2);

      ctx.save();
      ctx.translate(200, 200);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom * scaleFactor, zoom * scaleFactor);

      // Translate by pan scaled to output canvas
      const relPanX = (pan.x / (displayCanvas.width / 2)) * 200;
      const relPanY = (pan.y / (displayCanvas.height / 2)) * 200;
      ctx.translate(relPanX, relPanY);

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
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="cursor-move touch-none"
          />
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] font-700 px-3 py-1 rounded-full pointer-events-none">
            🖐️ Drag pin to position · Scroll / Slider to zoom
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
              className="text-xs font-700 text-gray-500 hover:text-gray-900 underline"
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
            className="px-5 py-2.5 rounded-2xl border border-gray-300 text-gray-700 text-xs font-800 hover:bg-gray-100 transition-colors"
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
            <span className="!text-white font-800">
              {isProcessing ? "Cropping..." : "Crop & Save Photo"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
