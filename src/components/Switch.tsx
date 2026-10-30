import styles from "./Switch.module.scss";

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

/** Apple-style on/off switch. */
export function Switch({ checked, onChange, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={styles.switch}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.knob} />
    </button>
  );
}
