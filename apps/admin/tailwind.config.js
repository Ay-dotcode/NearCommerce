import preset from "@nearcommerce/config/tailwind-preset";

export default {
  presets: [preset],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};
