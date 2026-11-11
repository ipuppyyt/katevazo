# App updates

Installed copies of Katevazo update themselves. At launch (and every six hours while the app
stays open) the app reads `latest.json` from the newest published GitHub release, downloads a
newer version in the background, checks its signature against the public key in
`src-tauri/tauri.conf.json`, and shows a banner. The new version installs only when the user
clicks **Restart to update**.

This needs no paid service. The update key is separate from the Windows and Apple signing
certificates in [SIGNING.md](SIGNING.md).

## One-time setup

1. The key pair already exists: the public key is in `tauri.conf.json`, and the private key
   was made at `~/.tauri/katevazo-updater.key` (no password). Make a new pair with
   `npx tauri signer generate -w ~/.tauri/katevazo-updater.key` if you prefer a password, and
   put the new public key in `plugins.updater.pubkey`.
2. In the repository's Settings, Secrets and variables, Actions, add:

| Secret | Value |
| --- | --- |
| `TAURI_SIGNING_PRIVATE_KEY` | The full contents of the private key file |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Its password. Skip this secret when the key has none (GitHub does not allow empty secrets) |

3. Keep a backup of the private key. If it is lost, installed apps can no longer verify an
   update and users would have to reinstall by hand.

## Releasing

Push a `v*` tag as usual. The workflow builds each platform, signs the update packages and
uploads them with `latest.json` to a draft release. Publish the draft: apps only see
published releases. Never publish a release without `latest.json`.

Updates start working from the first release built with this setup; versions installed
earlier do not have the updater and need a one-time manual install.
