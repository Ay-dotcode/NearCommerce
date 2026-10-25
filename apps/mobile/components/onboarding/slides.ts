import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

type IconName = ComponentProps<typeof Ionicons>["name"];

export interface OnboardingSlide {
  id: string;
  title: string;
  // Plain language, written for someone who has never used the app.
  body: string;
  // Big icon in the middle of the picture, and three smaller ones floating around it.
  icon: IconName;
  satellites: [IconName, IconName, IconName];
  tips: string[];
}

// What a shopper needs to know, in the order they will meet it. Every claim here matches what
// the app really does (see the screens named in the comments).
export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: "welcome",
    title: "Find it nearby, in stock",
    body: "Near Commerce shows which shops around you really have the thing you need, so you stop wasting trips.",
    icon: "location",
    satellites: ["storefront-outline", "cart-outline", "pricetag-outline"],
    tips: [
      "Real shops close to where you are",
      "Prices and stock come from the shops themselves",
    ],
  },
  {
    id: "search",
    title: "Search or browse",
    body: "Type what you're looking for on the Search tab, or open a category on the Home tab to see what's around.",
    icon: "search",
    satellites: ["grid-outline", "options-outline", "map-outline"],
    tips: [
      "Results are shown from the closest shop outward",
      "Change how far to look under Settings → Search distance",
    ],
  },
  {
    id: "check",
    title: "Check before you go",
    body: "Each product tells you whether the shop confirmed it recently. Open a shop to see its details and get directions.",
    icon: "shield-checkmark",
    satellites: ["time-outline", "navigate-outline", "star-outline"],
    tips: [
      "“Recently verified” means the shop checked its stock lately",
      "Tap Directions on a shop to open your maps app",
    ],
  },
  {
    id: "favorites",
    title: "Keep what you like",
    body: "Tap the heart on a product or a shop to save it. Everything you save is in the Favorites tab.",
    icon: "heart",
    satellites: ["bookmark-outline", "storefront-outline", "pricetag-outline"],
    tips: ["Saved items are one tap away", "Works for both products and shops"],
  },
  {
    id: "lists",
    title: "Shop together",
    body: "Make a household list, add products to it and share the invite code. Family or housemates join and see the same list.",
    icon: "people",
    satellites: [
      "list-outline",
      "share-social-outline",
      "checkmark-circle-outline",
    ],
    tips: [
      "Create a list on the Lists tab, then share its code",
      "Got a code? Use “Join with an invite code”",
    ],
  },
  {
    id: "location",
    title: "Your location, your choice",
    body: "We use your location only to find shops near you. If you'd rather not share it, you can type a ZIP code instead.",
    icon: "navigate-circle",
    satellites: ["lock-closed-outline", "keypad-outline", "locate-outline"],
    tips: [
      "Allow location when your phone asks, or choose a ZIP code",
      "You can switch any time in Settings",
    ],
  },
  {
    id: "ready",
    title: "You're all set",
    body: "Create a free account or sign in, and start finding what you need nearby. Rate shops and products afterwards to help others too.",
    icon: "checkmark-circle",
    satellites: ["sparkles-outline", "star-outline", "thumbs-up-outline"],
    tips: ["You can replay this guide from Settings → How it works"],
  },
];
