import { create } from "zustand";
import { extractLinks } from "./links";

export type Tab = "Downloads" | "History" | "Subscriptions" | "Convert" | "Settings";

interface AppState {
  tab: Tab;
  setTab: (tab: Tab) => void;
  /** Links sent to the app (dropped, from a browser, re-downloads) and not yet picked up. */
  incoming: { links: string[]; id: number } | null;
  /** Shows the Downloads tab and fetches these links. Anything that is not a link is ignored. */
  openLinks: (links: string[]) => void;
  /** Same, for raw text that may contain links. */
  openText: (text: string) => void;
  clearIncoming: () => void;
  palette: boolean;
  shortcuts: boolean;
  setPalette: (open: boolean) => void;
  setShortcuts: (open: boolean) => void;
}

let counter = 0;

export const useApp = create<AppState>((set, get) => ({
  tab: "Downloads",
  setTab: (tab) => set({ tab }),
  incoming: null,
  openLinks: (links) => {
    if (links.length === 0) return;
    set({ tab: "Downloads", incoming: { links, id: ++counter } });
  },
  openText: (text) => get().openLinks(extractLinks(text)),
  clearIncoming: () => set({ incoming: null }),
  palette: false,
  shortcuts: false,
  setPalette: (palette) => set({ palette, shortcuts: false }),
  setShortcuts: (shortcuts) => set({ shortcuts, palette: false }),
}));
