import { useEffect, useState, useSyncExternalStore } from "react";

export const REPO = "https://github.com/ipuppyyt/katevazo";
export const RELEASES = `${REPO}/releases/latest`;
export const ISSUES = `${REPO}/issues/new/choose`;
export const CHROME_STORE = "https://chromewebstore.google.com/detail/piaiamccaeniknpfiomledfkmldmdpkh";
export const EDGE_STORE = "https://microsoftedge.microsoft.com/addons/detail/send-to-katevazo/gdccmcbmdllamcdodbllkkgfheehgijc";

// Vite serves everything under the repository's Pages path.
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

export type Os = "windows" | "macos" | "linux";

export function detectOs(): Os | null {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "windows";
  if (/Android|iPhone|iPad|iPod/i.test(ua)) return null;
  if (/Mac/i.test(ua)) return "macos";
  if (/Linux|X11|CrOS/i.test(ua)) return "linux";
  return null;
}

export interface Installer {
  os: Os;
  label: string;
  detail: string;
  /** Matches the end of a release asset's file name. */
  match: RegExp;
}

export const INSTALLERS: Installer[] = [
  { os: "windows", label: "Installer (.exe)", detail: "Windows 10 and 11, 64-bit", match: /_x64-setup\.exe$/ },
  { os: "windows", label: "MSI package", detail: "For managed installs", match: /_x64_en-US\.msi$/ },
  { os: "macos", label: "Disk image (.dmg)", detail: "Apple Silicon (M1 and newer)", match: /_aarch64\.dmg$/ },
  { os: "linux", label: "AppImage", detail: "Runs on most distributions", match: /\.AppImage$/ },
  { os: "linux", label: "Debian package (.deb)", detail: "Debian, Ubuntu, Mint", match: /\.deb$/ },
  { os: "linux", label: "RPM package (.rpm)", detail: "Fedora, openSUSE", match: /\.rpm$/ },
];

export const OS_NAME: Record<Os, string> = { windows: "Windows", macos: "macOS", linux: "Linux" };

export interface Release {
  version: string;
  url: string;
  assets: { name: string; url: string; size: number }[];
}

interface ApiRelease {
  tag_name: string;
  html_url: string;
  assets: { name: string; browser_download_url: string; size: number }[];
}

/** The release that was newest when the site was built; it is in the page’s HTML. */
export const BUILT_RELEASE: Release | null = __RELEASE__;

/**
 * The newest published release. The build’s copy is used first, then the browser asks GitHub so a
 * release published after the build is still offered without waiting for a rebuild.
 */
export function useRelease(): Release | null {
  const [release, setRelease] = useState<Release | null>(BUILT_RELEASE);
  useEffect(() => {
    let live = true;
    fetch("https://api.github.com/repos/ipuppyyt/katevazo/releases/latest", {
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((r) => (r.ok ? (r.json() as Promise<ApiRelease>) : Promise.reject(r.status)))
      .then((data) => {
        if (!live) return;
        setRelease({
          version: data.tag_name.replace(/^v/, ""),
          url: data.html_url,
          assets: data.assets.map((a) => ({ name: a.name, url: a.browser_download_url, size: a.size })),
        });
      })
      .catch(() => {
        // Offline or rate limited: the buttons fall back to the releases page.
      });
    return () => {
      live = false;
    };
  }, []);
  return release;
}

export function findAsset(release: Release | null, installer: Installer) {
  return release?.assets.find((a) => installer.match.test(a.name)) ?? null;
}

export function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}

export type Theme = "light" | "dark";

/** Reads a saved preference; storage can be blocked, so this never throws. */
export function readPref(key: string): Theme | null {
  try {
    const v = localStorage.getItem(key);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

export function savePref(key: string, value: Theme) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Not remembered, but the page still switches.
  }
}

const THEME_EVENT = "katevazo-theme";

function systemTheme(): Theme {
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** The theme in use: the saved choice if there is one, otherwise the system's. */
function currentTheme(): Theme {
  const set = document.documentElement.dataset.theme;
  return set === "light" || set === "dark" ? set : systemTheme();
}

function subscribeTheme(notify: () => void) {
  const media = matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", notify);
  window.addEventListener(THEME_EVENT, notify);
  return () => {
    media.removeEventListener("change", notify);
    window.removeEventListener(THEME_EVENT, notify);
  };
}

/** The site's theme, following the system until the visitor picks one (then it is remembered). */
export function useSiteTheme(): [Theme, (next: Theme) => void] {
  const theme = useSyncExternalStore(subscribeTheme, currentTheme, () => "light" as Theme);
  const set = (next: Theme) => {
    // Fade colours between themes instead of snapping.
    const root = document.documentElement;
    root.classList.add("theme-fade");
    window.setTimeout(() => root.classList.remove("theme-fade"), 350);
    root.dataset.theme = next;
    savePref("theme", next);
    window.dispatchEvent(new Event(THEME_EVENT));
  };
  return [theme, set];
}

/** The visitor's system, known only in the browser; null while prerendering and on first paint so both match. */
export function useOs(): Os | null {
  const [os, setOs] = useState<Os | null>(null);
  useEffect(() => setOs(detectOs()), []);
  return os;
}
