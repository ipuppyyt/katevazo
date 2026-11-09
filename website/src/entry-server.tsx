import { renderToString } from "react-dom/server";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { createAppRouter } from "./router";

/** Renders one page of the site to an HTML string, for the build to write into a static file. */
export async function render(path: string): Promise<string> {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }));
  await router.load();
  return renderToString(<RouterProvider router={router} />);
}

export { PAGES, ROUTES, headHtml, BASE, SITE } from "./seo";
