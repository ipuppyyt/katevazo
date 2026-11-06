// Adds a Katevazo download button to the YouTube player's control bar, next to Settings, and
// to the action buttons beside a Short, between Share and Remix.
// Clicking it hands the video you are watching to the Katevazo app; nothing downloads until
// you press Download there.
const api = globalThis.browser ?? globalThis.chrome;

const ID = "katevazo-download";
const LABEL = "Download with Katevazo";
const SENT = "Sent to Katevazo";

// The same 24x24 outline style as the player's own icons. Built with DOM calls, since YouTube
// does not allow setting innerHTML.
const SVG = "http://www.w3.org/2000/svg";
const ICON = "M11 3h2v9.17l3.59-3.58L18 10l-6 6-6-6 1.41-1.41L11 12.17V3Zm-6 15h14v2H5v-2Z";
const CHECK = "m9.55 17.65-5.2-5.2 1.4-1.4 3.8 3.8 8.7-8.7 1.4 1.4-10.1 10.1Z";

function setIcon(button, d) {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "24");
  svg.setAttribute("height", "24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "currentColor");
  svg.append(path);
  button.replaceChildren(svg);
}

/** The video being watched, without playlist or time parameters; null when this is not a watch page. */
function currentLink() {
  if (location.pathname !== "/watch") return null;
  const id = new URL(location.href).searchParams.get("v");
  return id ? `https://www.youtube.com/watch?v=${encodeURIComponent(id)}` : null;
}

let tip = null;
function showTip(button, text) {
  const player = button.closest(".html5-video-player");
  if (!player) return;
  tip ??= Object.assign(document.createElement("div"), { className: "katevazo-tip" });
  tip.textContent = text;
  player.appendChild(tip);
  const p = player.getBoundingClientRect();
  const b = button.getBoundingClientRect();
  // Centred over the button, but kept inside the player.
  const half = tip.offsetWidth / 2;
  const centre = Math.min(Math.max(b.left - p.left + b.width / 2, half + 8), p.width - half - 8);
  tip.style.left = `${centre}px`;
  tip.style.bottom = `${p.bottom - b.top + 12}px`;
  tip.dataset.visible = "true";
}
function hideTip() {
  if (tip) tip.dataset.visible = "false";
}

function send(button) {
  const url = currentLink();
  if (!url) return;
  api.runtime.sendMessage({ type: "send", url });
    globalThis.katevazoWatchOpen?.();
  setIcon(button, CHECK);
  button.setAttribute("aria-label", SENT);
  showTip(button, SENT);
  window.setTimeout(() => {
    setIcon(button, ICON);
    button.setAttribute("aria-label", LABEL);
    if (button.matches(":hover")) showTip(button, LABEL);
    else hideTip();
  }, 1800);
}

function makeButton() {
  const button = document.createElement("button");
  button.id = ID;
  button.className = "ytp-button katevazo-button";
  button.setAttribute("aria-label", LABEL);
  setIcon(button, ICON);
  button.addEventListener("click", () => send(button));
  button.addEventListener("mouseenter", () => showTip(button, button.getAttribute("aria-label") ?? LABEL));
  button.addEventListener("focus", () => button.matches(":focus-visible") && showTip(button, LABEL));
  button.addEventListener("mouseleave", hideTip);
  button.addEventListener("blur", hideTip);
  return button;
}

const SHORT_ID = "katevazo-short-download";

/** The Short being watched; null when this is not a Shorts page. */
function shortLink() {
  const id = location.pathname.match(/^\/shorts\/([\w-]+)/)?.[1];
  return id ? `https://www.youtube.com/shorts/${id}` : null;
}

/** A copy of the Share button, so it looks and sits like the others, with our icon and action. */
function makeShortButton(share) {
  const item = share.cloneNode(true);
  item.id = SHORT_ID;
  const button = item.querySelector("button");
  const path = item.querySelector("svg path");
  const label = item.querySelector(".ytSpecButtonShapeWithLabelLabel span");
  if (!button || !path || !label) return null;
  button.setAttribute("aria-label", LABEL);
  button.removeAttribute("title");
  path.setAttribute("d", ICON);
  label.textContent = "Download";
  button.addEventListener("click", () => {
    const url = shortLink();
    if (!url) return;
    api.runtime.sendMessage({ type: "send", url });
    globalThis.katevazoWatchOpen?.();
    path.setAttribute("d", CHECK);
    label.textContent = "Sent";
    window.setTimeout(() => {
      path.setAttribute("d", ICON);
      label.textContent = "Download";
    }, 1800);
  });
  return item;
}

/** Adds a Download button between Share and Remix on Shorts, or removes it elsewhere. */
function syncShorts() {
  if (!shortLink()) {
    document.querySelectorAll(`#${SHORT_ID}`).forEach((e) => e.remove());
    return;
  }
  for (const bar of document.querySelectorAll("reel-action-bar-view-model")) {
    if (bar.querySelector(`#${SHORT_ID}`)) continue;
    const items = [...bar.children];
    // Like, comments, Share, then Remix: Share is the third.
    if (items[0]?.tagName !== "LIKE-BUTTON-VIEW-MODEL" || !items[2]) continue;
    const button = makeShortButton(items[2]);
    if (button) items[2].after(button);
  }
}

/** Puts the button in the control bar of the main player, or removes it where it does not belong. */
function sync() {
  const existing = document.getElementById(ID);
  const bar = document.querySelector("#movie_player .ytp-right-controls-right");
  if (!bar || !currentLink()) {
    existing?.remove();
    return;
  }
  if (existing && existing.parentElement === bar) return;
  existing?.remove();
  // Right after Settings, which sits in one of the control bar's two halves depending on width.
  const settings = document.querySelector("#movie_player .ytp-settings-button");
  if (settings?.parentElement === bar) settings.after(makeButton());
  else bar.prepend(makeButton());
}

// YouTube swaps pages and rebuilds the controls without reloading, so keep checking.
let queued = false;
new MutationObserver(() => {
  if (queued) return;
  queued = true;
  window.requestAnimationFrame(() => {
    queued = false;
    sync();
    syncShorts();
  });
}).observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener("yt-navigate-finish", () => {
  sync();
  syncShorts();
});
sync();
syncShorts();
