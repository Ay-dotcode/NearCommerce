import { API_URL } from "@/constants";

// Uploaded product pictures live in our own database and are served by the API at
// /api/images/<id>. The URL saved on the product was built from whatever host the store owner
// uploaded from (often localhost or an old address), which a shopper's phone can't reach, so
// those are rebuilt against the API address this app was built with.
const UPLOADED_IMAGE = /\/api\/images\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;

const apiBase = () => API_URL.replace(/\/+$/, "");

// Returns a URL the phone can load, or null when the product has no usable picture.
export function resolveImageUrl(raw?: string | null): string | null {
  const url = raw?.trim();
  if (!url) return null;

  const uploaded = UPLOADED_IMAGE.exec(url);
  if (uploaded) return `${apiBase()}/api/images/${uploaded[1]}`;

  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${apiBase()}${url}`;
  return null;
}
