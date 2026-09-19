import React, { useEffect, useRef, useState } from "react";
import { createYoloWorker } from "../workers/workerFactory";

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
      }, 3000);

      workerRef.current.onmessage = (event) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        if (event.data.success) {
          setBox(event.data.boundingBox);
          setLoading(false);
        } else {
          setManualMode(true);
          setLoading(false);
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
        />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
            <span className="text-blue-600 font-medium animate-pulse">
              Running Edge AI Detection...
            </span>
          </div>
        )}

        {/* Overlay the AI-detected bounding box */}
        {!loading && box && !manualMode && (
          <div
            className="absolute border-4 border-green-500 bg-green-500 bg-opacity-20 pointer-events-none"
            style={{
              left: box.x,
              top: box.y,
              width: box.width,
              height: box.height,
            }}
            data-testid="ai-crop-box"
          />
        )}
      </div>

      <div className="mt-4 flex gap-4 items-center">
        {manualMode && (
          <p
            className="text-sm text-yellow-600 font-medium"
            data-testid="manual-mode-alert"
          >
            AI detection timed out or failed. Manual mode activated.
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
