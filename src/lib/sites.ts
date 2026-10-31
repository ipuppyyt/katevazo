export interface Site {
  name: string;
  /** Matches the host name, e.g. "www.vimeo.com". */
  host: RegExp;
  /** Something worth knowing before downloading from this site. */
  note?: string;
}

const SIGN_IN = "Settings → Network → Sign in with browser cookies";

/** Sites Katevazo offers to download from when their link is copied. yt-dlp handles many more. */
export const SITES: Site[] = [
  { name: "YouTube", host: /^(www\.|m\.|music\.)?(youtube\.com|youtu\.be)$/ },
  {
    name: "Vimeo",
    host: /^(www\.|player\.)?vimeo\.com$/,
    note: `Vimeo often asks you to sign in before it shares a video. Pick your browser under ${SIGN_IN}.`,
  },
  {
    name: "SoundCloud",
    host: /^(www\.|m\.)?soundcloud\.com$/,
    note: "SoundCloud only has audio, so choose an audio format.",
  },
  {
    name: "X",
    host: /^(www\.|mobile\.)?(x\.com|twitter\.com)$/,
    note: `Only posts that contain a video can be downloaded. Some need you to be signed in: ${SIGN_IN}.`,
  },
  {
    name: "Instagram",
    host: /^(www\.)?instagram\.com$/,
    note: `Instagram usually wants you to be signed in. Pick your browser under ${SIGN_IN}.`,
  },
  {
    name: "TikTok",
    host: /^(www\.|m\.|vm\.)?tiktok\.com$/,
    note: "TikTok changes often. If a download fails, update yt-dlp in Settings and try again.",
  },
  {
    name: "Twitch",
    host: /^(www\.|m\.|clips\.)?twitch\.tv$/,
    note: "Past broadcasts and clips download normally. A channel that is live is recorded until you press Stop.",
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
