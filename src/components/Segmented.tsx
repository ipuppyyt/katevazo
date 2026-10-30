import styles from "./Segmented.module.scss";

interface Props<T extends string> {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}

/** Apple-style segmented control. */
export function Segmented<T extends string>({ value, options, onChange, label }: Props<T>) {
  return (
    <div className={styles.control} role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          data-active={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
