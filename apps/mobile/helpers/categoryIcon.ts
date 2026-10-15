import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

export type IconName = ComponentProps<typeof Ionicons>["name"];

export function iconForCategory(name: string): IconName {
  const n = name.toLowerCase();
  if (/(grocer|food|produce)/.test(n)) return "basket-outline";
  if (/(pharm|health|medic)/.test(n)) return "medkit-outline";
  if (/pet/.test(n)) return "paw-outline";
  if (/(house|home|clean)/.test(n)) return "home-outline";
  return "grid-outline";
}
