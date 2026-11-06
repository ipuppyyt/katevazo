// The toolbar popup: shows the page you are on and sends it to the Katevazo app.
const api = globalThis.browser ?? globalThis.chrome;

const $ = (id) => document.getElementById(id);
const sendButton = $("send");

let tab = null;

function isLink(url) {
  return /^https?:\/\//i.test(url ?? "");
}

async function start() {
  [tab] = await api.tabs.query({ active: true, currentWindow: true });
  if (!isLink(tab?.url)) {
    $("title").textContent = "This page can't be sent";
    $("host").textContent = "Open a video, or a page with one, then try again.";
    sendButton.disabled = true;
    return;
  }
  $("title").textContent = tab.title || tab.url;
  $("host").textContent = new URL(tab.url).host;
}

sendButton.addEventListener("click", () => {
  if (!tab || sendButton.disabled) return;
  api.runtime.sendMessage({ type: "send", url: tab.url, tabId: tab.id });
  sendButton.textContent = "Sent to Katevazo";
  sendButton.classList.add("sent");
  sendButton.disabled = true;
  // When the app opens it takes focus, and this popup closes. If it is still here a moment
  // later, nothing opened, most likely because the app is not installed.
  window.setTimeout(() => {
    $("note").hidden = false;
    $("footer").hidden = true;
    sendButton.textContent = "Send again";
    sendButton.classList.remove("sent");
    sendButton.disabled = false;
  }, 2500);
});

start();
