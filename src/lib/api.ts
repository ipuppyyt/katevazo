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
}

export const fetchMetadata = (url: string) =>
  invoke<Metadata>("fetch_metadata", { url });

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

export interface DownloadOptions {
  kind: "video" | "audio";
  height?: number | null;
  dir?: string | null;
  title?: string | null;
}

export type Theme = "system" | "light" | "dark";

export interface Settings {
  download_dir: string | null;
  theme: Theme;
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

/** Distinct video heights available, highest first (e.g. [1080, 720, 360]). */
export function availableHeights(formats: Format[]): number[] {
  const heights = formats
    .filter((f) => f.height && f.vcodec && f.vcodec !== "none")
    .map((f) => f.height as number);
  return [...new Set(heights)].sort((a, b) => b - a);
}
