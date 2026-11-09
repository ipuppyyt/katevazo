import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Served from https://ipuppyyt.github.io/katevazo/, so every asset lives under /katevazo/.
// Three real HTML pages (not a client router) keep /support.html and /privacy.html as
// plain, fast URLs that the Chrome Web Store listing can point at.
export default defineConfig({
  base: "/katevazo/",
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, "index.html"),
        support: resolve(import.meta.dirname, "support.html"),
        privacy: resolve(import.meta.dirname, "privacy.html"),
      },
    },
  },
});
