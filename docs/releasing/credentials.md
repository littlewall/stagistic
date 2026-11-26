# Release credentials

Workflow: `.github/workflows/desktop-release.yml`. Secrets live in the GitHub Environment `release`. You run every command here; agents never see private keys.

## Now (no Apple account)

1. Generate the updater key pair:
   ```sh
   pnpm exec tauri signer generate -w ~/.tauri/stagistic-updater.key
   ```
   Choose a password. The public key is printed and saved as `~/.tauri/stagistic-updater.key.pub`.
2. Store the private key file and password in a password manager, plus an offline copy (e.g. encrypted USB). Losing it means installed apps can never update (ADR 0002).
3. Public key: paste the full content of `~/.tauri/stagistic-updater.key.pub` into `apps/desktop/src-tauri/tauri.conf.json`, replacing the placeholder `REPLACE_WITH_STAGISTIC_UPDATER_PUBLIC_KEY` in `plugins.updater.pubkey`. The release script refuses to build signed updater artifacts while the placeholder is still there. Without `TAURI_SIGNING_PRIVATE_KEY` it builds the app and DMG only (no updater archive, signature or `latest.json`).
4. GitHub: Settings > Environments > New environment `release`.
   - Required reviewers: add yourself.
   - Deployment branches and tags: "Selected branches and tags", add tag rule `v*`.
   - Note: manual (workflow_dispatch) runs also use this environment; add branch rule(s) you dispatch from, or approve from a permitted ref.
5. Add Environment secrets:
   - `TAURI_SIGNING_PRIVATE_KEY`: full contents of `~/.tauri/stagistic-updater.key`.
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: the password.

Without Apple secrets the build is ad-hoc signed.

## Later, with the Apple account

Set all of these, or none (partial set fails the build).

1. Create a "Developer ID Application" certificate, export it from Keychain Access as `.p12` with a password, then:
   ```sh
   base64 -i cert.p12 | pbcopy
   ```
   - `APPLE_CERTIFICATE`: the base64 output.
   - `APPLE_CERTIFICATE_PASSWORD`: the p12 password.
2. `APPLE_SIGNING_IDENTITY`: exact identity string, e.g. `Developer ID Application: Your Name (TEAMID)` (see `security find-identity -v -p codesigning`).
3. App Store Connect > Users and Access > Integrations > Team Keys: create an API key, download the `.p8` once.
   ```sh
   base64 -i AuthKey_XXXXXXXXXX.p8 | pbcopy
   ```
   - `APPLE_API_KEY_P8`: the base64 output.
   - `APPLE_API_KEY`: the key ID.
   - `APPLE_API_ISSUER`: the issuer ID (UUID).
4. `KEYCHAIN_PASSWORD`: any random string; protects the temporary CI keychain.

## Secret list

Now: `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
Later: `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_API_KEY_P8`, `APPLE_API_KEY`, `APPLE_API_ISSUER`, `KEYCHAIN_PASSWORD`.
