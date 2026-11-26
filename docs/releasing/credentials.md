# Release credentials

Workflow: `.github/workflows/desktop-release.yml`. Secrets live in the GitHub Environment `release`. You run every command here; agents never see private keys. Do the steps once, in order. Each step ends with a check.

## 1. Updater key

The updater key signs every update. It never changes (ADR 0002).

1. Generate the key pair and choose a password:
   ```sh
   pnpm exec tauri signer generate -w ~/.tauri/stagistic-updater.key
   ```
   It writes `~/.tauri/stagistic-updater.key` (private) and `~/.tauri/stagistic-updater.key.pub` (public).
2. Store the private key file and the password in a password manager, plus an offline copy (e.g. encrypted USB). Losing either means installed apps can never update.
3. Paste the full content of `~/.tauri/stagistic-updater.key.pub` into `apps/desktop/src-tauri/tauri.conf.json`, replacing `REPLACE_WITH_STAGISTIC_UPDATER_PUBLIC_KEY` in `plugins.updater.pubkey`. Commit this change; the public key is not secret.

Check: `grep REPLACE_WITH apps/desktop/src-tauri/tauri.conf.json` prints nothing.

## 2. Developer ID certificate

Needs the Account Holder role in the Apple Developer account.

1. Keychain Access ▸ Certificate Assistant ▸ Request a Certificate From a Certificate Authority. Your email, common name "Stagistic Developer ID", "Saved to disk". This creates the private key in your login keychain.
2. [developer.apple.com ▸ Certificates](https://developer.apple.com/account/resources/certificates/list) ▸ **+** ▸ **Developer ID Application** ▸ Profile Type **G2 Sub-CA** ▸ upload the `.certSigningRequest` ▸ download the `.cer`.
3. Double-click the `.cer`. It joins its private key in the login keychain.
4. Export for CI: Keychain Access ▸ login ▸ My Certificates ▸ right-click "Developer ID Application: …" ▸ Export ▸ `.p12` with a new password. Store the `.p12` and its password in the password manager.

Check:
```sh
security find-identity -v -p codesigning
```
lists `"Developer ID Application: <Name> (<TEAMID>)"`. That exact string is your signing identity.

## 3. Notarization key (App Store Connect API)

1. [App Store Connect ▸ Users and Access ▸ Integrations ▸ App Store Connect API](https://appstoreconnect.apple.com/access/integrations/api) ▸ Team Keys ▸ **+**. Name "Stagistic notarization", access **Developer**.
2. Download `AuthKey_<KEYID>.p8`. Apple offers it only once. Store it in the password manager.
3. Note the **Key ID** (10 characters) and the **Issuer ID** (UUID above the key list).
4. Keep a local copy for signed local builds:
   ```sh
   mkdir -p ~/.appstoreconnect/private_keys
   mv ~/Downloads/AuthKey_<KEYID>.p8 ~/.appstoreconnect/private_keys/
   chmod 600 ~/.appstoreconnect/private_keys/AuthKey_<KEYID>.p8
   ```

Check:
```sh
xcrun notarytool history --key ~/.appstoreconnect/private_keys/AuthKey_<KEYID>.p8 --key-id <KEYID> --issuer <ISSUER_ID>
```
answers with an empty history, not an authentication error.

## 4. Local release settings

A local signed build needs to know where your keys are. You write that once into a settings file outside the repository. The file holds names and paths only, never key contents or passwords.

Each line `export NAME="value"` sets one variable. `source <file>` loads the file into the current Terminal window only; a new window needs `source` again.

1. Create the file:
   ```sh
   mkdir -p ~/.config/stagistic
   cat > ~/.config/stagistic/release.env <<'EOF'
   export TAURI_SIGNING_PRIVATE_KEY_PATH="$HOME/.tauri/stagistic-updater.key"
   export APPLE_SIGNING_IDENTITY="Developer ID Application: <Name> (<TEAMID>)"
   export APPLE_API_KEY="<KEYID>"
   export APPLE_API_ISSUER="<ISSUER_ID>"
   export APPLE_API_KEY_PATH="$HOME/.appstoreconnect/private_keys/AuthKey_<KEYID>.p8"
   EOF
   ```
2. Open it (`code ~/.config/stagistic/release.env`, or `open -t ~/.config/stagistic/release.env` for TextEdit) and replace the four placeholders in angle brackets:
   - `<Name> (<TEAMID>)`: copy the whole identity from step 2, the text in quotes printed by `security find-identity -v -p codesigning`.
   - `<KEYID>` (twice): the Key ID from step 3.
   - `<ISSUER_ID>`: the Issuer ID from step 3.
   Save. Leave `$HOME` as it is.
3. Before each local signed build, in the Terminal window you build from:
   ```sh
   source ~/.config/stagistic/release.env
   read -rs "TAURI_SIGNING_PRIVATE_KEY_PASSWORD?Updater key password: " && export TAURI_SIGNING_PRIVATE_KEY_PASSWORD
   ```
   The second line asks for the updater key password without showing it and keeps it in that window only. `desktop:update-test` asks for the password itself, so it needs only the first line.

The Apple variables go together: all set means Developer ID signing and notarization, none set means an ad-hoc build, a partial set fails.

Check: `echo $APPLE_API_KEY` prints your Key ID. Then a signed and notarized local build (about 5–15 minutes; notarization waits for Apple). It writes only to `apps/desktop/release-out/` (gitignored); it touches no GitHub Release and no repository file:
```sh
moon run desktop:release
moon run desktop:release-verify -- --dmg apps/desktop/release-out/Stagistic-Editor-mac-arm64.dmg
```
Every check must be PASS (no SKIP) for a signed build.

## 5. GitHub Environment and secrets

1. GitHub ▸ Settings ▸ Environments ▸ New environment `release`.
   - Required reviewers: yourself.
   - Deployment branches and tags: "Selected branches and tags", tag rule `v*`, plus the branch you run manual test builds from (`pre-release`).
2. Environment secrets:

   | Secret | Value |
   | --- | --- |
   | `TAURI_SIGNING_PRIVATE_KEY` | content of `~/.tauri/stagistic-updater.key` (`pbcopy < ~/.tauri/stagistic-updater.key`) |
   | `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | updater key password |
   | `APPLE_CERTIFICATE` | `base64 -i cert.p12 \| pbcopy` |
   | `APPLE_CERTIFICATE_PASSWORD` | `.p12` password |
   | `APPLE_SIGNING_IDENTITY` | the identity string from step 2 |
   | `APPLE_API_KEY_P8` | `base64 -i AuthKey_<KEYID>.p8 \| pbcopy` |
   | `APPLE_API_KEY` | Key ID |
   | `APPLE_API_ISSUER` | Issuer ID |
   | `KEYCHAIN_PASSWORD` | any random string (`openssl rand -hex 24 \| pbcopy`); protects the temporary CI keychain |

   Set all Apple secrets or none; a partial set fails the build. After `pbcopy` of a key, copy something else so the key leaves the clipboard.

Check, a signed CI test build: Actions ▸ `desktop-release` ▸ Run workflow from your branch, `test_version` `1.0.0-test.1`. Approve the `release` Environment. Download the artifact `desktop-test-aarch64-apple-darwin`, unzip it and run:
```sh
moon run desktop:release-verify -- --dmg <unzipped folder>/Stagistic-Editor-mac-arm64.dmg
```
On this first signed run, watch the log for a second certificate import by the Tauri bundler (it imports `APPLE_CERTIFICATE` itself when it also sees `APPLE_CERTIFICATE_PASSWORD`; the workflow passes the password only to its own keychain step, so expect one import).

## Secret list

`TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_API_KEY_P8`, `APPLE_API_KEY`, `APPLE_API_ISSUER`, `KEYCHAIN_PASSWORD`.

The certificate expires after five years; renew it before then (steps 2 and 5). Apps signed with the old certificate keep working, and the updater key is unaffected.
