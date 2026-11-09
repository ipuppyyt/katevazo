import { Reveal } from "../motion";
import { Link } from "@tanstack/react-router";
import { Icon } from "../components/Icon";
import { Faq } from "../components/Faq";
import { ISSUES, REPO, RELEASES } from "../lib";

export function Support() {
  return (
    <div className="page">
      <div className="container narrow">
        <p className="eyebrow">Support</p>
        <h1 className="page-title">How can we help?</h1>
        <p className="section-lead left">Help with the Katevazo app and the Send to Katevazo browser extension.</p>

        <div className="grid two">
          <a className="card link-card" href={ISSUES}>
            <span className="tile"><Icon name="bug" size={20} /></span>
            <h3>Report a problem</h3>
            <p>Open an issue on GitHub. Say which system and app version you use, and what you expected to happen.</p>
          </a>
          <a className="card link-card" href={`${REPO}/security/policy`}>
            <span className="tile"><Icon name="alert" size={20} /></span>
            <h3>Security issues</h3>
            <p>Please read the security policy before reporting a vulnerability.</p>
          </a>
          <a className="card link-card" href={`${REPO}/blob/main/CHANGELOG.md`}>
            <span className="tile"><Icon name="book" size={20} /></span>
            <h3>What's new</h3>
            <p>See the changelog for fixes and features in each release.</p>
          </a>
          <a className="card link-card" href={RELEASES}>
            <span className="tile"><Icon name="book" size={20} /></span>
            <h3>Get the latest version</h3>
            <p>Many problems are fixed by updating. Download the newest installer.</p>
          </a>
        </div>

        <h2>Common questions</h2>
        <Faq
          items={[
            {
              q: 'The extension says "App not found"',
              a: (
                <ol>
                  <li>Install the latest Katevazo app from the <a href={RELEASES}>Releases page</a>.</li>
                  <li>Open the app once. It registers itself with your browsers each time it starts.</li>
                  <li>Reopen the extension's popup.</li>
                </ol>
              ),
            },
            { q: "A download fails or a site stopped working", a: <p>Sites change often. Open Settings in the app and update yt-dlp, then try again. If it still fails, open an issue with the link type and the error shown.</p> },
            { q: "Windows or macOS blocks the installer", a: <p>The installers are not code-signed or notarized yet. See the notes under your system in the <Link to="/" hash="download">Download section</Link> to open it anyway.</p> },
            { q: "macOS says the app is damaged", a: <p>Run <code>xattr -cr /Applications/Katevazo.app</code> once in Terminal, then open the app again.</p> },
            { q: "Where do my files go?", a: <p>Into the save folder set in the app's Settings. You can change it at any time.</p> },
          ]}
        />
      </div>
      <Reveal />
    </div>
  );
}
