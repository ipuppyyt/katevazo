import { Reveal } from "../motion";
import { Icon } from "../components/Icon";
import { Faq } from "../components/Faq";
import { SUPPORT_FAQ } from "../content";
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
        <Faq items={SUPPORT_FAQ} />
      </div>
      <Reveal />
    </div>
  );
}
