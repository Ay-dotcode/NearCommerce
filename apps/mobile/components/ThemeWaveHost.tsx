import { registerThemeWave, type WaveOrigin } from "@/helpers/themeWave";
import { useReduceMotion } from "@/src/hooks/useReduceMotion";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  StyleSheet,
} from "react-native";

export const THEME_WAVE_MOUNT_MS = 50;
export const THEME_WAVE_EXPAND_MS = 420;
// The new theme needs a moment to paint behind the cover before the cover is lifted.
export const THEME_WAVE_SETTLE_MS = 120;
export const THEME_WAVE_FADE_MS = 280;

interface Wave {
  origin: WaveOrigin;
  color: string;
  radius: number;
  apply: () => void;
  done: () => void;
}

// Draws the theme wave (see helpers/themeWave). Mount it once, near the root. It is a Modal of its
// own so that it also covers the settings drawer, which is where the theme control lives.
export function ThemeWaveHost() {
  const reduceMotion = useReduceMotion();
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;

  const [wave, setWave] = useState<Wave | null>(null);
  const grow = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(
    () =>
      registerThemeWave(
        (origin, color, apply) =>
          new Promise<void>((resolve) => {
            // People who asked for less motion get the plain, instant change.
            if (reduceMotionRef.current) {
              apply();
              resolve();
              return;
            }
            const { width, height } = Dimensions.get("window");
            // Far enough to reach the corner farthest from where the wave starts.
            const radius = Math.hypot(
              Math.max(origin.x, width - origin.x),
              Math.max(origin.y, height - origin.y),
            );
            grow.setValue(0);
            fade.setValue(1);
            setWave({ origin, color, radius, apply, done: resolve });
          }),
      ),
    [grow, fade],
  );

  // Once the cover is on screen: spread, switch the theme while everything is covered, fade out.
  useEffect(() => {
    if (!wave) return;
    let applied = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const applyOnce = () => {
      if (applied) return;
      applied = true;
      wave.apply();
    };

    timers.push(
      setTimeout(() => {
        Animated.timing(grow, {
          toValue: 1,
          duration: THEME_WAVE_EXPAND_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          applyOnce();
          timers.push(
            setTimeout(() => {
              Animated.timing(fade, {
                toValue: 0,
                duration: THEME_WAVE_FADE_MS,
                useNativeDriver: true,
              }).start(() => {
                setWave(null);
                wave.done();
              });
            }, THEME_WAVE_SETTLE_MS),
          );
        });
      }, THEME_WAVE_MOUNT_MS),
    );

    return () => {
      timers.forEach(clearTimeout);
      grow.stopAnimation();
      fade.stopAnimation();
      // Never lose the theme change, even if the host goes away mid-wave.
      applyOnce();
    };
  }, [wave, grow, fade]);

  if (!wave) return null;
  const { origin, radius, color } = wave;

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
        style={[StyleSheet.absoluteFill, { opacity: fade }]}
      >
        <Animated.View
          style={{
            position: "absolute",
            left: origin.x - radius,
            top: origin.y - radius,
            width: radius * 2,
            height: radius * 2,
            borderRadius: radius,
            backgroundColor: color,
            transform: [
              {
                scale: grow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.001, 1],
                }),
              },
            ],
          }}
        />
      </Animated.View>
    </Modal>
  );
}
