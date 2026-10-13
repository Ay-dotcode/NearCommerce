import { useColors, useThemedStyles, type ThemeColors } from "@/theme";
import { useMemo, useRef, useState } from "react";
import {
  PanResponder,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";

interface Props {
  value: number;
  min: number;
  max: number;
  step?: number;
  // Called continuously while dragging (to update a label).
  onChange?: (value: number) => void;
  // Called once when the finger lifts, or after an accessibility adjustment (to save).
  onChangeComplete: (value: number) => void;
  label: string;
  // Spoken value, e.g. "5 miles".
  valueText?: (value: number) => string;
  testID?: string;
}

const THUMB = 28;

// Draggable slider (no native dependency). Works with VoiceOver / TalkBack through the standard
// "adjustable" role: swipe up or down to change the value by one step.
export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  onChangeComplete,
  label,
  valueText,
  testID = "slider",
}: Props) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const [width, setWidth] = useState(0);
  const [dragging, setDragging] = useState<number | null>(null);
  const startX = useRef(0);
  const current = dragging ?? value;

  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const snap = (v: number) => clamp(Math.round((v - min) / step) * step + min);
  const usable = Math.max(1, width - THUMB);
  const fromX = (x: number) => snap(min + (x / usable) * (max - min));
  const toX = (v: number) => ((v - min) / (max - min)) * usable;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          startX.current = Math.min(
            usable,
            Math.max(0, e.nativeEvent.locationX - THUMB / 2),
          );
          const v = fromX(startX.current);
          setDragging(v);
          onChange?.(v);
        },
        onPanResponderMove: (_e, g) => {
          const v = fromX(Math.min(usable, Math.max(0, startX.current + g.dx)));
          setDragging(v);
          onChange?.(v);
        },
        onPanResponderRelease: (_e, g) => {
          const v = fromX(Math.min(usable, Math.max(0, startX.current + g.dx)));
          setDragging(null);
          onChangeComplete(v);
        },
        onPanResponderTerminate: () => setDragging(null),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [usable, min, max, step, onChange, onChangeComplete],
  );

  const adjust = (direction: 1 | -1) => {
    const next = clamp(current + direction * step);
    if (next !== current) onChangeComplete(next);
  };

  const x = toX(current);

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{
        min,
        max,
        now: current,
        text: valueText?.(current),
      }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) =>
        adjust(e.nativeEvent.actionName === "increment" ? 1 : -1)
      }
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={styles.hit}
      {...responder.panHandlers}
    >
      <View style={styles.track} pointerEvents="none">
        <View style={[styles.fill, { width: x + THUMB / 2 }]} />
      </View>
      <View
        pointerEvents="none"
        style={[
          styles.thumb,
          { left: x, borderColor: c.primary },
          dragging !== null && styles.thumbActive,
        ]}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    hit: { height: 44, justifyContent: "center" },
    track: {
      height: 6,
      borderRadius: 3,
      backgroundColor: c.border,
      overflow: "hidden",
    },
    fill: { height: 6, backgroundColor: c.primary },
    thumb: {
      position: "absolute",
      top: (44 - THUMB) / 2,
      width: THUMB,
      height: THUMB,
      borderRadius: THUMB / 2,
      backgroundColor: c.surface,
      borderWidth: 3,
      shadowColor: c.shadow,
      shadowOpacity: 0.25,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 3,
    },
    thumbActive: { transform: [{ scale: 1.15 }] },
  });
