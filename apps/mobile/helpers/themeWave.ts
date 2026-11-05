// The wave that spreads across the screen when the theme is changed between light and dark: a
// circle in the new theme's colour grows out from the control that was pressed until it covers the
// screen, the theme is switched while it is covered, and it then fades away to show the new look.
//
// The ThemeWaveHost (mounted once at the root) does the drawing; this module only lets any
// screen ask for it without knowing about it.

export interface WaveOrigin {
  x: number;
  y: number;
}

// Plays the wave, calling `apply` while the screen is covered. Resolves when it is over.
type WavePlayer = (
  origin: WaveOrigin,
  color: string,
  apply: () => void,
) => Promise<void>;

let player: WavePlayer | null = null;

// Called by the host. Returns a function that unregisters it.
export function registerThemeWave(next: WavePlayer): () => void {
  player = next;
  return () => {
    if (player === next) player = null;
  };
}

// Runs `apply` (which switches the theme) with the wave, or straight away when there is nothing
// to draw it with, or nowhere known to start it from. `apply` is always run exactly once.
export async function changeThemeWithWave(
  origin: WaveOrigin | undefined,
  color: string,
  apply: () => void,
): Promise<void> {
  if (!player || !origin) {
    apply();
    return;
  }
  await player(origin, color, apply);
}
