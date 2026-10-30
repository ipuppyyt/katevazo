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

export interface Job extends DownloadUpdate {
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
  clearFinished: () => void;
}

/** Short summary of the chosen format, shown on the job row (e.g. "1080p · MKV"). */
function describe(o: DownloadOptions): string {
  if (o.kind === "audio") {
    const bitrate = o.audio_bitrate ? ` · ${o.audio_bitrate} kbps` : "";
    return (o.audio_format ?? "mp3").toUpperCase() + bitrate;
  }
  const quality = o.height ? `${o.height}p` : "Best";
  const codec = o.codec && o.codec !== "any" ? ` · ${o.codec.toUpperCase()}` : "";
  return `${quality} · ${(o.container ?? "mp4").toUpperCase()}${codec}`;
}

const blank = (u: DownloadUpdate): Job => ({
  ...u,
  title: "…",
  label: "",
  thumbnail: null,
});

export const useQueue = create<QueueState>((set) => ({
  jobs: [],
  add: async (meta, url, options, append = false) => {
    const label = describe(options);
    const id = await startDownload(url, { ...options, title: meta.title });
    const details = { title: meta.title, label, thumbnail: meta.thumbnail };
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
          const finished = u.status === "done" || u.status === "error" || u.status === "paused";
          return {
            ...j,
            ...u,
            // The backend's percentage is already monotonic; just ignore gaps.
            percent: u.percent ?? j.percent,
            speed: finished ? null : u.speed,
            eta: finished ? null : u.eta,
          };
        }),
      };
    }),
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
