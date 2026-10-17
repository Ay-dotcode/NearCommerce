import { isHorizontalDrag, shouldOpenOnRelease } from "@/helpers/swipe";
import { useOptionalSettings } from "@/src/context/SettingsContext";
import { useMemo, type ReactNode } from "react";
import { PanResponder, View } from "react-native";

// Wrap a screen with this and a sideways swipe anywhere on it opens the settings drawer, as if
// the drawer were dragged out from the edge. Vertical scrolling is left alone.
export function SwipeToOpenSettings({ children }: { children: ReactNode }) {
  // Without the settings provider (a screen rendered on its own) swiping simply does nothing.
  const openSettings = useOptionalSettings()?.openSettings;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_e, g) =>
          isHorizontalDrag(g.dx, g.dy),
        onPanResponderRelease: (_e, g) => {
          if (shouldOpenOnRelease(g.dx, g.dy)) openSettings?.();
        },
      }),
    [openSettings],
  );
  return (
    <View testID="swipe-to-open-settings" style={{ flex: 1 }} {...pan.panHandlers}>
      {children}
    </View>
  );
}
