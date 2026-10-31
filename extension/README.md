# Send to Katevazo

A small browser extension that sends the current page, or a link you right-click, to the
Katevazo app. Katevazo opens with the link ready to fetch; nothing downloads until you
press Download.

It needs Katevazo to be installed, since that registers the `katevazo://` address.

## Install it (Chrome, Edge, Brave)

1. Open `chrome://extensions` and switch on **Developer mode**.
2. Choose **Load unpacked** and pick this `extension` folder.
3. Click the extension's icon on a video page, or right-click a link and choose
   **Send link to Katevazo**.

## Install it (Firefox)

Open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on** and pick
`manifest.json` from this folder. Temporary add-ons are removed when Firefox closes.

## Without the extension

Any program can open `katevazo://download?url=<address>`, with the video address
percent-encoded, to send a link to the app.
