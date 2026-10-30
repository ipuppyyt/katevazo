# Contributing to Katevazo

Thanks for your interest in improving Katevazo! This guide explains how to get set up
and what we expect from contributions. By taking part you agree to follow our
[Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- **Report bugs** and **suggest features** using the
  [issue templates](https://github.com/ipuppyyt/katevazo/issues/new/choose). Search
  existing issues first.
- **Improve the docs**, fix typos, or add screenshots.
- **Fix bugs or build features.** For anything larger than a small fix, please open an
  issue first so we can agree on the approach before you invest time.
- **Test on other platforms.** Windows is the most-tested today; macOS and Linux reports
  are especially valuable.

Look for issues labelled `good first issue` or `help wanted` if you are new.

## Development setup

You need Node.js 22+, stable Rust, and the
[Tauri 2 system dependencies](https://tauri.app/start/prerequisites/) for your OS.

```bash
git clone https://github.com/<your-username>/katevazo.git
cd katevazo
npm install
npm run sidecars     # fetch yt-dlp + ffmpeg + Deno for your platform into src-tauri/binaries
npm run tauri dev    # start the app with hot reload
```

`npm run sidecars` downloads binaries that are git-ignored; never commit them.

## Project layout

```
src/                     React + TypeScript frontend
  components/            Shared UI: icons, segmented control, window controls
  features/add/          Paste-a-link toolbar field and the preview card
  features/queue/        Download list and its Zustand store
  features/history/      History view
  features/settings/     Settings view
  lib/api.ts             Typed wrappers around Tauri commands
  styles/                Sass tokens (CSS variables), mixins, global styles
src-tauri/               Rust backend
  src/ytdlp.rs           yt-dlp wrapper: metadata, version, self-update
  src/download.rs        Queue, pause/resume/cancel, progress parsing
  src/history.rs         SQLite history
  src/settings.rs        JSON settings
scripts/                 Tooling (sidecar fetcher)
branding/                Logo sources
```

## Design guidelines

The interface follows Apple's design language (clean, compact, system colours) while
using each platform's own window controls. When changing UI:

- Use the CSS variables in `src/styles/_tokens.scss`; do not hard-code colours.
- Make sure every change works in **light and dark** mode.
- Use Sass modules (`*.module.scss`) for component styles; the project deliberately does
  not use Tailwind or a component library.
- Keep controls keyboard-accessible and give icon-only buttons an `aria-label`.

## Code guidelines

- **Rust:** format with `cargo fmt`, and keep `cargo clippy` clean. Put parsing and other
  pure logic in functions that can be unit-tested (see the tests in `download.rs`).
  Never build a command line by string-joining user input; pass arguments separately and
  keep the `--` before URLs.
- **TypeScript:** `npm run build` runs the type-checker and must pass.
- Match the style of the surrounding code, including comment density and naming.
- Comments should explain *why*, not restate the code.

## Before you open a pull request

```bash
npm run build                           # type-check + frontend build
cd src-tauri && cargo fmt --check && cargo clippy && cargo test
```

CI runs the build and tests on Windows, macOS and Linux for every pull request.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org):

```
<type>(optional scope): <short summary in the imperative>
```

Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`,
`ci`, `chore`. Examples:

```
feat(queue): add retry button for failed downloads
fix: keep the progress bar from moving backwards after a pause
docs: explain how pause and resume work
```

## Pull requests

1. Fork the repository and create a branch from `main` (for example `feat/subtitles`).
2. Keep the change focused; unrelated changes belong in separate pull requests.
3. Add or update tests for behaviour you change, and update the docs and
   [CHANGELOG.md](CHANGELOG.md) when users will notice.
4. Fill in the pull request template, and include screenshots for UI changes (light and
   dark).
5. Be responsive to review feedback. Maintainers may squash commits when merging.

## Reporting security issues

Please do **not** open a public issue for vulnerabilities. See [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).
