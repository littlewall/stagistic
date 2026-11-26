# Stagistic Desktop (Tauri)

The Mac app: Stagistic Editor installed on a Mac (Apple silicon, macOS 15 or
later). It is released with every Release and downloaded from
[stagistic.com/download](https://stagistic.com/download); writers' docs are at
[docs.stagistic.com/mac-app](https://docs.stagistic.com/mac-app/). Tauri 3
(`next`) with a React + Vite frontend and local PGlite storage. Releasing it
(signing, tag, smoke test, go-live): [release runbook](../../docs/releasing/runbook.md).

## Prerequisites

- Node.js >= 24.12.0
- pnpm >= 11.0.0
- Rust 1.95.0 (selected by the repository's `rust-toolchain.toml`)
- Tauri system prerequisites (platform-specific)
- macOS distribution builds: the `aarch64-apple-darwin` Rust target (Apple silicon only), plus Xcode command line tools

> Tauri is pinned to the `3.0.0-alpha` line (`next`). Tauri 3 no longer bundles
> a webview runtime, so the app depends on `tauri-runtime-wry` and selects it
> explicitly in `src-tauri/src/main.rs`.

## Development

From the repo root:

```bash
moon run desktop:dev
```

Or directly from this folder:

```bash
moon run desktop:dev-ui
```

## Build

```bash
moon run desktop:build
```

## Notes

- The app is offline-first.
- File actions say "Save" and open a native Save dialog (`tauri-plugin-dialog`,
  `tauri-plugin-fs`); external links open in the system browser.
- The native menu (`src-tauri/src/menu.rs`: app, File, Edit, Script, View,
  Window, Help) emits `menu-action` events; ids are listed in `src/menu/menuActions.ts`.
- Data and logs live under `~/Library/{WebKit,Application Support,Logs}/com.stagistic.editor`.
  The identifier is frozen ([ADR 0002](../../docs/adr/0002-mac-app-distribution.md)).

## Local MCP

The backend exposes seven read-only tools over a native stdio executable.
Script text uses Stagistic syntax. Access starts disabled. The editor must be
running and its local database ready.

Settings (the header's user icon) › MCP turns the server on and off, opens the
`.mcpb` bundle in Claude and shows the manual client configuration. It calls the
functions in `src/mcp/client.ts` through `src/mcp/useMcpSettings.ts`. Manual preparation
returns the user's actual absolute executable path and `args: []`; it does not
enable access. Each stdio client launches that executable directly, without
Node, shell interpolation or a separate runtime.

`desktop:dev` builds a host-only bridge with a separate development socket and
settings directory. `desktop:build` packages the same arm64 macOS binary
for manual use and inside `stagistic.mcpb`, with a local ad-hoc signature.
Developer ID builds use `desktop:build-release` with
`STAGISTIC_MCP_SIGNING_IDENTITY` set. Notarization remains a release step.
Claude installation is intentionally unavailable in debug builds.

Reprepare the manual executable after an app upgrade; its path stays stable.
Restart client connections after a protocol mismatch. Reinstall the updated
MCPB for Claude. Opening its installation dialog returns
`installation_requested`, never a claim that the user installed it.

See [validation and manual smoke instructions](../../docs/testing/local-mcp.md).

## App icons

The desktop and MCP extension use the Stagistic favicon geometry. The macOS
bundle includes a native Icon Composer catalog with light, dark and tinted
appearances, plus Apple's compiled ICNS fallback. The Apple icon has a solid
white background and a glossy mark. MCP uses a separate flat 512 px PNG with
no glass, shadows or rounded enclosure.

After changing the favicon or Icon Composer settings, regenerate on macOS with
full Xcode (including Icon Composer), then rebuild:

```sh
moon run desktop:icons
moon run desktop:build
```

The editable source is `src-tauri/icons/Stagistic.icon`. Its `Assets/Mark.svg`
is generated from `apps/web/public/favicon.svg`; edit geometry in the favicon
and appearances/materials in `icon.json`. Generated icons are checked in so
ordinary builds do not regenerate them. See
[icon design and validation](../../docs/testing/desktop-icons.md).

## Release build

```sh
moon run desktop:release -- [--tag vX.Y.Z] [--test-version X.Y.Z-test.N] \
  [--updater-endpoint <url>] [--out-dir <dir>] [--publish-draft]
```

Builds the arm64 app non-interactively (`CI=true`, no Finder DMG styling) and
writes `apps/desktop/release-out/` (gitignored): `Stagistic-Editor-mac-arm64.dmg`,
`release-body.md` (from `releases/<n>.md`) and, with `TAURI_SIGNING_PRIVATE_KEY`
set, `…app.tar.gz`, `…app.tar.gz.sig` and `latest.json`. Without the key it
skips them and says so.

- Refuses before building when the Release number differs across files or
  `--tag` does not equal `v<Release>`.
- `--test-version` and `--updater-endpoint` are passed to `tauri build --config`
  only; no file changes.
- Signing: with `APPLE_SIGNING_IDENTITY`, `APPLE_API_ISSUER`, `APPLE_API_KEY`
  and `APPLE_API_KEY_PATH` all set: Developer ID signing, notarization and a
  signed MCP binary. With none set: ad-hoc. A partial set is an error.
- `--publish-draft` creates or updates the draft GitHub Release `v<version>`
  with `gh` (assets clobbered). It never publishes, tags or pushes.

## Release gate

`root:test-all` runs `desktop:test`, `desktop:test-rust` and `mcp:test-rust` (sequentially) before merge. CI release workflow: `.github/workflows/desktop-release.yml`. Steps and go-live order: [docs/releasing/runbook.md](../../docs/releasing/runbook.md); credentials: [docs/releasing/credentials.md](../../docs/releasing/credentials.md).
