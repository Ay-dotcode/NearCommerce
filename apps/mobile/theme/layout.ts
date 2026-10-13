import type { Edge } from "react-native-safe-area-context";

// Screens that sit under a navigation header (or above the tab bar) must not add the top/bottom
// safe-area padding again: the header and tab bar already handle it. Using the default edges
// there is what left an empty gap between the app bar and the content.
export const SCREEN_EDGES: Edge[] = ["left", "right"];
export const STACK_SCREEN_EDGES: Edge[] = ["left", "right", "bottom"];
