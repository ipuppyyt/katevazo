import { useToast } from "../lib/toast";
import styles from "./Toast.module.scss";

export function Toast() {
  const message = useToast((s) => s.message);
  return (
    <div className={styles.region} role="status" aria-live="polite">
      {message && <div className={styles.toast}>{message}</div>}
    </div>
  );
}
