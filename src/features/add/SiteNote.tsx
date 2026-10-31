import { siteFor, siteName } from "../../lib/sites";
import { useT } from "../../lib/i18n";
import styles from "./SiteNote.module.scss";

/** Names the site a link is from, with anything worth knowing about downloading from it. */
export function SiteNote({ url, extractor }: { url: string; extractor: string | null }) {
  const t = useT();
  const name = siteName(url, extractor);
  if (!name) return null;
  const noteKey = siteFor(url)?.note;
  return (
    <div className={styles.row}>
      <span className={styles.badge}>{name}</span>
      {noteKey && <span className={styles.note}>{t(noteKey)}</span>}
    </div>
  );
}
