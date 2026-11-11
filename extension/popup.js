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
  void setupSite();
}

// The button on videos is built in for some sites. For any other, the user can turn it on here:
// the browser then asks for access to that one site, and nothing is read anywhere else.
const SCRIPTS = ["hint.js", "overlay.js"];

/** Whether the manifest already adds the button on this host (or the site has its own). */
function isBuiltIn(host) {
  const patterns = (api.runtime.getManifest().content_scripts ?? []).flatMap((c) => c.matches);
  return patterns.some((p) => {
    const h = p.replace(/^[a-z*]+:[/][/]/, "").replace(/[/].*$/, "");
    return h.startsWith("*.") ? host === h.slice(2) || host.endsWith(h.slice(1)) : host === h;
  });
}

async function setupSite() {
  const url = new URL(tab.url);
  if (isBuiltIn(url.hostname)) return;
  const origins = [`${url.protocol}//${url.hostname}/*`];
  const id = `site-${url.hostname}`;
  const toggle = $("siteToggle");
  const hint = $("siteHint");
  $("siteTitle").textContent = `Show the Katevazo button on ${url.hostname}`;
  hint.textContent = "A small button appears on videos on this site.";
  $("site").hidden = false;

  const registered = async () => (await api.scripting.getRegisteredContentScripts({ ids: [id] })).length > 0;
  const set = (on) => toggle.setAttribute("aria-checked", String(on));
  try {
    set((await api.permissions.contains({ origins })) && (await registered()));
  } catch {
    toggle.disabled = true;
    return;
  }

  toggle.addEventListener("click", async () => {
    toggle.disabled = true;
    try {
      if (toggle.getAttribute("aria-checked") === "true") {
        if (await registered()) await api.scripting.unregisterContentScripts({ ids: [id] });
        await api.permissions.remove({ origins });
        set(false);
        hint.textContent = "Turned off. Reload the page to remove the button.";
      } else if (await api.permissions.request({ origins })) {
        if (!(await registered())) {
          await api.scripting.registerContentScripts([
            { id, matches: origins, js: SCRIPTS, runAt: "document_idle", persistAcrossSessions: true },
          ]);
        }
        // Works on the page that is open now, without a reload.
        await api.scripting.executeScript({ target: { tabId: tab.id }, files: SCRIPTS });
        set(true);
        hint.textContent = "On. Move the pointer over a video to see it.";
      } else {
        hint.textContent = "Not turned on. The browser needs your OK to let the button appear on this site.";
      }
    } catch {
      hint.textContent = "Couldn't change this. Try again.";
    }
    toggle.disabled = false;
  });
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
