import { getVersion } from "@tauri-apps/api/app";
import { open } from "@tauri-apps/plugin-dialog";
import { Fragment, useEffect, useState } from "react";
import { Modal } from "../../components/Modal";
import { Switch } from "../../components/Switch";
import { getSettings, setSettings, type Settings } from "../../lib/api";
import { useApp } from "../../lib/app";
import { changesFor, type ChangeGroup } from "../../lib/changelog";
import { LANGUAGES, useLang, useT } from "../../lib/i18n";
import styles from "./WelcomeFlow.module.scss";

/** Backticks in a changelog entry mark code. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split("`").map((part, i) => (
        <Fragment key={i}>{i % 2 ? <code>{part}</code> : part}</Fragment>
      ))}
    </>
  );
}

/**
 * Shows the welcome screen on the first run, and what changed after an update. Settings
 * remember what was seen, so each appears once.
 */
export function WelcomeFlow() {
  const t = useT();
  const mode = useApp((s) => s.welcome);
  const setMode = useApp((s) => s.setWelcome);
  const [settings, setLocal] = useState<Settings | null>(null);
  const [version, setVersion] = useState("");
  const [changes, setChanges] = useState<ChangeGroup[]>([]);

  useEffect(() => {
    (async () => {
      const [s, v] = await Promise.all([getSettings(), getVersion()]);
      setLocal(s);
      setVersion(v);
      setChanges(changesFor(v));
      if (!s.onboarded) setMode("welcome");
      else if (s.last_seen_version !== v) {
        // A version with nothing to report is not worth interrupting for.
        if (changesFor(v).length > 0) setMode("whatsnew");
        else await setSettings({ ...s, last_seen_version: v });
      }
    })().catch(() => {});
  }, [setMode]);

  // The settings screen can open What's new again.
  useEffect(() => {
    if (mode === "whatsnew" && !settings) void getSettings().then(setLocal);
  }, [mode, settings]);

  if (!mode || !settings) return null;

  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setLocal(next);
    return setSettings(next).catch(() => {});
  };

  const finish = async () => {
    await update({ onboarded: true, last_seen_version: version });
    setMode(null);
  };

  async function chooseFolder() {
    const dir = await open({ directory: true, defaultPath: settings?.download_dir ?? undefined });
    if (typeof dir === "string") void update({ download_dir: dir });
  }

  if (mode === "whatsnew") {
    return (
      <Modal label={t("whatsnew.title", { version })} onClose={finish}>
        <h2 className={styles.title}>{t("whatsnew.title", { version })}</h2>
        {changes.length === 0 ? (
          <p className={styles.muted}>{t("whatsnew.none")}</p>
        ) : (
          changes.map((g) => (
            <section key={g.heading} className={styles.group}>
              <h3>{g.heading}</h3>
              <ul>
                {g.items.map((item) => (
                  <li key={item}>
                    <Inline text={item} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
        <button className={styles.primary} onClick={finish} data-autofocus>
          {t("whatsnew.continue")}
        </button>
      </Modal>
    );
  }

  return (
    <Modal label={t("welcome.title")}>
      <h2 className={styles.title}>{t("welcome.title")}</h2>
      <p className={styles.muted}>{t("welcome.intro")}</p>
      <ol className={styles.steps}>
        <li>{t("welcome.step1")}</li>
        <li>{t("welcome.step2")}</li>
        <li>{t("welcome.step3")}</li>
      </ol>
      <div className={styles.rows}>
        <div className={styles.row}>
          <span>{t("welcome.folder")}</span>
          <code className={styles.path}>{settings.download_dir ?? t("welcome.defaultFolder")}</code>
          <button className={styles.plain} onClick={chooseFolder}>
            {t("welcome.choose")}
          </button>
        </div>
        <div className={styles.row}>
          <span>{t("welcome.clipboard")}</span>
          <Switch
            label={t("welcome.clipboard")}
            checked={settings.watch_clipboard}
            onChange={(watch_clipboard) => void update({ watch_clipboard })}
          />
        </div>
        <div className={styles.row}>
          <label htmlFor="welcome-language">{t("welcome.language")}</label>
          <select
            id="welcome-language"
            value={settings.language}
            onChange={(e) => {
              useLang.getState().set(e.currentTarget.value);
              void update({ language: e.currentTarget.value });
            }}
          >
            <option value="">{t("settings.languageSystem")}</option>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button className={styles.primary} onClick={finish} data-autofocus>
        {t("welcome.start")}
      </button>
    </Modal>
  );
}
