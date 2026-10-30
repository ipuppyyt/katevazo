import { useState } from "react";
import { Segmented } from "../../components/Segmented";
import { availableHeights, formatDuration, type Metadata } from "../../lib/api";
import { useQueue } from "../queue/store";
import styles from "./MetadataCard.module.scss";

const KINDS = [
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
] as const;

export function MetadataCard({ meta, url }: { meta: Metadata; url: string }) {
  const heights = availableHeights(meta.formats);
  const [kind, setKind] = useState<"video" | "audio">("video");
  const [height, setHeight] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const add = useQueue((s) => s.add);

  async function download() {
    setError(null);
    try {
      await add(meta, url, { kind, height: kind === "video" ? height : null });
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <section className={styles.card}>
      {meta.thumbnail && <img className={styles.thumb} src={meta.thumbnail} alt="" />}
      <div className={styles.info}>
        <h2 className={styles.title}>{meta.title}</h2>
        <p className={styles.sub}>
          {[meta.uploader, formatDuration(meta.duration)].filter(Boolean).join(" · ")}
        </p>
        <div className={styles.actions}>
          <Segmented label="Format" value={kind} options={KINDS} onChange={setKind} />
          {kind === "video" ? (
            <select
              value={height ?? ""}
              onChange={(e) =>
                setHeight(e.currentTarget.value ? Number(e.currentTarget.value) : null)
              }
              aria-label="Video quality"
            >
              <option value="">Best quality</option>
              {heights.map((h) => (
                <option key={h} value={h}>{`${h}p`}</option>
              ))}
            </select>
          ) : (
            <span className={styles.hint}>MP3</span>
          )}
          <button className={styles.primary} onClick={download}>
            Download
          </button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </section>
  );
}
