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
