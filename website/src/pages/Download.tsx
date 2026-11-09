import { Link } from "@tanstack/react-router";
import { Downloads } from "../components/Download";
import { Reveal } from "../motion";
import { REPO } from "../lib";

const STEPS = [
  {
    title: "Windows",
    items: [
      <>Download the <strong>.exe installer</strong> (or the .msi package for managed installs) for Windows 10 or 11, 64-bit.</>,
      <>Run it. If SmartScreen says "Windows protected your PC", choose <strong>More info</strong>, then <strong>Run anyway</strong>. The installers are not code-signed yet.</>,
      <>Open Katevazo from the Start menu, paste a link and press <strong>Fetch</strong>.</>,
    ],
  },
  {
    title: "macOS",
    items: [
      <>Download the <strong>.dmg</strong> for Apple Silicon (M1 and newer) and drag Katevazo to Applications.</>,
      <>If macOS will not open it, go to <strong>System Settings, Privacy &amp; Security</strong> and choose <strong>Open Anyway</strong>. The app is not notarized yet.</>,
      <>If macOS says the app is damaged, run <code>xattr -cr /Applications/Katevazo.app</code> once in Terminal, then open it again.</>,
    ],
  },
  {
    title: "Linux",
    items: [
      <>Download the <strong>AppImage</strong> for any distribution, or the <strong>.deb</strong> (Debian, Ubuntu, Mint) or <strong>.rpm</strong> (Fedora, openSUSE) package.</>,
      <>For the AppImage, run <code>chmod +x Katevazo_*.AppImage</code>, then start it. For a package, install it with your package manager.</>,
      <>Paste a link, press <strong>Fetch</strong>, choose a quality and download.</>,
    ],
  },
];

export function Download() {
  return (
    <div>
      <div className="page" style={{ paddingBottom: 0 }}>
        <div className="container narrow">
          <p className="eyebrow">Download</p>
          <h1 className="page-title">Download Katevazo</h1>
          <p className="section-lead left">
            Katevazo is a free, open-source video downloader for Windows, macOS and Linux. Pick your system below. The app bundles
            yt-dlp, ffmpeg and everything else it needs, so there is nothing else to install.
          </p>
        </div>
      </div>

      <Downloads intro={false} />

      <section className="section">
        <div className="container">
          <p className="eyebrow">Install</p>
          <h2>How to install Katevazo</h2>
          <p className="section-lead">Three short steps on every system.</p>
          <div className="grid">
            {STEPS.map((s) => (
              <article className="card" key={s.title}>
                <h3>{s.title}</h3>
                <ol className="plain-steps">
                  {s.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container narrow">
          <p className="eyebrow">Good to know</p>
          <h2>Before you download</h2>
          <ul className="ticks">
            <li>Katevazo is in early development (pre-1.0), so expect some rough edges. Please report problems on <a href={`${REPO}/issues/new/choose`}>GitHub</a>.</li>
            <li>Only YouTube has been tested so far. yt-dlp supports many more sites, and they may work too.</li>
            <li>Use the <Link to="/extension/">browser extension</Link> to send links straight from Chrome or Edge.</li>
            <li>Prefer to build it yourself? The <a href={`${REPO}#build-from-source`}>README</a> has the steps.</li>
          </ul>
          <p className="muted">Only download content you own or have permission to save, and follow each site's terms of service.</p>
        </div>
      </section>
      <Reveal />
    </div>
  );
}
