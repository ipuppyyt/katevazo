import { useState } from "react";
import { Icon } from "../../components/Icon";
import { ToolbarSlot } from "../../components/ToolbarSlot";
import {
  fetchMetadata,
  fetchPlaylist,
  isPlaylistUrl,
  type Metadata,
  type Playlist,
} from "../../lib/api";
import { QueueList } from "../queue/QueueList";
import { useQueue } from "../queue/store";
import styles from "./DownloadsView.module.scss";
import { MetadataCard } from "./MetadataCard";
import { PlaylistCard } from "./PlaylistCard";

export function DownloadsView({ active }: { active: boolean }) {
  const hasJobs = useQueue((s) => s.jobs.length > 0);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<Metadata | null>(null);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setMeta(null);
    setPlaylist(null);
    try {
      if (isPlaylistUrl(trimmed)) setPlaylist(await fetchPlaylist(trimmed));
      else setMeta(await fetchMetadata(trimmed));
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {active && (
        <ToolbarSlot>
          <form className={styles.search} onSubmit={onSubmit}>
            <span className={styles.searchIcon}>
              <Icon name="link" size={14} />
            </span>
            <input
              value={url}
              onChange={(e) => setUrl(e.currentTarget.value)}
              placeholder="Paste a video link"
              aria-label="Video URL"
              spellCheck={false}
            />
            <button type="submit" disabled={loading || !url.trim()}>
              {loading ? "Fetching…" : "Fetch"}
            </button>
          </form>
        </ToolbarSlot>
      )}
      {error && <div className={styles.error}>{error}</div>}
      {meta && <MetadataCard meta={meta} url={url.trim()} />}
      {playlist && <PlaylistCard key={playlist.title} playlist={playlist} />}
      <QueueList />
      {!meta && !playlist && !error && !hasJobs && (
        <div className={styles.empty}>
          <Icon name="tray" size={44} />
          <h2>No Downloads</h2>
          <p>Paste a link in the toolbar and press Fetch.</p>
        </div>
      )}
    </>
  );
}
