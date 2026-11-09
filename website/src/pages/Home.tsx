import { Icon } from "../components/Icon";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Reveal } from "../motion";
import { HOME_FAQ } from "../content";
import { Downloads } from "../components/Download";
import { Faq } from "../components/Faq";
import {
  CHROME_STORE,
  EDGE_STORE,
  OS_NAME,
  REPO,
  RELEASES,
  asset,
  useOs,
  findAsset,
  INSTALLERS,
  useRelease,
  useSiteTheme,
  readPref,
  savePref,
  type Theme,
} from "../lib";

const FEATURES = [
  { icon: <Icon name="video" size={20} />, title: "Video or audio", text: "Pick the quality you want, as MP4 video or MP3 audio, after previewing the title and thumbnail." },
  { icon: <Icon name="checklist" size={20} />, title: "A proper queue", text: "Several downloads at once with live progress, speed and time remaining, in one steady progress bar." },
  { icon: <Icon name="pause" size={20} />, title: "Pause and resume", text: "Stop any download and continue later. Partial files are continued, not restarted." },
  { icon: <Icon name="refresh" size={20} />, title: "Always up to date", text: "Update yt-dlp in one click from inside the app, so downloads keep working when sites change." },
  { icon: <Icon name="bolt" size={20} />, title: "Quick to add", text: "Drag and drop links, press Ctrl/Cmd+K for the command palette, or Ctrl/Cmd+Shift+D from the tray." },
  { icon: <Icon name="puzzle" size={20} />, title: "Browser extension", text: "Send the page you are on to the app, with download buttons on YouTube and Instagram." },
  { icon: <Icon name="palette" size={20} />, title: "Looks at home", text: "A native-feeling interface that follows each system's window style, in light, dark or system appearance." },
  { icon: <Icon name="translate" size={20} />, title: "Eight languages", text: "English, Spanish, French, German, Portuguese, Italian, Japanese and Simplified Chinese." },
  { icon: <Icon name="shield" size={20} />, title: "Private by design", text: "No account, no analytics and no ads. Everything runs on your computer." },
];

const STEPS = [
  { icon: <Icon name="link" size={22} />, title: "Paste a link", text: "Drop in a video address, or send it from your browser. Katevazo fetches the title, thumbnail and the qualities on offer." },
  { icon: <Icon name="video" size={22} />, title: "Choose a format", text: "Select video or audio and the quality you want. Nothing downloads until you press Download." },
  { icon: <Icon name="download" size={22} />, title: "Download", text: "Watch it in the queue, pause or retry whenever you like, and find the finished file in your folder." },
];

const SHOTS = [
  { id: "windows", label: "Windows" },
  { id: "macos", label: "macOS" },
  { id: "linux", label: "Linux" },
] as const;

function Hero() {
  const release = useRelease();
  const os = useOs();
  const installer = os ? INSTALLERS.find((i) => i.os === os) : undefined;
  const file = installer ? findAsset(release, installer) : null;
  return (
    <section className="hero">
      <div className="container">
        <span className="pill">{release ? `Version ${release.version} is out` : "Free and open source"}</span>
        <h1>
          Download videos, <span className="gradient">beautifully.</span>
        </h1>
        <p className="lead">
          Katevazo is a clean, fast video downloader for Windows, macOS and Linux. Paste a link, pick a quality, and let the
          queue do the rest.
        </p>
        <div className="cta">
          <a className="button primary" href={file?.url ?? "#download"}>
            <Icon name="download" size={18} />
            {os ? `Download for ${OS_NAME[os]}` : "Download"}
          </a>
          <a className="button" href={REPO}>
            View on GitHub
          </a>
        </div>
        <p className="muted small">Windows, macOS (Apple Silicon) and Linux. Free, with no account.</p>
        <div className="hero-shot">
          <img className="window only-light" src={asset("previews/macos-light.webp")} alt="Katevazo's download queue, with a video ready to fetch and several downloads in progress" width={1760} height={1117} />
          <img className="window only-dark" src={asset("previews/macos-dark.webp")} alt="" aria-hidden="true" width={1760} height={1117} />
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="section">
      <div className="container">
        <p className="eyebrow">Features</p>
        <h2>Everything you need, nothing you do not</h2>
        <p className="section-lead">Built on yt-dlp and ffmpeg, wrapped in an interface that stays out of your way.</p>
        <div className="grid">
          {FEATURES.map((f) => (
            <article className="card feature" key={f.title}>
              <span className="tile">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="section alt">
      <div className="container">
        <p className="eyebrow">How it works</p>
        <h2>From link to file in three steps</h2>
        <div className="steps">
          {STEPS.map((s, i) => (
            <div className="step" key={s.title}>
              <span className="tile big">{s.icon}</span>
              <h3>
                <span className="muted">{i + 1}.</span> {s.title}
              </h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Screens() {
  const [shot, setShot] = useState<(typeof SHOTS)[number]["id"]>("macos");
  const [site] = useSiteTheme();
  // Starts from the site theme (which follows the system); a choice made here is remembered.
  const [pref, setPref] = useState<Theme | null>(null);
  useEffect(() => setPref(readPref("screens-theme")), []);
  const theme = pref ?? site;
  const pick = (t: Theme) => {
    setPref(t);
    savePref("screens-theme", t);
  };
  const name = SHOTS.find((s) => s.id === shot)!.label;
  return (
    <section className="section">
      <div className="container">
        <p className="eyebrow">Screenshots</p>
        <h2>Native on every system</h2>
        <p className="section-lead">The window follows each platform's conventions, in light and dark.</p>
        <div className="pickers">
          <div className="segmented" role="tablist" aria-label="Platform">
            {SHOTS.map((s) => (
              <button key={s.id} role="tab" aria-selected={shot === s.id} className={shot === s.id ? "on" : ""} onClick={() => setShot(s.id)} type="button">
                {s.label}
              </button>
            ))}
          </div>
          <div className="segmented" role="tablist" aria-label="Appearance">
            {(["light", "dark"] as const).map((t) => (
              <button key={t} role="tab" aria-selected={theme === t} className={theme === t ? "on" : ""} onClick={() => pick(t)} type="button">
                {t === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
        </div>
        <img key={`${shot}-${theme}`} className="window big-shot swap" src={asset(`previews/${shot}-${theme}.webp`)} alt={`Katevazo on ${name}, ${theme} appearance`} width={1760} height={1117} loading="lazy" />
      </div>
    </section>
  );
}

function Extension() {
  return (
    <section id="extension" className="section alt">
      <div className="container split">
        <div>
          <p className="eyebrow">Browser extension</p>
          <h2>Send to Katevazo</h2>
          <p className="section-lead left">
            Send the page you are viewing, or any link you right-click, straight to the app. It also adds a download button
            to YouTube's player and Shorts, and to Instagram reels and video posts from public accounts.
          </p>
          <ul className="ticks">
            <li>Opens Katevazo with the link ready; nothing downloads until you press Download.</li>
            <li>A toolbar popup tells you whether the app is installed and ready.</li>
            <li>Makes no network requests of its own and collects no data.</li>
          </ul>
          <div className="cta left">
            <a className="button primary" href={CHROME_STORE}>
              <Icon name="globe" size={18} /> Add to Chrome
            </a>
            <a className="button" href={EDGE_STORE}>
              <Icon name="globe" size={18} /> Add to Edge
            </a>
          </div>
          <p className="muted small">Firefox is coming soon. It needs the Katevazo app installed, and works with Brave, Vivaldi and other Chromium browsers too.</p>
        </div>
        <div className="card ext-card" aria-hidden="true">
          <div className="ext-head">
            <img src={asset("logo.svg")} alt="" width={30} height={30} />
            <div>
              <strong>Katevazo</strong>
              <span className="status"><i /> Ready</span>
            </div>
          </div>
          <div className="ext-page">
            <small>CURRENT PAGE</small>
            <strong>Designing Delightful Interfaces</strong>
            <span>www.youtube.com</span>
          </div>
          <div className="button primary full">Send to Katevazo</div>
        </div>
      </div>
    </section>
  );
}

function Questions() {
  return (
    <section id="faq" className="section">
      <div className="container narrow">
        <p className="eyebrow">FAQ</p>
        <h2>Questions, answered</h2>
        <Faq items={HOME_FAQ} />
      </div>
    </section>
  );
}

export function Home() {
  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <Screens />
      <Extension />
      <Downloads />
      <Questions />
      <Reveal />
      <section className="section closing">
        <div className="container center">
          <h2>Ready to try it?</h2>
          <div className="cta">
            <Link className="button primary" to="/" hash="download">
              <Icon name="download" size={18} /> Download Katevazo
            </Link>
            <a className="button" href={RELEASES}>Latest release</a>
          </div>
        </div>
      </section>
    </>
  );
}
