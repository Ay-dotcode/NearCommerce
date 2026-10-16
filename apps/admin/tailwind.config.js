import preset from "@nearcommerce/config/tailwind-preset";

const theme = preset.createPreset("admin");

export default {
  presets: [theme],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};
