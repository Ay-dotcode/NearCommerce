import type { PluginOption } from "vite";

declare function themeInit(): PluginOption;
declare namespace themeInit {
  export const THEME_KEY: string;
}

export = themeInit;
