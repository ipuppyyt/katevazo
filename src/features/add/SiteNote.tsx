import { siteFor, siteName } from "../../lib/sites";
import styles from "./SiteNote.module.scss";

/** Names the site a link is from, with anything worth knowing about downloading from it. */
export function SiteNote({ url, extractor }: { url: string; extractor: string | null }) {
  const name = siteName(url, extractor);
  if (!name) return null;
  const note = siteFor(url)?.note;
  return (
    <div className={styles.row}>
      <span className={styles.badge}>{name}</span>
      {note && <span className={styles.note}>{note}</span>}
    </div>
  );
}
