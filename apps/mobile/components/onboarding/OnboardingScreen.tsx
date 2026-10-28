import { Button } from "@/components/ui";
import { motion } from "@/components/ui/motion";
import { useReduceMotion } from "@/src/hooks/useReduceMotion";
import { useColors, useThemedStyles, type ThemeColors } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ONBOARDING_SLIDES as SLIDES, type OnboardingSlide } from "./slides";

interface Props {
  // Called when the guide is finished or skipped.
  onFinish: () => void;
}

// Small icons circle the big one; these are their resting positions on the 240px stage.
const ORBIT = [
  { top: 14, left: 24 },
  { top: 30, right: 14 },
  { bottom: 22, left: 52 },
] as const;

function Picture({
  slide,
  index,
  width,
  scrollX,
}: {
  slide: OnboardingSlide;
  index: number;
  width: number;
  scrollX: Animated.Value;
}) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const reduceMotion = useReduceMotion();
  const float = useRef(new Animated.Value(0)).current;

  // Gentle bobbing of the small icons.
  useEffect(() => {
    if (!motion.ambient || reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1800 + index * 120,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1800 + index * 120,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float, index, reduceMotion]);

  // The picture slides a little slower than the page, so it feels like it is in the distance.
  const range = [(index - 1) * width, index * width, (index + 1) * width];
  const parallax = scrollX.interpolate({
    inputRange: range,
    outputRange: [width * 0.35, 0, -width * 0.35],
    extrapolate: "clamp",
  });
  const appear = scrollX.interpolate({
    inputRange: range,
    outputRange: [0.2, 1, 0.2],
    extrapolate: "clamp",
  });
  const grow = scrollX.interpolate({
    inputRange: range,
    outputRange: [0.7, 1, 0.7],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.stage,
        {
          opacity: appear,
          transform: [{ translateX: parallax }, { scale: grow }],
        },
      ]}
    >
      <View style={styles.disc} />
      <View style={styles.discInner}>
        <Ionicons name={slide.icon} size={84} color={c.onPrimary} />
      </View>
      {slide.satellites.map((name, i) => (
        <Animated.View
          key={name}
          style={[
            styles.satellite,
            ORBIT[i],
            {
              transform: [
                {
                  translateY: float.interpolate({
                    inputRange: [0, 1],
                    outputRange: i % 2 ? [6, -6] : [-6, 6],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons name={name} size={22} color={c.primaryText} />
        </Animated.View>
      ))}
    </Animated.View>
  );
}

// A swipeable, step-by-step introduction for new shoppers: a picture, a plain explanation and
// a couple of concrete tips per page. It can be skipped at any time.
export default function OnboardingScreen({ onFinish }: Props) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const { width } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(0)).current;
  const pager = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  const goTo = (next: number) => {
    const clamped = Math.min(SLIDES.length - 1, Math.max(0, next));
    setIndex(clamped);
    pager.current?.scrollTo({ x: clamped * width, animated: true });
  };

  const onSettled = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <SafeAreaView
      style={styles.root}
      testID="onboarding"
      edges={["top", "bottom"]}
    >
      <View style={styles.topBar}>
        <Text style={styles.step} accessibilityLiveRegion="polite">
          {index + 1} / {SLIDES.length}
        </Text>
        {!last ? (
          <Pressable
            testID="onboarding-skip"
            accessibilityRole="button"
            accessibilityLabel="Skip introduction"
            hitSlop={10}
            onPress={onFinish}
          >
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        ) : (
          <View />
        )}
      </View>

      <Animated.ScrollView
        ref={pager as never}
        testID="onboarding-pager"
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: motion.native },
        )}
        onMomentumScrollEnd={onSettled}
      >
        {SLIDES.map((slide, i) => (
          <View key={slide.id} style={[styles.page, { width }]}>
            <Picture slide={slide} index={i} width={width} scrollX={scrollX} />
            <View
              accessible
              accessibilityLabel={`${slide.title}. ${slide.body}`}
              style={styles.copy}
            >
              <Text accessibilityRole="header" style={styles.title}>
                {slide.title}
              </Text>
              <Text style={styles.body}>{slide.body}</Text>
              <View style={styles.tips}>
                {slide.tips.map((tip) => (
                  <View key={tip} style={styles.tipRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={c.primary}
                    />
                    <Text style={styles.tip}>{tip}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}
      </Animated.ScrollView>

      <View style={styles.footer}>
        <View
          style={styles.dots}
          accessible
          accessibilityLabel={`Page ${index + 1} of ${SLIDES.length}`}
        >
          {SLIDES.map((slide, i) => {
            const range = [(i - 1) * width, i * width, (i + 1) * width];
            // `width` is not supported by the native animated module, so we
            // animate scaleX on a fixed-width view instead. The dot's visual
            // width expands from 8 px (inactive) to 24 px (active) by scaling
            // around the left edge (via a translateX offset) — no layout pass.
            const scaleX = scrollX.interpolate({
              inputRange: range,
              outputRange: [1, 3, 1], // 8 px × 3 = 24 px at active position
              extrapolate: "clamp",
            });
            const opacity = scrollX.interpolate({
              inputRange: range,
              outputRange: [0.35, 1, 0.35],
              extrapolate: "clamp",
            });
            // Shift right so the dot appears to grow from its left edge
            const translateX = scrollX.interpolate({
              inputRange: range,
              outputRange: [0, 8, 0], // (24-8)/2 = 8 px offset
              extrapolate: "clamp",
            });
            return (
              <Animated.View
                key={slide.id}
                style={[
                  styles.dot,
                  {
                    opacity,
                    transform: [{ translateX }, { scaleX }],
                  },
                ]}
              />
            );
          })}
        </View>
        <Button
          testID="onboarding-next"
          title={last ? "Get started" : "Next"}
          onPress={() => (last ? onFinish() : goTo(index + 1))}
        />
      </View>
    </SafeAreaView>
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
      zIndex: 900,
      elevation: 900,
      backgroundColor: c.background,
    },
    topBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 24,
      paddingTop: 8,
      height: 40,
    },
    step: { color: c.textMuted, fontSize: 13, fontWeight: "700" },
    skip: { color: c.primaryText, fontSize: 16, fontWeight: "700" },
    page: {
      paddingHorizontal: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    stage: {
      width: 240,
      height: 240,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
    },
    disc: {
      position: "absolute",
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: c.primarySoft,
    },
    discInner: {
      width: 152,
      height: 152,
      borderRadius: 76,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: c.shadow,
      shadowOpacity: 0.25,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
    satellite: {
      position: "absolute",
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.border,
    },
    copy: { alignSelf: "stretch" },
    title: {
      color: c.text,
      fontSize: 28,
      fontWeight: "800",
      textAlign: "center",
      letterSpacing: -0.5,
    },
    body: {
      color: c.textSecondary,
      fontSize: 16,
      lineHeight: 24,
      textAlign: "center",
      marginTop: 10,
    },
    tips: { marginTop: 18, gap: 10, alignSelf: "center", maxWidth: 340 },
    tipRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
    tip: { flex: 1, color: c.text, fontSize: 14, lineHeight: 20 },
    footer: {
      paddingHorizontal: 24,
      paddingBottom: 16,
      paddingTop: 8,
      gap: 18,
    },
    dots: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 6,
    },
    dot: { height: 8, borderRadius: 4, backgroundColor: c.primary },
  });
