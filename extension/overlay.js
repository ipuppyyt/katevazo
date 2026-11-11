// Adds a small "Katevazo" chip just outside a video's top-right corner while the pointer is on the
// video, for the sites that have no button of their own in the extension (YouTube and Instagram do).
// It never covers the picture or the site's controls: it sits above the player, or below it when
// there is no room above, and stays away in fullscreen. Clicking it hands the video's link to the
// Katevazo app; nothing downloads until you press Download there. It appears only on a video whose
// link it can work out, and fades away when the pointer rests.
(() => {
  const LABEL = "Download with Katevazo";
  const SENT = "Sent to Katevazo";
  /** Smaller players are previews and thumbnails; a chip there would just be in the way. */
  const MIN_W = 240;
  const MIN_H = 135;
  const HIDE_AFTER = 3000;
  const CHIP_H = 30;
  const GAP = 6;

  const here = location.hostname.toLowerCase();
  const on = (re) => re.test(here);

  /** An absolute link with the tracking and position parameters dropped. */
  const clean = (href, keep = []) => {
    try {
      const u = new URL(href, location.href);
      const search = new URLSearchParams();
      for (const k of keep) if (u.searchParams.has(k)) search.set(k, u.searchParams.get(k));
      const q = search.toString();
      return `${u.origin}${u.pathname.replace(/\/+$/, "") || "/"}${q ? `?${q}` : ""}`;
    } catch {
      return null;
    }
  };

  /** The first link inside the video's post that matches, as an absolute address. */
  const inPost = (video, post, pattern) => {
    const scope = post ? video.closest(post) : null;
    if (!scope) return null;
    for (const a of scope.querySelectorAll("a[href]")) {
      const href = a.getAttribute("href");
      if (pattern.test(href)) return new URL(href, location.href).href;
    }
    return null;
  };

  /** What to send for a video on this site, or null when it is not a page of its own. */
  const resolvers = [
    [/(^|\.)vimeo\.com$/, () => (/\/\d{5,}/.test(location.pathname) ? clean(location.href) : null)],
    [/(^|\.)dailymotion\.com$/, () => (/^\/video\//.test(location.pathname) ? clean(location.href) : null)],
    [
      /(^|\.)(x|twitter)\.com$/,
      (v) => {
        const found = inPost(v, "article", /^\/[^/]+\/status\/\d+/) ?? location.href;
        const m = new URL(found).pathname.match(/^\/([^/]+)\/status\/(\d+)/);
        return m ? `${location.origin}/${m[1]}/status/${m[2]}` : null;
      },
    ],
    [
      /(^|\.)tiktok\.com$/,
      (v) => {
        const found = inPost(v, "article, [data-e2e*='item']", /\/video\/\d+/) ?? location.href;
        return /^\/@[^/]+\/video\/\d+/.test(new URL(found).pathname) ? clean(found) : null;
      },
    ],
    [
      /(^|\.)twitch\.tv$/,
      () => {
        const p = location.pathname;
        if (here === "clips.twitch.tv") return p.length > 1 ? clean(location.href) : null;
        if (/^\/videos\/\d+/.test(p) || /^\/[^/]+\/clip\/[^/]+/.test(p)) return clean(location.href);
        const channel = p.match(/^\/([^/]+)\/?$/)?.[1];
        const reserved = /^(directory|downloads|jobs|turbo|settings|subscriptions|drops|wallet|friends|p|search|videos|store|prime|inventory|payments|moderator|popout|embed)$/i;
        return channel && !reserved.test(channel) ? clean(location.href) : null;
      },
    ],
    [
      /(^|\.)facebook\.com$/,
      (v) => {
        const found = inPost(v, "[role='article']", /\/(videos|reel)\/\d+|\/watch\/?\?v=\d+/) ?? location.href;
        const u = new URL(found);
        if (/^\/watch\/?$/.test(u.pathname) && u.searchParams.get("v")) {
          return `${u.origin}/watch/?v=${encodeURIComponent(u.searchParams.get("v"))}`;
        }
        return /\/(videos|reel)\/\d+/.test(u.pathname) ? clean(found) : null;
      },
    ],
    [
      /(^|\.)reddit\.com$/,
      (v) => {
        const permalink = v.closest("shreddit-post")?.getAttribute("permalink");
        const found = permalink ? new URL(permalink, location.origin).href : location.href;
        return /^\/r\/[^/]+\/comments\//.test(new URL(found).pathname) ? clean(found) : null;
      },
    ],
  ];
  const resolve = resolvers.find(([re]) => on(re))?.[1];
  if (!resolve) return;

  const SHEET = `
    :host { all: initial; }
    button {
      position: fixed; z-index: 2147483647; display: flex; align-items: center; gap: 6px; height: 30px;
      padding: 0 12px 0 9px; border: 0; border-radius: 999px; cursor: pointer;
      background: rgba(28,28,30,.82); color: #fff; backdrop-filter: blur(8px);
      box-shadow: 0 2px 10px rgba(0,0,0,.35), 0 0 0 .5px rgba(255,255,255,.18);
      font: 600 12px/1 -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif;
      opacity: 0; visibility: hidden; transition: opacity .15s ease, visibility .15s;
    }
    button[data-shown="true"] { opacity: 1; visibility: visible; }
    button:hover { background: rgba(10,132,255,.95); }
    button:focus-visible { outline: 2px solid #0a84ff; outline-offset: 2px; }
    svg { width: 15px; height: 15px; flex: none; }
    @media (prefers-reduced-motion: reduce) { button { transition: none; } }
  `;
  const SVG = "http://www.w3.org/2000/svg";
  const ICON = "M12 4v10M7.5 10l4.5 4.5 4.5-4.5M5 19h14";
  const CHECK = "M5 12.5l4.5 4.5L19 7.5";

  const box = document.createElement("div");
  const root = box.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = SHEET;
  const chip = document.createElement("button");
  chip.type = "button";
  chip.setAttribute("aria-label", LABEL);
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG, "path");
  for (const [k, v] of Object.entries({
    stroke: "currentColor", "stroke-width": "2.4", "stroke-linecap": "round", "stroke-linejoin": "round", d: ICON,
  })) path.setAttribute(k, v);
  svg.append(path);
  const text = document.createElement("span");
  text.textContent = "Katevazo";
  chip.append(svg, text);
  root.append(style, chip);

  let video = null;
  let hideTimer = 0;
  let sentTimer = 0;
  let frame = 0;

  const videos = () =>
    [...document.querySelectorAll("video")].filter((v) => {
      const r = v.getBoundingClientRect();
      return r.width >= MIN_W && r.height >= MIN_H && r.bottom > 0 && r.top < innerHeight;
    });

  /** Where the chip goes for a video: above its top edge, else below its bottom edge, else nowhere. */
  const slot = (r) => {
    if (document.fullscreenElement) return null;
    if (r.top >= CHIP_H + GAP * 2) return { top: r.top - CHIP_H - GAP, above: true };
    if (innerHeight - r.bottom >= CHIP_H + GAP * 2) return { top: r.bottom + GAP, above: false };
    return null;
  };

  /**
   * The video the pointer is on. Players cover their video with other layers, so look at its box.
   * The strip where the chip sits counts too, so the pointer can travel to it without it vanishing.
   */
  const under = (x, y) =>
    videos().find((v) => {
      const r = v.getBoundingClientRect();
      const s = slot(r);
      if (!s) return false;
      const top = s.above ? s.top : r.top;
      const bottom = s.above ? r.bottom : s.top + CHIP_H;
      return x >= r.left && x <= r.right && y >= top && y <= bottom;
    }) ?? null;

  function place() {
    frame = 0;
    if (!video) return;
    const r = video.getBoundingClientRect();
    const s = slot(r);
    if (!s) return hide();
    chip.style.top = `${s.top}px`;
    // Anchored by its right edge, so it stays put when the label changes to "Sent".
    chip.style.right = `${document.documentElement.clientWidth - Math.min(r.right, innerWidth)}px`;
  }
  const queuePlace = () => {
    if (!frame) frame = requestAnimationFrame(place);
  };

  function hide() {
    clearTimeout(hideTimer);
    chip.dataset.shown = "false";
    video = null;
  }

  function show(v) {
    if (!box.isConnected || box.parentNode !== (document.fullscreenElement ?? document.documentElement)) {
      (document.fullscreenElement ?? document.documentElement).append(box);
    }
    video = v;
    chip.dataset.shown = "true";
    place();
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (!chip.matches(":hover") && !chip.matches(":focus-visible")) hide();
      else show(video);
    }, HIDE_AFTER);
  }

  document.addEventListener(
    "pointermove",
    (e) => {
      if (e.composedPath().includes(box)) {
        clearTimeout(hideTimer);
        return;
      }
      const v = under(e.clientX, e.clientY);
      if (!v) return hide();
      if (resolve(v)) show(v);
      else hide();
    },
    { capture: true, passive: true },
  );
  // Leaving the page altogether (not each element on the way).
  document.documentElement.addEventListener("mouseleave", hide);
  addEventListener("scroll", queuePlace, { capture: true, passive: true });
  addEventListener("resize", queuePlace);
  document.addEventListener("fullscreenchange", () => {
    // Only what is inside the fullscreen element is drawn, so move the chip in (or back out).
    hide();
  });

  chip.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = video ? resolve(video) : null;
    if (!url || !(await globalThis.katevazoSend(url))) return;
    path.setAttribute("d", CHECK);
    text.textContent = "Sent";
    chip.setAttribute("aria-label", SENT);
    clearTimeout(sentTimer);
    sentTimer = setTimeout(() => {
      path.setAttribute("d", ICON);
      text.textContent = "Katevazo";
      chip.setAttribute("aria-label", LABEL);
    }, 1800);
  });
  // Keep clicks on the chip from reaching the player (which would pause the video).
  for (const type of ["pointerdown", "mousedown", "mouseup", "dblclick"]) {
    chip.addEventListener(type, (e) => e.stopPropagation());
  }
})();
