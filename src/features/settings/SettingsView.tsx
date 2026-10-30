import { open } from "@tauri-apps/plugin-dialog";
import { useEffect, useState } from "react";
import { Segmented } from "../../components/Segmented";
import {
  applyTheme,
  getSettings,
  setSettings,
  updateYtdlp,
  ytdlpVersion,
  type Settings,
  type Theme,
} from "../../lib/api";
import styles from "./SettingsView.module.scss";

const THEMES = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

export function SettingsView() {
  const [settings, setLocal] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    getSettings().then(setLocal).catch((e) => setError(String(e)));
    ytdlpVersion().then(setVersion).catch(() => setVersion("Unavailable"));
  }, []);

  async function updateEngine() {
    setUpdating(true);
    setError(null);
    try {
      setVersion(await updateYtdlp());
    } catch (e) {
      setError(String(e));
    } finally {
      setUpdating(false);
    }
  }

  if (!settings) return error ? <div className={styles.error}>{error}</div> : null;

  async function save(next: Settings) {
    setLocal(next);
    setError(null);
    try {
      await setSettings(next);
      applyTheme(next.theme);
    } catch (e) {
      setError(String(e));
    }
  }

  async function chooseFolder() {
    const dir = await open({ directory: true, defaultPath: settings?.download_dir ?? undefined });
    if (typeof dir === "string") save({ ...settings!, download_dir: dir });
  }

  return (
    <div className={styles.page}>
      <section>
        <h2 className={styles.heading}>General</h2>
        <div className={styles.group}>
          <div className={styles.row}>
            <div className={styles.label}>
              <span>Save to</span>
              <code>{settings.download_dir ?? "Downloads folder"}</code>
            </div>
            {settings.download_dir && (
              <button className={styles.plain} onClick={() => save({ ...settings, download_dir: null })}>
                Reset
              </button>
            )}
            <button className={styles.tinted} onClick={chooseFolder}>
              Choose…
            </button>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Appearance</span>
            <Segmented
              label="Appearance"
              value={settings.theme}
              options={THEMES}
              onChange={(theme: Theme) => save({ ...settings, theme })}
            />
          </div>
        </div>
      </section>
      <section>
        <h2 className={styles.heading}>Download engine</h2>
        <div className={styles.group}>
          <div className={styles.row}>
            <div className={styles.label}>
              <span>yt-dlp</span>
              <code>{updating ? "Updating…" : (version ?? "…")}</code>
            </div>
            <button className={styles.tinted} onClick={updateEngine} disabled={updating}>
              Check for Updates
            </button>
          </div>
        </div>
        <p className={styles.footnote}>
          Sites change often. If downloads start failing, updating yt-dlp usually fixes it.
        </p>
      </section>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
