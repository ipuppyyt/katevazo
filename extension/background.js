// Hands a link to the Katevazo app through its katevazo:// address. The app only loads
// the link so you can pick a format; nothing downloads until you press Download there.
const api = globalThis.browser ?? globalThis.chrome;

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

api.contextMenus.onClicked.addListener((info, tab) => {
  send(tab?.id, info.menuItemId === "link" ? info.linkUrl : (info.srcUrl ?? info.pageUrl));
});

api.action.onClicked.addListener((tab) => send(tab.id, tab.url));
