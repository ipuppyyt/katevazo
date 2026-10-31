import { listen } from "@tauri-apps/api/event";
import { create } from "zustand";
import {
  startDownload,
  type DownloadOptions,
  type DownloadUpdate,
} from "../../lib/api";

/** The bits of a video the queue needs; `Metadata` and playlist entries both fit. */
export interface QueueItem {
  title: string;
  thumbnail: string | null;
}

export interface Job extends Omit<DownloadUpdate, "title"> {
  /** When a scheduled download is due to start, in milliseconds since the epoch. */
  scheduledFor: number | null;
  /** A live recording, which has no end point to show progress towards. */
  live: boolean;
  title: string;
  label: string;
  thumbnail: string | null;
}

interface QueueState {
  jobs: Job[];
  /** New downloads go on top of the list, or at the bottom when `append` is set. */
  add: (
    meta: QueueItem,
    url: string,
    options: DownloadOptions,
    append?: boolean,
  ) => Promise<void>;
  apply: (update: DownloadUpdate) => void;
  remove: (id: string) => void;
  /** Shows a message on a finished job, e.g. when its file can no longer be opened. */
  note: (id: string, message: string) => void;
  clearFinished: () => void;
}

/** Short summary of the chosen format, shown on the job row (e.g. "1080p · MKV"). */
export function describe(o: DownloadOptions): string {
  if (o.kind === "audio") {
    const bitrate = o.audio_bitrate ? ` · ${o.audio_bitrate} kbps` : "";
    return (o.audio_format ?? "mp3").toUpperCase() + bitrate;
  }
  const quality = o.height ? `${o.height}p` : "Best";
  const codec = o.codec && o.codec !== "any" ? ` · ${o.codec.toUpperCase()}` : "";
  return `${quality} · ${(o.container ?? "mp4").toUpperCase()}${codec}`;
}

const blank = ({ title, ...u }: DownloadUpdate): Job => ({
  ...u,
  scheduledFor: null,
  live: false,
  title: title ?? "…",
  label: "",
  thumbnail: null,
});

export const useQueue = create<QueueState>((set) => ({
  jobs: [],
  add: async (meta, url, options, append = false) => {
    const label = describe(options);
    const id = await startDownload(url, { ...options, title: meta.title });
    const details = {
      title: meta.title,
      label,
      thumbnail: meta.thumbnail,
      scheduledFor: options.start_at ?? null,
      live: options.live ?? false,
    };
    // Events can arrive before this resolves; keep any job `apply` already created.
    set((s) =>
      s.jobs.some((j) => j.id === id)
        ? { jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...details } : j)) }
        : (() => {
            const job: Job = {
              id, status: "queued", percent: null, speed: null, eta: null,
              file: null, error: null, ...details,
            };
            return { jobs: append ? [...s.jobs, job] : [job, ...s.jobs] };
          })(),
    );
  },
  apply: (u) =>
    set((s) => {
      if (!s.jobs.some((j) => j.id === u.id)) {
        // The user removed this job locally; its late "cancelled" event must not bring it back.
        return u.status === "cancelled" ? s : { jobs: [blank(u), ...s.jobs] };
      }
      return {
        jobs: s.jobs.map((j) => {
          if (j.id !== u.id) return j;
          // A cancel can be reported twice (immediately, then when the process exits).
          if (j.status === "cancelled") return j;
          // Only a job's first update carries its title; later ones must not blank it.
          const { title, ...update } = u;
          const finished = u.status === "done" || u.status === "error" || u.status === "paused";
          return {
            ...j,
            ...update,
            title: j.title === "…" && title ? title : j.title,
            // The backend's percentage is already monotonic; just ignore gaps.
            percent: u.percent ?? j.percent,
            speed: finished ? null : u.speed,
            eta: finished ? null : u.eta,
          };
        }),
      };
    }),
  note: (id, message) =>
    set((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, error: message } : j)) })),
  remove: (id) => set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) })),
  clearFinished: () =>
    set((s) => ({
      jobs: s.jobs.filter((j) => !["done", "cancelled"].includes(j.status)),
    })),
}));

/** Subscribes once to backend progress events; returns the unsubscribe function. */
export async function listenForUpdates() {
  return listen<DownloadUpdate>("download://update", (e) =>
    useQueue.getState().apply(e.payload),
  );
}
