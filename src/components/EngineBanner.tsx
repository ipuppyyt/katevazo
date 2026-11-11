import { useEffect, useState } from "react";
import { useEngine } from "../lib/engine";
import { useT } from "../lib/i18n";
import styles from "./EngineBanner.module.scss";

/** How long the "updated" and "could not check" notes stay before they fade away. */
const SHOWN_FOR = 6000;

/**
 * Shows what the download engine is doing: checking for a newer yt-dlp at launch, and the
 * result. A check that finds nothing new leaves no trace, so most launches only see a brief
 * "checking" line (which does not appear at all if the check is quick).
 */
export function EngineBanner() {
  const t = useT();
  const status = useEngine((s) => s.status);
  const held = useEngine((s) => s.held);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(false);
    if (status.state === "updating") return;
    const timer = window.setTimeout(() => setHidden(true), SHOWN_FOR);
    return () => window.clearTimeout(timer);
  }, [status]);

  let tone: "busy" | "good" | "warn";
  let text: string;
  let detail: string | null = null;
  if (status.state === "updating") {
    tone = "busy";
    text = t("engine.updating");
    detail = held > 0 ? t("engine.holding", { count: held }) : null;
  } else if (status.state === "ready" && status.updated) {
    tone = "good";
    text = t("engine.updated", { version: status.version });
  } else if (status.state === "failed") {
    tone = "warn";
    text = status.version ? t("engine.failedWith", { version: status.version }) : t("engine.failed");
    detail = t("engine.failedHint");
  } else {
    return null;
  }
  if (hidden && status.state !== "updating") return null;

  return (
    <div className={styles.banner} data-tone={tone} role="status" aria-live="polite">
      {tone === "busy" && <span className={styles.spinner} aria-hidden="true" />}
      <span className={styles.text}>
        <strong>{text}</strong>
        {detail && <span>{detail}</span>}
      </span>
      {tone !== "busy" && (
        <button className={styles.close} onClick={() => setHidden(true)} aria-label={t("engine.dismiss")}>
          ×
        </button>
      )}
    </div>
  );
}
