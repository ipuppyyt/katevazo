import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from https://ipuppyyt.github.io/katevazo/, so every asset lives under /katevazo/.
export default defineConfig({
  base: "/katevazo/",
  plugins: [react()],
});
