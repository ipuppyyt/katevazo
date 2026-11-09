import { Apple, Download as DownloadIcon, Monitor, Terminal } from "lucide-react";
import type { ReactNode } from "react";
import { INSTALLERS, OS_NAME, RELEASES, findAsset, formatSize, useRelease, type Os } from "../lib";

const ICONS: Record<Os, ReactNode> = {
  windows: <Monitor size={22} />,
  macos: <Apple size={22} />,
  linux: <Terminal size={22} />,
};

const NOTES: Record<Os, ReactNode> = {
  windows: (
    <>
      The installer is not code-signed yet, so SmartScreen may say "Windows protected your PC". Choose{" "}
      <strong>More info</strong>, then <strong>Run anyway</strong>.
    </>
  ),
  macos: (
    <>
      The app is not notarized yet. If it will not open, go to <strong>System Settings, Privacy &amp; Security</strong>{" "}
      and choose <strong>Open Anyway</strong>. If macOS says it is damaged, run <code>xattr -cr /Applications/Katevazo.app</code>{" "}
      once in Terminal.
    </>
  ),
  linux: <>Make the AppImage executable (<code>chmod +x</code>) and run it, or install the package with your package manager.</>,
};

export function Downloads() {
  const release = useRelease();
  return (
    <section id="download" className="section alt">
      <div className="container">
        <p className="eyebrow">Download</p>
        <h2>Get Katevazo for your computer</h2>
        <p className="section-lead">
          {release ? `Version ${release.version}. ` : ""}Free, with no account and no ads. Katevazo is in early development, so
          expect some rough edges.
        </p>
        <div className="os-grid">
          {(Object.keys(OS_NAME) as Os[]).map((os) => (
            <div className="card os-card" key={os}>
              <div className="os-title">
                <span className="tile">{ICONS[os]}</span>
                <h3>{OS_NAME[os]}</h3>
              </div>
              <ul className="installers">
                {INSTALLERS.filter((i) => i.os === os).map((installer) => {
                  const file = findAsset(release, installer);
                  return (
                    <li key={installer.label}>
                      <a className="installer" href={file?.url ?? RELEASES}>
                        <DownloadIcon size={16} />
                        <span>
                          <strong>{installer.label}</strong>
                          <small>
                            {installer.detail}
                            {file ? ` · ${formatSize(file.size)}` : ""}
                          </small>
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
              <p className="note">{NOTES[os]}</p>
            </div>
          ))}
        </div>
        <p className="center muted">
          Looking for older versions or the source? See{" "}
          <a href="https://github.com/ipuppyyt/katevazo/releases">all releases</a>.
        </p>
      </div>
    </section>
  );
}
