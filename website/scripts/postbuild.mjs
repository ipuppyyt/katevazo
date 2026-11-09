// GitHub Pages is static hosting, so /support/ and /privacy/ need real files to answer with a
// normal 200 when opened directly. Each is a copy of the app shell; the router shows the right page.
import { copyFileSync, mkdirSync } from "node:fs";

for (const dir of ["support", "privacy"]) {
  mkdirSync(`dist/${dir}`, { recursive: true });
  copyFileSync("dist/index.html", `dist/${dir}/index.html`);
}
// Unknown addresses get the shell too, which then shows the app's own "not found" page.
copyFileSync("dist/index.html", "dist/404.html");
