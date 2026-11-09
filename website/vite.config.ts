import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The app itself knows nothing about a sub-path: it is served from "/" locally. The Pages workflow
// sets SITE_BASE (for example "/katevazo/") because GitHub serves project sites under the repo name.
// With a custom domain, leave SITE_BASE unset.
export default defineConfig({
  base: process.env.SITE_BASE ?? "/",
  plugins: [react()],
});
