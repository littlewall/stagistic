# @stagistic/db

Drizzle schema, PGlite client, queries, and repository interface contracts.

How saves work (persist pipeline, block ordering, durability, perf
invariants): see [docs/persistence.md](../../docs/persistence.md).

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

## Migrations

SQL migrations live in `drizzle/` and are compiled into
`src/pglite/migrations.compiled.ts`, which `runPgliteMigrations` applies in
lexicographic id order and records in `__stagistic_migrations` with a checksum.

- Name: `<YYYYMMDDHHMMSS>_<snake_name>.sql`, UTC timestamp (drizzle-kit
  `prefix: 'timestamp'`). Branches can add migrations in parallel without
  colliding. `0000`–`0026` are frozen legacy sequential ids and sort first.
- Create: `moon run db:db-new-migration -- <snake_name>` (empty file to fill by
  hand) or `moon run db:db-generate` (drizzle-kit diff, then compile).
- Compile: `moon run db:db-compile-migrations` after any manual SQL edit.
  `db-check-migrations` runs before `db:typecheck`/`db:test` and fails on stale
  output, malformed names or duplicate prefixes (`src/pglite/migrationIds.ts`).
- Immutable: never edit or rename a migration that reached `rewrite`/`main`;
  add a new one. A branch-only migration may be renamed while merging; add
  `old id → new id` to `RENAMED_MIGRATIONS` in `src/pglite/migrations.ts` so
  databases that already applied it keep opening.
- Merging branches: keep every migration file, regenerate
  `migrations.compiled.ts` with `db-compile-migrations` instead of resolving
  its conflict by hand.

## Used by

- Apps for repository implementations and shared types
- `@stagistic/app-core` for repository contracts
