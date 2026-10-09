import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const srcPath = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  envDir: fileURLToPath(new URL("../..", import.meta.url)),
  plugins: [react()],
  resolve: { alias: { "@": srcPath } },
  build: {
    rollupOptions: {
      output: {
        // Stable third-party code gets its own long-cached files, so an app change does not
        // make users re-download React. Page code is already split by route.
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          if (
            /node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|@remix-run)\//.test(
              id,
            )
          )
            return "vendor-react";
          if (/node_modules\/(@tanstack|axios|zod)\//.test(id))
            return "vendor-data";
          return undefined;
        },
      },
    },
  },
  server: { port: 3001 },
});
