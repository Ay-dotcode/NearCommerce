import { BrandIcon } from "@/components/ui";
import { motion } from "@/components/ui/motion";
import { useReduceMotion } from "@/src/hooks/useReduceMotion";
import { useThemedStyles, type ThemeColors } from "@/theme";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

interface Props {
  // True once the app behind the splash is ready to be shown.
  ready: boolean;
  // Called after the splash has faded away completely.
  onDone: () => void;
}

const RING_COUNT = 3;
const FADE_MS = 320;

// Opening animation: the logo springs in while rings ripple out of it and the name rises
// underneath. It stays at least `motion.splashMs` (shorter with "reduce motion"), and once the
// app is ready it fades away and calls `onDone`.
export function AnimatedSplash({ ready, onDone }: Props) {
  const styles = useThemedStyles(makeStyles);
  const reduceMotion = useReduceMotion();
  const [minElapsed, setMinElapsed] = useState(motion.splashMs === 0);

  const logo = useRef(
    new Animated.Value(motion.splashMs === 0 ? 1 : 0),
  ).current;
  const text = useRef(
    new Animated.Value(motion.splashMs === 0 ? 1 : 0),
  ).current;
  const fade = useRef(new Animated.Value(1)).current;
  const rings = useRef(
    Array.from({ length: RING_COUNT }, () => new Animated.Value(0)),
  ).current;

  // Entrance.
  useEffect(() => {
    if (motion.splashMs === 0) return;
    Animated.parallel([
      Animated.spring(logo, {
        toValue: 1,
        friction: 5,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.timing(text, {
        toValue: 1,
        duration: 600,
        delay: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [logo, text]);

  // Ripples, skipped for people who asked for less motion.
  useEffect(() => {
    if (!motion.ambient || reduceMotion) return;
    const loops = rings.map((ring, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 520),
          Animated.timing(ring, {
            toValue: 1,
            duration: 1700,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(ring, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [rings, reduceMotion]);

  // Minimum time on screen so the animation is actually seen.
  useEffect(() => {
    if (motion.splashMs === 0) return;
    const wait = reduceMotion ? 450 : motion.splashMs;
    const t = setTimeout(() => setMinElapsed(true), wait);
    return () => clearTimeout(t);
  }, [reduceMotion]);

  // Leave once both the minimum time has passed and the app is ready.
  useEffect(() => {
    if (!ready || !minElapsed) return;
    if (motion.splashMs === 0) return onDone();
    Animated.timing(fade, {
      toValue: 0,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start(({ finished }) => finished && onDone());
  }, [ready, minElapsed, fade, onDone]);

  return (
    <Animated.View
      testID="splash"
      accessibilityLabel="Loading Near Commerce"
      accessibilityRole="progressbar"
      pointerEvents="auto"
      style={[styles.root, { opacity: fade }]}
    >
      <View style={styles.stage}>
        {rings.map((ring, i) => (
          <Animated.View
            key={i}
            style={[
              styles.ring,
              {
                opacity: ring.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 0],
                }),
                transform: [
                  {
                    scale: ring.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.7, 2.6],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
        <Animated.View
          style={{
            opacity: logo,
            transform: [
              {
                scale: logo.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.4, 1],
                }),
              },
              {
                rotate: logo.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["-14deg", "0deg"],
                }),
              },
            ],
          }}
        >
          <BrandIcon size={104} />
        </Animated.View>
      </View>
      <Animated.View
        style={{
          opacity: text,
          transform: [
            {
              translateY: text.interpolate({
                inputRange: [0, 1],
                outputRange: [14, 0],
              }),
            },
          ],
        }}
      >
        <Text style={styles.name}>Near Commerce</Text>
        <Text style={styles.tagline}>What you need, close to you</Text>
      </Animated.View>
    </Animated.View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      elevation: 1000,
      backgroundColor: c.background,
      alignItems: "center",
      justifyContent: "center",
    },
    stage: {
      width: 220,
      height: 220,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    ring: {
      position: "absolute",
      width: 104,
      height: 104,
      borderRadius: 52,
      borderWidth: 2,
      borderColor: c.primary,
    },
    name: {
      color: c.text,
      fontSize: 26,
      fontWeight: "800",
      textAlign: "center",
      letterSpacing: -0.4,
    },
    tagline: {
      color: c.primaryText,
      fontSize: 14,
      fontWeight: "600",
      textAlign: "center",
      marginTop: 4,
    },
  });
