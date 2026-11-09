import { getActiveWave, subscribeWave } from "@/helpers/themeWave";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { Animated, StyleSheet, View } from "react-native";

interface Props {
  token: "background" | "surface";
}

export function ThemeWaveLayer({ token }: Props) {
  const wave = useSyncExternalStore(
    subscribeWave,
    getActiveWave,
    getActiveWave,
  );
  const ref = useRef<View>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const measure = useCallback(() => {
    ref.current?.measureInWindow?.((x, y) => {
      if (typeof x === "number" && typeof y === "number") setOffset({ x, y });
    });
  }, []);

  if (!wave) return null;
  const { origin, radius, from, to, grow } = wave;

  return (
    <View
      ref={ref}
      testID={`theme-wave-${token}`}
      pointerEvents="none"
      onLayout={measure}
      style={[
        StyleSheet.absoluteFill,
        { overflow: "hidden", backgroundColor: from.colors[token] },
      ]}
    >
      {to && (
        <Animated.View
          testID={`theme-wave-${token}-circle`}
          style={{
            position: "absolute",
            left: origin.x - offset.x - radius,
            top: origin.y - offset.y - radius,
            width: radius * 2,
            height: radius * 2,
            borderRadius: radius,
            backgroundColor: to.colors[token],
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
      )}
    </View>
  );
}
