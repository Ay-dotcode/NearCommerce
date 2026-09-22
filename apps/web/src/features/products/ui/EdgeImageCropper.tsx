import { createYoloWorker } from "@/workers/workerFactory";
import React, { useEffect, useRef, useState } from "react";

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface EdgeImageCropperProps {
  imageUrl: string;
  onCropComplete: (croppedDataUrl: string) => void;
}

export const EdgeImageCropper: React.FC<EdgeImageCropperProps> = ({
  imageUrl,
  onCropComplete,
}) => {
  const [loading, setLoading] = useState(true);
  const [manualMode, setManualMode] = useState(false);
  const [box, setBox] = useState<BoundingBox | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, img.width, img.height);

      // Spawn the YOLO Web Worker via the isolated factory
      workerRef.current = createYoloWorker();

      // Enforce the strict 3-second fallback rule
      timeoutRef.current = setTimeout(() => {
        workerRef.current?.terminate();
        setLoading(false);
        setManualMode(true);
        setBox({
          x: img.width * 0.1,
          y: img.height * 0.1,
          width: img.width * 0.8,
          height: img.height * 0.8,
        });
      }, 3000);

      workerRef.current.onmessage = (event) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        if (event.data.success) {
          setBox(event.data.boundingBox);
          setLoading(false);
        } else {
          setManualMode(true);
          setLoading(false);
          setBox({
            x: img.width * 0.1,
            y: img.height * 0.1,
            width: img.width * 0.8,
            height: img.height * 0.8,
          });
        }
      };

      // Dispatch the image tensor data to the worker
      workerRef.current.postMessage({
        imageData,
        width: img.width,
        height: img.height,
      });
    };

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      workerRef.current?.terminate();
    };
  }, [imageUrl]);

  const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
      y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!manualMode) return;
    const point = getCanvasPoint(event);
    if (!point) return;
    dragStartRef.current = point;
    event.currentTarget.setPointerCapture(event.pointerId);
    setBox({ x: point.x, y: point.y, width: 1, height: 1 });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!manualMode || !dragStartRef.current) return;
    const point = getCanvasPoint(event);
    if (!point || !canvasRef.current) return;
    const start = dragStartRef.current;
    const x = Math.min(start.x, point.x);
    const y = Math.min(start.y, point.y);
    setBox({
      x,
      y,
      width: Math.max(1, Math.abs(point.x - start.x)),
      height: Math.max(1, Math.abs(point.y - start.y)),
    });
  };

  const handlePointerUp = () => {
    dragStartRef.current = null;
  };

  const handleConfirmCrop = () => {
    if (!canvasRef.current || !box) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const croppedImageData = ctx.getImageData(
      box.x,
      box.y,
      box.width,
      box.height,
    );
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = box.width;
    tempCanvas.height = box.height;
    tempCanvas.getContext("2d")?.putImageData(croppedImageData, 0, 0);

    onCropComplete(tempCanvas.toDataURL("image/jpeg"));
  };

  return (
    <div className="flex flex-col items-center border p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold mb-4">Product Image Cropper</h3>

      <div className="relative">
        <canvas
          ref={canvasRef}
          className="max-w-full h-auto border shadow-sm"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ cursor: manualMode ? "crosshair" : "default" }}
        />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
            <span className="text-blue-600 font-medium animate-pulse">
              Running Edge AI Detection...
            </span>
          </div>
        )}

        {/* Overlay the AI-detected bounding box */}
        {!loading && box && (
          <div
            className={`absolute border-4 bg-opacity-20 pointer-events-none ${
              manualMode
                ? "border-yellow-500 bg-yellow-500"
                : "border-green-500 bg-green-500"
            }`}
            style={{
              left: `${(box.x / (canvasRef.current?.width || 1)) * 100}%`,
              top: `${(box.y / (canvasRef.current?.height || 1)) * 100}%`,
              width: `${(box.width / (canvasRef.current?.width || 1)) * 100}%`,
              height: `${(box.height / (canvasRef.current?.height || 1)) * 100}%`,
            }}
            data-testid={manualMode ? "manual-crop-box" : "ai-crop-box"}
          />
        )}
      </div>

      <div className="mt-4 flex gap-4 items-center">
        {manualMode && (
          <p
            className="text-sm text-yellow-600 font-medium"
            data-testid="manual-mode-alert"
          >
            AI detection timed out or failed. Drag on the image to adjust the
            crop.
          </p>
        )}
        {!loading && box && (
          <button
            onClick={handleConfirmCrop}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Confirm Crop
          </button>
        )}
      </div>
    </div>
  );
};
