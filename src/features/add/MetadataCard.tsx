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
import { defaultSchedule, resolveSchedule, ScheduleControl } from "./ScheduleControl";
import { defaultTrim, resolveTrim, TrimControl } from "./TrimControl";

export function MetadataCard({ meta, url }: { meta: Metadata; url: string }) {
  const heights = availableHeights(meta.formats);
  const [choice, setChoice] = useState<FormatChoice>(defaultChoice);
  const [trim, setTrim] = useState(() => defaultTrim(meta.duration));
  const [schedule, setSchedule] = useState(defaultSchedule);
  const [error, setError] = useState<string | null>(null);
  const add = useQueue((s) => s.add);

  async function download() {
    setError(null);
    const { section, error: trimError } = resolveTrim(trim, meta.duration);
    if (trimError) return setError(trimError);
    const { startAt, error: scheduleError } = resolveSchedule(schedule);
    if (scheduleError) return setError(scheduleError);
    try {
      await add(meta, url, { ...toOptions(choice), section, start_at: startAt });
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
          <div className={styles.pickers}>
            <FormatPicker
            value={choice}
            onChange={setChoice}
            heights={heights}
            codecs={availableCodecs(meta.formats)}
            subtitles={{ manual: meta.subtitle_langs, auto: meta.auto_caption_langs }}
            />
            <TrimControl value={trim} onChange={setTrim} duration={meta.duration} />
            <ScheduleControl value={schedule} onChange={setSchedule} />
          </div>
          <button className={styles.primary} onClick={download}>
            Download
          </button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </section>
  );
}
