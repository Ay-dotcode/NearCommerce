import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/expo-export/**",
      "**/coverage/**",
      "apps/mobile/android/**",
      "apps/mobile/ios/**",
      "**/*.cjs",
      "**/*.config.js",
      "**/jest.setup.js",
      "**/public/**",
    ],
  },
  { linterOptions: { reportUnusedDisableDirectives: "warn" } },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Unused values are bugs waiting to happen; a leading underscore opts out on purpose.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": "off",
      eqeqeq: ["error", "always", { null: "ignore" }],
      "prefer-const": "error",
    },
  },
  {
    // React Native loads images, fonts and optional native modules with require().
    files: ["apps/mobile/**"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    // Tests mock freely; strict typing there adds noise, not safety.
    files: ["**/__tests__/**", "**/*.test.{ts,tsx}", "**/testing/**"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
);
