# Katevazo

A clean, cross-platform video downloader (Windows, macOS, Linux) built with Tauri 2, Rust and React.
Downloads are powered by [yt-dlp](https://github.com/yt-dlp/yt-dlp) and [ffmpeg](https://ffmpeg.org).
The name comes from the Greek κατέβασε, "download".

## Develop

```bash
npm install
npm run sidecars   # fetch yt-dlp + ffmpeg for this platform
npm run tauri dev
```

Branding sources live in `branding/`; regenerate app icons with `npm run tauri icon branding/logo.svg`.
