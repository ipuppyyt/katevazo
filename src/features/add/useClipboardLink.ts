import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSettings, isVideoUrl } from "../../lib/api";

/**
 * Watches the clipboard whenever the window comes to the front and returns a video link
 * the user may want to download. Each link is offered once; `dismiss` clears it.
 */
export function useClipboardLink(active: boolean) {
  const [link, setLink] = useState<string | null>(null);
  const seen = useRef<string | null>(null);

  const check = useCallback(async () => {
    try {
      if (!(await getSettings()).watch_clipboard) return;
      const text = (await readText())?.trim();
      if (!text || text === seen.current || !isVideoUrl(text)) return;
      seen.current = text;
      setLink(text);
    } catch {
      // No clipboard access (or not running inside Tauri): just do not offer anything.
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    check();
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, [active, check]);

  return { link, dismiss: () => setLink(null) };
}
