# @stagistic/sync-core

Repository interfaces and sync-related abstractions.

## Scope

- Repository interfaces (e.g., `ScriptRepository`).
- Sync boundaries and future extension points (locks, outbox, cloud adapters).

## Non-goals

- No concrete storage drivers.
- No UI code.
- No Tauri, HTTP, or framework dependencies beyond shared types.

## Apps

- `apps/desktop` provides local SQLite adapters.
- Single-writer lock model will be implemented here as an extension point.
