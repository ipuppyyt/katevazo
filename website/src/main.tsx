import "@fontsource-variable/manrope";
import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import "./styles.css";
import { router } from "./router";

const app = (
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
const root = document.getElementById("root")!;
// Built pages arrive prerendered, so attach to them; the dev server starts empty and renders instead.
if (root.hasChildNodes()) {
  // Render the same tree the server did: no Suspense wrapper, and the route already matched. Without
  // the matches in place the first render is empty, hydration cannot reuse the prerendered page, and
  // React draws a second copy next to it.
  (router as unknown as { ssr: boolean }).ssr = true;
  router.load().then(() => hydrateRoot(root, app));
} else {
  createRoot(root).render(app);
}
