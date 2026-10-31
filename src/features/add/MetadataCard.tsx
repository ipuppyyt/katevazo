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
import { SiteNote } from "./SiteNote";
import { defaultSchedule, resolveSchedule, ScheduleControl } from "./ScheduleControl";
import { defaultTrim, resolveTrim, TrimControl } from "./TrimControl";

export function MetadataCard({ meta, url }: { meta: Metadata; url: string }) {
  const heights = availableHeights(meta.formats);
  const live = meta.live_status === "is_live" || meta.live_status === "is_upcoming";
  const upcoming = meta.live_status === "is_upcoming";
  // Sites such as SoundCloud only have audio; start there instead of offering video that is not there.
  const audioOnly = meta.formats.length > 0 && heights.length === 0;
  const [choice, setChoice] = useState<FormatChoice>(() =>
    audioOnly ? { ...defaultChoice, kind: "audio" } : defaultChoice,
  );
  const [trim, setTrim] = useState(() => defaultTrim(meta.duration));
  const [schedule, setSchedule] = useState(defaultSchedule);
  const [error, setError] = useState<string | null>(null);
  const add = useQueue((s) => s.add);

  async function record() {
    setError(null);
    // Start a little early so the first seconds are not missed; yt-dlp keeps checking after that.
    const startAt = upcoming && meta.release_timestamp ? meta.release_timestamp * 1000 - 30_000 : null;
    try {
      await add(meta, url, { ...toOptions(choice), live: true, start_at: startAt });
    } catch (e) {
      setError(String(e));
    }
  }

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
        <SiteNote url={url} extractor={meta.extractor_key} />
        <h2 className={styles.title}>{meta.title}</h2>
        <p className={styles.sub}>
          {[meta.uploader, formatDuration(meta.duration)].filter(Boolean).join(" · ")}
        </p>
        {live && (
          <p className={styles.live}>
            {upcoming
              ? `Not live yet${meta.release_timestamp ? `: starts ${new Date(meta.release_timestamp * 1000).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}` : ""}. Katevazo will wait and record it. Keep the app open.`
              : "Live now. Recording starts at this moment and runs until you press Stop."}
          </p>
        )}
        <div className={styles.actions}>
          <div className={styles.pickers}>
            <FormatPicker
            value={choice}
            onChange={setChoice}
            heights={heights}
            codecs={availableCodecs(meta.formats)}
            subtitles={{ manual: meta.subtitle_langs, auto: meta.auto_caption_langs }}
            />
            {!live && <TrimControl value={trim} onChange={setTrim} duration={meta.duration} />}
            {!live && <ScheduleControl value={schedule} onChange={setSchedule} />}
          </div>
          <button className={styles.primary} onClick={live ? record : download}>
            {live ? (upcoming ? "Wait and record" : "Record") : "Download"}
          </button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </section>
  );
}
