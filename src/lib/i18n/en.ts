/** English is the source language: every key is defined here, and other languages may leave some out. */
export const en = {
  "nav.Downloads": "Downloads",
  "nav.History": "History",
  "nav.Subscriptions": "Subscriptions",
  "nav.Convert": "Convert",
  "nav.Settings": "Settings",

  "drop.title": "Drop to download",
  "drop.hint": "A link, or a text file with one link per line",
  "drop.none": "No links found in what you dropped.",

  "palette.title": "Command palette",
  "palette.placeholder": "Type a command…",
  "palette.empty": "No matching commands",
  "palette.goto": "Go to {name}",
  "palette.paste": "Add link from clipboard",
  "palette.pasteNone": "There is no link on the clipboard.",
  "palette.focusUrl": "Enter a link",
  "palette.checkSubs": "Check subscriptions now",
  "palette.checked": "{count} new videos queued",
  "palette.checked_one": "1 new video queued",
  "palette.checked_zero": "No new videos",
  "palette.updateYtdlp": "Update yt-dlp",
  "palette.updated": "yt-dlp is now {version}",
  "palette.clearFinished": "Clear finished downloads",
  "palette.theme": "Switch theme (now {theme})",
  "palette.shortcuts": "Show keyboard shortcuts",
  "palette.failed": "That did not work: {error}",
  "theme.system": "system",
  "theme.light": "light",
  "theme.dark": "dark",

  "shortcuts.title": "Keyboard shortcuts",
  "shortcuts.palette": "Open the command palette",
  "shortcuts.tabs": "Switch section",
  "shortcuts.focus": "Enter a link",
  "shortcuts.settings": "Open Settings",
  "shortcuts.paste": "Paste a link anywhere in the window",
  "shortcuts.close": "Close",
} as const;

export type Key = keyof typeof en;
