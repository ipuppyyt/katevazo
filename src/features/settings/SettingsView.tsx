import { open } from "@tauri-apps/plugin-dialog";
import { useEffect, useState } from "react";
import { Segmented } from "../../components/Segmented";
import { Switch } from "../../components/Switch";
import {
  applyTheme,
  getSettings,
  previewTemplate,
  setSettings,
  TEMPLATE_FIELDS,
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
  const [template, setTemplate] = useState("");
  const [templateError, setTemplateError] = useState<string | null>(null);

  useEffect(() => {
    getSettings()
      .then((s) => {
        setLocal(s);
        setTemplate(s.filename_template);
      }).catch((e) => setError(String(e)));
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

  async function commitTemplate(value: string) {
    if (value === settings?.filename_template) return setTemplateError(null);
    try {
      await setSettings({ ...settings!, filename_template: value });
      setLocal({ ...settings!, filename_template: value });
      setTemplateError(null);
    } catch (e) {
      setTemplateError(String(e));
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
          <div className={styles.stack}>
            <div className={styles.label}>
              <span>File name</span>
              <small>
                Use / to sort into folders, for example {"{uploader}/{title}"}
              </small>
            </div>
            <input
              className={styles.input}
              value={template}
              onChange={(e) => setTemplate(e.currentTarget.value)}
              onBlur={() => commitTemplate(template)}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              spellCheck={false}
              aria-label="File name template"
            />
            <div className={styles.chips}>
              {TEMPLATE_FIELDS.map((f) => (
                <button
                  key={f.name}
                  className={styles.chip}
                  onClick={() => {
                    const next = `${template}{${f.name}}`;
                    setTemplate(next);
                    commitTemplate(next);
                  }}
                >
                  {`{${f.name}}`}
                </button>
              ))}
            </div>
            {templateError ? (
              <p className={styles.error}>{templateError}</p>
            ) : (
              <code className={styles.preview}>{previewTemplate(template)}.mp4</code>
            )}
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
        <h2 className={styles.heading}>Files</h2>
        <div className={styles.group}>
          <div className={styles.row}>
            <div className={styles.label}>
              <span>Embed metadata</span>
              <small>Save the title, uploader and chapters inside the file</small>
            </div>
            <Switch
              label="Embed metadata"
              checked={settings.embed_metadata}
              onChange={(embed_metadata) => save({ ...settings, embed_metadata })}
            />
          </div>
          <div className={styles.row}>
            <div className={styles.label}>
              <span>Embed cover art</span>
              <small>Use the thumbnail as the cover (not supported in WebM or WAV)</small>
            </div>
            <Switch
              label="Embed cover art"
              checked={settings.embed_thumbnail}
              onChange={(embed_thumbnail) => save({ ...settings, embed_thumbnail })}
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
