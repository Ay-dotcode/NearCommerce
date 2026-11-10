import type { Theme } from "@/theme";
import type { Animated } from "react-native";

export interface WaveOrigin {
  x: number;
  y: number;
}

export interface ActiveWave {
  origin: WaveOrigin;
  radius: number;
  from: Theme;
  to: Theme | null;
  grow: Animated.Value;
}

let active: ActiveWave | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export const getActiveWave = () => active;
export const isWaveActive = () => active !== null;

export function subscribeWave(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function beginWave(wave: ActiveWave) {
  active = wave;
  notify();
}

export function updateWave(patch: Partial<Pick<ActiveWave, "to">>) {
  if (!active) return;
  active = { ...active, ...patch };
  notify();
}

export function endWave() {
  if (!active) return;
  active = null;
  notify();
}

type WavePlayer = (
  origin: WaveOrigin,
  apply: () => void,
  targetDark?: boolean,
) => Promise<void>;

let player: WavePlayer | null = null;

export function registerThemeWave(next: WavePlayer): () => void {
  player = next;
  return () => {
    if (player === next) player = null;
  };
}

export async function changeThemeWithWave(
  origin: WaveOrigin | undefined,
  apply: () => void,
  targetDark?: boolean,
): Promise<void> {
  if (!player || !origin) {
    apply();
    return;
  }
  await player(origin, apply, targetDark);
}
