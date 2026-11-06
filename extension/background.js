// Hands a link to the Katevazo app through its katevazo:// address. The app only loads
// the link so you can pick a format; nothing downloads until you press Download there.
const api = globalThis.browser ?? globalThis.chrome;

const HOST = "app.katevazo.host";
const RELEASES = "https://github.com/ipuppyyt/katevazo/releases/latest";

/** Asks the installed app, through native messaging, whether it is there. */
async function status() {
  try {
    const reply = await api.runtime.sendNativeMessage(HOST, { type: "ping" });
    return reply?.installed === true ? { installed: true, version: reply.version } : { installed: false };
  } catch {
    // No such host: the app is not installed, or is too old to know about the extension.
    return { installed: false };
  }
}

function send(tabId, link) {
  if (!/^https?:\/\//i.test(link ?? "")) return;
  const address = `katevazo://download?url=${encodeURIComponent(link)}`;
  // Navigating a tab to a custom address opens the app and leaves the page where it is.
  api.tabs.update(tabId, { url: address });
}

api.runtime.onInstalled.addListener(() => {
  api.contextMenus.create({ id: "page", title: "Send page to Katevazo", contexts: ["page", "video"] });
  api.contextMenus.create({ id: "link", title: "Send link to Katevazo", contexts: ["link"] });
});

api.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!(await status()).installed) return api.tabs.create({ url: RELEASES });
  send(tab?.id, info.menuItemId === "link" ? info.linkUrl : (info.srcUrl ?? info.pageUrl));
});

// The popup and the buttons added to YouTube and Instagram.
api.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type === "status") {
    status().then(respond);
    return true;
  }
  if (message?.type !== "send") return;
  status().then((state) => {
    const tabId = sender.tab?.id ?? message.tabId;
    if (state.installed && tabId !== undefined) send(tabId, message.url);
    respond(state);
  });
  return true;
});
