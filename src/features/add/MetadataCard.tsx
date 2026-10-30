import { useState } from "react";
import {
  availableCodecs,
  availableHeights,
  formatDuration,
  type Metadata,
} from "../../lib/api";
import { useQueue } from "../queue/store";
import { defaultChoice, FormatPicker, toOptions, type FormatChoice } from "./FormatPicker";
import styles from "./MetadataCard.module.scss";

export function MetadataCard({ meta, url }: { meta: Metadata; url: string }) {
  const heights = availableHeights(meta.formats);
  const [choice, setChoice] = useState<FormatChoice>(defaultChoice);
  const [error, setError] = useState<string | null>(null);
  const add = useQueue((s) => s.add);

  async function download() {
    setError(null);
    try {
      await add(meta, url, toOptions(choice));
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
          <FormatPicker
            value={choice}
            onChange={setChoice}
            heights={heights}
            codecs={availableCodecs(meta.formats)}
          />
          <button className={styles.primary} onClick={download}>
            Download
          </button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </section>
  );
}
