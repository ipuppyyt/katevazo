import { listen } from "@tauri-apps/api/event";
import { create } from "zustand";
import {
  startDownload,
  type DownloadOptions,
  type DownloadUpdate,
  type Metadata,
} from "../../lib/api";

export interface Job extends DownloadUpdate {
  title: string;
  label: string;
  thumbnail: string | null;
}

interface QueueState {
  jobs: Job[];
  add: (meta: Metadata, url: string, options: DownloadOptions) => Promise<void>;
  apply: (update: DownloadUpdate) => void;
  remove: (id: string) => void;
  clearFinished: () => void;
}

const blank = (u: DownloadUpdate): Job => ({
  ...u,
  title: "…",
  label: "",
  thumbnail: null,
});

export const useQueue = create<QueueState>((set) => ({
  jobs: [],
  add: async (meta, url, options) => {
    const label =
      options.kind === "audio" ? "MP3" : options.height ? `${options.height}p` : "Best";
    const id = await startDownload(url, { ...options, title: meta.title });
    const details = { title: meta.title, label, thumbnail: meta.thumbnail };
    // Events can arrive before this resolves; keep any job `apply` already created.
    set((s) =>
      s.jobs.some((j) => j.id === id)
        ? { jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...details } : j)) }
        : {
            jobs: [
              {
                id, status: "queued", percent: null, speed: null, eta: null,
                file: null, error: null, ...details,
              },
              ...s.jobs,
            ],
          },
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
