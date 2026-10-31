import { useEffect, useMemo, useState } from "react";
import { Icon } from "../../components/Icon";
import { ToolbarSlot } from "../../components/ToolbarSlot";
import {
  clearHistory,
  listHistory,
  openFile,
  revealFile,
  type HistoryEntry,
} from "../../lib/api";
import { useApp } from "../../lib/app";
import { useT } from "../../lib/i18n";
import styles from "./HistoryView.module.scss";

type Filter = "all" | "video" | "audio";

const isWebLink = (url: string) => /^https?:\/\//i.test(url);

export function HistoryView() {
  const t = useT();
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const openLinks = useApp((s) => s.openLinks);

  const act = (run: (path: string) => Promise<void>, path: string) =>
    run(path).catch((e) => setError(String(e)));

  const load = () => listHistory().then(setEntries).catch((e) => setError(String(e)));
  useEffect(() => void load(), []);

  const shown = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return (entries ?? []).filter(
      (h) =>
        (filter === "all" || h.kind === filter) &&
        words.every((w) => `${h.title} ${h.url} ${h.file ?? ""}`.toLowerCase().includes(w)),
    );
  }, [entries, query, filter]);

  async function clear() {
    await clearHistory();
    load();
  }

  if (error) return <div className={styles.error}>{error}</div>;
  if (!entries) return null;
  if (entries.length === 0)
    return (
      <div className={styles.empty}>
        <Icon name="clock" size={44} />
        <h2>{t("history.emptyTitle")}</h2>
        <p>{t("history.emptyHint")}</p>
      </div>
    );

  return (
    <>
      <ToolbarSlot>
        <span className={styles.count}>
          {query || filter !== "all"
            ? t("history.matching", { shown: shown.length, total: entries.length })
            : t("history.count", { count: entries.length })}
        </span>
        <button className={styles.clear} onClick={clear}>
          {t("history.clear")}
        </button>
      </ToolbarSlot>
      <div className={styles.filters}>
        <input
          type="search"
          className={styles.search}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          placeholder={t("history.search")}
          aria-label={t("history.search")}
          spellCheck={false}
        />
        <select value={filter} onChange={(e) => setFilter(e.currentTarget.value as Filter)} aria-label={t("history.filter")}>
          <option value="all">{t("history.all")}</option>
          <option value="video">{t("history.video")}</option>
          <option value="audio">{t("history.audio")}</option>
        </select>
      </div>
      {shown.length === 0 ? (
        <p className={styles.none}>{t("history.noMatches")}</p>
      ) : (
        <ul className={styles.list}>
          {shown.map((h) => (
            <li key={h.id} className={styles.item}>
              <span className={styles.glyph}>
                <Icon name={h.kind === "audio" ? "music" : "download"} size={15} />
              </span>
              <div className={styles.text}>
                <span className={styles.title}>{h.title}</span>
                <span className={styles.meta}>
                  {h.kind === "audio" ? t("history.audio") : t("history.video")} ·{" "}
                  {new Date(h.finished_at * 1000).toLocaleString([], {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
                {h.file && <code className={styles.file}>{h.file}</code>}
              </div>
              <div className={styles.actions}>
                {isWebLink(h.url) && (
                  <button
                    title={t("history.again")}
                    aria-label={t("history.again")}
                    onClick={() => openLinks([h.url])}
                  >
                    <Icon name="retry" size={14} />
                  </button>
                )}
                {h.file && (
                  <>
                    <button title={t("common.open")} aria-label={t("common.open")} onClick={() => act(openFile, h.file!)}>
                      <Icon name="play" size={14} />
                    </button>
                    <button
                      title={t("common.reveal")}
                      aria-label={t("common.reveal")}
                      onClick={() => act(revealFile, h.file!)}
                    >
                      <Icon name="folder" size={14} />
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
