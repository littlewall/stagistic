# @stagistic/release-notes

Release Notes: one schema and parser shared by the prepare command, the web and desktop apps and the marketing site.

## Fragments

One Markdown file per change a writer could notice: `releases/next/<slug>.md`. The body is the description (Markdown, English).

```md
---
type: feature # feature | improvement | fix
bump: minor # minor | patch; the highest bump in a Release sets the number
highlight: true # optional, default false; announced in the app
breaking: false # optional, default false; see below
title: Start from a template
image: /images/templates.png # optional
docs: /docs/templates # optional
article: /articles/templates # optional
---

Pick a template on the script list and start writing.
```

`docs` and `article` are site paths (`/guide/templates` on docs.stagistic.com, `/articles/templates` on stagistic.com) or `https://` addresses; the app shows other values as no link. `image` is shown only as a path served by the site itself (a file in that site's `public/` folder); other values are not shown. The web app and the marketing site each serve their own `public/`, so put the file at the same path in both `apps/web/public/` and `apps/marketing/public/` (a marketing test fails when a Release image is missing from either). Give an image only to a Highlight: one cover, shown right under the note title in What's new, the popup and the changelog. It is a 16:9 WebP screenshot of the real app (1920×1080, so it stays sharp on 2x screens; under about 100 kB) that shows roughly what the change is about, not everything it does; keep covers in `public/releases/`. `resolveNoteLink` and `resolveNoteImage` apply these rules for the app dialog and the changelog.

Unknown fields are rejected. `breaking: true` marks a change to how existing data behaves; the popup shows it first with a warning, so it must also be `highlight: true` and `bump: minor`.

## Prepare a Release

```sh
moon run root:release-prepare [-- --date YYYY-MM-DD]
```

Merges the fragments into `releases/<release>.md`, sets the number in every `package.json`, `tauri.conf.json`, `Cargo.toml` and `Cargo.lock`, and removes the fragments. The number is the current one bumped by the highest `bump`. It fails, changing nothing, when there are no fragments, a fragment is invalid, the target file exists or the files disagree about the current number. It never commits or tags.

## Revert a prepared Release

```sh
moon run root:release-revert -- 0.1.0
```

Goes back to a Release: every `releases/<n>.md` newer than the target is split back into `releases/next/<slug>.md` fragments (same format `prepare` reads; `bump` is `minor` or `patch` by how the number changed) and deleted, and the number in every `package.json`, `tauri.conf.json`, `Cargo.toml` and `Cargo.lock` is set to the target. Preparing again gives the same Release file apart from its date. When file names alone would reorder notes of one type, the fragments get a `NN-` prefix. The target is an existing `releases/<n>.md` or the initial version `0.1.0`. It refuses, changing nothing, when the target is neither, is not older than the current Release, the newest Release file is not the current Release, the numbers disagree, a step between Releases is not a minor or patch bump, or a fragment file name already exists. It never commits or tags and prints what changed.

## Reading Releases

Browser-safe (no Node API):

```ts
import {currentReleaseNumber, releases} from '@stagistic/release-notes/bundled'; // releases: newest first, bundled as text at build time (Vite `import.meta.glob`); currentReleaseNumber: the root package.json version
import {compareReleaseNumbers, listReleases, parseFragment, type Release} from '@stagistic/release-notes';
```

`Release` is `{release, date, notes[]}`; a note has `type`, `title`, `highlight`, `breaking`, optional `image`, `docs`, `article`, and `description`. Notes are ordered breaking first, then features, improvements and fixes.

Node only: `@stagistic/release-notes/node` (`prepareRelease`, `revertRelease`, `readReleaseNumbers`).

## Changelog and RSS (marketing)

`/changelog` on stagistic.com lists every Release newest first (anchor `#release-<number>`, date, notes in What's new order with the same type labels, breaking changes first, optional cover image, guide and article links); `/changelog.xml` is the RSS feed with one entry per Release, and the page advertises it. The site reads `releases/*.md` at build time through `@stagistic/release-notes/bundled`. Descriptions use the Markdown subset of `parseMarkdown` (`@stagistic/shared`): raw HTML stays literal text. The footer links the page only once a Release exists. Cloudflare Pages must build the marketing site on a change under `releases/`: check the project's build watch paths in the dashboard (they are not in the repository).

## Announcing Releases

`announceReleases({currentRelease, releases, lastSeenRelease, hasScripts})` decides what a writer is told: unseen Releases with a Highlight (merged, newest first), whether they deserve a popup, whether the dot shows, and whether the current Release should be recorded silently. Pure; the app keeps `lastSeenRelease` in `localStorage`. In the editor, What's new and announcement popups list only notes marked with `highlight: true` (regardless of patch or non-patch). The dot shows only for an unseen Release with a Highlight. The footer still shows the current number, including a patch.

## Update detection (web only)

The web build emits `version.json` (`{release, dbGeneration}`, by `versionManifestPlugin` in `@stagistic/vite-config/version-manifest`; the number is the root `package.json` version, the generation is `migrationCount/latestMigrationId/pgliteVersion` read from `migrations.compiled.ts`). `apps/web/public/_headers` sets `Cache-Control: no-store` on it (Cloudflare Pages; `nginx.conf` does the same). An open tab fetches it on window focus and every 30 minutes (`ReleaseUpdateProvider`, app-routes) and accepts only JSON of the right content type and shape; a missing file is answered with the HTML fallback, so everything else is ignored. `parseVersionManifest` validates it. Desktop mounts no provider and never polls.

## Invalid Release files

The web and marketing production builds run `validateReleasesPlugin` (`@stagistic/release-notes/validate-plugin`), which fails the build and names the file when a `releases/<n>.md` is invalid. At runtime a broken file degrades to an empty changelog instead of a blank app; the build check makes sure that never ships.
