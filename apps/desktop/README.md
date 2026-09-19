# Stagistic Desktop (Tauri)

Offline-first desktop shell for the Stagistic editor. Tauri 3 (`next`) with a
React + Vite frontend. The editor itself is not wired up yet — the frontend is
currently a placeholder while the foundations are brought up to date.

## Prerequisites

- Node.js >= 24.12.0
- pnpm >= 11.0.0
- Rust toolchain (stable)
- Tauri system prerequisites (platform-specific)

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

- The desktop app is offline-first; local storage is not wired up yet.
- File dialogs and filesystem access are available via `tauri-plugin-dialog`
  and `tauri-plugin-fs` for future export/import features.
- The native menu (File / Edit / View / Window / Help) emits `menu-action`
  events the frontend can listen to.
