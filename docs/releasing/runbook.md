# Release runbook

One Release ships the Web app and the Mac app together. You run every step; agents prepare changes and never commit, tag or publish. Terms: `GLOSSARY.md`. Credentials: [credentials.md](credentials.md). Why the identifier and the updater key are frozen: [ADR 0002](../adr/0002-mac-app-distribution.md).

## Go-live order

release commit → you tag `vX.Y.Z` → CI draft GitHub Release → smoke test → you publish the GitHub Release → merge to `main` (Cloudflare deploys web, marketing and docs).

Publish before the merge: `stagistic.com/download/mac` and the updater endpoint read the latest published GitHub Release, and the merge makes the download page and the "Stagistic for Mac" announcement public.

## Once, before the first Release

- Updater key, public key in `tauri.conf.json`, GitHub Environment `release` and its secrets: [credentials.md](credentials.md), section "Now".
- Apple Developer account, certificate, notarization key and secrets: [credentials.md](credentials.md), section "Later". Buy the account only before the last release candidate. Without it CI builds are ad-hoc signed and not notarized: fine for testing, not for public download.
- Updater key custody (ADR 0002): keep the private key and its password in a password manager plus an offline copy. If the key is lost, installed apps can never update themselves; the only recovery is the [Manual update notice](#manual-update-notice-emergency) asking writers to install the current Release by hand. To rotate a key you still hold, ship one Release signed with the old key that contains the new public key, then switch the secret (not tested).

## 1. Prepare the Release

1. Make sure every change a writer could notice has a fragment in `releases/next/` (format: `packages/release-notes/README.md`).
2. `moon run root:release-prepare` (milestone Release: `moon run root:release-prepare -- --major`). It merges the fragments into `releases/<release>.md` and sets the number in every `package.json`, `tauri.conf.json`, `Cargo.toml` and `Cargo.lock`. It never commits or tags. To take it back before committing: `moon run root:release-revert -- <previous release>`.

## 2. Check

1. `moon run root:verify -- --fresh root:test-all`. It includes `desktop:test`, `desktop:test-rust` and `mcp:test-rust`, every browser suite and `marketing:test`.
2. Property oracles, once per feature before merge: `moon run root:verify -- --fresh root:test-explore`.
3. Optional local dry run of the build: `moon run desktop:release`. It writes `apps/desktop/release-out/` (gitignored) and touches no GitHub Release.

CI repeats `desktop:test`, `desktop:test-rust`, `mcp:test-rust` and `mcp:contract-check` for a tag, and refuses a tag whose number differs from the number in the files.

## 3. Commit and tag

1. You commit the release commit (version files, `releases/<release>.md`, removed fragments).
2. You tag it: `git tag vX.Y.Z` (same number as the files) and push the branch and the tag.
3. The workflow `desktop-release` (`.github/workflows/desktop-release.yml`) waits for your approval of the `release` Environment. Approve it in the Actions run.
4. CI builds the arm64 app and creates or updates the draft GitHub Release `vX.Y.Z` with:
   - `Stagistic-Editor-mac-arm64.dmg`
   - `Stagistic-Editor-mac-arm64.app.tar.gz` and `.sig`
   - `latest.json`
   - a body generated from `releases/<release>.md`

   Without the updater key secret it makes the DMG only. Pushing the same tag again, or re-running the workflow, updates the draft and replaces its assets. If a tag is wrong, delete the draft, then the tag locally and on the remote, and tag again.

## 4. Smoke test the draft

Download the DMG from the draft's page in Safari (the download keeps the quarantine flag, so Gatekeeper behaves as for a writer). Test on macOS 15 and on the current macOS. Record the Gatekeeper result: a warning is expected only for unsigned or ad-hoc builds.

- Install to Applications and first launch. Signed builds: `spctl --assess --type execute -vv "/Applications/Stagistic Editor.app"` accepts, and `xcrun stapler validate` on the DMG succeeds.
- Create, edit and rename a script; add an attachment (score PDF); open Board; export a PDF (Save dialog); save `.stepkg` and `.stagistic` (Save dialog); import by dialog and by drag and drop.
- Every menu item. The Script menu is disabled on the script list. Settings with ⌘,. Zoom. Undo and Redo by menu and by keys. About shows the Release and copyright.
- External links open the browser: What's new guide, Changelog, Report a Problem, docs.
- Type and immediately press ⌘Q, reopen: the text is there. Do the same by closing the window.
- Settings ▸ Storage shows the paths; Show Backups Folder opens Finder; a backup appears at the next 15-minute tick after a change, and on quit; idle writes none. Restore… per row (test it once).
- MCP: enable, manual configuration, Claude install (signed builds only), use after an update.
- Update A → B ([below](#update-test-a--b)). Manual update notice with a test notice file.
- Downgrade: open an older build on newer data; the "download the current Release" screen appears and nothing changes.
- A log file exists in `~/Library/Logs/com.stagistic.editor/`. Activity Monitor shows Apple silicon. Third-party licences open from Help.

### Update test A → B

Run it for the first Release and again after every Tauri upgrade, with real data (the webview origin decides where scripts are found). The updater needs the key pair from credentials.md and an https URL it can reach. Plain http is likely refused in a release build; this procedure has not been run end to end yet.

1. Export the signing key for the local build:
   ```sh
   export TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/stagistic-updater.key)"
   export TAURI_SIGNING_PRIVATE_KEY_PASSWORD='<password>'
   ```
2. Build A and install it. Create scripts, attach a score PDF and let a backup run:
   ```sh
   moon run desktop:release -- --test-version 1.0.0-test.1 --updater-endpoint https://<your-host>/latest.json
   ```
   Output is in `apps/desktop/release-out/`. A test version never changes any file in the repository.
3. Build B the same way with `--test-version 1.0.0-test.2`.
4. Host B's `Stagistic-Editor-mac-arm64.app.tar.gz` and `latest.json` at the endpoint. Edit `platforms.darwin-aarch64.url` in the served `latest.json` to the hosted archive; the generated URL points to a GitHub Release that does not exist for a test version.
5. Open A. Wait for the check or choose **Check for Updates…**. The footer shows "Release 1.0.0-test.2 is ready. Restart" and **Settings ▸ About app** shows the same.
6. Choose **Restart**. The app saves, takes a backup and relaunches into B. Check that scripts, attachments and backups are intact.

A manual run of the workflow does the same build in CI: Actions ▸ `desktop-release` ▸ Run workflow with `test_version` (pattern `X.Y.Z-test.N`) and an optional `updater_endpoint`. It uploads the files as a workflow artifact and publishes nothing.

## 5. Publish

1. If the smoke test failed, fix, prepare again if needed and go back to step 3. Nothing is public yet.
2. On GitHub, open the draft and choose **Publish release**. Keep it marked as the latest release.
3. Check at once: `https://github.com/littlewall/stagistic/releases/latest/download/latest.json` shows the new version.

## 6. Merge to `main`

1. Merge the release branch to `main`. Cloudflare deploys the Web app, the marketing site and the docs; it runs no tests, which is why step 2 comes first.
2. Check: the Web app footer shows the Release; `stagistic.com/download` and `stagistic.com/download/mac` (redirects to the DMG); `stagistic.com/changelog`; the Mac app section of `docs.stagistic.com`; `stagistic.com/desktop/notice.json` is valid JSON with `cache-control: no-store`.
3. On a Mac with the previous Release installed, wait for the update check or choose **Check for Updates…**. The first Mac app Release, 1.0.0, has no previous Release to update from.

## Manual update notice (emergency)

Use this when installed apps can no longer update themselves (lost key, broken updater, broken Release) and writers must install the current Release by hand.

1. Edit `apps/marketing/public/desktop/notice.json`:
   ```json
   {"minimumRelease": "1.0.3", "message": "Optional plain text.", "url": "https://stagistic.com/download"}
   ```
   - `minimumRelease`: apps running an older Release show the bar. Never set it above the newest published Release: every writer would see the bar and have nothing to install.
   - `message` (optional): plain text, shown as is. Default: "This Release can no longer update itself. Download the current Release."
   - `url` (optional): must start with `https://stagistic.com/`, else the Download link goes to `https://stagistic.com/download`.
2. `moon run root:verify -- marketing:test`.
3. Commit straight to `main`. This is the one exception to "code reaches `main` only through a Release" (ADR 0002); no Release, tag or fragment is needed.
4. After Cloudflare deploys, `curl -i https://stagistic.com/desktop/notice.json` must show your change and `cache-control: no-store`. Apps pick it up with their next update check (after start, then every few hours). Writers can hide the bar until the next start.
5. Undo by setting `minimumRelease` back to `1.0.0` (the lowest Release ever public).

An invalid, missing or non-JSON file shows nothing.

## Roll back

- Before publishing: delete the draft (and the tag if needed). Nothing reached writers.
- After publishing, there is no downgrade. The updater never installs an older Release, and migrations only go forward. Fix forward: `fix` fragment, `release-prepare`, tag, smoke test, publish a patch Release.
- To stop new installs of a bad Release at once, change the GitHub Release to a draft or delete it: `/download/mac` and `latest.json` then point to the previous published Release. Apps that already updated stay on the bad Release until the patch ships.
- If the updater itself is broken, use the Manual update notice.
- A Release that changes the database writes a backup first (`stagistic-premigration-…` in `~/Library/Application Support/com.stagistic.editor/backups`). Settings ▸ Storage lists it as "Before update" with Restore…, so a writer can return to the state before a bad Release's migration; they restore it after the fix-forward Release is installed. Pre-migration backups from the last 14 days are all kept, so the fix Release's own migration does not delete the one writers need. Restoring re-runs every migration newer than the backup: if the bad migration itself destroys data, correct that migration's SQL in the fix Release (the one exception to "never edit a released migration", AGENTS.md) and say so in its `fix` fragment; installs that have not run it yet get the corrected version directly. Writers' steps: [docs, Backups and recovery](https://docs.stagistic.com/mac-app/backups/).
- The Web app and docs deploy from `main`. Reverting the merge on `main` redeploys the previous site.
