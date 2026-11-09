import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "./Icon";
import { REPO, asset } from "../lib";

function GithubMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
    </svg>
  );
}

type Theme = "light" | "dark";

function currentTheme(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") {
        document.documentElement.dataset.theme = saved;
        setTheme(saved);
      }
    } catch {
      // Storage can be blocked; the system theme still applies.
    }
  }, []);

  const flip = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Not remembered, but the page still switches.
    }
  };

  return (
    <button className="icon-button" type="button" onClick={flip} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
      {theme === "dark" ? <Icon name="sun" size={18} /> : <Icon name="moon" size={18} />}
    </button>
  );
}

export function Layout({ page, children }: { page: string; children: ReactNode }) {
  const home = page === "home";
  const link = (hash: string, label: string) => <a href={home ? hash : `${asset("")}${hash}`}>{label}</a>;
  return (
    <>
      <header className="site-header">
        <div className="container bar">
          <a className="brand" href={asset("")}>
            <img src={asset("logo.svg")} alt="" width={28} height={28} />
            <span>Katevazo</span>
          </a>
          <nav aria-label="Main">
            {link("#features", "Features")}
            {link("#extension", "Extension")}
            {link("#download", "Download")}
            {link("#faq", "FAQ")}
            <a href={asset("support.html")} aria-current={page === "support" ? "page" : undefined}>Support</a>
          </nav>
          <div className="bar-actions">
            <a className="icon-button" href={REPO} aria-label="Katevazo on GitHub">
              <GithubMark />
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div className="container foot">
          <div>
            <a className="brand" href={asset("")}>
              <img src={asset("logo.svg")} alt="" width={24} height={24} />
              <span>Katevazo</span>
            </a>
            <p>Free and open source under the MIT licence. Only download content you have the right to download.</p>
          </div>
          <nav aria-label="Footer">
            <a href={asset("support.html")}>Support</a>
            <a href={asset("privacy.html")}>Privacy</a>
            <a href={`${REPO}/releases`}>Releases</a>
            <a href={`${REPO}/blob/main/CHANGELOG.md`}>Changelog</a>
            <a href={REPO}>GitHub</a>
          </nav>
        </div>
      </footer>
    </>
  );
}
