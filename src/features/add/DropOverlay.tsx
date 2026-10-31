import { useEffect, useState } from "react";
import { Icon } from "../../components/Icon";
import { useApp } from "../../lib/app";
import { extractLinks } from "../../lib/links";
import styles from "./DropOverlay.module.scss";

/** Text files bigger than this are not a list of links. */
const MAX_LIST_BYTES = 2_000_000;

/**
 * Accepts a link dragged from a browser, or a text file with one link per line, anywhere in
 * the window. The webview's own drop handling is used (not Tauri's), because it is the only
 * one that can see dragged links.
 */
export function DropOverlay() {
  const [over, setOver] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const openLinks = useApp((s) => s.openLinks);

  useEffect(() => {
    let depth = 0;
    const carriesContent = (e: DragEvent) => {
      const types = e.dataTransfer?.types ?? [];
      return types.includes("Files") || types.includes("text/uri-list") || types.includes("text/plain");
    };
    const enter = (e: DragEvent) => {
      if (!carriesContent(e)) return;
      e.preventDefault();
      depth++;
      setOver(true);
    };
    const hover = (e: DragEvent) => {
      if (carriesContent(e)) e.preventDefault();
    };
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setOver(false);
    };
    const drop = async (e: DragEvent) => {
      e.preventDefault();
      depth = 0;
      setOver(false);
      const data = e.dataTransfer;
      if (!data) return;
      let text = `${data.getData("text/uri-list")}\n${data.getData("text/plain")}`;
      for (const file of Array.from(data.files)) {
        if (file.size <= MAX_LIST_BYTES && (file.type.startsWith("text/") || /\.(txt|csv|url|list)$/i.test(file.name))) {
          text += `\n${await file.text()}`;
        }
      }
      const links = extractLinks(text);
      if (links.length === 0) {
        setNotice("No links found in what you dropped.");
        window.setTimeout(() => setNotice(null), 3500);
      } else {
        openLinks(links);
      }
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", hover);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", hover);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, [openLinks]);

  return (
    <>
      {over && (
        <div className={styles.overlay} aria-hidden="true">
          <div className={styles.box}>
            <Icon name="link" size={36} />
            <strong>Drop to download</strong>
            <span>A link, or a text file with one link per line</span>
          </div>
        </div>
      )}
      {notice && (
        <div className={styles.notice} role="status">
          {notice}
        </div>
      )}
    </>
  );
}
