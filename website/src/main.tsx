import "@fontsource-variable/manrope";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Support } from "./pages/Support";
import { Privacy } from "./pages/Privacy";

const pages = { home: Home, support: Support, privacy: Privacy } as const;
const key = (document.body.dataset.page ?? "home") as keyof typeof pages;
const Page = pages[key] ?? Home;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Layout page={key}>
      <Page />
    </Layout>
  </StrictMode>,
);
