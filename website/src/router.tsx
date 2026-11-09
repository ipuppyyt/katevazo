import { createRootRoute, createRoute, createRouter, Link } from "@tanstack/react-router";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Privacy } from "./pages/Privacy";
import { Support } from "./pages/Support";

function NotFound() {
  return (
    <div className="page">
      <div className="container narrow">
        <p className="eyebrow">404</p>
        <h1 className="page-title">Page not found</h1>
        <p className="section-lead left">That page does not exist.</p>
        <Link className="button primary" to="/">Back to home</Link>
      </div>
    </div>
  );
}

const root = createRootRoute({ component: Layout, notFoundComponent: NotFound });

const routeTree = root.addChildren([
  createRoute({ getParentRoute: () => root, path: "/", component: Home }),
  createRoute({ getParentRoute: () => root, path: "/support/", component: Support }),
  createRoute({ getParentRoute: () => root, path: "/privacy/", component: Privacy }),
]);

// The site lives under /katevazo/ on GitHub Pages. Pages are real files (see scripts/postbuild.mjs),
// so a link opened directly loads with a normal 200 and then the router takes over.
export const router = createRouter({
  routeTree,
  basepath: "/katevazo",
  trailingSlash: "always",
  scrollRestoration: true,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
