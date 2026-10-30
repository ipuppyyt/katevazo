# Third-Party Notices

Katevazo's own source code is released under the [MIT License](LICENSE). It builds on,
and installers bundle, the following third-party software. Each remains under its own
license.

## Bundled programs (shipped inside installers)

These are run as separate programs (Tauri "sidecars"); Katevazo does not link against them.

| Program | Used for | License | Source |
| --- | --- | --- | --- |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | Extracting and downloading media | The Unlicense | https://github.com/yt-dlp/yt-dlp |
| [FFmpeg](https://ffmpeg.org) | Merging video and audio, converting to MP3 | GPL-3.0-or-later (the build supplied by [`ffmpeg-static`](https://github.com/eugeneware/ffmpeg-static)) | https://ffmpeg.org/download.html |

**FFmpeg and the GPL.** The FFmpeg binary that `npm run sidecars` copies from
`ffmpeg-static` is a GPL-licensed build. It is distributed alongside Katevazo as a
separate executable, not combined into it. If you redistribute Katevazo installers you
must comply with the GPL for that binary, including making the corresponding FFmpeg
source available (see the link above and the `ffmpeg-static` release notes for the exact
version). We intend to evaluate LGPL-licensed FFmpeg builds to simplify redistribution.
This notice is informational and is not legal advice.

## Frameworks and libraries

Katevazo is built with [Tauri](https://tauri.app) (MIT or Apache-2.0),
[React](https://react.dev) (MIT), [Vite](https://vite.dev) (MIT),
[Zustand](https://github.com/pmndrs/zustand) (MIT), [Sass](https://sass-lang.com) (MIT),
[rusqlite](https://github.com/rusqlite/rusqlite) with bundled
[SQLite](https://sqlite.org) (MIT / public domain), [Tokio](https://tokio.rs) (MIT),
and [Serde](https://serde.rs) (MIT or Apache-2.0), plus their transitive dependencies,
which are predominantly MIT, Apache-2.0, BSD, Zlib, Unicode-3.0 and MPL-2.0 licensed.

The complete, current lists live in `package-lock.json` and `src-tauri/Cargo.lock`.
To list the Rust licenses yourself, run `cargo metadata` in `src-tauri/`, or use a tool
such as [`cargo-about`](https://github.com/EmbarkStudios/cargo-about).

## Trademarks

YouTube is a trademark of Google LLC. Katevazo is an independent project and is not
affiliated with, endorsed by, or sponsored by YouTube, Google, Apple, or any of the sites
it can download from. References to Apple's design language describe visual style only.
