import { create } from "zustand";
import { en, type Key } from "./en";
import { de } from "./de";
import { es } from "./es";
import { fr } from "./fr";
import { it } from "./it";
import { ja } from "./ja";
import { pt } from "./pt";
import { zh } from "./zh";

type Catalogue = Partial<Record<Key, string>>;

/** Languages the interface is translated into. Add one by creating its file and listing it here. */
export const LANGUAGES: { code: string; name: string; strings: Catalogue }[] = [
  { code: "en", name: "English", strings: en },
  { code: "es", name: "Español", strings: es },
  { code: "fr", name: "Français", strings: fr },
  { code: "de", name: "Deutsch", strings: de },
  { code: "pt", name: "Português", strings: pt },
  { code: "it", name: "Italiano", strings: it },
  { code: "ja", name: "日本語", strings: ja },
  { code: "zh", name: "简体中文", strings: zh },
];

/** The language to use for a setting. English is the default, and also what an unknown code falls back to. */
export function resolveLanguage(setting: string): string {
  const base = setting.toLowerCase();
  return (LANGUAGES.find((l) => l.code === base) ?? LANGUAGES.find((l) => l.code === base.split("-")[0]))?.code ?? "en";
}

type Vars = Record<string, string | number>;

/**
 * Looks up `key` in the language, falling back to English. `{name}` is replaced from `vars`;
 * with a `count`, `key_one` or `key_other` is used when it exists.
 */
export function translate(lang: string, key: Key, vars?: Vars): string {
  const strings = LANGUAGES.find((l) => l.code === lang)?.strings ?? en;
  let text: string | undefined;
  if (vars && typeof vars.count === "number") {
    const form = new Intl.PluralRules(lang).select(vars.count);
    text = strings[`${key}_${form}` as Key] ?? strings[`${key}_other` as Key];
    text ??= en[`${key}_${form}` as Key] ?? en[`${key}_other` as Key];
  }
  text ??= strings[key] ?? en[key] ?? key;
  return vars ? text.replace(/\{(\w+)\}/g, (whole, name: string) => String(vars[name] ?? whole)) : text;
}

interface LangState {
  lang: string;
  set: (setting: string) => void;
}

export const useLang = create<LangState>((set) => ({
  lang: resolveLanguage(""),
  set: (setting) => {
    const lang = resolveLanguage(setting);
    document.documentElement.lang = lang;
    set({ lang });
  },
}));

export type T = (key: Key, vars?: Vars) => string;

/** Returns the translate function for the current language; components re-render when it changes. */
export function useT(): T {
  const lang = useLang((s) => s.lang);
  return (key, vars) => translate(lang, key, vars);
}

export type { Key };

/** `translate` for code outside components, using the current language. */
export const tr: T = (key, vars) => translate(useLang.getState().lang, key, vars);
