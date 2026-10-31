import { useEffect, useRef, type ReactNode } from "react";
import styles from "./Modal.module.scss";

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** A dialog that holds the keyboard focus until it is closed, then gives it back. */
export function Modal({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose?: () => void;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus() ??
      box.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => before?.focus?.();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && onClose) {
      e.stopPropagation();
      onClose();
    } else if (e.key === "Tab") {
      const items = [...(box.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter((el) => !el.hasAttribute("disabled"));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div className={styles.backdrop}>
      <div ref={box} className={styles.dialog} role="dialog" aria-modal="true" aria-label={label} onKeyDown={onKeyDown}>
        {children}
      </div>
    </div>
  );
}
