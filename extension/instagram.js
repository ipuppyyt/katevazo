// Adds a Katevazo download button beside Share on Instagram video posts and reels, and on the reels in a profile's Reels tab.
// It appears only on public accounts: nothing is added where Instagram marks the account as
// private. Clicking it hands the post's link to the Katevazo app; nothing downloads until you
// press Download there.
const api = globalThis.browser ?? globalThis.chrome;

const LABEL = "Download with Katevazo";
const SENT = "Sent to Katevazo";
const MARK = "data-katevazo";

const SVG = "http://www.w3.org/2000/svg";
// Outline strokes, to sit among Instagram's own outlined icons.
const ICON = "M12 4v10M7.5 10l4.5 4.5 4.5-4.5M5 19h14";
const CHECK = "M5 12.5l4.5 4.5L19 7.5";

function makeIcon(d, like) {
  const svg = document.createElementNS(SVG, "svg");
  if (like) svg.setAttribute("class", like.getAttribute("class") ?? "");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", like?.getAttribute("width") ?? "24");
  svg.setAttribute("height", like?.getAttribute("height") ?? "24");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", LABEL);
  svg.setAttribute("fill", "none");
  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", d);
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.append(path);
  return svg;
}

/** Whether the page's data marks this user's account as private. Unknown counts as public. */
function isPrivateIn(text, user) {
  const needle = `"username":"${user}"`;
  for (let at = text.indexOf(needle); at >= 0; at = text.indexOf(needle, at + needle.length)) {
    // The flag sits next to the username in the same object; stop at the neighbouring user.
    const after = text.slice(at + needle.length, at + needle.length + 700).split('"username":"')[0];
    const before = text.slice(Math.max(0, at - 400), at).split('"username":"').pop() ?? "";
    if (/"is_private":true/.test(after) || /"is_private":true/.test(before)) return true;
  }
  return false;
}

const privacy = new Map();
function isPrivate(user) {
  if (!user) return false;
  const scripts = document.querySelectorAll('script[type="application/json"]');
  const known = privacy.get(user);
  if (known && known.scripts === scripts.length) return known.value;
  let value = false;
  for (const script of scripts) {
    if (script.textContent.includes(user) && isPrivateIn(script.textContent, user)) {
      value = true;
      break;
    }
  }
  privacy.set(user, { scripts: scripts.length, value });
  return value;
}

/** The post or reel a path points at, as a canonical link. */
function linkOf(path) {
  const m = path.match(/^\/(?:([\w.]+)\/)?(p|reel|reels|tv)\/([\w-]+)/);
  if (!m) return null;
  return { user: m[1] ?? null, url: `https://www.instagram.com/${m[2] === "reels" ? "reel" : m[2]}/${m[3]}/` };
}

/** Whether this is the Reels tab of a profile. */
function onReelsTab() {
  return /^/[w.]+/reels/?$/.test(location.pathname);
}

/** Whether the post an action row belongs to is a video: a reel, or a post with a video in it. */
function isVideo(row, post) {
  if (//(reel|tv)//.test(post.url)) return true;
  const scope = row.closest("article, [role=dialog], main") ?? document;
  return !!scope.querySelector("video");
}

/** The user whose profile page this is, or null elsewhere. */
function profileUser() {
  const m = location.pathname.match(/^\/([\w.]+)\/?(?:reels\/?|tagged\/?)?$/);
  return m && !["explore", "reels", "direct", "accounts", "stories"].includes(m[1]) ? m[1] : null;
}

/** The link and author for the post an element belongs to. */
function postFor(element) {
  const here = linkOf(location.pathname);
  if (here) return { ...here, user: here.user ?? authorIn(element.closest("article, [role=dialog]")) };
  const article = element.closest("article");
  const anchor = article?.querySelector('a[href*="/p/"], a[href*="/reel/"]');
  const found = anchor && linkOf(new URL(anchor.href).pathname);
  return found && { ...found, user: found.user ?? authorIn(article) };
}

function authorIn(root) {
  const link = root?.querySelector("header a[href]");
  return link?.getAttribute("href")?.match(/^\/([\w.]+)\/$/)?.[1] ?? null;
}

function send(url, swap) {
  api.runtime.sendMessage({ type: "send", url });
  swap(true);
  window.setTimeout(() => swap(false), 1800);
}

/** A copy of the Share button beside Like and Comment, with our icon. */
function addToActionRow(row) {
  if (row.querySelector(`[${MARK}]`)) return;
  const share = row.querySelectorAll("svg[aria-label]")[2];
  const original = share?.closest("[role=button]");
  if (!share || !original) return;
  const post = postFor(row);
  if (!post || isPrivate(post.user) || !isVideo(row, post)) return;

  const button = original.cloneNode(true);
  button.setAttribute(MARK, "");
  button.setAttribute("aria-label", LABEL);
  button.title = LABEL;
  const mine = makeIcon(ICON, share);
  button.querySelector("svg").replaceWith(mine);
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const current = postFor(row);
    if (current && !isPrivate(current.user)) {
      send(current.url, (done) => {
        button.querySelector("svg").replaceWith(makeIcon(done ? CHECK : ICON, share));
        button.title = done ? SENT : LABEL;
      });
    }
  });
  original.after(button);
}

/** A small button over each reel on the Reels tab of a public profile, shown when you point at it. */
function addToGrid() {
  const user = onReelsTab() ? profileUser() : null;
  for (const old of document.querySelectorAll(`.katevazo-ig-tile`)) {
    if (!user || isPrivate(user)) old.remove();
  }
  if (!user || isPrivate(user)) return;
  for (const anchor of document.querySelectorAll('main a[href*="/p/"], main a[href*="/reel/"]')) {
    const host = anchor.parentElement;
    const post = linkOf(new URL(anchor.href).pathname);
    if (!host || !post || host.querySelector(".katevazo-ig-tile")) continue;
    host.classList.add("katevazo-ig-host");
    const button = document.createElement("button");
    button.className = "katevazo-ig-tile";
    button.type = "button";
    button.title = LABEL;
    button.setAttribute("aria-label", LABEL);
    button.append(makeIcon(ICON));
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      send(post.url, (done) => button.replaceChildren(makeIcon(done ? CHECK : ICON)));
    });
    host.append(button);
  }
}

function sync() {
  for (const section of document.querySelectorAll("section")) {
    // The row of Like, Comment, Share and Save has four icons and hardly any text.
    if (section.querySelectorAll("svg[aria-label]").length >= 4 && section.innerText.length < 60) addToActionRow(section);
  }
  addToGrid();
}

// Instagram builds its pages as you move around, so keep checking.
let queued = false;
new MutationObserver(() => {
  if (queued) return;
  queued = true;
  window.requestAnimationFrame(() => {
    queued = false;
    sync();
  });
}).observe(document.documentElement, { childList: true, subtree: true });
sync();
