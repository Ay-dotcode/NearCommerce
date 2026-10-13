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
}

const SWIPE_CLOSE_DISTANCE = 60;

// Reusable panel that slides in from the left edge over a blurred, dimmed backdrop. Close it by
// tapping the backdrop, the close button, the Android back button, or swiping it to the left.
export function Drawer({
  visible,
  onClose,
  title,
  children,
  testID = "drawer",
}: Props) {
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
          g.dx < -8 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_e, g) => drag.setValue(Math.min(0, g.dx)),
        onPanResponderRelease: (_e, g) => {
          if (g.dx < -SWIPE_CLOSE_DISTANCE) onClose();
          else
            Animated.timing(drag, {
              toValue: 0,
              duration: motion.duration,
              useNativeDriver: false,
            }).start();
        },
      }),
    [drag, onClose],
  );

  if (!mounted) return null;

  const slide = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, 0],
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
      left: 0,
      backgroundColor: c.surface,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: c.border,
      shadowColor: c.shadow,
      shadowOpacity: 0.3,
      shadowRadius: 20,
      shadowOffset: { width: 4, height: 0 },
      elevation: 16,
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
