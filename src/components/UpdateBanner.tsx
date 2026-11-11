import { useState } from "react";
import { useQueue } from "../features/queue/store";
import { useT } from "../lib/i18n";
import { installUpdate, useUpdate } from "../lib/updater";
import styles from "./EngineBanner.module.scss";

/**
 * Tells the user a new version of the app has been downloaded and waits for them to restart.
 * Nothing is installed without a click, and running downloads are named before they are cut off.
 */
export function UpdateBanner() {
  const t = useT();
  const status = useUpdate((s) => s.status);
  const running = useQueue(
    (s) => s.jobs.filter((j) => ["downloading", "processing"].includes(j.status)).length,
  );
  const [hidden, setHidden] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (hidden || (status.state !== "ready" && status.state !== "installing")) return null;
  const installing = status.state === "installing";
  const warn = confirming && running > 0 && !installing;

  return (
    <div className={styles.banner} data-tone={warn ? "warn" : "good"} role="status" aria-live="polite">
      {installing && <span className={styles.spinner} aria-hidden="true" />}
      <span className={styles.text}>
        <strong>{installing ? t("update.installing") : t("update.ready", { version: status.version })}</strong>
        {warn && <span>{t("update.busy", { count: running })}</span>}
      </span>
      {!installing && (
        <>
          <button
            className={styles.action}
            onClick={() => (running > 0 && !confirming ? setConfirming(true) : void installUpdate())}
          >
            {warn ? t("update.restartAnyway") : t("update.restart")}
          </button>
          <button
            className={styles.close}
            onClick={() => (warn ? setConfirming(false) : setHidden(true))}
            aria-label={warn ? t("update.later") : t("engine.dismiss")}
          >
            ×
          </button>
        </>
      )}
    </div>
  );
}
