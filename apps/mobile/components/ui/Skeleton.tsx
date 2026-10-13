import { useTheme } from "@/theme";
import { useEffect, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { motion } from "./motion";

// One shared, looping value drives every skeleton on screen so the highlight sweeps across
// them in sync (like YouTube). It runs only while at least one skeleton is mounted.
const shimmer = new Animated.Value(0);
let consumers = 0;
let loop: Animated.CompositeAnimation | null = null;

function useShimmer() {
  useEffect(() => {
    if (!motion.shimmer) return;
    consumers += 1;
    if (consumers === 1) {
      loop = Animated.loop(
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      );
      loop.start();
    }
    return () => {
      consumers -= 1;
      if (consumers === 0) {
        loop?.stop();
        loop = null;
        shimmer.setValue(0);
      }
    };
  }, []);
  return shimmer;
}

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

// A grey placeholder block with a moving highlight. Give it the same size and radius as the
// element it stands in for, so the screen does not jump when the data arrives.
export function Skeleton({
  width = "100%",
  height = 16,
  radius = 8,
  style,
}: SkeletonProps) {
  const { colors: c, isDark } = useTheme();
  const progress = useShimmer();
  const [w, setW] = useState(0);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: c.skeleton,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {motion.shimmer && w > 0 && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              width: w * 0.6,
              // A light sweep in both appearances (subtler on dark).
              backgroundColor: c.onPrimary,
              opacity: isDark ? 0.08 : 0.35,
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-w * 0.6, w],
                  }),
                },
              ],
            },
          ]}
        />
      )}
    </View>
  );
}

// Wraps a group of skeleton blocks so assistive tech announces one busy region (no visible text).
export function SkeletonGroup({
  label = "Content is loading",
  style,
  children,
}: {
  label?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return (
    <View
      testID="skeleton"
      accessible
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={style}
    >
      {children}
    </View>
  );
}
