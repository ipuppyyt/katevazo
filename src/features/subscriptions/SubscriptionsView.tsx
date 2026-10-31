import { useEffect, useState } from "react";
import { Icon } from "../../components/Icon";
import { ToolbarSlot } from "../../components/ToolbarSlot";
import {
  checkSubscriptions,
  listSubscriptions,
  removeSubscription,
  type Subscription,
} from "../../lib/api";
import { describe } from "../queue/store";
import styles from "./SubscriptionsView.module.scss";

function lastChecked(s: Subscription): string {
  if (s.last_error) return s.last_error;
  if (!s.last_checked) return "Not checked yet";
  return `Checked ${new Date(s.last_checked).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`;
}

export function SubscriptionsView() {
  const [subs, setSubs] = useState<Subscription[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const load = () => listSubscriptions().then(setSubs).catch((e) => setError(String(e)));
  useEffect(() => void load(), []);

  async function checkNow() {
    setChecking(true);
    setResult(null);
    try {
      const queued = await checkSubscriptions();
      setResult(queued === 0 ? "No new videos" : `${queued} new ${queued === 1 ? "video" : "videos"} queued`);
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setChecking(false);
    }
  }

  async function remove(id: string) {
    try {
      await removeSubscription(id);
      await load();
    } catch (e) {
      setError(String(e));
    }
  }

  if (error) return <div className={styles.error}>{error}</div>;
  if (!subs) return null;
  if (subs.length === 0)
    return (
      <div className={styles.empty}>
        <Icon name="rss" size={44} />
        <h2>No Subscriptions</h2>
        <p>Paste a channel or playlist link in Downloads and choose Subscribe.</p>
      </div>
    );

  return (
    <>
      <ToolbarSlot>
        {result && <span className={styles.count}>{result}</span>}
        <button className={styles.check} onClick={checkNow} disabled={checking}>
          {checking ? "Checking…" : "Check Now"}
        </button>
      </ToolbarSlot>
      <ul className={styles.list}>
        {subs.map((s) => (
          <li key={s.id} className={styles.item}>
            <span className={styles.glyph}>
              <Icon name="rss" size={15} />
            </span>
            <div className={styles.text}>
              <span className={styles.title}>{s.title}</span>
              <span className={styles.meta}>{describe(s.options)}</span>
              <span className={s.last_error ? styles.problem : styles.meta}>{lastChecked(s)}</span>
            </div>
            <div className={styles.actions}>
              <button title="Unsubscribe" aria-label="Unsubscribe" onClick={() => remove(s.id)}>
                <Icon name="close" size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <p className={styles.footnote}>
        New uploads download automatically every 30 minutes while Katevazo is open.
      </p>
    </>
  );
}
