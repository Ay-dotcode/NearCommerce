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
export const THEME_WAVE_EXPAND_MS = 550;
export const THEME_WAVE_CHANGE_TIMEOUT_MS = 400;

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
      (origin, apply) =>
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
          let mountTimer: ReturnType<typeof setTimeout> | undefined;
          let changeTimer: ReturnType<typeof setTimeout> | undefined;

          const applyOnce = () => {
            if (applied) return;
            applied = true;
            apply();
          };
          const finish = () => {
            if (over) return;
            over = true;
            clearTimeout(mountTimer);
            clearTimeout(changeTimer);
            onLookChange.current = null;
            if (cancelCurrent.current === finish) cancelCurrent.current = null;
            grow.stopAnimation();
            applyOnce();
            endWave();
            resolve();
          };
          cancelCurrent.current = finish;

          const spread = (dark: boolean) => {
            if (over) return;
            clearTimeout(changeTimer);
            onLookChange.current = null;
            updateWave({ to: dark ? darkTheme : lightTheme });
            Animated.timing(grow, {
              toValue: 1,
              duration: THEME_WAVE_EXPAND_MS,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }).start(finish);
          };

          grow.setValue(0);
          beginWave({
            origin,
            radius,
            from: fromDark ? darkTheme : lightTheme,
            to: null,
            grow,
          });

          mountTimer = setTimeout(() => {
            if (over) return;
            applyOnce();
            if (isDarkRef.current !== fromDark)
              return spread(isDarkRef.current);
            onLookChange.current = (dark) => {
              if (dark !== fromDark) spread(dark);
            };
            changeTimer = setTimeout(finish, THEME_WAVE_CHANGE_TIMEOUT_MS);
          }, THEME_WAVE_MOUNT_MS);
        }),
    );
    return () => {
      unregister();
      cancelCurrent.current?.();
    };
  }, [grow]);

  return null;
}
