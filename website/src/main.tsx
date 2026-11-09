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
  // Tell the router the page came from the server, so it renders the same tree and hydration lines up.
  (router as unknown as { ssr: boolean }).ssr = true;
  hydrateRoot(root, app);
} else {
  createRoot(root).render(app);
}
