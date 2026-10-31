import { useState } from "react";
import { fetchMetadata } from "../../lib/api";
import { useT } from "../../lib/i18n";
import { useQueue } from "../queue/store";
import { defaultChoice, FormatPicker, toOptions, type FormatChoice } from "./FormatPicker";
import styles from "./BatchCard.module.scss";

const HEIGHTS = [2160, 1440, 1080, 720, 480, 360];
/** Titles are looked up this many links at a time. */
const PARALLEL = 3;

type State = { kind: "waiting" } | { kind: "added" } | { kind: "failed"; message: string };

/** Several links at once (a dropped list, say): one format choice for all of them. */
export function BatchCard({ links }: { links: string[] }) {
  const t = useT();
  const [choice, setChoice] = useState<FormatChoice>(defaultChoice);
  const [states, setStates] = useState<Record<string, State>>({});
  const [busy, setBusy] = useState(false);
  const add = useQueue((s) => s.add);

  const added = Object.values(states).filter((s) => s.kind === "added").length;
  const failed = Object.values(states).filter((s) => s.kind === "failed").length;

  async function download() {
    setBusy(true);
    setStates({});
    const options = toOptions(choice);
    const todo = [...links];
    const worker = async () => {
      for (let link = todo.shift(); link; link = todo.shift()) {
        const url = link;
        try {
          const meta = await fetchMetadata(url);
          await add(meta, url, options, true);
          setStates((s) => ({ ...s, [url]: { kind: "added" } }));
        } catch (e) {
          setStates((s) => ({ ...s, [url]: { kind: "failed", message: String(e) } }));
        }
      }
    };
    await Promise.all(Array.from({ length: PARALLEL }, worker));
    setBusy(false);
  }

  const finished = added + failed === links.length && links.length > 0 && !busy;

  return (
    <section className={styles.card}>
      <header>
        <h2 className={styles.title}>{t("batch.title", { count: links.length })}</h2>
        <p className={styles.sub}>
          {busy
            ? t("batch.progress", { done: added + failed, total: links.length })
            : finished
              ? t(failed ? "batch.summaryFailed" : "batch.summary", { added, failed })
              : t("batch.hint")}
        </p>
      </header>
      <ul className={styles.list}>
        {links.map((url) => {
          const state = states[url];
          return (
            <li key={url} data-state={state?.kind ?? "idle"}>
              <span className={styles.url}>{url}</span>
              {state?.kind === "added" && <span className={styles.ok}>{t("batch.added")}</span>}
              {state?.kind === "failed" && (
                <span className={styles.problem} title={state.message}>
                  {state.message}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <div className={styles.actions}>
        <FormatPicker value={choice} onChange={setChoice} heights={HEIGHTS} />
        <button className={styles.primary} onClick={download} disabled={busy || finished}>
          {busy ? t("batch.adding") : t("batch.download", { count: links.length })}
        </button>
      </div>
    </section>
  );
}
