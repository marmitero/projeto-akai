import { defineConfig } from "vite";
export default defineConfig({
  envDir: "../..",
  server: {
    proxy: { "/api/v1": { target: "http://127.0.0.1:3000", ws: true } },
  },
  preview: {
    proxy: { "/api/v1": { target: "http://127.0.0.1:3000", ws: true } },
  },
  build: {
    rollupOptions: { output: { manualChunks: { phaser: ["phaser"] } } },
  },
});
