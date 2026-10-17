import preset from "@nearcommerce/config/tailwind-preset";

// Each portal has its own brand colour: shoppers blue, store owners teal, admins violet.
const theme = preset.createPreset("owner");

// Colours, dark mode and animations come from the shared preset in packages/config. The shared
// UI package is scanned too so its classes are generated.
export default {
  presets: [theme],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};
