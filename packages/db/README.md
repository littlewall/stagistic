# @stagistic/db

Shared, platform-agnostic domain types and schema definitions.

## Scope

- Domain types (e.g., `ScriptSummary`).
- Database concepts that are platform-agnostic.

## Non-goals

- No UI code.
- No Tauri, HTTP, or storage drivers.
- No persistence logic.

## Used by

- `@stagistic/sync-core` for repository interfaces.
- Apps (desktop/web) for shared types.
