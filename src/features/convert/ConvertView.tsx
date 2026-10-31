import { open } from "@tauri-apps/plugin-dialog";
import { Icon } from "../../components/Icon";
import { ToolbarSlot } from "../../components/ToolbarSlot";
import { openFile, revealFile, type ConvertTarget } from "../../lib/api";
import styles from "./ConvertView.module.scss";
import { useConvert, type ConvertItem } from "./store";

const VIDEO: { value: ConvertTarget; label: string }[] = [
  { value: "mp4", label: "MP4 (H.264)" },
  { value: "mkv", label: "MKV (keeps the streams as they are)" },
  { value: "webm", label: "WebM (VP9)" },
];

const AUDIO: { value: ConvertTarget; label: string }[] = [
  { value: "mp3", label: "MP3" },
  { value: "m4a", label: "M4A (AAC)" },
  { value: "opus", label: "Opus" },
  { value: "flac", label: "FLAC (lossless)" },
  { value: "wav", label: "WAV (lossless)" },
];

function statusText(i: ConvertItem): string {
  switch (i.status) {
    case "waiting":
      return "Waiting";
    case "converting":
      return i.percent > 0 ? `Converting · ${Math.floor(i.percent)}%` : "Converting…";
    case "done":
      return `Saved as ${i.output?.split(/[\\/]/).pop() ?? "a new file"}`;
    case "error":
      return i.error ?? "Failed";
  }
}

export function ConvertView() {
  const { items, target, running, setTarget, addFiles, start, cancel, remove, clearFinished } = useConvert();

  async function choose() {
    const picked = await open({
      multiple: true,
      filters: [
        {
          name: "Video and audio",
          extensions: ["mp4", "mkv", "webm", "mov", "avi", "flv", "wmv", "m4v", "ts", "mp3", "m4a", "aac", "opus", "ogg", "flac", "wav", "wma"],
        },
      ],
    });
    if (Array.isArray(picked)) addFiles(picked);
  }

  const waiting = items.filter((i) => i.status === "waiting").length;
  const hasFinished = items.some((i) => i.status === "done" || i.status === "error");

  return (
    <>
      <ToolbarSlot>
        {hasFinished && (
          <button className={styles.plain} onClick={clearFinished}>
            Clear finished
          </button>
        )}
        <button className={styles.tinted} onClick={choose}>
          Add Files…
        </button>
      </ToolbarSlot>

      <div className={styles.bar}>
        <label className={styles.target}>
          <span>Convert to</span>
          <select value={target} onChange={(e) => setTarget(e.currentTarget.value as ConvertTarget)} aria-label="Convert to">
            <optgroup label="Video">
              {VIDEO.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </optgroup>
            <optgroup label="Audio only">
              {AUDIO.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </optgroup>
          </select>
        </label>
        <button className={styles.primary} onClick={start} disabled={running || waiting === 0}>
          {running ? "Converting…" : waiting > 1 ? `Convert ${waiting} files` : "Convert"}
        </button>
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>
          <Icon name="convert" size={44} />
          <h2>No Files</h2>
          <p>Add videos or music to change their format. The originals are never touched.</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {items.map((i) => (
            <li key={i.id} className={styles.item} data-status={i.status}>
              <div className={styles.text}>
                <span className={styles.name}>{i.name}</span>
                <div className={styles.track} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(i.percent)}>
                  <div className={styles.fill} style={{ width: `${i.percent}%` }} />
                </div>
                <span className={i.status === "error" ? styles.problem : styles.meta}>{statusText(i)}</span>
              </div>
              <div className={styles.actions}>
                {i.status === "done" && i.output && (
                  <>
                    <button title="Open" aria-label="Open" onClick={() => openFile(i.output!)}>
                      <Icon name="play" size={14} />
                    </button>
                    <button title="Show in folder" aria-label="Show in folder" onClick={() => revealFile(i.output!)}>
                      <Icon name="folder" size={14} />
                    </button>
                  </>
                )}
                <button
                  title={i.status === "converting" ? "Cancel" : "Remove"}
                  aria-label={i.status === "converting" ? "Cancel" : "Remove"}
                  onClick={() => (i.status === "converting" ? cancel(i.id) : remove(i.id))}
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
