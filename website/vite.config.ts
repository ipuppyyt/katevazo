import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * The newest published release, looked up while the site is built so the version and download
 * links are already in the page's HTML (crawlers and visitors without JavaScript see them). The
 * page still refreshes it in the browser. Offline or rate limited, this is null and the page
 * shows no version until the browser has fetched one.
 */
async function latestRelease() {
  try {
    const token = process.env.GITHUB_TOKEN;
    const res = await fetch("https://api.github.com/repos/ipuppyyt/katevazo/releases/latest", {
      headers: { Accept: "application/vnd.github+json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      version: String(data.tag_name).replace(/^v/, ""),
      url: data.html_url,
      assets: data.assets.map((a: { name: string; browser_download_url: string; size: number }) => ({
        name: a.name,
        url: a.browser_download_url,
        size: a.size,
      })),
    };
  } catch {
    return null;
  }
}

// The app itself knows nothing about a sub-path: it is served from "/" locally. The Pages workflow
// sets SITE_BASE (for example "/katevazo/") because GitHub serves project sites under the repo name.
// With a custom domain, leave SITE_BASE unset.
export default defineConfig(async () => ({
  base: process.env.SITE_BASE ?? "/",
  plugins: [react()],
  define: { __RELEASE__: JSON.stringify(await latestRelease()) },
}));
