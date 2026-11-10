import {
  beginWave,
  endWave,
  registerThemeWave,
  updateWave,
} from "@/helpers/themeWave";
import { useReduceMotion } from "@/src/hooks/useReduceMotion";
import { darkTheme, lightTheme, useTheme } from "@/theme";
import { useEffect, useRef } from "react";
import { Animated, Dimensions, Easing } from "react-native";

export const THEME_WAVE_MOUNT_MS = 40;
export const THEME_WAVE_EXPAND_MS = 650;
export const THEME_WAVE_APPLY_DELAY_MS = 100;
export const THEME_WAVE_CHANGE_TIMEOUT_MS = 1200;
export const THEME_WAVE_RETINT_MS = 80;

const lookOf = (dark: boolean) => (dark ? darkTheme : lightTheme);
export function ThemeWaveHost() {
  const reduceMotion = useReduceMotion();
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;

  const { isDark } = useTheme();
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;
  const onLookChange = useRef<((dark: boolean) => void) | null>(null);
  useEffect(() => {
    onLookChange.current?.(isDark);
  }, [isDark]);

  const grow = useRef(new Animated.Value(0)).current;
  const cancelCurrent = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unregister = registerThemeWave(
      (origin, apply, targetDark) =>
        new Promise<void>((resolve) => {
          if (reduceMotionRef.current) {
            apply();
            resolve();
            return;
          }
          cancelCurrent.current?.();

          const fromDark = isDarkRef.current;
          const { width, height } = Dimensions.get("window");
          const radius = Math.hypot(
            Math.max(origin.x, width - origin.x),
            Math.max(origin.y, height - origin.y),
          );
          let applied = false;
          let over = false;
          let shown: boolean | null = null;
          let animationDone = true;
          let settled = false;
          const timers: ReturnType<typeof setTimeout>[] = [];

          const applyOnce = () => {
            if (applied) return;
            applied = true;
            apply();
          };
          const finish = () => {
            if (over) return;
            over = true;
            timers.forEach(clearTimeout);
            onLookChange.current = null;
            if (cancelCurrent.current === finish) cancelCurrent.current = null;
            grow.stopAnimation();
            applyOnce();
            endWave();
            resolve();
          };
          const finishIfReady = () => {
            if (settled && animationDone) finish();
          };

          const spread = (dark: boolean) => {
            if (over || shown !== null) return;
            shown = dark;
            animationDone = false;
            updateWave({ to: lookOf(dark) });
            Animated.timing(grow, {
              toValue: 1,
              duration: THEME_WAVE_EXPAND_MS,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }).start(() => {
              animationDone = true;
              finishIfReady();
            });
          };

          const settle = (dark: boolean) => {
            if (over || settled) return;
            settled = true;
            onLookChange.current = null;
            if (shown === null) {
              if (dark !== fromDark) spread(dark);
            } else if (shown !== dark) {
              shown = dark;
              updateWave({ to: lookOf(dark) });
              if (animationDone) {
                animationDone = false;
                timers.push(
                  setTimeout(() => {
                    animationDone = true;
                    finishIfReady();
                  }, THEME_WAVE_RETINT_MS),
                );
              }
            }
            finishIfReady();
          };

          grow.setValue(0);
          beginWave({
            origin,
            radius,
            from: lookOf(fromDark),
            to: null,
            grow,
          });

          const startsNow = targetDark !== undefined && targetDark !== fromDark;
          timers.push(
            setTimeout(() => {
              if (over) return;
              if (startsNow) spread(targetDark);
              timers.push(
                setTimeout(
                  () => {
                    if (over) return;
                    applyOnce();
                    if (isDarkRef.current !== fromDark)
                      return settle(isDarkRef.current);
                    onLookChange.current = (dark) => {
                      if (dark !== fromDark) settle(dark);
                    };
                    timers.push(
                      setTimeout(
                        () => settle(fromDark),
                        THEME_WAVE_CHANGE_TIMEOUT_MS,
                      ),
                    );
                  },
                  startsNow ? THEME_WAVE_APPLY_DELAY_MS : 0,
                ),
              );
            }, THEME_WAVE_MOUNT_MS),
          );
          cancelCurrent.current = finish;
        }),
    );
    return () => {
      unregister();
      cancelCurrent.current?.();
    };
  }, [grow]);

  return null;
}
