import { useDebouncedValue } from "@nearcommerce/ui";
import { useEffect, useState } from "react";
import { checkImageUrl, IMAGE_URL_PATTERN } from "./image";

export type ImageUrlStatus = "idle" | "checking" | "valid" | "invalid";

// Watches an image URL the user is typing and reports whether it leads to a real image.
// Waits for typing to pause before loading the URL, so half-typed links are not fetched.
export function useImageUrlCheck(url: string, delayMs = 600): ImageUrlStatus {
  const trimmed = url.trim();
  const debounced = useDebouncedValue(trimmed, delayMs);
  const [result, setResult] = useState<{
    url: string;
    ok: boolean;
  } | null>(null);

  useEffect(() => {
    if (!debounced || !IMAGE_URL_PATTERN.test(debounced)) return;
    let cancelled = false;
    void checkImageUrl(debounced).then((ok) => {
      if (!cancelled) setResult({ url: debounced, ok });
    });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  if (!trimmed) return "idle";
  if (!IMAGE_URL_PATTERN.test(trimmed)) return "invalid";
  if (result?.url === trimmed) return result.ok ? "valid" : "invalid";
  return "checking";
}
