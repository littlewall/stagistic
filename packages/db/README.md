# @stagistic/db

Drizzle schema, PGlite client, queries, and repository interface contracts.

## Scope

- Domain types (e.g., `ScriptSummary`)
- Drizzle schema and migrations
- PGlite client setup
- Query helpers
- `ScriptRepository` interface contracts (storage-agnostic)

## Non-goals

- No UI code
- No concrete storage drivers (apps wire those up)
- No persistence side effects beyond the queries themselves

## Used by

- Apps for repository implementations and shared types
- `@stagistic/app-core` for repository contracts
