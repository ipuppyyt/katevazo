import { useEffect, useState } from "react";
import { Icon } from "../../components/Icon";
import { useApp } from "../../lib/app";
import { ToolbarSlot } from "../../components/ToolbarSlot";
import {
  fetchMetadata,
  fetchPlaylist,
  isPlaylistUrl,
  type Metadata,
  type Playlist,
} from "../../lib/api";
import { useT } from "../../lib/i18n";
import { QueueList } from "../queue/QueueList";
import { useQueue } from "../queue/store";
import styles from "./DownloadsView.module.scss";
import { BatchCard } from "./BatchCard";
import { MetadataCard } from "./MetadataCard";
import { PlaylistCard } from "./PlaylistCard";
import { useClipboardLink } from "./useClipboardLink";

export function DownloadsView({ active }: { active: boolean }) {
  const t = useT();
  const hasJobs = useQueue((s) => s.jobs.length > 0);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<Metadata | null>(null);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [batch, setBatch] = useState<string[] | null>(null);
  const incoming = useApp((s) => s.incoming);
  const clearIncoming = useApp((s) => s.clearIncoming);

  const clipboard = useClipboardLink(active);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    load(url.trim());
  }

  // Links sent from elsewhere: dropped on the window, from a browser, or a history re-download.
  useEffect(() => {
    if (!incoming) return;
    clearIncoming();
    if (incoming.links.length === 1) {
      setUrl(incoming.links[0]);
      void load(incoming.links[0]);
    } else {
      setBatch(incoming.links);
      setMeta(null);
      setPlaylist(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming]);

  async function load(trimmed: string) {
    if (!trimmed) return;
    clipboard.dismiss();
    setLoading(true);
    setError(null);
    setMeta(null);
    setPlaylist(null);
    setBatch(null);
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
              placeholder={t("dl.placeholder")}
              aria-label={t("dl.field")}
              data-link-field
              spellCheck={false}
            />
            <button type="submit" disabled={loading || !url.trim()}>
              {loading ? t("dl.fetching") : t("dl.fetch")}
            </button>
          </form>
        </ToolbarSlot>
      )}
      {clipboard.link && (
        <div className={styles.offer}>
          <Icon name="link" size={14} />
          <span className={styles.offerText}>
            {t("dl.copied")} <strong>{clipboard.link}</strong>
          </span>
          <button
            className={styles.offerPrimary}
            onClick={() => {
              setUrl(clipboard.link!);
              load(clipboard.link!);
            }}
          >
            Fetch
          </button>
          <button className={styles.offerPlain} onClick={clipboard.dismiss}>
            {t("dl.dismiss")}
          </button>
        </div>
      )}
      {error && <div className={styles.error}>{error}</div>}
      {batch && <BatchCard key={batch.join(" ")} links={batch} />}
      {meta && <MetadataCard meta={meta} url={url.trim()} />}
      {playlist && <PlaylistCard key={playlist.title} playlist={playlist} url={url.trim()} />}
      <QueueList />
      {!meta && !playlist && !batch && !error && !hasJobs && (
        <div className={styles.empty}>
          <Icon name="tray" size={44} />
          <h2>{t("dl.emptyTitle")}</h2>
          <p>{t("dl.emptyHint")}</p>
        </div>
      )}
    </>
  );
}
