import { useState } from "react";
import { addSubscription, formatDuration, type Playlist } from "../../lib/api";
import { useT } from "../../lib/i18n";
import { useQueue } from "../queue/store";
import { defaultChoice, FormatPicker, toOptions, type FormatChoice } from "./FormatPicker";
import styles from "./PlaylistCard.module.scss";

const HEIGHTS = [2160, 1440, 1080, 720, 480, 360];

export function PlaylistCard({ playlist, url }: { playlist: Playlist; url: string }) {
  const t = useT();
  const { entries } = playlist;
  const [selected, setSelected] = useState(() => new Set(entries.map((e) => e.id)));
  const [choice, setChoice] = useState<FormatChoice>(defaultChoice);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const add = useQueue((s) => s.add);

  const all = selected.size === entries.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  async function download() {
    setError(null);
    setBusy(true);
    try {
      // Appended one by one so the videos download, and are listed, in playlist order.
      for (const entry of entries.filter((e) => selected.has(e.id))) {
        await add(entry, entry.url, toOptions(choice), true);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function subscribe() {
    setError(null);
    try {
      await addSubscription(url, toOptions(choice));
      setSubscribed(true);
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <section className={styles.card}>
      <header className={styles.head}>
        <div className={styles.titles}>
          <h2 className={styles.title}>{playlist.title}</h2>
          <p className={styles.sub}>
            {[playlist.uploader, t("pl.videos", { count: entries.length })].filter(Boolean).join(" · ")}
          </p>
        </div>
        <label className={styles.all}>
          <input
            type="checkbox"
            checked={all}
            onChange={() =>
              setSelected(all ? new Set() : new Set(entries.map((e) => e.id)))
            }
          />
          {t("pl.selectAll")}
        </label>
      </header>

      <ul className={styles.list}>
        {entries.map((e) => (
          <li key={e.id}>
            <label className={styles.row}>
              <input
                type="checkbox"
                checked={selected.has(e.id)}
                onChange={() => toggle(e.id)}
              />
              {e.thumbnail ? (
                <img className={styles.thumb} src={e.thumbnail} alt="" loading="lazy" />
              ) : (
                <span className={styles.thumb} />
              )}
              <span className={styles.name}>{e.title}</span>
              <span className={styles.duration}>{formatDuration(e.duration)}</span>
            </label>
          </li>
        ))}
      </ul>

      <div className={styles.actions}>
        <FormatPicker value={choice} onChange={setChoice} heights={HEIGHTS} />
        <button className={styles.secondary} onClick={subscribe} disabled={subscribed}>
          {subscribed ? t("pl.subscribed") : t("pl.subscribe")}
        </button>
        <button
          className={styles.primary}
          onClick={download}
          disabled={busy || selected.size === 0}
        >
          {t("pl.download", { count: selected.size })}
        </button>
      </div>
      {subscribed && (
        <p className={styles.note}>
          {t("pl.subNote")}
        </p>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </section>
  );
}
