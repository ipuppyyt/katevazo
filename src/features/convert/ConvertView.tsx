import { open } from "@tauri-apps/plugin-dialog";
import { Icon } from "../../components/Icon";
import { ToolbarSlot } from "../../components/ToolbarSlot";
import { openFile, revealFile, type ConvertTarget } from "../../lib/api";
import { tr, useT, type Key } from "../../lib/i18n";
import styles from "./ConvertView.module.scss";
import { useConvert, type ConvertItem } from "./store";

const VIDEO: { value: ConvertTarget; label: Key }[] = [
  { value: "mp4", label: "conv.mp4" },
  { value: "mkv", label: "conv.mkv" },
  { value: "webm", label: "conv.webm" },
];

const AUDIO: { value: ConvertTarget; label: Key }[] = [
  { value: "mp3", label: "conv.mp3" },
  { value: "m4a", label: "conv.m4a" },
  { value: "opus", label: "conv.opus" },
  { value: "flac", label: "conv.flac" },
  { value: "wav", label: "conv.wav" },
];

function statusText(i: ConvertItem): string {
  switch (i.status) {
    case "waiting":
      return tr("conv.waiting");
    case "converting":
      return i.percent > 0 ? tr("conv.percent", { percent: Math.floor(i.percent) }) : tr("conv.working");
    case "done":
      return tr("conv.saved", { name: i.output?.split(/[\\/]/).pop() ?? "" });
    case "error":
      return i.error ?? tr("conv.failed");
  }
}

export function ConvertView() {
  const t = useT();
  const { items, target, running, setTarget, addFiles, start, cancel, remove, clearFinished } = useConvert();

  async function choose() {
    const picked = await open({
      multiple: true,
      filters: [
        {
          name: tr("conv.filter"),
          extensions: ["mp4", "mkv", "webm", "mov", "avi", "flv", "wmv", "m4v", "ts", "mp3", "m4a", "aac", "opus", "ogg", "flac", "wav", "wma"],
        },
      ],
    });
    if (Array.isArray(picked)) addFiles(picked);
  }

  const waiting = items.filter((i) => i.status === "waiting").length;
  const hasFinished = items.some((i) => i.status === "done" || i.status === "error");

  return (
    <>
      <ToolbarSlot>
        {hasFinished && (
          <button className={styles.plain} onClick={clearFinished}>
            {t("conv.clear")}
          </button>
        )}
        <button className={styles.tinted} onClick={choose}>
          {t("conv.add")}
        </button>
      </ToolbarSlot>

      <div className={styles.bar}>
        <label className={styles.target}>
          <span>{t("conv.to")}</span>
          <select value={target} onChange={(e) => setTarget(e.currentTarget.value as ConvertTarget)} aria-label={t("conv.to")}>
            <optgroup label={t("conv.video")}>
              {VIDEO.map((o) => (
                <option key={o.value} value={o.value}>{t(o.label)}</option>
              ))}
            </optgroup>
            <optgroup label={t("conv.audio")}>
              {AUDIO.map((o) => (
                <option key={o.value} value={o.value}>{t(o.label)}</option>
              ))}
            </optgroup>
          </select>
        </label>
        <button className={styles.primary} onClick={start} disabled={running || waiting === 0}>
          {running ? t("conv.working") : waiting > 1 ? t("conv.goMany", { count: waiting }) : t("conv.go")}
        </button>
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>
          <Icon name="convert" size={44} />
          <h2>{t("conv.emptyTitle")}</h2>
          <p>{t("conv.emptyHint")}</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {items.map((i) => (
            <li key={i.id} className={styles.item} data-status={i.status}>
              <div className={styles.text}>
                <span className={styles.name}>{i.name}</span>
                <div className={styles.track} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(i.percent)} aria-label={i.name}>
                  <div className={styles.fill} style={{ width: `${i.percent}%` }} />
                </div>
                <span className={i.status === "error" ? styles.problem : styles.meta}>{statusText(i)}</span>
              </div>
              <div className={styles.actions}>
                {i.status === "done" && i.output && (
                  <>
                    <button title={t("common.open")} aria-label={t("common.open")} onClick={() => openFile(i.output!)}>
                      <Icon name="play" size={14} />
                    </button>
                    <button title={t("common.reveal")} aria-label={t("common.reveal")} onClick={() => revealFile(i.output!)}>
                      <Icon name="folder" size={14} />
                    </button>
                  </>
                )}
                <button
                  title={i.status === "converting" ? t("q.cancel") : t("q.remove")}
                  aria-label={i.status === "converting" ? t("q.cancel") : t("q.remove")}
                  onClick={() => (i.status === "converting" ? cancel(i.id) : remove(i.id))}
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
