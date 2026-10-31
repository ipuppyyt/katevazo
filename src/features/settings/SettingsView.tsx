import { open } from "@tauri-apps/plugin-dialog";
import { useEffect, useState } from "react";
import { Segmented } from "../../components/Segmented";
import { Switch } from "../../components/Switch";
import {
  applyTheme,
  archiveSize,
  clearArchive,
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

const CONCURRENT = [1, 2, 3, 4, 5, 6, 8];

const RETRIES = [0, 1, 2, 3, 5, 10];

// KiB/s; shown as KB/s or MB/s.
const SPEED_LIMITS = [256, 512, 1024, 2048, 5120, 10240];

const speedLabel = (kbps: number) =>
  kbps >= 1024 ? `${kbps / 1024} MB/s` : `${kbps} KB/s`;

const SPONSORBLOCK = [
  { value: "off", label: "Off" },
  { value: "mark", label: "Mark" },
  { value: "remove", label: "Skip" },
] as const;

const BROWSERS = [
  { value: "firefox", label: "Firefox" },
  { value: "chrome", label: "Chrome" },
  { value: "edge", label: "Edge" },
  { value: "brave", label: "Brave" },
  { value: "chromium", label: "Chromium" },
  { value: "opera", label: "Opera" },
  { value: "vivaldi", label: "Vivaldi" },
  { value: "safari", label: "Safari" },
];

export function SettingsView() {
  const [settings, setLocal] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [template, setTemplate] = useState("");
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [proxy, setProxy] = useState("");
  const [proxyError, setProxyError] = useState<string | null>(null);
  const [remembered, setRemembered] = useState(0);

  useEffect(() => {
    getSettings()
      .then((s) => {
        setLocal(s);
        setTemplate(s.filename_template);
        setProxy(s.proxy);
      }).catch((e) => setError(String(e)));
    archiveSize().then(setRemembered).catch(() => {});
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

  async function commitProxy(value: string) {
    if (value.trim() === settings?.proxy) return setProxyError(null);
    try {
      await setSettings({ ...settings!, proxy: value.trim() });
      setLocal({ ...settings!, proxy: value.trim() });
      setProxyError(null);
    } catch (e) {
      setProxyError(String(e));
    }
  }

  async function forgetArchive() {
    try {
      await clearArchive();
      setRemembered(0);
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
            <div className={styles.label}>
              <span>Notifications</span>
              <small>Tell me when a download finishes or fails while the app is in the background</small>
            </div>
            <Switch
              label="Notifications"
              checked={settings.notifications}
              onChange={(notifications) => save({ ...settings, notifications })}
            />
          </div>
          <div className={styles.row}>
            <div className={styles.label}>
              <span>Watch the clipboard</span>
              <small>Offer to download a video link when you copy one</small>
            </div>
            <Switch
              label="Watch the clipboard"
              checked={settings.watch_clipboard}
              onChange={(watch_clipboard) => save({ ...settings, watch_clipboard })}
            />
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
        <h2 className={styles.heading}>Downloads</h2>
        <div className={styles.group}>
          <div className={styles.row}>
            <div className={styles.label}>
              <span>Simultaneous downloads</span>
              <small>More at once is faster overall; the rest wait in the queue</small>
            </div>
            <select
              className={styles.select}
              value={settings.max_concurrent}
              onChange={(e) => save({ ...settings, max_concurrent: Number(e.currentTarget.value) })}
              aria-label="Simultaneous downloads"
            >
              {CONCURRENT.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className={styles.row}>
            <div className={styles.label}>
              <span>Speed limit</span>
              <small>Applies to each download, and to downloads started after you change it</small>
            </div>
            <select
              className={styles.select}
              value={settings.speed_limit_kbps ?? ""}
              onChange={(e) =>
                save({
                  ...settings,
                  speed_limit_kbps: e.currentTarget.value ? Number(e.currentTarget.value) : null,
                })
              }
              aria-label="Speed limit"
            >
              <option value="">Unlimited</option>
              {SPEED_LIMITS.map((k) => (
                <option key={k} value={k}>{speedLabel(k)}</option>
              ))}
            </select>
          </div>
          <div className={styles.row}>
            <div className={styles.label}>
              <span>Skip videos already downloaded</span>
              <small>
                {remembered > 0
                  ? `Remembers ${remembered} ${remembered === 1 ? "video" : "videos"}, even if you moved or deleted the files`
                  : "Remembers each finished video, even if you later move or delete the file"}
              </small>
            </div>
            {remembered > 0 && (
              <button className={styles.plain} onClick={forgetArchive}>
                Forget all
              </button>
            )}
            <Switch
              label="Skip videos already downloaded"
              checked={settings.use_archive}
              onChange={(use_archive) => save({ ...settings, use_archive })}
            />
          </div>
          <div className={styles.row}>
            <div className={styles.label}>
              <span>Retry on network errors</span>
              <small>Wait a little longer each time, then try again on its own</small>
            </div>
            <select
              className={styles.select}
              value={settings.max_retries}
              onChange={(e) => save({ ...settings, max_retries: Number(e.currentTarget.value) })}
              aria-label="Retries"
            >
              {RETRIES.map((n) => (
                <option key={n} value={n}>{n === 0 ? "Never" : `Up to ${n}×`}</option>
              ))}
            </select>
          </div>
        </div>
      </section>
      <section>
        <h2 className={styles.heading}>SponsorBlock</h2>
        <div className={styles.group}>
          <div className={styles.row}>
            <div className={styles.label}>
              <span>Sponsor segments</span>
              <small>
                Use community-submitted timestamps to handle sponsors, self-promotion and
                reminders to like and subscribe
              </small>
            </div>
            <Segmented
              label="SponsorBlock"
              value={settings.sponsorblock}
              options={SPONSORBLOCK}
              onChange={(sponsorblock) => save({ ...settings, sponsorblock })}
            />
          </div>
        </div>
      </section>
      <section>
        <h2 className={styles.heading}>Network</h2>
        <div className={styles.group}>
          <div className={styles.stack}>
            <div className={styles.label}>
              <span>Proxy</span>
              <small>Send all traffic through a proxy, for example socks5://127.0.0.1:1080. Leave empty for none.</small>
            </div>
            <input
              className={styles.input}
              value={proxy}
              onChange={(e) => setProxy(e.currentTarget.value)}
              onBlur={() => commitProxy(proxy)}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              placeholder="http://host:port"
              spellCheck={false}
              aria-label="Proxy"
            />
            {proxyError && <p className={styles.error}>{proxyError}</p>}
          </div>
          <div className={styles.row}>
            <div className={styles.label}>
              <span>Sign in with browser cookies</span>
              <small>
                For age-restricted or members-only videos, use the account you are signed in to in
                this browser. Firefox is the most reliable; close Chrome and Edge first.
              </small>
            </div>
            <select
              className={styles.select}
              value={settings.cookies_from_browser}
              onChange={(e) => save({ ...settings, cookies_from_browser: e.currentTarget.value })}
              aria-label="Browser for cookies"
            >
              <option value="">Don't sign in</option>
              {BROWSERS.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>
      <section>
        <h2 className={styles.heading}>Files</h2>
        <div className={styles.group}>
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
