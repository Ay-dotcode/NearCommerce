import { uploadProductImage } from "@/api/uploads";
import { Button } from "@/components/ui";
import {
  ACCEPTED_IMAGE_TYPES,
  dataUrlToBlob,
  validateImageFile,
} from "@/features/products/lib/image";
import { parseApiError } from "@nearcommerce/api";
import React, { lazy, Suspense, useEffect, useState } from "react";

// Loaded on demand so the cropper is not part of the main bundle.
const EdgeImageCropper = lazy(() =>
  import("@/features/products/ui/EdgeImageCropper").then((m) => ({
    default: m.EdgeImageCropper,
  })),
);

interface Props {
  // The product's current image URL, if any.
  value: string;
  onChange: (url: string) => void;
}

// Choose a photo, crop it (auto-detected, or by hand), upload it, and hand back the hosted URL.
export const ProductImagePicker: React.FC<Props> = ({ value, onChange }) => {
  const [source, setSource] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Object URLs hold the file in memory until revoked.
  useEffect(
    () => () => {
      if (source) URL.revokeObjectURL(source);
    },
    [source],
  );

  const choose = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSource(URL.createObjectURL(file));
  };

  const upload = async (croppedDataUrl: string) => {
    setUploading(true);
    setError(null);
    try {
      onChange(await uploadProductImage(dataUrlToBlob(croppedDataUrl)));
      setSource(null);
    } catch (err) {
      setError(
        parseApiError(err, "We couldn't upload the image. Please try again.")
          .message,
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <span className="block text-sm font-medium text-slate-800">
        Product photo
      </span>

      {source ? (
        <div className="space-y-2">
          <Suspense
            fallback={<p className="text-sm text-slate-500">Loading editor…</p>}
          >
            <EdgeImageCropper imageUrl={source} onCropComplete={upload} />
          </Suspense>
          {uploading && (
            <p role="status" className="text-sm text-slate-600">
              Uploading…
            </p>
          )}
          <Button
            variant="secondary"
            onClick={() => setSource(null)}
            disabled={uploading}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {value && (
            <img
              src={value}
              alt="Current product"
              className="h-24 w-24 rounded-lg border border-slate-200 object-cover"
              onError={(e) =>
                ((e.currentTarget as HTMLImageElement).style.display = "none")
              }
            />
          )}
          <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {value ? "Replace photo" : "Upload photo"}
            <input
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              className="sr-only"
              onChange={choose}
              aria-label="Choose product photo"
            />
          </label>
          {value && (
            <Button variant="secondary" onClick={() => onChange("")}>
              Remove photo
            </Button>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};
