import { formatDuration, parseTime } from "../../lib/api";
import styles from "./TrimControl.module.scss";

export interface TrimState {
  enabled: boolean;
  start: string;
  end: string;
}

export const defaultTrim = (duration: number | null): TrimState => ({
  enabled: false,
  start: "0:00",
  end: duration ? formatDuration(duration) : "",
});

/** The chosen section in seconds, or why it cannot be used. */
export function resolveTrim(
  trim: TrimState,
  duration: number | null,
): { section: { start: number; end: number } | null; error: string | null } {
  if (!trim.enabled) return { section: null, error: null };
  const start = parseTime(trim.start);
  const end = parseTime(trim.end);
  if (start === null || end === null) {
    return { section: null, error: "Enter times like 1:30 or 0:01:30." };
  }
  if (end <= start) return { section: null, error: "The end must come after the start." };
  if (duration && start >= duration) {
    return { section: null, error: "The start is past the end of the video." };
  }
  return { section: { start, end: duration ? Math.min(end, duration) : end }, error: null };
}

interface Props {
  value: TrimState;
  onChange: (value: TrimState) => void;
  duration: number | null;
}

/** Optional start and end time, for downloading just part of a video. */
export function TrimControl({ value, onChange, duration }: Props) {
  const set = (patch: Partial<TrimState>) => onChange({ ...value, ...patch });
  const { error } = resolveTrim(value, duration);

  return (
    <div className={styles.trim}>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => set({ enabled: e.currentTarget.checked })}
        />
        Trim
      </label>
      {value.enabled && (
        <>
          <input
            className={styles.time}
            value={value.start}
            onChange={(e) => set({ start: e.currentTarget.value })}
            aria-label="Start time"
            aria-invalid={error !== null}
            spellCheck={false}
          />
          <span className={styles.to}>to</span>
          <input
            className={styles.time}
            value={value.end}
            onChange={(e) => set({ end: e.currentTarget.value })}
            aria-label="End time"
            aria-invalid={error !== null}
            spellCheck={false}
          />
          {error && <span className={styles.error}>{error}</span>}
        </>
      )}
    </div>
  );
}
