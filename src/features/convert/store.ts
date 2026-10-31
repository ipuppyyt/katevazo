import { listen } from "@tauri-apps/api/event";
import { create } from "zustand";
import { cancelConvert, convertFile, type ConvertTarget } from "../../lib/api";

export interface ConvertItem {
  id: string;
  path: string;
  name: string;
  status: "waiting" | "converting" | "done" | "error";
  percent: number;
  target: ConvertTarget | null;
  output: string | null;
  error: string | null;
}

interface ConvertState {
  items: ConvertItem[];
  target: ConvertTarget;
  running: boolean;
  setTarget: (target: ConvertTarget) => void;
  addFiles: (paths: string[]) => void;
  /** Converts every waiting file, one after another. */
  start: () => Promise<void>;
  cancel: (id: string) => void;
  remove: (id: string) => void;
  clearFinished: () => void;
}

let next = 1;
let listening = false;

const fileName = (path: string) => path.split(/[\\/]/).pop() ?? path;

export const useConvert = create<ConvertState>((set, get) => {
  const patch = (id: string, change: Partial<ConvertItem>) =>
    set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...change } : i)) }));

  return {
    items: [],
    target: "mp4",
    running: false,
    setTarget: (target) => set({ target }),
    addFiles: (paths) =>
      set((s) => ({
        items: [
          ...s.items,
          ...paths
            .filter((p) => !s.items.some((i) => i.path === p && i.status !== "done" && i.status !== "error"))
            .map<ConvertItem>((path) => ({
              id: `c${next++}`,
              path,
              name: fileName(path),
              status: "waiting",
              percent: 0,
              target: null,
              output: null,
              error: null,
            })),
        ],
      })),
    start: async () => {
      if (get().running) return;
      if (!listening) {
        listening = true;
        await listen<{ id: string; percent: number }>("convert://progress", (e) =>
          patch(e.payload.id, { percent: e.payload.percent }),
        );
      }
      set({ running: true });
      for (;;) {
        const item = get().items.find((i) => i.status === "waiting");
        if (!item) break;
        const target = get().target;
        patch(item.id, { status: "converting", percent: 0, target });
        try {
          const output = await convertFile(item.id, item.path, target);
          patch(item.id, { status: "done", percent: 100, output });
        } catch (e) {
          // A cancelled file is simply dropped from the list.
          if (String(e) === "Cancelled") get().remove(item.id);
          else patch(item.id, { status: "error", error: String(e) });
        }
      }
      set({ running: false });
    },
    cancel: (id) => void cancelConvert(id),
    remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
    clearFinished: () =>
      set((s) => ({ items: s.items.filter((i) => i.status !== "done" && i.status !== "error") })),
  };
});
