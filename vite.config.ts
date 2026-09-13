import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: { outDir: "site-dist", chunkSizeWarningLimit: 1500 },
  server: { host: "127.0.0.1" },
});
