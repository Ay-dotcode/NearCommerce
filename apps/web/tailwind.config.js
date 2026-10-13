import preset from "@nearcommerce/config/tailwind-preset";

// Colours, dark mode and animations come from the shared preset in packages/config. The shared
// UI package is scanned too so its classes are generated.
export default {
  presets: [preset],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};
