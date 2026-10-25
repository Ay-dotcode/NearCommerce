import { ONBOARDING_SEEN_KEY } from "@/constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface OnboardingValue {
  // The saved "already seen" flag has been read from the phone.
  loaded: boolean;
  // The guide is on screen right now.
  visible: boolean;
  // First launch ever: nothing else (such as the location prompt) should interrupt yet.
  firstRun: boolean;
  open: () => void;
  finish: () => void;
}

const OnboardingContext = createContext<OnboardingValue | null>(null);

// Shows the first-launch guide once, remembers that it was seen, and lets Settings replay it.
export function OnboardingProvider({ children }: { children: ReactNode }) {
  // null while the saved flag is still being read.
  const [seen, setSeen] = useState<boolean | null>(null);
  const [replaying, setReplaying] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(ONBOARDING_SEEN_KEY)
      .then((value) => active && setSeen(value === "1"))
      // If the phone's storage fails, never trap anyone behind the guide.
      .catch(() => active && setSeen(true));
    return () => {
      active = false;
    };
  }, []);

  const open = useCallback(() => setReplaying(true), []);
  const finish = useCallback(() => {
    setReplaying(false);
    setSeen(true);
    AsyncStorage.setItem(ONBOARDING_SEEN_KEY, "1").catch(() => {});
  }, []);

  const value = useMemo<OnboardingValue>(
    () => ({
      loaded: seen !== null,
      visible: replaying || seen === false,
      firstRun: seen === false,
      open,
      finish,
    }),
    [seen, replaying, open, finish],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx)
    throw new Error("useOnboarding must be used inside OnboardingProvider");
  return ctx;
}

// For screens that can also render without the provider (tests, previews).
export const useOptionalOnboarding = () => useContext(OnboardingContext);
