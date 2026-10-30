import { useEffect, useState } from "react";
import styles from "./App.module.scss";
import { Icon, type IconName } from "./components/Icon";
import { ToolbarSlotContext } from "./components/ToolbarSlot";
import { WindowControls, detectPlatform } from "./components/WindowControls";
import { DownloadsView } from "./features/add/DownloadsView";
import { HistoryView } from "./features/history/HistoryView";
import { listenForUpdates, useQueue } from "./features/queue/store";
import { SettingsView } from "./features/settings/SettingsView";
import { applyTheme, getSettings } from "./lib/api";

const NAV: { id: Tab; icon: IconName }[] = [
  { id: "Downloads", icon: "tray" },
  { id: "History", icon: "clock" },
  { id: "Settings", icon: "gear" },
];
type Tab = "Downloads" | "History" | "Settings";

const platform = detectPlatform();
const isMac = platform === "mac";

function App() {
  const [tab, setTab] = useState<Tab>("Downloads");
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const active = useQueue(
    (s) => s.jobs.filter((j) => ["queued", "downloading", "processing"].includes(j.status)).length,
  );

  useEffect(() => {
    document.documentElement.dataset.platform = platform;
    const unlisten = listenForUpdates();
    getSettings().then((s) => applyTheme(s.theme)).catch(() => {});
    return () => void unlisten.then((fn) => fn());
  }, []);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        {/* Draggable strip: native traffic lights overlay it on macOS; elsewhere it shows the app name. */}
        <div className={styles.sidebarTop} data-tauri-drag-region>
          {!isMac && (
            <span className={styles.titleBrand}>
              <img src="/logo.svg" alt="" />
              Katevazo
            </span>
          )}
        </div>
        <nav className={styles.nav} aria-label="Sections">
          {NAV.map(({ id, icon }) => (
            <button key={id} data-active={id === tab} onClick={() => setTab(id)}>
              <Icon name={icon} size={16} />
              <span>{id}</span>
              {id === "Downloads" && active > 0 && <em>{active}</em>}
            </button>
          ))}
        </nav>
        {isMac && (
          <div className={styles.brand}>
            <img src="/logo.svg" alt="" />
            Katevazo
          </div>
        )}
      </aside>

      <section className={styles.pane}>
        <header className={styles.toolbar} data-tauri-drag-region>
          <h1 className={styles.title}>{tab}</h1>
          <div className={styles.slot} ref={setSlot} />
          {!isMac && <WindowControls platform={platform} />}
        </header>
        <ToolbarSlotContext.Provider value={slot}>
          <main className={styles.content}>
            {/* Kept mounted (just hidden) so the pasted URL and queue survive tab switches. */}
            <div className={styles.view} hidden={tab !== "Downloads"}>
              <DownloadsView active={tab === "Downloads"} />
            </div>
            {tab === "History" && <HistoryView />}
            {tab === "Settings" && <SettingsView />}
          </main>
        </ToolbarSlotContext.Provider>
      </section>
    </div>
  );
}

export default App;
