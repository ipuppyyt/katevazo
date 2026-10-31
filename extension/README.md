# Send to Katevazo

A small browser extension that sends the current page, or a link you right-click, to the
Katevazo app. Katevazo opens with the link ready to fetch; nothing downloads until you
press Download.

On YouTube it also adds a download button to the player's control bar, next to Settings.
Clicking it sends the video you are watching (without any playlist) to the app.

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
