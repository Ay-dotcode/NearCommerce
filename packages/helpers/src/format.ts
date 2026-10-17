const DAY_MS = 24 * 60 * 60 * 1000;

// "just now", "5 minutes ago", "3 days ago", "2 months ago". Invalid dates return "unknown".
export function timeAgo(
  iso: string | undefined,
  now: number = Date.now(),
): string {
  const then = iso ? new Date(iso).getTime() : NaN;
  if (!Number.isFinite(then)) return "unknown";
  const diff = Math.max(0, now - then);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(diff / (60 * 60_000));
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(diff / DAY_MS);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

// 1234.5 -> "1,234.50". Accepts the numeric strings Postgres DECIMAL columns can produce.
export function formatPrice(value: number | string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// 3 -> "3 days", 1 -> "1 day". Pass the plural when it is not just "+s" ("category", "categories").
export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

// "12 Oct 2026". Invalid dates return "unknown".
export function formatDate(iso: string | undefined): string {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return "unknown";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// "12 Oct", for chart axes.
export function formatShortDate(isoDay: string): string {
  return new Date(`${isoDay}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

// "Jane Doe" -> "J": the letter shown in an avatar circle.
export function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

// 5 -> "5 km". Distances are shown in kilometres everywhere.
export const formatKm = (km: number) => `${km} km`;

// 1234 metres -> "1.2 km"; under a kilometre stays readable: 420 -> "420 m".
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return "unknown";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
