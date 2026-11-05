// The wave that spreads across the page when the theme is changed: the new look grows out from
// the button that was pressed as a circle, until it covers the page. It uses the browser's View
// Transitions API (a snapshot of the old page stays underneath while the new one is revealed).
// Browsers without it, and people who asked for less motion, simply get the instant change.

export const THEME_WAVE_MS = 650;

export interface WaveOrigin {
  x: number;
  y: number;
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => {
    ready: Promise<void>;
    finished: Promise<void>;
  };
};

export function prefersReducedMotion(): boolean {
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

// Radius of the circle that reaches the farthest corner of the window from the origin.
export function waveRadius({ x, y }: WaveOrigin, width: number, height: number) {
  return Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
}

// Runs `change` (which must switch the page's theme synchronously) with the wave, or without any
// animation where it is not available. `change` is always run exactly once.
export function startThemeWave(origin: WaveOrigin, change: () => void): void {
  const doc = document as ViewTransitionDocument;
  if (typeof doc.startViewTransition !== "function" || prefersReducedMotion()) {
    change();
    return;
  }

  const transition = doc.startViewTransition(change);
  const radius = waveRadius(origin, window.innerWidth, window.innerHeight);
  transition.ready
    .then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${origin.x}px ${origin.y}px)`,
            `circle(${radius}px at ${origin.x}px ${origin.y}px)`,
          ],
        },
        {
          duration: THEME_WAVE_MS,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    // The browser can skip a transition (for example when the tab is hidden); the theme has
    // still been changed by then.
    .catch(() => {});
}
