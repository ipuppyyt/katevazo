import { useEffect } from "react";
import { useApp } from "../../lib/app";
import { focusLinkField, TABS } from "./commands";

const isEditable = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

/** Window-wide keyboard shortcuts; Ctrl on Windows and Linux, Cmd on a Mac. */
export function useShortcuts() {
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      const app = useApp.getState();
      if (e.key === "k") {
        app.setPalette(!app.palette);
      } else if (e.key === "l") {
        focusLinkField();
      } else if (e.key === ",") {
        app.setTab("Settings");
      } else if (/^[1-5]$/.test(e.key)) {
        app.setTab(TABS[Number(e.key) - 1]);
      } else {
        return;
      }
      e.preventDefault();
    };
    // Pasting somewhere that is not a text field means "download this".
    const paste = (e: ClipboardEvent) => {
      if (isEditable(e.target)) return;
      const text = e.clipboardData?.getData("text/plain");
      if (text) useApp.getState().openText(text);
    };
    window.addEventListener("keydown", keydown);
    window.addEventListener("paste", paste);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("paste", paste);
    };
  }, []);
}
