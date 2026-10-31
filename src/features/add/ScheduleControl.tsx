import { tr, useT } from "../../lib/i18n";
import styles from "./ScheduleControl.module.scss";

export interface ScheduleState {
  enabled: boolean;
  /** Value of a datetime-local input, in the user's own time zone. */
  at: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The next full hour, formatted for a datetime-local input. */
export function defaultSchedule(): ScheduleState {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  const at = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
  return { enabled: false, at };
}

/** When to start, in milliseconds since the epoch, or why that cannot be used. */
export function resolveSchedule(s: ScheduleState): { startAt: number | null; error: string | null } {
  if (!s.enabled) return { startAt: null, error: null };
  const startAt = new Date(s.at).getTime();
  if (Number.isNaN(startAt)) return { startAt: null, error: tr("sched.pick") };
  if (startAt <= Date.now()) return { startAt: null, error: tr("sched.future") };
  return { startAt, error: null };
}

interface Props {
  value: ScheduleState;
  onChange: (value: ScheduleState) => void;
}

/** Optional start time, so a download can run later (for example overnight). */
export function ScheduleControl({ value, onChange }: Props) {
  const t = useT();
  const { error } = resolveSchedule(value);
  return (
    <div className={styles.schedule}>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.currentTarget.checked })}
        />
        {t("sched.label")}
      </label>
      {value.enabled && (
        <>
          <input
            className={styles.when}
            type="datetime-local"
            value={value.at}
            onChange={(e) => onChange({ ...value, at: e.currentTarget.value })}
            aria-label={t("sched.at")}
            aria-invalid={error !== null}
          />
          {error ? (
            <span className={styles.error}>{error}</span>
          ) : (
            <span className={styles.hint}>{t("sched.open")}</span>
          )}
        </>
      )}
    </div>
  );
}
