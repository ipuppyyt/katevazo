import { Link } from "@tanstack/react-router";
import { REPO, RELEASES } from "./lib";

/** A question with its answer as page content and as plain text (for search engines and AI answers). */
export interface Qa {
  q: string;
  text: string;
  a: React.ReactNode;
}

export const HOME_FAQ: Qa[] = [
  {
    q: "Is Katevazo free?",
    text: "Yes. Katevazo is free and open source under the MIT licence, with no account, ads or tracking.",
    a: <p>Yes. Katevazo is free and open source under the MIT licence, with no account, ads or tracking.</p>,
  },
  {
    q: "What is Katevazo?",
    text: "Katevazo is a desktop video downloader for Windows, macOS and Linux. It wraps yt-dlp and ffmpeg in a clean interface with a download queue, pause and resume, and MP4 or MP3 output.",
    a: <p>Katevazo is a desktop video downloader for Windows, macOS and Linux. It wraps yt-dlp and ffmpeg in a clean interface with a download queue, pause and resume, and MP4 or MP3 output.</p>,
  },
  {
    q: "Which sites does it work with?",
    text: "YouTube is the site tested so far. Katevazo uses yt-dlp, which supports many more sites, and they may work too.",
    a: <p>YouTube is the site tested so far. Katevazo uses yt-dlp, which supports many more sites, and they may work too.</p>,
  },
  {
    q: "Why does my system warn me when I open the installer?",
    text: "The installers are not code-signed or notarized yet. Windows SmartScreen and macOS Gatekeeper may warn on first launch; the Download page explains how to open the app anyway.",
    a: (
      <p>
        The installers are not code-signed or notarized yet. Windows SmartScreen and macOS Gatekeeper may warn on first launch; the{" "}
        <Link to="/download/">Download page</Link> explains how to open the app anyway.
      </p>
    ),
  },
  {
    q: "Does the browser extension need the app?",
    text: "Yes. The Send to Katevazo extension only hands links to the Katevazo app. After installing or updating the app, open it once so it registers with your browsers.",
    a: (
      <p>
        Yes. The <Link to="/extension/">Send to Katevazo extension</Link> only hands links to the Katevazo app. After installing or updating the app, open
        it once so it registers with your browsers.
      </p>
    ),
  },
  {
    q: "How do I keep downloads working when a site changes?",
    text: "Open Settings in the app and update yt-dlp. It takes one click.",
    a: <p>Open Settings in the app and update yt-dlp. It takes one click.</p>,
  },
  {
    q: "Is it legal to use?",
    text: "Only download content you own or have permission to save, and follow each site's terms of service.",
    a: <p>Only download content you own or have permission to save, and follow each site's terms of service.</p>,
  },
  {
    q: "Where do I report a bug?",
    text: "Open an issue on GitHub, or see the support page.",
    a: (
      <p>
        Open an issue on <a href={`${REPO}/issues/new/choose`}>GitHub</a>, or see the <Link to="/support/">support page</Link>.
      </p>
    ),
  },
];

export const SUPPORT_FAQ: Qa[] = [
  {
    q: 'The extension says "App not found"',
    text: "Install the latest Katevazo app from the Releases page, open the app once so it registers itself with your browsers, then reopen the extension's popup.",
    a: (
      <ol>
        <li>Install the latest Katevazo app from the <a href={RELEASES}>Releases page</a>.</li>
        <li>Open the app once. It registers itself with your browsers each time it starts.</li>
        <li>Reopen the extension's popup.</li>
      </ol>
    ),
  },
  {
    q: "A download fails or a site stopped working",
    text: "Sites change often. Open Settings in the app and update yt-dlp, then try again. If it still fails, open an issue with the link type and the error shown.",
    a: <p>Sites change often. Open Settings in the app and update yt-dlp, then try again. If it still fails, open an issue with the link type and the error shown.</p>,
  },
  {
    q: "Windows or macOS blocks the installer",
    text: "The installers are not code-signed or notarized yet. See the Download page for the steps to open Katevazo on your system.",
    a: (
      <p>
        The installers are not code-signed or notarized yet. See the <Link to="/download/">Download page</Link> for the steps to open Katevazo on your system.
      </p>
    ),
  },
  {
    q: "macOS says the app is damaged",
    text: "Run xattr -cr /Applications/Katevazo.app once in Terminal, then open the app again.",
    a: <p>Run <code>xattr -cr /Applications/Katevazo.app</code> once in Terminal, then open the app again.</p>,
  },
  {
    q: "Where do my files go?",
    text: "Into the save folder set in the app's Settings. You can change it at any time.",
    a: <p>Into the save folder set in the app's Settings. You can change it at any time.</p>,
  },
];

export const EXTENSION_FAQ: Qa[] = [
  {
    q: "Which browsers does Send to Katevazo support?",
    text: "It is available for Google Chrome and Microsoft Edge from their stores, and works in other Chromium browsers such as Brave and Vivaldi. A Firefox version is coming soon.",
    a: <p>It is available for Google Chrome and Microsoft Edge from their stores, and works in other Chromium browsers such as Brave and Vivaldi. A Firefox version is coming soon.</p>,
  },
  {
    q: "Does the extension download videos by itself?",
    text: "No. It only sends the address of the page or link to the Katevazo app on your computer. Nothing downloads until you press Download in the app.",
    a: <p>No. It only sends the address of the page or link to the Katevazo app on your computer. Nothing downloads until you press Download in the app.</p>,
  },
  {
    q: "Why does it ask for the nativeMessaging permission?",
    text: "It uses nativeMessaging only to ask the Katevazo app on your own computer whether it is installed. The app answers with its version number; nothing else is exchanged and nothing leaves your computer.",
    a: <p>It uses <code>nativeMessaging</code> only to ask the Katevazo app on your own computer whether it is installed. The app answers with its version number; nothing else is exchanged and nothing leaves your computer.</p>,
  },
  {
    q: "Does it work on private Instagram accounts?",
    text: "No. The Instagram download button appears only on reels and video posts from public accounts.",
    a: <p>No. The Instagram download button appears only on reels and video posts from public accounts.</p>,
  },
  {
    q: 'It says "App not found". What do I do?',
    text: "Install or update the Katevazo app, then open it once so it registers with your browsers. Reopen the extension's popup afterwards.",
    a: <p>Install or update the Katevazo app, then open it once so it registers with your browsers. Reopen the extension's popup afterwards.</p>,
  },
];
