import type { Key } from "./i18n";

export interface Site {
  name: string;
  /** Matches the host name, e.g. "www.vimeo.com". */
  host: RegExp;
  /** Something worth knowing before downloading from this site. */
  note?: Key;
}

/** Sites Katevazo offers to download from when their link is copied. yt-dlp handles many more. */
export const SITES: Site[] = [
  { name: "YouTube", host: /^(www\.|m\.|music\.)?(youtube\.com|youtu\.be)$/ },
  {
    name: "Vimeo",
    host: /^(www\.|player\.)?vimeo\.com$/,
    note: "site.vimeo",
  },
  {
    name: "SoundCloud",
    host: /^(www\.|m\.)?soundcloud\.com$/,
    note: "site.soundcloud",
  },
  {
    name: "X",
    host: /^(www\.|mobile\.)?(x\.com|twitter\.com)$/,
    note: "site.x",
  },
  {
    name: "Instagram",
    host: /^(www\.)?instagram\.com$/,
    note: "site.instagram",
  },
  {
    name: "TikTok",
    host: /^(www\.|m\.|vm\.)?tiktok\.com$/,
    note: "site.tiktok",
  },
  {
    name: "Twitch",
    host: /^(www\.|m\.|clips\.)?twitch\.tv$/,
    note: "site.twitch",
  },
  { name: "Facebook", host: /^(www\.|m\.|web\.)?(facebook\.com|fb\.watch)$/ },
  { name: "Reddit", host: /^(www\.|old\.)?reddit\.com$/ },
  { name: "Dailymotion", host: /^(www\.)?(dailymotion\.com|dai\.ly)$/ },
];

function hostOf(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.hostname.toLowerCase() : null;
  } catch {
    return null;
  }
}

/** The known site a link belongs to, if any. */
export function siteFor(raw: string): Site | null {
  const host = hostOf(raw);
  return host ? (SITES.find((s) => s.host.test(host)) ?? null) : null;
}

/** What to call the site in the badge: our name for it, else yt-dlp's. */
export function siteName(raw: string, extractor: string | null): string | null {
  const known = siteFor(raw);
  if (known) return known.name;
  // "Generic" is yt-dlp's fallback for pages it only guessed at.
  const name = extractor?.replace(/Generic$/i, "").trim();
  return name || null;
}
