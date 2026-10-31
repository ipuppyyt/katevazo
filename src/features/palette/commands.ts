import { readText } from "@tauri-apps/plugin-clipboard-manager";
import {
  applyTheme,
  checkSubscriptions,
  getSettings,
  setSettings,
  updateYtdlp,
  type Theme,
} from "../../lib/api";
import { useApp, type Tab } from "../../lib/app";
import { translate, useLang, type Key } from "../../lib/i18n";
import { extractLinks } from "../../lib/links";
import { toast } from "../../lib/toast";
import { useQueue } from "../queue/store";

export const TABS: Tab[] = ["Downloads", "History", "Subscriptions", "Convert", "Settings"];

export interface Command {
  id: string;
  label: string;
  run: () => void | Promise<void>;
}

const t = (key: Key, vars?: Record<string, string | number>) =>
  translate(useLang.getState().lang, key, vars);

/** Runs an action, telling the user if it fails instead of failing silently. */
const attempt = (action: () => Promise<void>) => async () => {
  try {
    await action();
  } catch (e) {
    toast(t("palette.failed", { error: String(e) }));
  }
};

export async function pasteLink() {
  const links = extractLinks((await readText().catch(() => "")) ?? "");
  if (links.length === 0) toast(t("palette.pasteNone"));
  else useApp.getState().openLinks(links);
}

export function focusLinkField() {
  useApp.getState().setTab("Downloads");
  // The field only exists once the Downloads toolbar has rendered.
  window.setTimeout(() => document.querySelector<HTMLInputElement>('input[aria-label="Video URL"]')?.focus(), 0);
}

const THEMES: Theme[] = ["system", "light", "dark"];

export function buildCommands(): Command[] {
  const app = useApp.getState();
  return [
    ...TABS.map<Command>((tab) => ({
      id: `go-${tab}`,
      label: t("palette.goto", { name: t(`nav.${tab}`) }),
      run: () => app.setTab(tab),
    })),
    { id: "focus", label: t("palette.focusUrl"), run: focusLinkField },
    { id: "paste", label: t("palette.paste"), run: attempt(pasteLink) },
    {
      id: "subs",
      label: t("palette.checkSubs"),
      run: attempt(async () => {
        const count = await checkSubscriptions();
        toast(count === 0 ? t("palette.checked_zero") : t("palette.checked", { count }));
      }),
    },
    {
      id: "update",
      label: t("palette.updateYtdlp"),
      run: attempt(async () => toast(t("palette.updated", { version: await updateYtdlp() }))),
    },
    { id: "clear", label: t("palette.clearFinished"), run: () => useQueue.getState().clearFinished() },
    {
      id: "theme",
      label: "", // filled in by withThemeLabel, since it names the current theme
      run: attempt(async () => {
        const settings = await getSettings();
        const next = THEMES[(THEMES.indexOf(settings.theme) + 1) % THEMES.length];
        await setSettings({ ...settings, theme: next });
        applyTheme(next);
      }),
    },
    { id: "shortcuts", label: t("palette.shortcuts"), run: () => app.setShortcuts(true) },
  ];
}

/** The theme command names the current theme, which takes a read of the settings. */
export async function withThemeLabel(commands: Command[]): Promise<Command[]> {
  const theme = await getSettings().then((s) => s.theme).catch(() => "system" as Theme);
  return commands.map((c) =>
    c.id === "theme" ? { ...c, label: t("palette.theme", { theme: t(`theme.${theme}`) }) } : c,
  );
}
