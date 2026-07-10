import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "@arcforge/engine/compiler",
        replacement: path.resolve(__dirname, "../../packages/engine/src/compiler.ts"),
      },
      {
        find: "@arcforge/editor-core",
        replacement: path.resolve(__dirname, "../../packages/editor-core/src/index.ts"),
      },
      {
        find: "@arcforge/engine",
        replacement: path.resolve(__dirname, "../../packages/engine/src/index.ts"),
      },
      {
        find: "@arcforge/schemas",
        replacement: path.resolve(__dirname, "../../packages/schemas/src/index.ts"),
      },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: process.env.TAURI_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
