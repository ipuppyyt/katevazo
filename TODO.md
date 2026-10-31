# Roadmap

Ideas for Katevazo, roughly in the order we plan to build them. Tick a box when the work
is merged. Want to help? See [CONTRIBUTING.md](CONTRIBUTING.md).


## Next up: high value, low effort

- [x] **Playlists and channels:** list a playlist's videos, tick the ones to download, or download all
- [x] **Format and quality control:** pick resolution, codec, container and audio format and bitrate
- [x] **Subtitles:** download or embed, with a language picker, including auto-generated ones
- [x] **Metadata and thumbnails:** embed cover art, title, artist and chapters
- [x] **Filename templates:** such as `{uploader} - {title}`, with a live preview
- [x] **Clipboard detection:** offer to download when a supported link is copied
- [x] **Notifications:** tell the user when a download finishes or fails in the background
- [x] **Open file or folder** actions on finished downloads

## Power-user features

- [x] Trim a section: download only a start and end time
- [x] Speed limit and a setting for simultaneous downloads
- [x] Scheduled downloads and automatic retry with backoff
- [x] Proxy support and sign-in with browser cookies
- [x] SponsorBlock: skip or mark sponsor segments
- [x] Archive file so repeat downloads are skipped
- [ ] Subscriptions: auto-download new uploads from a channel or playlist

## Beyond YouTube

- [ ] Site badge and per-site notes; test the common sites (Vimeo, SoundCloud, X, Instagram, TikTok, Twitch)
- [ ] Live-stream recording and waiting for premieres
- [ ] Convert existing files with the bundled ffmpeg

## App polish

- [ ] Drag and drop a link, or a `.txt` list of links, onto the window
- [ ] Browser extension or `katevazo://` links to send a page to the app
- [ ] System tray: keep downloading in the background, with a quick-add shortcut
- [ ] Localization
- [ ] Keyboard shortcuts and a command palette
- [ ] Search and filter history, re-download, show in folder
- [ ] First-run onboarding and a "What's new" screen
- [ ] Accessibility pass: screen reader labels, focus order, reduced motion

## Distribution and trust

- [ ] In-app auto-update (needs a signing key and update endpoint)
- [ ] Code signing and notarisation (wired up in CI, waiting on certificates; see [docs/SIGNING.md](docs/SIGNING.md))
- [ ] Intel Mac and Windows ARM builds
- [ ] winget, Homebrew cask and Flathub packages
- [ ] Opt-in crash reports (off by default)
- [ ] Project website with download buttons

## Quality

- [ ] Frontend tests (Vitest) and end-to-end tests for the queue
- [ ] A mock yt-dlp for CI so download tests do not need the network

## Done

- [x] Download queue with live progress, speed and time remaining
- [x] Pause, resume, cancel and retry
- [x] History, settings, light and dark themes
- [x] In-app yt-dlp update
- [x] Branded Windows and macOS installers
- [x] CI and tagged releases for Windows, macOS and Linux
