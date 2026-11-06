// The toolbar popup: checks that the Katevazo app is installed, then shows the page you are
// on and sends it to the app.
const api = globalThis.browser ?? globalThis.chrome;

const $ = (id) => document.getElementById(id);
const sendButton = $("send");

let tab = null;

function isLink(url) {
  return /^https?:\/\//i.test(url ?? "");
}

function showMissing() {
  $("status").textContent = "App not found";
  $("status").classList.add("off");
  $("page").hidden = true;
  sendButton.hidden = true;
  $("missing").hidden = false;
}

async function start() {
  let state = { installed: false };
  try {
    state = await api.runtime.sendMessage({ type: "status" });
  } catch {
    // The background script did not answer; treat the app as missing.
  }
  if (!state?.installed) return showMissing();

  $("status").textContent = state.version ? `Ready · version ${state.version}` : "Ready";
  $("status").classList.add("on");
  $("page").hidden = false;
  sendButton.hidden = false;

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

sendButton.addEventListener("click", async () => {
  if (!tab || sendButton.disabled) return;
  sendButton.disabled = true;
  let state = { installed: false };
  try {
    state = await api.runtime.sendMessage({ type: "send", url: tab.url, tabId: tab.id });
  } catch {
    // Handled as missing below.
  }
  if (!state?.installed) return showMissing();
  sendButton.textContent = "Sent to Katevazo";
  sendButton.classList.add("sent");
  window.setTimeout(() => {
    sendButton.textContent = "Send to Katevazo";
    sendButton.classList.remove("sent");
    sendButton.disabled = false;
  }, 1800);
});

start();
