import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { create } from "zustand";

/** Where the app's own update stands. Nothing here ever interrupts the user: it is only shown. */
export type UpdateStatus =
  | { state: "checking" }
  | { state: "current" }
  | { state: "downloading"; version: string }
  | { state: "ready"; version: string }
  | { state: "installing"; version: string }
  | { state: "failed" };

interface UpdateState {
  status: UpdateStatus;
  setStatus: (status: UpdateStatus) => void;
}

export const useUpdate = create<UpdateState>((set) => ({
  status: { state: "checking" },
  setStatus: (status) => set({ status }),
}));

/** The first look waits a little so it never competes with the window opening. */
const FIRST_CHECK_DELAY = 8_000;
/** The app can stay open in the tray for days, so it looks again now and then. */
const RECHECK_EVERY = 6 * 60 * 60 * 1000;

let pending: Update | null = null;
let working = false;

async function look() {
  const { status, setStatus } = useUpdate.getState();
  // Once an update is downloaded or being installed there is nothing more to look for.
  if (working || status.state === "ready" || status.state === "installing") return;
  working = true;
  try {
    const update = await check();
    if (!update) {
      setStatus({ state: "current" });
      return;
    }
    setStatus({ state: "downloading", version: update.version });
    await update.download();
    pending = update;
    setStatus({ state: "ready", version: update.version });
  } catch {
    // Offline, no release yet, or a development build: try again next time.
    setStatus({ state: "failed" });
  } finally {
    working = false;
  }
}

/** Checks for a new version a moment after launch and every few hours; returns a stop function. */
export function startUpdateChecks(): () => void {
  const first = window.setTimeout(() => void look(), FIRST_CHECK_DELAY);
  const again = window.setInterval(() => void look(), RECHECK_EVERY);
  return () => {
    window.clearTimeout(first);
    window.clearInterval(again);
  };
}

/** Installs the downloaded update and restarts into it. */
export async function installUpdate(): Promise<void> {
  const { status, setStatus } = useUpdate.getState();
  if (!pending || status.state !== "ready") return;
  setStatus({ state: "installing", version: status.version });
  try {
    await pending.install();
    await relaunch();
  } catch {
    setStatus({ state: "failed" });
  }
}
