import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import styles from "./WindowControls.module.scss";

export type Platform = "mac" | "windows" | "linux";

export function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/Mac/i.test(ua)) return "mac";
  if (/Windows/i.test(ua)) return "windows";
  return "linux";
}

/**
 * Caption buttons for the frameless window, drawn the way each platform draws them:
 * Windows gets flush rectangular minimize/maximize/close; Linux gets round
 * GNOME-style buttons. macOS uses its native traffic lights, so renders nothing.
 */
export function WindowControls({ platform }: { platform: Exclude<Platform, "mac"> }) {
  const [focused, setFocused] = useState(true);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const on = () => setFocused(true);
    const off = () => setFocused(false);
    window.addEventListener("focus", on);
    window.addEventListener("blur", off);

    // Outside the Tauri shell (e.g. a plain browser preview) there is no window to track.
    let unlisten: Promise<() => void> | undefined;
    try {
      const win = getCurrentWindow();
      const sync = () => win.isMaximized().then(setMaximized).catch(() => {});
      sync();
      unlisten = win.onResized(sync);
    } catch {
      /* not running inside Tauri */
    }

    return () => {
      window.removeEventListener("focus", on);
      window.removeEventListener("blur", off);
      void unlisten?.then((fn) => fn());
    };
  }, []);

  const win = () => getCurrentWindow();

  return (
    <div className={styles.controls} data-platform={platform} data-focused={focused}>
      <button aria-label="Minimize" onClick={() => win().minimize()}>
        <svg viewBox="0 0 10 10"><path d="M1 5h8" /></svg>
      </button>
      <button
        aria-label={maximized ? "Restore" : "Maximize"}
        onClick={() => win().toggleMaximize()}
      >
        {maximized ? (
          <svg viewBox="0 0 10 10">
            <path d="M2.5 3.5h5v5h-5z M3.5 3.5v-1.5h5v5h-1.5" />
          </svg>
        ) : (
          <svg viewBox="0 0 10 10"><path d="M1.5 1.5h7v7h-7z" /></svg>
        )}
      </button>
      <button className={styles.close} aria-label="Close" onClick={() => win().close()}>
        <svg viewBox="0 0 10 10"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" /></svg>
      </button>
    </div>
  );
}
