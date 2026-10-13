import { useColors, useThemedStyles, type ThemeColors } from "@/theme";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurBackdrop } from "./BlurBackdrop";
import { motion } from "./motion";

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  // Disable backdrop / back-button dismissal while a request is running.
  dismissible?: boolean;
  testID?: string;
}

// Reusable bottom sheet: slides up over a blurred, dimmed backdrop. Used for every pop-up in
// the app (support, ZIP code, ...), so they all look and behave the same.
export function BottomSheet({
  visible,
  onClose,
  title,
  description,
  children,
  dismissible = true,
  testID = "bottom-sheet",
}: Props) {
  const styles = useThemedStyles(makeStyles);
  const c = useColors();
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
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
  }, [visible, progress]);

  if (!mounted) return null;

  const close = () => dismissible && onClose();

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      onRequestClose={close}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        <BlurBackdrop onPress={close} testID={`${testID}-backdrop`} />
      </Animated.View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.wrap}
        pointerEvents="box-none"
      >
        <Animated.View
          testID={testID}
          accessibilityViewIsModal
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) },
            {
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [Dimensions.get("window").height * 0.4, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: c.borderStrong }]} />
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {description ? (
            <Text style={styles.description}>{description}</Text>
          ) : null}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.body}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: { flex: 1, justifyContent: "flex-end" },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 10,
      maxHeight: "88%",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    grabber: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      marginBottom: 14,
    },
    title: { color: c.text, fontSize: 20, fontWeight: "800" },
    description: { color: c.textMuted, fontSize: 14, marginTop: 6 },
    body: { marginTop: 16, flexGrow: 0 },
  });
