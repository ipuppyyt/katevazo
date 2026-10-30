# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/ipuppyyt/katevazo/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ipuppyyt/katevazo/releases/tag/v0.1.0
