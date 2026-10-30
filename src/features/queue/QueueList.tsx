import { Icon } from "../../components/Icon";
import {
  cancelDownload,
  formatEta,
  formatSpeed,
  openFile,
  pauseDownload,
  resumeDownload,
  revealFile,
} from "../../lib/api";
import styles from "./QueueList.module.scss";
import { useQueue, type Job } from "./store";

function statusText(j: Job): string {
  const pct = j.percent != null ? `${Math.floor(j.percent)}%` : null;
  switch (j.status) {
    case "queued":
      return "Waiting…";
    case "downloading":
      return [
        pct ?? "Starting…",
        j.speed != null ? formatSpeed(j.speed) : null,
        j.eta != null ? `${formatEta(j.eta)} left` : null,
      ]
        .filter(Boolean)
        .join(" · ");
    case "processing":
      return "Finishing up…";
    case "paused":
      return pct ? `Paused · ${pct}` : "Paused";
    case "done":
      return j.error ?? "Complete";
    case "cancelled":
      return "Cancelled";
    case "error":
      return j.error ?? "Failed";
  }
}

function Controls({ job }: { job: Job }) {
  const remove = useQueue((s) => s.remove);
  const note = useQueue((s) => s.note);
  const open = (path: string) => openFile(path).catch((e) => note(job.id, String(e)));
  const reveal = (path: string) => revealFile(path).catch((e) => note(job.id, String(e)));
  switch (job.status) {
    case "queued":
    case "downloading":
      return (
        <>
          <button className={styles.icon} title="Pause" aria-label="Pause" onClick={() => pauseDownload(job.id)}>
            <Icon name="pause" size={14} />
          </button>
          <button className={styles.icon} title="Cancel" aria-label="Cancel" onClick={() => cancelDownload(job.id)}>
            <Icon name="close" size={14} />
          </button>
        </>
      );
    case "processing":
      return null;
    case "paused":
      return (
        <>
          <button className={styles.icon} title="Resume" aria-label="Resume" onClick={() => resumeDownload(job.id)}>
            <Icon name="play" size={14} />
          </button>
          <button className={styles.icon} title="Cancel" aria-label="Cancel" onClick={() => cancelDownload(job.id)}>
            <Icon name="close" size={14} />
          </button>
        </>
      );
    case "error":
      return (
        <>
          <button className={styles.icon} title="Retry" aria-label="Retry" onClick={() => resumeDownload(job.id)}>
            <Icon name="retry" size={14} />
          </button>
          <button className={styles.icon} title="Remove" aria-label="Remove" onClick={() => { cancelDownload(job.id); remove(job.id); }}>
            <Icon name="close" size={14} />
          </button>
        </>
      );
    case "done":
      return (
        <>
          {job.file && (
            <>
              <button className={styles.icon} title="Open" aria-label="Open" onClick={() => open(job.file!)}>
                <Icon name="play" size={14} />
              </button>
              <button className={styles.icon} title="Show in folder" aria-label="Show in folder" onClick={() => reveal(job.file!)}>
                <Icon name="folder" size={14} />
              </button>
            </>
          )}
          <button className={styles.icon} title="Remove" aria-label="Remove" onClick={() => remove(job.id)}>
            <Icon name="close" size={14} />
          </button>
        </>
      );
    default:
      return (
        <button className={styles.icon} title="Remove" aria-label="Remove" onClick={() => remove(job.id)}>
          <Icon name="close" size={14} />
        </button>
      );
  }
}

export function QueueList() {
  const jobs = useQueue((s) => s.jobs);
  const clearFinished = useQueue((s) => s.clearFinished);
  if (jobs.length === 0) return null;
  const hasFinished = jobs.some((j) => j.status === "done" || j.status === "cancelled");

  return (
    <section>
      <div className={styles.header}>
        <h2>Queue</h2>
        {hasFinished && <button onClick={clearFinished}>Clear finished</button>}
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
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(j.percent ?? 0)}
              >
                <div
                  className={styles.fill}
                  style={{ width: `${j.status === "done" ? 100 : (j.percent ?? 0)}%` }}
                />
              </div>
              <div className={styles.status}>{statusText(j)}</div>
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
