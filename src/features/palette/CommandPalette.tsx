import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../../lib/app";
import { useT } from "../../lib/i18n";
import { buildCommands, withThemeLabel, type Command } from "./commands";
import styles from "./CommandPalette.module.scss";

/** Ctrl/Cmd+K: search every action in the app and run one without the mouse. */
export function CommandPalette() {
  const open = useApp((s) => s.palette);
  const setPalette = useApp((s) => s.setPalette);
  const t = useT();
  const [commands, setCommands] = useState<Command[]>([]);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const returnTo = document.activeElement as HTMLElement | null;
    setQuery("");
    setIndex(0);
    const base = buildCommands();
    setCommands(base);
    void withThemeLabel(base).then(setCommands);
    input.current?.focus();
    return () => returnTo?.focus?.();
  }, [open]);

  const shown = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return commands.filter((c) => words.every((w) => c.label.toLowerCase().includes(w)));
  }, [commands, query]);

  if (!open) return null;

  const run = (command: Command | undefined) => {
    if (!command) return;
    setPalette(false);
    void command.run();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setIndex((i) => (shown.length ? (i + step + shown.length) % shown.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(shown[index]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setPalette(false);
    }
  };

  return (
    <div className={styles.backdrop} onMouseDown={() => setPalette(false)}>
      <div
        className={styles.palette}
        role="dialog"
        aria-modal="true"
        aria-label={t("palette.title")}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKey}
      >
        <input
          ref={input}
          className={styles.input}
          value={query}
          onChange={(e) => {
            setQuery(e.currentTarget.value);
            setIndex(0);
          }}
          placeholder={t("palette.placeholder")}
          aria-label={t("palette.placeholder")}
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={shown[index] ? `cmd-${shown[index].id}` : undefined}
          spellCheck={false}
        />
        <ul id="palette-list" className={styles.list} role="listbox">
          {shown.map((c, i) => (
            <li
              key={c.id}
              id={`cmd-${c.id}`}
              role="option"
              aria-selected={i === index}
              data-active={i === index}
              onMouseMove={() => setIndex(i)}
              onClick={() => run(c)}
            >
              {c.label}
            </li>
          ))}
          {shown.length === 0 && <li className={styles.empty}>{t("palette.empty")}</li>}
        </ul>
      </div>
    </div>
  );
}
