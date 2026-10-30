import { useState } from "react";
import { Segmented } from "../../components/Segmented";
import { formatDuration, type Playlist } from "../../lib/api";
import { useQueue } from "../queue/store";
import styles from "./PlaylistCard.module.scss";

const KINDS = [
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
] as const;

const HEIGHTS = [2160, 1440, 1080, 720, 480, 360];

export function PlaylistCard({ playlist }: { playlist: Playlist }) {
  const { entries } = playlist;
  const [selected, setSelected] = useState(() => new Set(entries.map((e) => e.id)));
  const [kind, setKind] = useState<"video" | "audio">("video");
  const [height, setHeight] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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
        await add(entry, entry.url, { kind, height: kind === "video" ? height : null }, true);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.card}>
      <header className={styles.head}>
        <div className={styles.titles}>
          <h2 className={styles.title}>{playlist.title}</h2>
          <p className={styles.sub}>
            {[playlist.uploader, `${entries.length} videos`].filter(Boolean).join(" · ")}
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
          Select all
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
        <Segmented label="Format" value={kind} options={KINDS} onChange={setKind} />
        {kind === "video" ? (
          <select
            value={height ?? ""}
            onChange={(e) =>
              setHeight(e.currentTarget.value ? Number(e.currentTarget.value) : null)
            }
            aria-label="Video quality"
          >
            <option value="">Best quality</option>
            {HEIGHTS.map((h) => (
              <option key={h} value={h}>{`Up to ${h}p`}</option>
            ))}
          </select>
        ) : (
          <span className={styles.hint}>MP3</span>
        )}
        <button
          className={styles.primary}
          onClick={download}
          disabled={busy || selected.size === 0}
        >
          {selected.size === 1 ? "Download 1 video" : `Download ${selected.size} videos`}
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </section>
  );
}
