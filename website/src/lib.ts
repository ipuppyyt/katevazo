import { useEffect, useState } from "react";

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

/** Reads the newest published release so the page never needs a rebuild to offer it. */
export function useRelease(): Release | null {
  const [release, setRelease] = useState<Release | null>(null);
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
