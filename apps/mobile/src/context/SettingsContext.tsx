import LocationFallbackModal from "@/components/LocationFallbackModal";
import SettingsContent from "@/components/settings/SettingsContent";
import SupportSheet from "@/components/settings/SupportSheet";
import { Drawer } from "@/components/ui";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Overlay = "settings" | "zip" | "support" | null;

interface SettingsContextValue {
  openSettings: () => void;
  openSupport: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

// Owns the settings drawer and the sheets opened from it (ZIP code, support). They are rendered
// side by side here (never nested), so any screen's header button can open them.
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [overlay, setOverlay] = useState<Overlay>(null);
  const close = useCallback(() => setOverlay(null), []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      openSettings: () => setOverlay("settings"),
      openSupport: () => setOverlay("support"),
    }),
    [],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
      <Drawer
        visible={overlay === "settings"}
        onClose={close}
        title="Settings"
        side="right"
        testID="settings-drawer"
      >
        <SettingsContent
          onOpenZip={() => setOverlay("zip")}
          onOpenSupport={() => setOverlay("support")}
          onClose={close}
        />
      </Drawer>
      <LocationFallbackModal
        visible={overlay === "zip"}
        reason="manual"
        onClose={close}
      />
      <SupportSheet visible={overlay === "support"} onClose={close} />
    </SettingsContext.Provider>
  );
}

// Like useSettings, but returns null outside the provider (screens that can also render
// without a drawer, such as the sign-in page).
export function useOptionalSettings() {
  return useContext(SettingsContext);
}

export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value)
    throw new Error("useSettings must be used inside SettingsProvider");
  return value;
}
