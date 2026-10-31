import { getVersion } from "@tauri-apps/api/app";
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
import { useApp } from "../../lib/app";
import { LANGUAGES, useLang, useT, type Key } from "../../lib/i18n";
import styles from "./SettingsView.module.scss";

const THEMES = ["system", "light", "dark"] as const;

const CONCURRENT = [1, 2, 3, 4, 5, 6, 8];

const RETRIES = [0, 1, 2, 3, 5, 10];

// KiB/s; shown as KB/s or MB/s.
const SPEED_LIMITS = [256, 512, 1024, 2048, 5120, 10240];

const speedLabel = (kbps: number) =>
  kbps >= 1024 ? `${kbps / 1024} MB/s` : `${kbps} KB/s`;

const SPONSORBLOCK = ["off", "mark", "remove"] as const;

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
  const t = useT();
  const [settings, setLocal] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [template, setTemplate] = useState("");
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [proxy, setProxy] = useState("");
  const [proxyError, setProxyError] = useState<string | null>(null);
  const [remembered, setRemembered] = useState(0);
  const [appVersion, setAppVersion] = useState("");
  const setWelcome = useApp((s) => s.setWelcome);

  useEffect(() => {
    getSettings()
      .then((s) => {
        setLocal(s);
        setTemplate(s.filename_template);
        setProxy(s.proxy);
      }).catch((e) => setError(String(e)));
    archiveSize().then(setRemembered).catch(() => {});
    getVersion().then(setAppVersion).catch(() => {});
    ytdlpVersion().then(setVersion).catch(() => setVersion(t("set.unavailable")));
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
        <h2 className={styles.heading}>{t("set.general")}</h2>
        <div className={styles.group}>
          <div className={styles.row}>
            <div className={styles.label}>
              <span>{t("set.saveTo")}</span>
              <code>{settings.download_dir ?? t("set.downloadsFolder")}</code>
            </div>
            {settings.download_dir && (
              <button className={styles.plain} onClick={() => save({ ...settings, download_dir: null })}>
                {t("set.reset")}
              </button>
            )}
            <button className={styles.tinted} onClick={chooseFolder}>
              {t("set.choose")}
            </button>
          </div>
          <div className={styles.row}>
            <div className={styles.label}>
              <span>{t("set.notifications")}</span>
              <small>{t("set.notificationsHint")}</small>
            </div>
            <Switch
              label={t("set.notifications")}
              checked={settings.notifications}
              onChange={(notifications) => save({ ...settings, notifications })}
            />
          </div>
          <div className={styles.row}>
            <div className={styles.label}>
              <span>{t("set.tray")}</span>
              <small>{t("set.trayHint")}</small>
            </div>
            <Switch
              label={t("set.tray")}
              checked={settings.close_to_tray}
              onChange={(close_to_tray) => save({ ...settings, close_to_tray })}
            />
          </div>
          <div className={styles.row}>
            <div className={styles.label}>
              <span>{t("set.clipboard")}</span>
              <small>{t("set.clipboardHint")}</small>
            </div>
            <Switch
              label={t("set.clipboard")}
              checked={settings.watch_clipboard}
              onChange={(watch_clipboard) => save({ ...settings, watch_clipboard })}
            />
          </div>
          <div className={styles.row}>
            <div className={styles.label}>
              <span>{t("settings.language")}</span>
              <small>{t("settings.languageHint")}</small>
            </div>
            <select
              className={styles.select}
              value={settings.language}
              onChange={(e) => {
                useLang.getState().set(e.currentTarget.value);
                save({ ...settings, language: e.currentTarget.value });
              }}
              aria-label={t("settings.language")}
            >
              <option value="">{t("settings.languageSystem")}</option>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>{t("set.appearance")}</span>
            <Segmented
              label={t("set.appearance")}
              value={settings.theme}
              options={THEMES.map((value) => ({ value, label: t(`theme.title.${value}` as Key) }))}
              onChange={(theme: Theme) => save({ ...settings, theme })}
            />
          </div>
        </div>
      </section>
      <section>
        <h2 className={styles.heading}>{t("set.downloads")}</h2>
        <div className={styles.group}>
          <div className={styles.row}>
            <div className={styles.label}>
              <span>{t("set.simultaneous")}</span>
              <small>{t("set.simultaneousHint")}</small>
            </div>
            <select
              className={styles.select}
              value={settings.max_concurrent}
              onChange={(e) => save({ ...settings, max_concurrent: Number(e.currentTarget.value) })}
              aria-label={t("set.simultaneous")}
            >
              {CONCURRENT.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className={styles.row}>
            <div className={styles.label}>
              <span>{t("set.speed")}</span>
              <small>{t("set.speedHint")}</small>
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
              aria-label={t("set.speed")}
            >
              <option value="">{t("set.unlimited")}</option>
              {SPEED_LIMITS.map((k) => (
                <option key={k} value={k}>{speedLabel(k)}</option>
              ))}
            </select>
          </div>
          <div className={styles.row}>
            <div className={styles.label}>
              <span>{t("set.skipDone")}</span>
              <small>
                {remembered > 0
                  ? t("set.skipHintSome", { count: remembered })
                  : t("set.skipHintNone")}
              </small>
            </div>
            {remembered > 0 && (
              <button className={styles.plain} onClick={forgetArchive}>
                {t("set.forget")}
              </button>
            )}
            <Switch
              label={t("set.skipDone")}
              checked={settings.use_archive}
              onChange={(use_archive) => save({ ...settings, use_archive })}
            />
          </div>
          <div className={styles.row}>
            <div className={styles.label}>
              <span>{t("set.retry")}</span>
              <small>{t("set.retryHint")}</small>
            </div>
            <select
              className={styles.select}
              value={settings.max_retries}
              onChange={(e) => save({ ...settings, max_retries: Number(e.currentTarget.value) })}
              aria-label={t("set.retry")}
            >
              {RETRIES.map((n) => (
                <option key={n} value={n}>{n === 0 ? t("set.never") : t("set.upTo", { count: n })}</option>
              ))}
            </select>
          </div>
        </div>
      </section>
      <section>
        <h2 className={styles.heading}>{t("set.sponsorTitle")}</h2>
        <div className={styles.group}>
          <div className={styles.row}>
            <div className={styles.label}>
              <span>{t("set.sponsorSegments")}</span>
              <small>{t("set.sponsorHint")}</small>
            </div>
            <Segmented
              label={t("set.sponsorTitle")}
              value={settings.sponsorblock}
              options={SPONSORBLOCK.map((value) => ({ value, label: t(`sponsor.${value}` as Key) }))}
              onChange={(sponsorblock) => save({ ...settings, sponsorblock })}
            />
          </div>
        </div>
      </section>
      <section>
        <h2 className={styles.heading}>{t("set.network")}</h2>
        <div className={styles.group}>
          <div className={styles.stack}>
            <div className={styles.label}>
              <span>{t("set.proxy")}</span>
              <small>{t("set.proxyHint")}</small>
            </div>
            <input
              className={styles.input}
              value={proxy}
              onChange={(e) => setProxy(e.currentTarget.value)}
              onBlur={() => commitProxy(proxy)}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              placeholder="http://host:port"
              spellCheck={false}
              aria-label={t("set.proxy")}
            />
            {proxyError && <p className={styles.error}>{proxyError}</p>}
          </div>
          <div className={styles.row}>
            <div className={styles.label}>
              <span>{t("set.cookies")}</span>
              <small>{t("set.cookiesHint")}</small>
            </div>
            <select
              className={styles.select}
              value={settings.cookies_from_browser}
              onChange={(e) => save({ ...settings, cookies_from_browser: e.currentTarget.value })}
              aria-label={t("set.cookies")}
            >
              <option value="">{t("set.noCookies")}</option>
              {BROWSERS.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>
      <section>
        <h2 className={styles.heading}>{t("set.files")}</h2>
        <div className={styles.group}>
          <div className={styles.stack}>
            <div className={styles.label}>
              <span>{t("set.fileName")}</span>
              <small>{t("set.fileNameHint", { example: "{uploader}/{title}" })}</small>
            </div>
            <input
              className={styles.input}
              value={template}
              onChange={(e) => setTemplate(e.currentTarget.value)}
              onBlur={() => commitTemplate(template)}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              spellCheck={false}
              aria-label={t("set.fileName")}
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
              <span>{t("set.embedMeta")}</span>
              <small>{t("set.embedMetaHint")}</small>
            </div>
            <Switch
              label={t("set.embedMeta")}
              checked={settings.embed_metadata}
              onChange={(embed_metadata) => save({ ...settings, embed_metadata })}
            />
          </div>
          <div className={styles.row}>
            <div className={styles.label}>
              <span>{t("set.embedCover")}</span>
              <small>{t("set.embedCoverHint")}</small>
            </div>
            <Switch
              label={t("set.embedCover")}
              checked={settings.embed_thumbnail}
              onChange={(embed_thumbnail) => save({ ...settings, embed_thumbnail })}
            />
          </div>
        </div>
      </section>
      <section>
        <h2 className={styles.heading}>{t("set.engine")}</h2>
        <div className={styles.group}>
          <div className={styles.row}>
            <div className={styles.label}>
              <span>yt-dlp</span>
              <code>{updating ? t("set.updating") : (version ?? "…")}</code>
            </div>
            <button className={styles.tinted} onClick={updateEngine} disabled={updating}>
              {t("set.checkUpdates")}
            </button>
          </div>
        </div>
        <p className={styles.footnote}>
          {t("set.engineHint")}
        </p>
      </section>
      <section>
        <h2 className={styles.heading}>{t("settings.about")}</h2>
        <div className={styles.group}>
          <div className={styles.row}>
            <div className={styles.label}>
              <span>{t("settings.version")}</span>
              <code>{appVersion}</code>
            </div>
            <button className={styles.tinted} onClick={() => setWelcome("whatsnew")}>
              {t("whatsnew.open")}
            </button>
          </div>
        </div>
      </section>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
