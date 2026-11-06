// A small card shown on a page when the app did not open after you pressed a download button
// there. A web page cannot tell whether the app is installed, so this goes by what happens
// next: when Katevazo opens, this window loses focus. If it kept focus, say so.
(() => {
  const SHEET = `
    :host { all: initial; }
    .card {
      position: fixed; right: 20px; bottom: 20px; z-index: 2147483647; width: 280px; padding: 14px 16px;
      border-radius: 12px; background: #2a2a2c; color: rgba(255,255,255,.92);
      box-shadow: 0 8px 28px rgba(0,0,0,.45), 0 0 0 .5px rgba(255,255,255,.12);
      font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif;
    }
    p { margin: 0; }
    .title { font-weight: 600; font-size: 14px; }
    .text { margin-top: 4px; color: rgba(255,255,255,.6); }
    .row { display: flex; gap: 8px; margin-top: 12px; }
    a, button {
      flex: 1; display: flex; align-items: center; justify-content: center; min-height: 30px; border: 0;
      border-radius: 6px; font: inherit; font-weight: 500; text-decoration: none; cursor: pointer;
    }
    a { background: #0a84ff; color: #fff; }
    button { background: rgba(255,255,255,.12); color: inherit; }
    :focus-visible { outline: 2px solid #0a84ff; outline-offset: 2px; }
  `;

  let host = null;

  function close() {
    host?.remove();
    host = null;
  }

  function show() {
    if (host) return;
    host = document.createElement("div");
    const root = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = SHEET;
    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("role", "status");

    const title = Object.assign(document.createElement("p"), { className: "title", textContent: "Katevazo didn't open" });
    const text = Object.assign(document.createElement("p"), {
      className: "text",
      textContent: "If the app isn't installed yet, get it, then press the button again.",
    });
    const row = document.createElement("div");
    row.className = "row";
    const get = Object.assign(document.createElement("a"), {
      href: "https://github.com/ipuppyyt/katevazo/releases/latest",
      target: "_blank",
      rel: "noopener",
      textContent: "Get Katevazo",
    });
    const dismiss = Object.assign(document.createElement("button"), { type: "button", textContent: "Dismiss" });
    dismiss.addEventListener("click", close);
    row.append(get, dismiss);
    card.append(title, text, row);
    root.append(style, card);
    document.documentElement.append(host);
    window.setTimeout(close, 15000);
  }

  /** Call right after sending a link; shows the card if this window never loses focus. */
  globalThis.katevazoWatchOpen = () => {
    let left = false;
    const note = () => {
      left = true;
    };
    window.addEventListener("blur", note, { once: true });
    document.addEventListener("visibilitychange", note, { once: true });
    window.setTimeout(() => {
      window.removeEventListener("blur", note);
      document.removeEventListener("visibilitychange", note);
      if (!left) show();
    }, 2500);
  };
})();
