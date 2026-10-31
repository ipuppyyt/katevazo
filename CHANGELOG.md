# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- A badge shows which site a link is from, with a note where a site needs something extra (Vimeo, Instagram and X usually want you signed in). Links from Vimeo, SoundCloud, X, Instagram, TikTok, Twitch, Facebook, Reddit and Dailymotion are now offered when copied, and SoundCloud sets can be listed like playlists.
- Record live streams: press Record on a live video and Stop when you are done. Streams and premieres that have not started yet are waited for and recorded.
- Convert tab: change video or audio files already on your computer to MP4, MKV, WebM, MP3, M4A, Opus, FLAC or WAV with the bundled ffmpeg. The originals are never changed.

## [0.3.0] - 2026-10-31

### Added

- Trim a video: download only the part between a start and end time.
- Settings for how many downloads run at once and a speed limit for each.
- Start a download later at a time you choose (Katevazo must be open then).
- Retry on its own after network errors, waiting 5, 15 and 45 seconds and so on (Settings: Retry on network errors).
- SponsorBlock: mark sponsor segments as chapters or cut them out (Settings: SponsorBlock). This bundles ffprobe, so installers are about 25 MB larger.
- Skip videos you have already downloaded, with a button to forget them (Settings: Skip videos already downloaded).
- Subscriptions: subscribe to a channel or playlist and new uploads download automatically every 30 minutes while the app is open.
- Proxy support, and sign-in using the cookies of a browser you are already signed in to (Settings: Network).

### Fixed

- Windows installer: the page title and subtitle now start right after the logo instead of leaving a wide gap.

## [0.2.1] - 2026-10-30

### Changed

- The app name is set in capitals in the Manrope typeface.
- A Beta badge next to the app name marks the app as pre-release.

### Fixed

- The sidebar icons were hand-drawn and uneven; the app now uses the Lucide icon set throughout.
- Dropdown lists (quality, container, codec and so on) showed blank choices in dark mode.
- The Windows installer header logo is aligned to the left edge.

## [0.2.0] - 2026-10-30

### Added

- Download whole YouTube playlists and channels: tick the videos you want, or take them all.
- Choose the container (MP4, MKV, WebM) and preferred codec (H.264, VP9, AV1) for video, and the format (MP3, M4A, Opus, FLAC, WAV) and bitrate for audio.
- Download subtitles, including auto-generated captions, saved as .srt or embedded in the video.
- Embed title, uploader, chapters and cover art in downloaded files (on by default, in Settings).
- Filename templates such as {uploader} - {title}, with sub-folders and a live preview.
- Offer to fetch a YouTube link when you copy one (can be turned off in Settings).
- Desktop notification when a download finishes or fails while the app is in the background.
- Open a finished download, or show it in its folder, from the queue and from History.

### Fixed

- Bundle Deno so yt-dlp can solve YouTube's script challenges; without a JavaScript runtime some formats could go missing.

## [0.1.1] - 2026-10-30

### Added

- Branded installers: the Windows setup and MSI and the macOS disk image now carry the Katevazo logo, with custom banner, sidebar and background artwork and a licence page.
- Publisher, copyright and description metadata on all packages.
- Optional code signing and notarisation in the release workflow, enabled when signing secrets are configured (see docs/SIGNING.md).

## [0.1.0] - 2026-10-30

First public release.

### Added

- Paste a link to preview a video's title, thumbnail, duration and available qualities.
- Download as MP4 video (optional height limit) or MP3 audio, via bundled yt-dlp and ffmpeg.
- Download queue with live progress, speed and time remaining; up to three run at once.
- Pause, resume, cancel and retry for every download.
- History of finished downloads, stored locally in SQLite.
- Settings for the save folder and light, dark or system appearance.
- In-app yt-dlp update.
- Apple-style interface with platform-appropriate window controls on Windows, macOS and Linux.
- CI for Windows, macOS and Linux, and a tag-triggered release workflow.

### Fixed

- The progress bar no longer jumps up and down when video and audio are downloaded as
  separate streams, and it stays put across pauses.

[Unreleased]: https://github.com/ipuppyyt/katevazo/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/ipuppyyt/katevazo/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/ipuppyyt/katevazo/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/ipuppyyt/katevazo/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/ipuppyyt/katevazo/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/ipuppyyt/katevazo/releases/tag/v0.1.0
