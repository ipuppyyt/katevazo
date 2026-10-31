import { useEffect, useRef } from "react";
import { useApp } from "../../lib/app";
import { useT } from "../../lib/i18n";
import styles from "./ShortcutsHelp.module.scss";

const isMac = navigator.userAgent.includes("Mac");
const MOD = isMac ? "⌘" : "Ctrl";

export function ShortcutsHelp() {
  const open = useApp((s) => s.shortcuts);
  const setShortcuts = useApp((s) => s.setShortcuts);
  const t = useT();
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) close.current?.focus();
  }, [open]);

  if (!open) return null;

  const rows: [string, string][] = [
    [`${MOD} K`, t("shortcuts.palette")],
    [`${MOD} 1 – 5`, t("shortcuts.tabs")],
    [`${MOD} L`, t("shortcuts.focus")],
    [`${MOD} ,`, t("shortcuts.settings")],
    [`${MOD} V`, t("shortcuts.paste")],
  ];

  return (
    <div className={styles.backdrop} onMouseDown={() => setShortcuts(false)}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={t("shortcuts.title")}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === "Escape" && setShortcuts(false)}
      >
        <h2>{t("shortcuts.title")}</h2>
        <dl>
          {rows.map(([keys, what]) => (
            <div key={keys}>
              <dt>
                <kbd>{keys}</kbd>
              </dt>
              <dd>{what}</dd>
            </div>
          ))}
        </dl>
        <button ref={close} onClick={() => setShortcuts(false)}>
          {t("shortcuts.close")}
        </button>
      </div>
    </div>
  );
}
