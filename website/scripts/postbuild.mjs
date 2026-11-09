// Turns the client build into a static site GitHub Pages can serve well:
//  - every page is prerendered to real HTML, with its own title, description, social tags and
//    structured data, so search engines and AI crawlers that do not run JavaScript still read it;
//  - each page is a real file (/support/ answers 200 directly), plus a 404 page;
//  - sitemap.xml lists the pages.
import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const { render, PAGES, ROUTES, headHtml, BASE, SITE } = await import(
  pathToFileURL(resolve("dist-ssr/entry-server.js")).href
);

let template = readFileSync("dist/index.html", "utf8");

// Load the main font early so text does not jump when it arrives.
const font = readdirSync("dist/assets").find((f) => /^manrope-latin-wght-normal.*\.woff2$/.test(f));
if (font) {
  template = template.replace(
    "</head>",
    `  <link rel="preload" href="${BASE}/assets/${font}" as="font" type="font/woff2" crossorigin />\n  </head>`,
  );
}

async function page(path, meta, renderPath = path) {
  // React adds image preload links in front of the markup; the browser-side render has none, so drop them.
  const body = (await render(`${BASE}${renderPath}`)).replace(/<link rel="preload" as="image"[^>]*>/g, "");
  const html = template
    .replace(/<!--seo:start-->[\s\S]*<!--seo:end-->/, headHtml(meta))
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  const dir = path === "/" ? "dist" : `dist${path}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/index.html`, html);
}

for (const path of ROUTES) await page(path, PAGES[path]);

// Unknown addresses get a shell with the app's own "not found" screen, kept out of search results.
const notFound = {
  path: "/404/",
  title: "Page not found | Katevazo",
  description: "That page does not exist. Go back to the Katevazo home page.",
  ld: [],
  noindex: true,
};
writeFileSync(
  "dist/404.html",
  template
    .replace(/<!--seo:start-->[\s\S]*<!--seo:end-->/, headHtml(notFound))
    .replace('<div id="root"></div>', `<div id="root">${(await render(`${BASE}/404/`)).replace(/<link rel="preload" as="image"[^>]*>/g, "")}</div>`),
);

let lastmod = new Date().toISOString().slice(0, 10);
try {
  lastmod = execSync("git log -1 --format=%cs -- .", { encoding: "utf8" }).trim() || lastmod;
} catch {
  // Not a git checkout; the build date will do.
}
const urls = ROUTES.map((p) => `  <url><loc>${SITE}${p}</loc><lastmod>${lastmod}</lastmod></url>`).join("\n");
writeFileSync(
  "dist/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
);
console.log(`prerendered ${ROUTES.length} pages, 404 and sitemap`);
