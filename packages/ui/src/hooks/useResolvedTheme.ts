import { useSyncExternalStore } from "react";

// Reads what the page is showing right now: a theme forced on <html data-theme> (by the theme
// toggle), otherwise the device's own setting.
function readResolvedTheme(): "light" | "dark" {
  const forced = document.documentElement.dataset.theme;
  if (forced === "light" || forced === "dark") return forced;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  media?.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    media?.removeEventListener("change", onChange);
  };
}

// The theme the page is showing, kept up to date when the visitor flips the theme toggle or
// the device switches between light and dark. Use it for things the stylesheet cannot reach,
// such as third-party widgets drawn in an iframe.
export function useResolvedTheme(): "light" | "dark" {
  return useSyncExternalStore(subscribe, readResolvedTheme, () => "light");
}
