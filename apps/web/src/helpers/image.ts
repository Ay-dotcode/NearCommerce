export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
// Raw phone photos are large; the cropper shrinks them before upload.
export const MAX_SOURCE_IMAGE_BYTES = 15 * 1024 * 1024;

// Returns an error message for a file the picker cannot use, or null when it is fine.
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type))
    return "Choose a JPEG, PNG or WebP image.";
  if (file.size > MAX_SOURCE_IMAGE_BYTES)
    return "That image is larger than 15 MB. Choose a smaller one.";
  return null;
}

// Converts the cropper's data URL into a Blob for upload.
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, payload = ""] = dataUrl.split(",");
  const type = /^data:([^;]+)/.exec(header)?.[1] ?? "application/octet-stream";
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

export const IMAGE_URL_PATTERN = /^https?:\/\/\S+$/i;
export const IMAGE_CHECK_TIMEOUT_MS = 8000;

const checked = new Map<string, Promise<boolean>>();

// Resolves true only when the URL really loads as an image in the browser. A link to a web
// page, a missing file or an unreachable host all resolve false. Results are cached per URL so
// re-validating the same link (typing, then submitting) does not download it again.
export function checkImageUrl(
  url: string,
  timeoutMs = IMAGE_CHECK_TIMEOUT_MS,
): Promise<boolean> {
  const key = url.trim();
  if (!IMAGE_URL_PATTERN.test(key)) return Promise.resolve(false);
  const cached = checked.get(key);
  if (cached) return cached;

  const result = new Promise<boolean>((resolve) => {
    const img = new Image();
    const finish = (ok: boolean) => {
      window.clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      resolve(ok);
    };
    const timer = window.setTimeout(() => finish(false), timeoutMs);
    img.onload = () => finish(img.naturalWidth > 0 && img.naturalHeight > 0);
    img.onerror = () => finish(false);
    img.referrerPolicy = "no-referrer";
    img.src = key;
  });
  checked.set(key, result);
  // A failure may be temporary (offline, slow host), so allow it to be retried later.
  void result.then((ok) => {
    if (!ok) checked.delete(key);
  });
  return result;
}

// Test helper: forget every cached result.
export const clearImageCheckCache = () => checked.clear();
