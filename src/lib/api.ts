import { invoke } from "@tauri-apps/api/core";

export interface Format {
  format_id: string;
  ext: string;
  height: number | null;
  vcodec: string | null;
  acodec: string | null;
  filesize: number | null;
}

export interface Metadata {
  id: string;
  title: string;
  thumbnail: string | null;
  duration: number | null;
  uploader: string | null;
  formats: Format[];
  playlist_count: number | null;
  subtitle_langs: string[];
  auto_caption_langs: string[];
}

export const fetchMetadata = (url: string) =>
  invoke<Metadata>("fetch_metadata", { url });

export interface PlaylistEntry {
  id: string;
  title: string;
  url: string;
  duration: number | null;
  thumbnail: string | null;
}

export interface Playlist {
  title: string;
  uploader: string | null;
  entries: PlaylistEntry[];
}

export const fetchPlaylist = (url: string) =>
  invoke<Playlist>("fetch_playlist", { url });

/** True for a link Katevazo can download; so far that means YouTube. */
export function isVideoUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    return (
      (u.protocol === "https:" || u.protocol === "http:") &&
      /^(www\.|m\.|music\.)?(youtube\.com|youtu\.be)$/.test(u.hostname)
    );
  } catch {
    return false;
  }
}

/** True for YouTube playlist and channel links, which list many videos. */
export function isPlaylistUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (!/(^|\.)youtube\.com$/.test(u.hostname)) return false;
    const path = u.pathname.replace(/\/+$/, "");
    if (path === "/playlist") return true;
    // A watch link that is merely inside a playlist is treated as the single video.
    if (u.searchParams.has("list") && !u.searchParams.has("v") && path === "/watch") return true;
    return /^\/(@[^/]+|(channel|c|user)\/[^/]+)(\/videos)?$/.test(path);
  } catch {
    return false;
  }
}

export type Status =
  | "queued"
  | "downloading"
  | "processing"
  | "paused"
  | "done"
  | "error"
  | "cancelled";

export interface DownloadUpdate {
  id: string;
  status: Status;
  percent: number | null;
  speed: number | null;
  eta: number | null;
  file: string | null;
  error: string | null;
}

export type Container = "mp4" | "mkv" | "webm";
export type Codec = "any" | "h264" | "vp9" | "av1";
export type AudioFormat = "mp3" | "m4a" | "opus" | "flac" | "wav";

export interface DownloadOptions {
  kind: "video" | "audio";
  height?: number | null;
  container?: Container;
  codec?: Codec;
  audio_format?: AudioFormat;
  /** kbit/s; null means the best quality. */
  audio_bitrate?: number | null;
  subtitles?: { lang: string; auto: boolean; embed: boolean } | null;
  /** Keep only this part of the video, in seconds. */
  section?: { start: number; end: number } | null;
  /** Wait until this time (milliseconds since the epoch) before starting. */
  start_at?: number | null;
  dir?: string | null;
  title?: string | null;
}

export type Theme = "system" | "light" | "dark";

export interface Settings {
  download_dir: string | null;
  theme: Theme;
  embed_metadata: boolean;
  embed_thumbnail: boolean;
  filename_template: string;
  watch_clipboard: boolean;
  notifications: boolean;
  max_concurrent: number;
  /** Automatic retries after a network problem. */
  max_retries: number;
  /** e.g. socks5://127.0.0.1:1080; empty for none. */
  proxy: string;
  /** Skip videos that were downloaded before. */
  use_archive: boolean;
  /** What to do with sponsor segments. */
  sponsorblock: "off" | "mark" | "remove";
  /** Browser to read cookies from, or empty. */
  cookies_from_browser: string;
  /** KiB/s per download; null means unlimited. */
  speed_limit_kbps: number | null;
}

/** Fields usable in a filename template, with an example value for the live preview. */
export const TEMPLATE_FIELDS = [
  { name: "title", sample: "Me at the zoo" },
  { name: "uploader", sample: "jawed" },
  { name: "channel", sample: "jawed" },
  { name: "id", sample: "jNQXAC9IVRw" },
  { name: "date", sample: "2005-04-24" },
  { name: "year", sample: "2005" },
] as const;

/** What a file would be called, using a sample video. */
export function previewTemplate(template: string): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const field = TEMPLATE_FIELDS.find((f) => f.name === name);
    return field ? field.sample : whole;
  });
}

export interface HistoryEntry {
  id: number;
  title: string;
  url: string;
  file: string | null;
  kind: "video" | "audio";
  finished_at: number;
}

export const getSettings = () => invoke<Settings>("get_settings");
export const setSettings = (settings: Settings) =>
  invoke<void>("set_settings", { settings });
export const listHistory = () => invoke<HistoryEntry[]>("list_history");
export const clearHistory = () => invoke<void>("clear_history");

export function applyTheme(theme: Theme) {
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

export const startDownload = (url: string, options: DownloadOptions) =>
  invoke<string>("start_download", { url, options });

/** Opens a finished download in its default app. */
export const openFile = (path: string) => invoke<void>("open_file", { path });

/** Shows a finished download in the system file manager. */
export const revealFile = (path: string) => invoke<void>("reveal_file", { path });

export const pauseDownload = (id: string) =>
  invoke<void>("pause_download", { id });

/** Resumes a paused download, or retries a failed one. */
export const resumeDownload = (id: string) =>
  invoke<void>("resume_download", { id });

export const cancelDownload = (id: string) =>
  invoke<void>("cancel_download", { id });

export function formatSpeed(bytesPerSecond: number): string {
  const mb = bytesPerSecond / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB/s` : `${Math.round(bytesPerSecond / 1024)} KB/s`;
}

export function formatEta(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  return m < 60 ? `${m}m ${seconds % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** How many videos the download archive remembers. */
export const archiveSize = () => invoke<number>("archive_size");
export const clearArchive = () => invoke<void>("clear_archive");

export const ytdlpVersion = () => invoke<string>("ytdlp_version");
export const updateYtdlp = () => invoke<string>("update_ytdlp");

export function formatDuration(seconds: number | null): string {
  if (seconds == null) return "";
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

/** Video codecs offered by at least one format. */
export function availableCodecs(formats: Format[]): Codec[] {
  const has = (prefix: string) =>
    formats.some((f) => f.vcodec?.toLowerCase().startsWith(prefix));
  const found: Codec[] = [];
  if (has("avc")) found.push("h264");
  if (has("vp9") || has("vp09")) found.push("vp9");
  if (has("av01")) found.push("av1");
  return found;
}

/** Distinct video heights available, highest first (e.g. [1080, 720, 360]). */
export function availableHeights(formats: Format[]): number[] {
  const heights = formats
    .filter((f) => f.height && f.vcodec && f.vcodec !== "none")
    .map((f) => f.height as number);
  return [...new Set(heights)].sort((a, b) => b - a);
}

/** Reads "83", "1:23" or "1:02:03" as seconds; null when it is not a time. */
export function parseTime(text: string): number | null {
  const parts = text.trim().split(":");
  if (parts.length > 3 || parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return null;
  return parts.reduce((total, p) => total * 60 + Number(p), 0);
}
