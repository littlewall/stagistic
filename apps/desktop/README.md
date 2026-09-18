# Stagistic Desktop (Tauri)

Offline-first desktop shell for the Stagistic editor. This app uses Tauri with a React + Vite frontend and a local SQLite database via the SQL plugin.

## Prerequisites

- Node.js >= 24.12.0
- pnpm >= 9.0.0
- Rust toolchain (stable)
- Tauri system prerequisites (platform-specific)

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

- The desktop app is offline-first and uses local SQLite storage.
- The database is loaded from `sqlite:stagistic.db` on startup.
- File dialogs and filesystem access are wired via Tauri plugins for future export/import features.
