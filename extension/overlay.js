// Adds a small download button inside a video's top-right corner while the pointer is on the
// video, for the sites that have no button of their own in the extension (YouTube and Instagram do).
// It is icon-only, hides in a few seconds of rest, and sits in the corner where the controls are not.
// Clicking it hands the video's link to the Katevazo app; nothing downloads until you press Download there.
// It appears only on a video whose link it can work out.

(() => {
  // The page may be given this script twice (registered for the site, and added when it was turned on).
  if (globalThis.katevazoOverlay) return;
  globalThis.katevazoOverlay = true;

  const LABEL = "Download with Katevazo";
  const SENT = "Sent to Katevazo";
  /** Smaller players are previews and thumbnails; a chip there would just be in the way. */
  const MIN_W = 240;
  const MIN_H = 135;
  const HIDE_AFTER = 3000;
  const CHIP_H = 32;
  const INSET = 10;

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
        // A channel page is a live stream, which is not downloadable.
        return null;
      },
    ],
    [
      /(^|\.)facebook\.com$/,
      (v) => {
        // A tile in a row of Reels is wrapped in a link to its own address.
        const tile = v.closest("a[href]")?.getAttribute("href");
        const own = tile && /\/(videos|reel)\/\d+/.test(tile) ? new URL(tile, location.href).href : null;
        const found = own ?? inPost(v, "[role='article']", /\/(videos|reel)\/\d+|\/watch\/?\?v=\d+/) ?? location.href;
        const u = new URL(found);
        if (/^\/watch\/?$/.test(u.pathname) && u.searchParams.get("v")) {
          return `${u.origin}/watch/?v=${encodeURIComponent(u.searchParams.get("v"))}`;
        }
        if (/\/(videos|reel)\/\d+/.test(u.pathname)) return clean(found);
        // Only videos and reels have a page of their own; a video inside a post gets no button.
        return null;
      },
    ],
    [
      /(^|\.)reddit\.com$/,
      (v) => {
        const permalink = closestDeep(v, "shreddit-post")?.getAttribute("permalink");
        const found = permalink ? new URL(permalink, location.origin).href : location.href;
        return /^\/r\/[^/]+\/comments\//.test(new URL(found).pathname) ? clean(found) : null;
      },
    ],
  ];
  // Any other site the user turned the button on for: yt-dlp reads most video pages from their own
  // address, so the page is what gets sent. A site’s home page, which has no video of its own, is not.
  const generic = () => {
    if (!/^https?:$/.test(location.protocol)) return null;
    if (location.pathname === "/" && !location.search) return null;
    return location.href.split("#")[0];
  };
  const resolve = resolvers.find(([re]) => on(re))?.[1] ?? generic;

  const SHEET = `
    :host { all: initial; }
    button {
      position: fixed; z-index: 2147483647; display: flex; align-items: center; gap: 6px; width: 32px; height: 32px; justify-content: center;
      padding: 0; border: 0; border-radius: 999px; cursor: pointer;
      background: rgba(28,28,30,.82); color: #fff; backdrop-filter: blur(8px);
      box-shadow: 0 2px 10px rgba(0,0,0,.35), 0 0 0 .5px rgba(255,255,255,.18);
      font: 600 12px/1 -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif;
      opacity: 0; visibility: hidden; transition: opacity .15s ease, visibility .15s;
    }
    button[data-shown="true"] { opacity: 1; visibility: visible; }
    button:hover { background: rgba(10,132,255,.95); }
    button:focus-visible { outline: 2px solid #0a84ff; outline-offset: 2px; }
    svg { width: 17px; height: 17px; flex: none; }
    span { display: none; }
    @media (prefers-reduced-motion: reduce) { button { transition: none; } }
  `;
  const SVG = "http://www.w3.org/2000/svg";
  const TT_ICON = "M9.5 3h5v7.5h6L12 18.5 3.5 10.5h6V3zM4 19.8h16V22H4v-2.2z";
  const TT_CHECK = "M9.2 16.4 5 12.2 2.4 14.8l6.8 6.8L21.6 9.2 19 6.6z";
  const ICON = "M12 4v10M7.5 10l4.5 4.5 4.5-4.5M5 19h14";
  const CHECK = "M5 12.5l4.5 4.5L19 7.5";
  // Solid versions, for players whose own control icons are solid.
  const SOLID_ICON = "M8.75 2.5h2.5v6.2l2.2-2.2 1.77 1.77L10 13.25 4.78 8.27 6.55 6.5l2.2 2.2V2.5zM3.75 15h12.5v2.5H3.75V15z";
  const SOLID_CHECK = "M7.5 13.4 4.1 10l-1.4 1.4 4.8 4.8L17.3 6.4 15.9 5z";

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

  /** Every <video>, including those inside open shadow roots (Reddit's player lives in one). */
  const allVideos = (root = document, out = []) => {
    for (const el of root.querySelectorAll("*")) {
      if (el.localName === "video") out.push(el);
      if (el.shadowRoot) allVideos(el.shadowRoot, out);
    }
    return out;
  };
  /** Like closest(), but also climbs out of shadow roots. */
  const closestDeep = (el, selector) => {
    for (let n = el; n; n = n.parentNode instanceof ShadowRoot ? n.parentNode.host : n.parentElement) {
      if (n.matches?.(selector)) return n;
    }
    return null;
  };

  const videos = () =>
    allVideos().filter((v) => {
      const r = v.getBoundingClientRect();
      return r.width >= MIN_W && r.height >= MIN_H && r.bottom > 0 && r.top < innerHeight;
    });

  /** The button sits inside the player's top-right corner, clear of the screen edge. */
  const slot = (r) => {
    const right = Math.min(r.right, document.documentElement.clientWidth);
    const top = Math.max(r.top, 0) + INSET;
    if (r.bottom - top < CHIP_H + INSET) return null;
    return { top, right: document.documentElement.clientWidth - right + INSET };
  };

  /**
   * The video the pointer is on. Players cover their video with other layers, so look at its box.
   * The strip where the chip sits counts too, so the pointer can travel to it without it vanishing.
   */
  const under = (x, y) =>
    videos().find((v) => {
      const r = v.getBoundingClientRect();
      return slot(r) && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }) ?? null;

  function place() {
    frame = 0;
    if (!video) return;
    const r = video.getBoundingClientRect();
    const s = slot(r);
    if (!s) return hide();
    chip.style.top = `${s.top}px`;
    // Anchored by its right edge, so it stays put when the label changes to "Sent".
    chip.style.right = `${s.right}px`;
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
      // The player has our button in its own controls.
      if (document.querySelector("[data-katevazo-bar], [data-katevazo-tiktok], [data-katevazo-reel]")) return hide();
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

  const nearestVideo = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const v = n.querySelector?.("video");
      if (v) return v;
    }
    return null;
  };
  /** The child of `parent` that contains `el`. */
  const childOf = (parent, el) => {
    let n = el;
    while (n && n.parentElement !== parent) n = n.parentElement;
    return n;
  };
  // A button in the player's own control bar, where the site has one we can find.
  const bars = [
    {
      // Vimeo: just before Picture in picture, after the settings and speed buttons.
      site: resolvers[0][0],
      anchors: () => [document.querySelector("#pip-control-bar-button")?.parentElement].filter(Boolean),
      host: "display:flex;align-items:center;flex:none;position:relative;pointer-events:all;",
      box: 24, radius: "4px", icon: 20, tip: "700 12px/15px 'Helvetica Neue',Helvetica,Arial,sans-serif",
      tipStyle: "padding:8px 12px;border-radius:4px;background:rgba(0,0,0,.9);color:#fff;", tipGap: 14, tipArrow: false,
    },
    {
      // Twitch: just before Settings, in the group on the right of the control bar.
      gate: true, // no button on a live stream
      site: resolvers[4][0],
      anchors: () => {
        const settings = document.querySelector('[data-a-target="player-settings-button"]');
        const group = settings?.closest(".player-controls__right-control-group");
        return [settings && group ? [...group.children].find((c) => c.contains(settings)) : null].filter(Boolean);
      },
      host: "display:flex;align-items:center;flex:none;position:relative;pointer-events:all;",
      box: 32, radius: "9000px", icon: 20, tip: "600 14px/19.6px Inter,'Noto Sans Arabic',Roobert,'Helvetica Neue',Helvetica,Arial,sans-serif",
      // Twitch's own tooltip: white on the dark theme, dark on the light one.
      tipStyle: () => {
        const light = document.documentElement.classList.contains("tw-root--theme-light");
        return `padding:4px 8px;border-radius:4px;background:${light ? "#0e0e10" : "#fff"};color:${light ? "#fff" : "#0e0e10"};`;
      },
      tipGap: 10, tipArrow: true,
    },
    {
      // Facebook: just after Settings, in the row of controls along the bottom of the player.
      after: true,
      solid: true,
      // A copy of the Settings control itself, so every style and fade the page gives it applies to ours too.
      clone: true,
      site: resolvers[5][0],
      anchors: () =>
        // A reel has its button in the column beside it instead (see below).
        (/^\/reel\//.test(location.pathname) ? [] : [...document.querySelectorAll('[role="button"][aria-label="Settings"]')])
          .map((settings) => {
            let row = settings.parentElement;
            while (row && !(row.querySelector('[role="button"][aria-label$="full-screen"]') && row.children.length > 3)) {
              row = row.parentElement;
            }
            return row ? childOf(row, settings) : null;
          })
          .filter(Boolean),
      host: "display:flex;align-items:center;justify-content:center;flex:none;position:relative;pointer-events:all;width:38px;height:44px;",
      box: 32, radius: "50%", icon: 20, tip: "400 13px/16px 'Segoe UI Historic','Segoe UI',Helvetica,Arial,sans-serif",
      tipStyle: "padding:8px 12px 9px;border-radius:8px;background:rgba(11,11,11,.8);color:#e4e6eb;box-shadow:0 2px 4px rgba(0,0,0,.5);",
      // Its tooltips start at the left edge of the control's 32px button, 6px left of the 20px icon.
      tipGap: 8, tipArrow: false, tipStart: 6, tipFade: false,
      gate: true, // no button on a video that has no page of its own
    },
  ].find((b) => on(b.site));
  if (bars) {
    const makeNative = (anchor) => {
      let host;
      let b;
      let ip;
      let resting = ICON;
      let done = CHECK;
      if (bars.clone) {
        host = anchor.cloneNode(true);
        host.setAttribute("data-katevazo-bar", "");
        for (const el of [host, ...host.querySelectorAll("*")]) el.removeAttribute("id");
        b = host.querySelector('[role="button"]') ?? host;
        b.setAttribute("aria-label", LABEL);
        b.removeAttribute("aria-haspopup");
        b.removeAttribute("aria-expanded");
        const glyph = host.querySelector("svg");
        glyph.replaceChildren();
        ip = document.createElementNS(SVG, "path");
        resting = SOLID_ICON;
        done = SOLID_CHECK;
        ip.setAttribute("d", resting);
        glyph.append(ip);
        glyph.setAttribute("viewBox", "0 0 20 20");
        // Keep every class and style of the copy the same as the original's, as the page changes them
        // (it shows and hides its controls that way), so the two always look and move alike.
        let offset = "";
        const sync = (from, to) => {
          for (const name of ["class", "style"]) {
            let value = from.getAttribute(name);
            if (to === host && name === "style" && offset) value = `${value ?? ""};${offset}`;
            if (value === null) to.removeAttribute(name);
            else if (to.getAttribute(name) !== value) to.setAttribute(name, value);
          }
          if (from.localName === "svg") return;
          const n = Math.min(from.children.length, to.children.length);
          for (let i = 0; i < n; i++) sync(from.children[i], to.children[i]);
        };
        sync(anchor, host);
        // Icons in this row are 38px apart, while the controls' boxes differ in width; offset ours so that
        // Settings, ours and Full-screen are evenly spaced.
        const mine = anchor.querySelector('[role="button"]')?.getBoundingClientRect();
        const next = anchor.parentElement?.querySelector('[role="button"][aria-label$="full-screen"]')?.getBoundingClientRect();
        const box = anchor.getBoundingClientRect();
        if (mine && next && box.width > 0 && mine.width > 0 && next.width > 0) {
          const step = next.left + next.width / 2 - (mine.left + mine.width / 2);
          if (step > 0 && step < 120) {
            offset = `margin-left:${step - box.width}px`;
            sync(anchor, host);
          }
        }
        new MutationObserver(() => sync(anchor, host)).observe(anchor, {
          attributes: true,
          attributeFilter: ["class", "style"],
          subtree: true,
        });
      } else {
        host = document.createElement("div");
        host.setAttribute("data-katevazo-bar", "");
        host.style.cssText = bars.host;
      }
      const sr = bars.clone ? null : host.attachShadow({ mode: "open" });
      const st = document.createElement("style");
      st.textContent = `button{all:unset;box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:${bars.box}px;height:${bars.box}px;border-radius:${bars.radius};cursor:pointer;color:#fff;opacity:.9;pointer-events:all}
        button:hover{opacity:1;background:${bars.hover ?? "rgba(255,255,255,.2)"}} button:focus-visible{outline:2px solid #fff}
        svg{width:${bars.icon}px;height:${bars.icon}px}`;
      if (!bars.clone) {
        b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", LABEL);
        const ic = svg.cloneNode(true);
        ip = ic.querySelector("path");
        b.append(ic);
        sr.append(st, b);
      }
      // Drawn in a host of its own on the page, so the control bar's clipping cannot cut it off.
      const tipHost = document.createElement("div");
      const tipRoot = tipHost.attachShadow({ mode: "open" });
      const tipCss = document.createElement("style");
      const look = typeof bars.tipStyle === "function" ? bars.tipStyle() : bars.tipStyle;
      tipCss.textContent = `.tip{position:fixed;z-index:2147483647;transform:translateX(-50%);${look}font:${bars.tip};white-space:nowrap;
          opacity:0;pointer-events:none;${bars.tipFade === false ? "" : "transition:opacity .15s ease"}}
        .tip[data-on="true"]{opacity:1}
        ${bars.tipArrow ? ".tip::after{content:'';position:absolute;left:calc(50% - 4px);bottom:-4px;width:8px;height:8px;background:inherit;transform:rotate(45deg)}" : ""}`;
      const tip = document.createElement("span");
      tip.className = "tip";
      tip.setAttribute("aria-hidden", "true");
      tip.textContent = "Download with Katevazo";
      tipRoot.append(tipCss, tip);
      const showTip = (on) => {
        if (on) {
          const parent = document.fullscreenElement ?? document.documentElement;
          if (tipHost.parentNode !== parent) parent.append(tipHost);
          const r = b.getBoundingClientRect();
          if (bars.tipStart !== undefined) {
            tip.style.transform = "none";
            tip.style.left = `${r.left - bars.tipStart}px`;
          } else {
            tip.style.left = `${r.left + r.width / 2}px`;
          }
          tip.style.bottom = `${innerHeight - r.top + bars.tipGap}px`;
        }
        tip.dataset.on = String(on);
      };
      b.addEventListener("mouseenter", () => showTip(true));
      b.addEventListener("mouseleave", () => showTip(false));
      b.addEventListener("focus", () => b.matches(":focus-visible") && showTip(true));
      b.addEventListener("blur", () => showTip(false));
      b.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const v = nearestVideo(host);
        const url = v ? resolve(v) : null;
        if (!url) {
          tip.textContent = "Couldn't find this video's link";
          showTip(true);
          setTimeout(() => {
            showTip(false);
            tip.textContent = "Download with Katevazo";
          }, 2200);
          return;
        }
        if (!(await globalThis.katevazoSend(url))) return;
        ip.setAttribute("d", done);
        b.setAttribute("aria-label", SENT);
        setTimeout(() => {
          ip.setAttribute("d", resting);
          b.setAttribute("aria-label", LABEL);
        }, 1800);
      });
      for (const type of ["pointerdown", "mousedown", "mouseup", "dblclick", "click"]) {
        host.addEventListener(type, (e) => e.stopPropagation());
      }
      return host;
    };
    let mounted = 0;
    const mount = () => {
      mounted = 0;
      for (const anchor of bars.anchors()) {
        const next = bars.after ? anchor.nextElementSibling : anchor.previousElementSibling;
        const ours = next?.hasAttribute("data-katevazo-bar") ? next : null;
        const video = nearestVideo(anchor);
        // Only where the video has a page of its own; not a live stream.
        if (!video || (bars.gate && !resolve(video))) {
          ours?.remove();
          continue;
        }
        if (!ours) (bars.after ? anchor.after(makeNative(anchor)) : anchor.before(makeNative(anchor)));
      }
    };
    const queueMount = () => {
      if (!mounted) mounted = setTimeout(mount, 150);
    };
    new MutationObserver(queueMount).observe(document.documentElement, { childList: true, subtree: true });
    mount();
  }

  /**
   * TikTok: a button in the row of action buttons beside each video, between Comments and Bookmark.
   * It is a copy of the Comments button, so it looks and sizes like the others in any theme.
   */
  if (on(resolvers[3][0])) {
    /** The child of `parent` that contains `el`. */
    const childOf = (parent, el) => {
      let n = el;
      while (n && n.parentElement !== parent) n = n.parentElement;
      return n;
    };
    const send = async (bar) => {
      // The video's own link: in the feed it is on a link near the player, on a video page it is the address.
      let url = null;
      for (let n = bar, i = 0; n && i < 10 && !url; n = n.parentElement, i++) {
        for (const link of n.querySelectorAll('a[href*="/video/"]')) {
          const href = new URL(link.getAttribute("href"), location.href);
          if (new RegExp("^/@[^/]+/video/[0-9]+").test(href.pathname)) {
            url = clean(href.href);
            break;
          }
        }
      }
      // Newer layouts have no link to the video; the player's wrapper carries its id, and the author's link its owner.
      for (let n = bar, i = 0; n && i < 12 && !url; n = n.parentElement, i++) {
        const id = n.querySelector('[id^="xgwrapper-"]')?.id.match(new RegExp("-([0-9]{8,})$"))?.[1];
        const author = n.querySelector('a[data-e2e="video-author-avatar"], a[href^="/@"]')?.getAttribute("href");
        const handle = author?.match(new RegExp("^/(@[^/?#]+)"))?.[1];
        if (id && handle) url = `${location.origin}/${handle}/video/${id}`;
      }
      if (!url) {
        const v = document.querySelector("video");
        url = v ? resolve(v) : null;
      }
      return url ? globalThis.katevazoSend(url) : false;
    };
    /**
     * Built from scratch with the Comments item's measurements (size, gaps, label font and colour), so it
     * lines up with the other buttons whatever styles the page puts on them.
     */
    const build = (comment) => {
      const cs = getComputedStyle(comment);
      const was = comment.querySelector("svg");
      const btn = comment.querySelector("button") ?? was;
      const count = comment.querySelector("strong");
      const ccs = count ? getComputedStyle(count) : null;
      const box = was?.getBoundingClientRect();
      const row = btn?.getBoundingClientRect();
      const color = was ? getComputedStyle(was.querySelector("path") ?? was).fill : "";

      const item = document.createElement("div");
      item.setAttribute("data-katevazo-tiktok", "");
      item.setAttribute("role", "button");
      item.setAttribute("aria-label", LABEL);
      item.style.cssText = `display:flex;flex-direction:column;align-items:center;cursor:pointer;pointer-events:auto;
        margin:${cs.marginTop} ${cs.marginRight} ${cs.marginBottom} ${cs.marginLeft};`;
      const icon = document.createElement("div");
      const room = (row?.height || 48) + (ccs ? parseFloat(ccs.lineHeight) || parseFloat(ccs.fontSize) * 1.2 || 15 : 15) / 2;
      icon.style.cssText = `display:flex;align-items:center;justify-content:center;width:${row?.width || 48}px;height:${room}px;`;
      const ic = document.createElementNS(SVG, "svg");
      ic.setAttribute("viewBox", "2 2 20 20");
      ic.setAttribute("aria-hidden", "true");
      ic.style.cssText = `width:${box?.width || 24}px;height:${box?.height || 24}px;display:block;`;
      const glyph = document.createElementNS(SVG, "path");
      glyph.setAttribute("d", TT_ICON);
      glyph.setAttribute("fill", color && color !== "none" ? color : "#fff");
      ic.append(glyph);
      icon.append(ic);
      item.append(icon);
      return { item, ic };
    };

    // The page can have its own layers or handlers over this column, so the clicks are caught at the
    // top by where they land rather than by what receives them.
    const actions = new WeakMap();
    const ours = (e) =>
      [...document.querySelectorAll("[data-katevazo-tiktok]")].find((item) => {
        const r = item.getBoundingClientRect();
        return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      });
    for (const type of ["pointerdown", "pointerup", "mousedown", "mouseup", "click", "dblclick"]) {
      addEventListener(
        type,
        (e) => {
          const item = ours(e);
          if (!item) return;
          e.stopImmediatePropagation();
          e.stopPropagation();
          if (type === "click") {
            e.preventDefault();
            actions.get(item)?.();
          }
        },
        true,
      );
    }
    let queued = 0;
    const mountAll = () => {
      queued = 0;
      for (const favorite of document.querySelectorAll('[data-e2e="favorite-icon"]')) {
        // The action buttons are children of one column; the comment one is a direct child.
        let column = null;
        let comment = null;
        for (let n = favorite.parentElement; n && n !== document.body; n = n.parentElement) {
          comment = [...n.children].find((k) => k.querySelector?.('[data-e2e="comment-icon"]') || k.matches?.('[data-e2e="comment-icon"]')) ?? null;
          if (comment) {
            column = n;
            break;
          }
        }
        if (!column || !comment) continue;
        const target = childOf(column, favorite);
        if (!target || target === comment) continue;
        if (target.previousElementSibling?.hasAttribute("data-katevazo-tiktok")) continue;
        const { item, ic } = build(comment);
        actions.set(item, async () => {
          // Nothing was sent when there is no link, or the app is not installed (the page then shows its card).
          if (!(await send(column))) return;
          const p = ic.querySelector("path");
          p.setAttribute("d", TT_CHECK);
          setTimeout(() => p.setAttribute("d", TT_ICON), 1800);
        });
        target.before(item);
      }
    };
    const queue = () => {
      if (!queued) queued = setTimeout(mountAll, 250);
    };
    new MutationObserver(queue).observe(document.documentElement, { childList: true, subtree: true });
    mountAll();
  }

  /**
   * Facebook reels: a button in the column of actions beside the reel, between Comment and Share. It is a
   * copy of the Comment item, so it sizes and looks like the others; the count under it is left blank.
   */
  if (on(resolvers[5][0])) {
    const labelled = (re) => [...document.querySelectorAll('[role="button"][aria-label]')].filter((b) => re.test(b.getAttribute("aria-label")));
    const reelLink = (column) => {
      for (let n = column, i = 0; n && i < 14; n = n.parentElement, i++) {
        for (const a of n.querySelectorAll('a[href*="/reel/"]')) {
          const h = new URL(a.getAttribute("href"), location.href);
          if (/^\/reel\/\d+/.test(h.pathname)) return clean(h.href);
        }
      }
      const v = nearestVideo(column);
      return v ? resolve(v) : null;
    };
    let queued = 0;
    const mountReels = () => {
      queued = 0;
      // Counts and neighbours load in later and reels scroll past: keep every button centred.
      for (const k of document.querySelectorAll("[data-katevazo-reel]")) k.katevazoAlign?.();
      for (const share of labelled(/^Share(,|$)/)) {
        let column = null;
        let comment = null;
        for (let n = share.parentElement; n && n !== document.body; n = n.parentElement) {
          comment = [...n.children].find((k) => !k.contains(share) && [...k.querySelectorAll('[role="button"][aria-label]')].some((b) => /^Comment(,|$)/.test(b.getAttribute("aria-label")))) ?? null;
          if (comment) {
            column = n;
            break;
          }
        }
        if (!column || !comment) continue;
        const target = childOf(column, share);
        if (!target || target === comment) continue;
        if (target.previousElementSibling?.hasAttribute("data-katevazo-reel")) continue;
        const item = comment.cloneNode(true);
        item.setAttribute("data-katevazo-reel", "");
        for (const el of [item, ...item.querySelectorAll("*")]) {
          el.removeAttribute("id");
          el.removeAttribute("href");
          el.removeAttribute("aria-haspopup");
          el.removeAttribute("aria-expanded");
          el.removeAttribute("aria-pressed");
          if (el.hasAttribute("aria-label")) el.setAttribute("aria-label", LABEL);
          if (el.hasAttribute("title")) el.setAttribute("title", LABEL);
        }
        const svg = item.querySelector("svg");
        if (!svg) continue;
        svg.replaceChildren();
        // The other reel icons are thin outlines that fill most of their box: draw ours the same way.
        svg.setAttribute("viewBox", "3 3 18 18");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor");
        svg.setAttribute("stroke-width", "1.6");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");
        const p = document.createElementNS(SVG, "path");
        p.setAttribute("d", ICON);
        svg.append(p);
        // The count under the Comment button: keep its place, drop its text.
        for (const el of item.querySelectorAll("*")) {
          if (!el.closest("svg") && !el.children.length && el.textContent.trim()) el.textContent = "\u00a0";
        }
        item.setAttribute("title", LABEL);
        let sentTimer = 0;
        for (const type of ["pointerdown", "pointerup", "mousedown", "mouseup", "dblclick"]) {
          item.addEventListener(type, (e) => e.stopPropagation());
        }
        item.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const url = reelLink(column);
          if (!url || !(await globalThis.katevazoSend(url))) return;
          p.setAttribute("d", CHECK);
          clearTimeout(sentTimer);
          sentTimer = setTimeout(() => p.setAttribute("d", ICON), 1800);
        });
        target.before(item);
        // Put our icon exactly halfway between the Comment and Share icons.
        const centre = (el) => {
          const r = el.getBoundingClientRect();
          return r.top + r.height / 2;
        };
        const align = () => {
          const above = comment.querySelector("svg");
          const below = target.querySelector("svg");
          if (!above || !below || !item.isConnected) return;
          item.style.transform = "";
          const shift = (centre(above) + centre(below)) / 2 - centre(svg);
          if (Math.abs(shift) < 40) item.style.transform = `translateY(${shift}px)`;
        };
        item.katevazoAlign = align;
        requestAnimationFrame(align);
        setTimeout(align, 300);
        setTimeout(align, 1500);
        addEventListener("resize", align);
      }
    };
    const queueReels = () => {
      if (!queued) queued = setTimeout(mountReels, 250);
    };
    new MutationObserver(queueReels).observe(document.documentElement, { childList: true, subtree: true });
    mountReels();
  }

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
