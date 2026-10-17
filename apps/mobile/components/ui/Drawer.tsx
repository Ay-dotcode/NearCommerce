import { useColors, useThemedStyles, type ThemeColors } from "@/theme";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurBackdrop } from "./BlurBackdrop";
import { motion } from "./motion";

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  testID?: string;
  // Which screen edge the panel slides in from.
  side?: "left" | "right";
}

const SWIPE_CLOSE_DISTANCE = 60;

// Reusable panel that slides in from a screen edge (the right by default) over a blurred, dimmed
// backdrop. Close it by tapping the backdrop, the close button, the Android back button, or by
// swiping it back toward the edge it came from.
export function Drawer({
  visible,
  onClose,
  title,
  children,
  testID = "drawer",
  side = "right",
}: Props) {
  // +1 when the panel sits on the right: it slides in from (and back toward) the positive side.
  const dir = side === "right" ? 1 : -1;
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const insets = useSafeAreaInsets();
  const width = Math.min(340, Dimensions.get("window").width * 0.86);
  const progress = useRef(new Animated.Value(0)).current;
  const drag = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    drag.setValue(0);
    if (visible) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: motion.duration,
        useNativeDriver: motion.native,
      }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: motion.duration,
        useNativeDriver: motion.native,
      }).start(({ finished }) => finished && setMounted(false));
    }
  }, [visible, progress, drag]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) =>
          g.dx * dir > 8 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_e, g) =>
          drag.setValue(dir > 0 ? Math.max(0, g.dx) : Math.min(0, g.dx)),
        onPanResponderRelease: (_e, g) => {
          if (g.dx * dir > SWIPE_CLOSE_DISTANCE) onClose();
          else
            Animated.timing(drag, {
              toValue: 0,
              duration: motion.duration,
              useNativeDriver: false,
            }).start();
        },
      }),
    [drag, onClose, dir],
  );

  if (!mounted) return null;

  const slide = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [dir * width, 0],
  });

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        <BlurBackdrop onPress={onClose} testID={`${testID}-backdrop`} />
      </Animated.View>
      <Animated.View
        testID={testID}
        accessibilityViewIsModal
        {...pan.panHandlers}
        style={[
          styles.panel,
          side === "right" ? styles.panelRight : styles.panelLeft,
          {
            width,
            paddingTop: insets.top + 8,
            paddingBottom: Math.max(insets.bottom, 12),
            transform: [{ translateX: slide }, { translateX: drag }],
          },
        ]}
      >
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={`Close ${title.toLowerCase()}`}
            hitSlop={10}
            style={styles.close}
          >
            <Ionicons name="close" size={22} color={c.textSecondary} />
          </Pressable>
        </View>
        {children}
      </Animated.View>
    </Modal>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    panel: {
      position: "absolute",
      top: 0,
      bottom: 0,
      backgroundColor: c.surface,
      shadowColor: c.shadow,
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 16,
    },
    panelLeft: {
      left: 0,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: c.border,
      shadowOffset: { width: 4, height: 0 },
    },
    panelRight: {
      right: 0,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: c.border,
      shadowOffset: { width: -4, height: 0 },
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    title: { color: c.text, fontSize: 22, fontWeight: "800" },
    close: { padding: 6, borderRadius: 999, backgroundColor: c.surfaceAlt },
  });
