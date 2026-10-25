import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

// True when the phone's "reduce motion" accessibility setting is on. Decorative animation
// should be skipped or shortened for these people.
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo?.isReduceMotionEnabled?.()
      ?.then((value) => active && setReduce(Boolean(value)))
      .catch(() => {});
    const sub = AccessibilityInfo?.addEventListener?.(
      "reduceMotionChanged",
      setReduce,
    );
    return () => {
      active = false;
      sub?.remove?.();
    };
  }, []);
  return reduce;
}
