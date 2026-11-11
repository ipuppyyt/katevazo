# Send to Katevazo

A small browser extension that sends the current page, or a link you right-click, to the
Katevazo app. Katevazo opens with the link ready to fetch; nothing downloads until you
press Download.

On YouTube it also adds a download button to the player's control bar, next to Settings.
Clicking it sends the video you are watching (without any playlist) to the app. On Shorts it
adds a Download button between Share and Remix.

On Vimeo the button is in the player's own control bar, just before Picture in picture. On Twitch it is in the control bar just before Settings, on videos (VODs) and clips only; live streams get no button. On TikTok it is in the row of buttons beside the video, between Comments and Favorites. On Facebook it is in the control bar just after Settings on videos and watch pages, and between Comment and Share beside a reel; a video inside an ordinary post gets no button. On X, Reddit and Dailymotion it shows a small Katevazo chip in the top-right corner of a video while your pointer is over it. Clicking it sends that video’s link to the app. It appears only where the video’s link can be worked out (a post, a watch page, a channel that is live), and never on small previews.

On any other site that yt-dlp supports, open the toolbar popup and switch on **Show the Katevazo button on this site**. The browser asks you to allow access to that one site (an optional permission, so it is not requested at install), and the chip then appears above videos there, including after a restart. Switch it off in the same place. The page's address is what gets sent, which yt-dlp reads for most sites.

On Instagram it adds a download icon after Share on reels and video posts. It appears only for public accounts: where Instagram's page data marks the
account as private, nothing is added. That check is best effort, since the data is most reliable right after a page loads.

The toolbar button opens a small popup that first checks the Katevazo app is installed, then shows the page you are on with a Send button. The check uses native messaging: the app registers itself with your browsers each time it starts, so open it once after installing or updating. If the app is not found, the popup, the YouTube and Instagram buttons and the right-click menu point you to the download.

It needs Katevazo to be installed, since that registers the `katevazo://` address.

## Install it (Chrome, Edge, Brave)

1. Open `chrome://extensions` and switch on **Developer mode**.
2. Choose **Load unpacked** and pick this `extension` folder.
3. Click the extension's icon on a video page, or right-click a link and choose
   **Send link to Katevazo**.

## Publish it

Run `npm run pack:extension`. It writes `dist/katevazo-extension-<version>-chromium.zip` (Chrome and
Edge) and `-firefox.zip`, which differ only in their manifest: Chromium wants a
`service_worker` background and Firefox wants `scripts`.

## Install it (Firefox)

Open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on** and pick
`manifest.json` from this folder. Temporary add-ons are removed when Firefox closes.

## Without the extension

Any program can open `katevazo://download?url=<address>`, with the video address
percent-encoded, to send a link to the app.
