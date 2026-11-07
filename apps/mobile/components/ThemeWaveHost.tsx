import { registerThemeWave, type WaveOrigin } from "@/helpers/themeWave";
import { useReduceMotion } from "@/src/hooks/useReduceMotion";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, StyleSheet } from "react-native";

export const THEME_WAVE_MOUNT_MS = 30;
export const THEME_FADE_IN_MS = 180;
export const THEME_WAVE_SETTLE_MS = 60;
export const THEME_FADE_OUT_MS = 200;

interface TransitionState {
  origin?: WaveOrigin;
  color: string;
  apply: () => void;
  done: () => void;
}

// Draws the professional theme cross-fade transition overlay. Mount it once, near the root.
// It is a Modal of its own so that it also covers the settings drawer where the theme control lives.
export function ThemeWaveHost() {
  const reduceMotion = useReduceMotion();
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;

  const [transition, setTransition] = useState<TransitionState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(
    () =>
      registerThemeWave(
        (origin, color, apply) =>
          new Promise<void>((resolve) => {
            if (reduceMotionRef.current) {
              apply();
              resolve();
              return;
            }
            opacity.setValue(0);
            setTransition({ origin, color, apply, done: resolve });
          }),
      ),
    [opacity],
  );

  useEffect(() => {
    if (!transition) return;
    let applied = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const applyOnce = () => {
      if (applied) return;
      applied = true;
      transition.apply();
    };

    timers.push(
      setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 1,
          duration: THEME_FADE_IN_MS,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start(() => {
          applyOnce();
          timers.push(
            setTimeout(() => {
              Animated.timing(opacity, {
                toValue: 0,
                duration: THEME_FADE_OUT_MS,
                easing: Easing.in(Easing.ease),
                useNativeDriver: true,
              }).start(() => {
                setTransition(null);
                transition.done();
              });
            }, THEME_WAVE_SETTLE_MS),
          );
        });
      }, THEME_WAVE_MOUNT_MS),
    );

    return () => {
      timers.forEach(clearTimeout);
      opacity.stopAnimation();
      // Never lose the theme change, even if the host goes away mid-transition.
      applyOnce();
    };
  }, [transition, opacity]);

  if (!transition) return null;
  const { color } = transition;

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => {}}
    >
      <Animated.View
        testID="theme-wave"
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: color,
            opacity,
          },
        ]}
      />
    </Modal>
  );
}
