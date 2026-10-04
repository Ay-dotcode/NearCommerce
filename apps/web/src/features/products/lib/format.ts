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
