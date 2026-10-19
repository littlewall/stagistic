# Stagistic Desktop (Tauri)

Offline-first desktop shell for the Stagistic editor. Tauri 3 (`next`) with a
React + Vite frontend and local PGlite storage.

## Prerequisites

- Node.js >= 24.12.0
- pnpm >= 11.0.0
- Rust 1.95.0 (selected by the repository's `rust-toolchain.toml`)
- Tauri system prerequisites (platform-specific)
- macOS distribution builds: both `aarch64-apple-darwin` and
  `x86_64-apple-darwin` Rust targets, plus Xcode command line tools

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

- The desktop app is offline-first.
- File dialogs and filesystem access are available via `tauri-plugin-dialog`
  and `tauri-plugin-fs` for future export/import features.
- The native menu (File / Edit / View / Window / Help) emits `menu-action`
  events the frontend can listen to.

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
settings directory. `desktop:build` packages the same universal macOS binary
for manual use and inside `stagistic.mcpb`, with a local ad-hoc signature.
Developer ID builds use `desktop:build-release` with
`STAGISTIC_MCP_SIGNING_IDENTITY` set. Notarization remains a release step.
Claude installation is intentionally unavailable in debug builds.

Reprepare the manual executable after an app upgrade; its path stays stable.
Restart client connections after a protocol mismatch. Reinstall the updated
MCPB for Claude. Opening its installation dialog returns
`installation_requested`, never a claim that the user installed it.

See [validation and manual smoke instructions](../../docs/testing/local-mcp.md).
