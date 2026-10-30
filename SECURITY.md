# Security Policy

## Supported versions

Katevazo is pre-1.0. Security fixes are made on the latest release and on `main`.

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Use GitHub's private vulnerability reporting instead:
**[Report a vulnerability](https://github.com/ipuppyyt/katevazo/security/advisories/new)**
(the *Security* tab of the repository, then *Report a vulnerability*).

Please include:

- a description of the issue and its impact,
- steps to reproduce, or a proof of concept,
- the Katevazo version and your operating system.

You can expect an acknowledgement within a few days. We will keep you updated while we
investigate, and credit you in the release notes if you wish once a fix is available.

## Scope

Examples of issues we want to hear about:

- a crafted URL or page title that runs commands or injects options into yt-dlp or ffmpeg,
- writing files outside the chosen download folder,
- a way for web content to reach Tauri commands it should not,
- problems with how the bundled binaries or updates are fetched and verified.

Vulnerabilities in yt-dlp, ffmpeg, Tauri or other dependencies should be reported to
those projects; let us know too if Katevazo needs to ship an update.
