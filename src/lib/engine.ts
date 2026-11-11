import { listen } from "@tauri-apps/api/event";
import { create } from "zustand";
import { engineStatus, type EngineStatus } from "./api";

interface EngineState {
  status: EngineStatus;
  /** Links from the browser extension that are waiting for the update to finish. */
  held: number;
  setStatus: (status: EngineStatus) => void;
  setHeld: (held: number) => void;
}

export const useEngine = create<EngineState>((set) => ({
  status: { state: "updating" },
  held: 0,
  setStatus: (status) => set({ status }),
  setHeld: (held) => set({ held }),
}));

/** Follows the engine from the backend: its state now, and every change after. */
export function listenEngine(): Promise<() => void> {
  const apply = useEngine.getState().setStatus;
  const unlisten = listen<EngineStatus>("engine://status", (e) => apply(e.payload));
  // The update may have finished before the window was listening.
  engineStatus().then(apply).catch(() => {});
  return unlisten;
}

/** Resolves when the engine is not updating (straight away if it already is not). */
export function whenEngineReady(): Promise<void> {
  if (useEngine.getState().status.state !== "updating") return Promise.resolve();
  return new Promise((resolve) => {
    const stop = useEngine.subscribe((s) => {
      if (s.status.state === "updating") return;
      stop();
      resolve();
    });
  });
}
