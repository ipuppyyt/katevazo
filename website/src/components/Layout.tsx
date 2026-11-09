import { useEffect } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Icon } from "./Icon";
import { REPO, asset, useSiteTheme } from "../lib";
import { useHeaderShadow } from "../motion";
import { PAGES, applyMeta } from "../seo";

function GithubMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
    </svg>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useSiteTheme();
  return (
    <button className="icon-button" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
      <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
    </button>
  );
}

/** The persistent shell: only the page inside it changes when you navigate, so nothing reloads or flashes. */
export function Layout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  useHeaderShadow();
  useEffect(() => {
    if (PAGES[path]) applyMeta(PAGES[path]);
  }, [path]);
  return (
    <>
      <header className="site-header">
        <div className="container bar">
          <Link className="brand" to="/">
            <img src={asset("logo.svg")} alt="" width={28} height={28} />
            <span>Katevazo</span>
          </Link>
          <nav aria-label="Main">
            <Link to="/" hash="features">Features</Link>
            <Link to="/download/" activeProps={{ "aria-current": "page" }}>Download</Link>
            <Link to="/extension/" activeProps={{ "aria-current": "page" }}>Extension</Link>
            <Link to="/" hash="faq">FAQ</Link>
            <Link to="/support/" activeProps={{ "aria-current": "page" }}>Support</Link>
          </nav>
          <div className="bar-actions">
            <a className="icon-button" href={REPO} aria-label="Katevazo on GitHub">
              <GithubMark />
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="route">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container foot">
          <div>
            <Link className="brand" to="/">
              <img src={asset("logo.svg")} alt="" width={24} height={24} />
              <span>Katevazo</span>
            </Link>
            <p>Free and open source under the MIT licence. Only download content you have the right to download.</p>
          </div>
          <nav aria-label="Footer">
            <Link to="/download/">Download</Link>
            <Link to="/extension/">Extension</Link>
            <Link to="/support/">Support</Link>
            <Link to="/privacy/">Privacy</Link>
            <a href={`${REPO}/releases`}>Releases</a>
            <a href={`${REPO}/blob/main/CHANGELOG.md`}>Changelog</a>
            <a href={REPO}>GitHub</a>
          </nav>
        </div>
      </footer>
    </>
  );
}
