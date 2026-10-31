import { Icon } from "../../components/Icon";
import {
  cancelDownload,
  formatEta,
  formatSpeed,
  openFile,
  pauseDownload,
  resumeDownload,
  revealFile,
  stopRecording,
} from "../../lib/api";
import { tr, useT } from "../../lib/i18n";
import styles from "./QueueList.module.scss";
import { useQueue, type Job } from "./store";

function statusText(j: Job): string {
  const pct = j.percent != null ? `${Math.floor(j.percent)}%` : null;
  switch (j.status) {
    case "queued":
      if (j.error) return j.error;
      if (j.scheduledFor && j.scheduledFor > Date.now()) {
        return tr("q.scheduled", { time: new Date(j.scheduledFor).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) });
      }
      return tr("q.waiting");
    case "downloading":
      return [
        j.live ? tr("q.recording") : (pct ?? tr("q.starting")),
        j.speed != null ? formatSpeed(j.speed) : null,
        j.eta != null ? tr("q.left", { time: formatEta(j.eta) }) : null,
      ]
        .filter(Boolean)
        .join(" · ");
    case "processing":
      return tr("q.finishing");
    case "paused":
      return pct ? tr("q.pausedAt", { percent: pct }) : tr("q.paused");
    case "done":
      return j.error ?? tr("q.complete");
    case "cancelled":
      return tr("q.cancelled");
    case "error":
      return j.error ?? tr("q.failed");
  }
}

function Controls({ job }: { job: Job }) {
  const t = useT();
  const remove = useQueue((s) => s.remove);
  const note = useQueue((s) => s.note);
  const open = (path: string) => openFile(path).catch((e) => note(job.id, String(e)));
  const reveal = (path: string) => revealFile(path).catch((e) => note(job.id, String(e)));
  switch (job.status) {
    case "queued":
    case "downloading":
      return (
        <>
          {job.live && job.status === "downloading" && (
            <button className={styles.icon} title={t("q.stop")} aria-label={t("q.stop")} onClick={() => stopRecording(job.id)}>
              <Icon name="stop" size={14} />
            </button>
          )}
          <button className={styles.icon} title={t("q.pause")} aria-label={t("q.pause")} onClick={() => pauseDownload(job.id)}>
            <Icon name="pause" size={14} />
          </button>
          <button className={styles.icon} title={t("q.cancel")} aria-label={t("q.cancel")} onClick={() => cancelDownload(job.id)}>
            <Icon name="close" size={14} />
          </button>
        </>
      );
    case "processing":
      return null;
    case "paused":
      return (
        <>
          <button className={styles.icon} title={t("q.resume")} aria-label={t("q.resume")} onClick={() => resumeDownload(job.id)}>
            <Icon name="play" size={14} />
          </button>
          <button className={styles.icon} title={t("q.cancel")} aria-label={t("q.cancel")} onClick={() => cancelDownload(job.id)}>
            <Icon name="close" size={14} />
          </button>
        </>
      );
    case "error":
      return (
        <>
          <button className={styles.icon} title={t("q.retry")} aria-label={t("q.retry")} onClick={() => resumeDownload(job.id)}>
            <Icon name="retry" size={14} />
          </button>
          <button className={styles.icon} title={t("q.remove")} aria-label={t("q.remove")} onClick={() => { cancelDownload(job.id); remove(job.id); }}>
            <Icon name="close" size={14} />
          </button>
        </>
      );
    case "done":
      return (
        <>
          {job.file && (
            <>
              <button className={styles.icon} title={t("common.open")} aria-label={t("common.open")} onClick={() => open(job.file!)}>
                <Icon name="play" size={14} />
              </button>
              <button className={styles.icon} title={t("common.reveal")} aria-label={t("common.reveal")} onClick={() => reveal(job.file!)}>
                <Icon name="folder" size={14} />
              </button>
            </>
          )}
          <button className={styles.icon} title={t("q.remove")} aria-label={t("q.remove")} onClick={() => remove(job.id)}>
            <Icon name="close" size={14} />
          </button>
        </>
      );
    default:
      return (
        <button className={styles.icon} title={t("q.remove")} aria-label={t("q.remove")} onClick={() => remove(job.id)}>
          <Icon name="close" size={14} />
        </button>
      );
  }
}

export function QueueList() {
  const t = useT();
  const jobs = useQueue((s) => s.jobs);
  const clearFinished = useQueue((s) => s.clearFinished);
  if (jobs.length === 0) return null;
  const hasFinished = jobs.some((j) => j.status === "done" || j.status === "cancelled");

  return (
    <section>
      <div className={styles.header}>
        <h2>{t("q.title")}</h2>
        {hasFinished && <button onClick={clearFinished}>{t("q.clear")}</button>}
      </div>
      <ul className={styles.list}>
        {jobs.map((j) => (
          <li key={j.id} className={styles.item} data-status={j.status}>
            {j.thumbnail ? (
              <img className={styles.thumb} src={j.thumbnail} alt="" />
            ) : (
              <div className={styles.thumb} />
            )}
            <div className={styles.body}>
              <div className={styles.titleRow}>
                <span className={styles.title}>{j.title}</span>
                {j.label && <span className={styles.badge}>{j.label}</span>}
              </div>
              <div
                className={styles.track}
                role="progressbar"
                aria-label={j.title}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(j.percent ?? 0)}
              >
                <div
                  className={styles.fill}
                  data-live={j.live && j.status === "downloading"}
                  style={{ width: `${j.status === "done" ? 100 : (j.percent ?? 0)}%` }}
                />
              </div>
              <div className={styles.status} aria-live={j.status === "downloading" ? "off" : "polite"}>{statusText(j)}</div>
            </div>
            <div className={styles.controls}>
              <Controls job={j} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
