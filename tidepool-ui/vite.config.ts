import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [svelte(), viteSingleFile()],
  build: {
    outDir: "../src/tools/tidepool/dist",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/": {
        target: "ws://127.0.0.1:18790",
        ws: true,
      },
    },
  },
});
