import { Link } from "@tanstack/react-router";
import { Faq } from "../components/Faq";
import { Icon } from "../components/Icon";
import { EXTENSION_FAQ } from "../content";
import { CHROME_STORE, EDGE_STORE, RELEASES } from "../lib";
import { Reveal } from "../motion";

const WHAT = [
  { icon: "link", title: "Send any page or link", text: "Click the toolbar button to send the page you are on, or right-click a link and choose Send link to Katevazo." },
  { icon: "download", title: "YouTube buttons", text: "Adds a download button to the video player's control bar and a Download button beside Share on Shorts." },
  { icon: "video", title: "Instagram buttons", text: "Adds a download icon after Share on reels and video posts from public accounts. Private accounts are skipped." },
  { icon: "video", title: "A chip on other sites", text: "On Vimeo, X, TikTok, Twitch, Facebook, Reddit and Dailymotion, a small Katevazo chip appears just above the video while your pointer is on it, never over the picture or the site’s own controls. Click it to send that video to the app." },
  { icon: "shield", title: "Private by design", text: "No analytics, no tracking, and no network requests of its own. Links go only to the app on your computer." },
] as const;

const PERMISSIONS = [
  ["activeTab", "Reads the title and address of the tab you are on, only when you click the toolbar button."],
  ["contextMenus", "Adds the Send link to Katevazo entry to the right-click menu."],
  ["nativeMessaging", "Asks the Katevazo app on your own computer whether it is installed. The reply is only a version number."],
  ["youtube.com and instagram.com", "Lets the extension place its download buttons on those pages and read the address of the video you are watching."],
];

export function Extension() {
  return (
    <div>
      <div className="page">
        <div className="container narrow">
          <p className="eyebrow">Browser extension</p>
          <h1 className="page-title">Send to Katevazo</h1>
          <p className="section-lead left">
            A small, free browser extension that sends the page you are viewing, or any link, to the Katevazo app. Katevazo opens
            with the link ready, and nothing downloads until you press Download.
          </p>
          <div className="cta left">
            <a className="button primary" href={CHROME_STORE}><Icon name="globe" size={18} /> Add to Chrome</a>
            <a className="button" href={EDGE_STORE}><Icon name="globe" size={18} /> Add to Edge</a>
          </div>
          <p className="muted small">Works in other Chromium browsers such as Brave and Vivaldi too. A Firefox version is coming soon.</p>

          <h2>What it does</h2>
          <div className="grid two">
            {WHAT.map((w) => (
              <article className="card" key={w.title}>
                <span className="tile"><Icon name={w.icon} size={20} /></span>
                <h3 style={{ marginTop: 14 }}>{w.title}</h3>
                <p>{w.text}</p>
              </article>
            ))}
          </div>

          <h2>How to set it up</h2>
          <ol className="plain-steps">
            <li>Install the <Link to="/download/">Katevazo app</Link> for your system (<a href={RELEASES}>latest release</a>).</li>
            <li>Add the extension from the Chrome Web Store or Edge Add-ons, or from the Browser extension section in the app's Settings.</li>
            <li>Open the Katevazo app once. It registers itself with your browsers so the extension can see it.</li>
            <li>Click the extension's toolbar button. It should say Ready, with the app's version number.</li>
          </ol>

          <h2>Permissions, explained</h2>
          <div className="card">
            <dl className="perms">
              {PERMISSIONS.map(([name, text]) => (
                <div key={name}>
                  <dt><code>{name}</code></dt>
                  <dd>{text}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="muted">Read the full <Link to="/privacy/">privacy policy</Link>.</p>

          <h2>Questions</h2>
          <Faq items={EXTENSION_FAQ} />
        </div>
      </div>
      <Reveal />
    </div>
  );
}
