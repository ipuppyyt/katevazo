import { useEffect, useState } from "react";
import { Icon } from "../../components/Icon";
import { ToolbarSlot } from "../../components/ToolbarSlot";
import { clearHistory, listHistory, type HistoryEntry } from "../../lib/api";
import styles from "./HistoryView.module.scss";

export function HistoryView() {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => listHistory().then(setEntries).catch((e) => setError(String(e)));
  useEffect(() => void load(), []);

  async function clear() {
    await clearHistory();
    load();
  }

  if (error) return <div className={styles.error}>{error}</div>;
  if (!entries) return null;
  if (entries.length === 0)
    return (
      <div className={styles.empty}>
        <Icon name="clock" size={44} />
        <h2>No History</h2>
        <p>Finished downloads appear here.</p>
      </div>
    );

  return (
    <>
      <ToolbarSlot>
        <span className={styles.count}>{entries.length} items</span>
        <button className={styles.clear} onClick={clear}>
          Clear History
        </button>
      </ToolbarSlot>
      <ul className={styles.list}>
        {entries.map((h) => (
          <li key={h.id} className={styles.item}>
            <span className={styles.glyph}>
              <Icon name={h.kind === "audio" ? "music" : "download"} size={15} />
            </span>
            <div className={styles.text}>
              <span className={styles.title}>{h.title}</span>
              <span className={styles.meta}>
                {h.kind === "audio" ? "Audio" : "Video"} ·{" "}
                {new Date(h.finished_at * 1000).toLocaleString([], {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
              {h.file && <code className={styles.file}>{h.file}</code>}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
