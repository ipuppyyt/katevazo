import { EXTENSION_FAQ, HOME_FAQ, SUPPORT_FAQ, type Qa } from "./content";
import { CHROME_STORE, EDGE_STORE, REPO, RELEASES } from "./lib";

export const ORIGIN = "https://ipuppyyt.github.io";
export const BASE = "/katevazo";
export const SITE = `${ORIGIN}${BASE}`;
export const OG_IMAGE = `${SITE}/og.jpg`;
export const NAME = "Katevazo";

export interface PageMeta {
  /** Router path, with the trailing slash. */
  path: string;
  title: string;
  description: string;
  /** Structured data for search engines and AI answers. */
  ld: object[];
  /** Pages that should not appear in search results. */
  noindex?: boolean;
}

const url = (path: string) => `${SITE}${path === "/" ? "/" : path}`;

const organization = {
  "@type": "Organization",
  "@id": `${SITE}/#organization`,
  name: NAME,
  url: `${SITE}/`,
  logo: `${SITE}/icon-512.png`,
  sameAs: [REPO],
};

const application = {
  "@type": "SoftwareApplication",
  "@id": `${SITE}/#app`,
  name: NAME,
  alternateName: "Katevazo video downloader",
  description:
    "Katevazo is a free, open-source desktop video downloader for Windows, macOS and Linux, built on yt-dlp and ffmpeg, with a download queue, pause and resume, and MP4 or MP3 output.",
  url: `${SITE}/`,
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Windows, macOS, Linux",
  softwareHelp: `${SITE}/support/`,
  downloadUrl: RELEASES,
  installUrl: `${SITE}/download/`,
  license: "https://opensource.org/licenses/MIT",
  isAccessibleForFree: true,
  image: OG_IMAGE,
  screenshot: [`${SITE}/previews/macos-light.webp`, `${SITE}/previews/windows-dark.webp`, `${SITE}/previews/linux-light.webp`],
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  author: { "@id": `${SITE}/#organization` },
  publisher: { "@id": `${SITE}/#organization` },
  codeRepository: REPO,
};

const extension = {
  "@type": "SoftwareApplication",
  "@id": `${SITE}/extension/#extension`,
  name: "Send to Katevazo",
  description:
    "A free browser extension that sends the page you are viewing, or any link, to the Katevazo app, with download buttons on YouTube and Instagram.",
  url: `${SITE}/extension/`,
  applicationCategory: "BrowserApplication",
  operatingSystem: "Chrome, Edge, Chromium browsers",
  installUrl: CHROME_STORE,
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  isRelatedTo: { "@id": `${SITE}/#app` },
  author: { "@id": `${SITE}/#organization` },
  sameAs: [CHROME_STORE, EDGE_STORE],
};

const website = {
  "@type": "WebSite",
  "@id": `${SITE}/#website`,
  name: NAME,
  url: `${SITE}/`,
  inLanguage: "en",
  publisher: { "@id": `${SITE}/#organization` },
};

function breadcrumbs(...items: [string, string][]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [["Home", "/"], ...items].map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: url(path),
    })),
  };
}

function faq(items: Qa[]) {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.text },
    })),
  };
}

export const PAGES: Record<string, PageMeta> = {
  "/": {
    path: "/",
    title: "Katevazo: free video downloader for Windows, macOS and Linux",
    description:
      "Katevazo is a free, open-source video downloader built on yt-dlp and ffmpeg. Queue, pause and resume downloads as MP4 or MP3, with a Chrome and Edge extension.",
    ld: [organization, website, application, faq(HOME_FAQ)],
  },
  "/download/": {
    path: "/download/",
    title: "Download Katevazo for Windows, macOS and Linux",
    description:
      "Get the latest Katevazo installer for Windows (.exe, .msi), macOS (.dmg) or Linux (AppImage, .deb, .rpm). Free and open source, with install steps for every system.",
    ld: [organization, application, breadcrumbs(["Download", "/download/"])],
  },
  "/extension/": {
    path: "/extension/",
    title: "Send to Katevazo: browser extension for Chrome and Edge",
    description:
      "Send any page or link to the Katevazo video downloader in one click, with download buttons on YouTube and Instagram. Free, private and open source.",
    ld: [organization, extension, breadcrumbs(["Browser extension", "/extension/"]), faq(EXTENSION_FAQ)],
  },
  "/support/": {
    path: "/support/",
    title: "Katevazo support and troubleshooting",
    description:
      "Fix common Katevazo problems, from the extension saying App not found to failed downloads and installer warnings, or report a bug on GitHub.",
    ld: [organization, breadcrumbs(["Support", "/support/"]), faq(SUPPORT_FAQ)],
  },
  "/privacy/": {
    path: "/privacy/",
    title: "Privacy policy for the Send to Katevazo extension",
    description:
      "The Send to Katevazo browser extension collects no personal data, makes no network requests of its own and sends links only to the app on your computer.",
    ld: [organization, breadcrumbs(["Privacy policy", "/privacy/"])],
  },
};

export const ROUTES = Object.keys(PAGES);

/** The head tags for one page, as HTML. */
export function headHtml(meta: PageMeta): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const canonical = url(meta.path);
  const graph = JSON.stringify({ "@context": "https://schema.org", "@graph": meta.ld }).replace(/</g, "\\u003c");
  return [
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    meta.noindex
      ? `<meta name="robots" content="noindex" />`
      : `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${NAME}" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="Katevazo's download queue with a video ready to fetch" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(meta.title)}" />`,
    `<meta name="twitter:description" content="${esc(meta.description)}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE}" />`,
    `<script type="application/ld+json">${graph}</script>`,
  ].join("\n    ");
}

/** Keeps the title, description and canonical link right as the visitor moves between pages. */
export function applyMeta(meta: PageMeta) {
  document.title = meta.title;
  const set = (selector: string, attr: string, value: string) =>
    document.head.querySelector(selector)?.setAttribute(attr, value);
  set('meta[name="description"]', "content", meta.description);
  set('link[rel="canonical"]', "href", url(meta.path));
  set('meta[property="og:title"]', "content", meta.title);
  set('meta[property="og:description"]', "content", meta.description);
  set('meta[property="og:url"]', "content", url(meta.path));
  set('meta[name="twitter:title"]', "content", meta.title);
  set('meta[name="twitter:description"]', "content", meta.description);
}
