# Workspace Refactor Roadmap

## Goal
Aggressive hard-cut refactor introducing `@stagistic/script-core` and `@stagistic/platform-core`, reducing `@stagistic/shared` to generic utilities, modularizing oversized files, and improving testability seams.

## Checklist

### Phase 1: New package scaffolding
- [x] Create `packages/script-core` with package metadata and exports.
- [x] Create `packages/platform-core` with package metadata and exports.
- [x] Add migration matrix for import rewrites.

### Phase 2: Domain ownership migration
- [x] Move fountain/domain code from `editor-core` to `script-core`.
- [x] Move editor document/settings/defaults from `shared` to `script-core`.
- [x] Move platform helpers/events from `shared`/`app-core` to `platform-core`.
- [x] Move character document mutation utils from app-routes to script-core.

### Phase 3: Import hard cut
- [x] Replace all `@stagistic/editor-core` imports with `@stagistic/script-core`.
- [x] Replace script-domain imports from `@stagistic/shared` with `@stagistic/script-core`.
- [x] Replace platform imports with `@stagistic/platform-core`.
- [x] Retarget `sync-core` signatures to script-core types.

### Phase 4: Shared package trimming
- [x] Keep only generic utilities in `@stagistic/shared`.
- [x] Remove editor/script/platform exports from `shared` public API.

### Phase 5: Large file decomposition
- [x] Decompose all mandatory files from the plan into focused modules.
- [x] Bring every TypeScript/TSX file in `packages/*` below 300 LOC.
- [x] Deduplicate parser/serializer text helpers (all-caps + uppercase-outside-parentheses) in script-core.

### Phase 6: Cleanup and normalization
- [x] Remove redundant wrappers/barrels.
- [x] Consolidate duplicated block metadata.
- [x] Unify character list item typing.
- [x] Consolidate duplicated generic string/number/object logic into `@stagistic/shared` helpers (`collapseWhitespace`, `splitTrailingParentheticalSuffix`, `trimOrFallback`, `clampNumber`, `isObjectRecord`).
- [x] Remove dead file `packages/db/src/queries/scripts.ts`.
- [x] Remove unused dependency `@stagistic/shared` from `packages/ui/package.json`.
- [x] Standardize placeholder packages (`auth`, `config`, `music`).

### Phase 7: Removal and verification
- [x] Remove `packages/editor-core` package and dependencies.
- [ ] Run workspace lint/build/type checks. (target package lints pass; full workspace build still blocked by existing db/typography issues)
- [ ] Smoke-check target scenarios.

### Phase 8: Desktop optimization
- [x] Decompose `apps/desktop/src/repo/localPgliteRepo.ts` into modular localPglite handlers/codecs.
- [x] Extract desktop boot and menu runtime orchestration into focused modules.
- [x] Parallelize desktop boot prerequisites (fonts + local DB prep) to reduce startup latency.

## Import Migration Matrix
| Old import | New import |
|---|---|
| `@stagistic/editor-core` | `@stagistic/script-core` |
| Script/document/settings exports from `@stagistic/shared` | `@stagistic/script-core` |
| `isApplePlatform` from `@stagistic/shared` | `@stagistic/platform-core` |
| `MENU_EVENT_NEW_SCRIPT`, `MENU_EVENT_IMPORT_SCRIPT` from `@stagistic/app-core` | `@stagistic/platform-core` |

## Acceptance Criteria
- No source import remains for `@stagistic/editor-core`.
- `@stagistic/shared` exports only generic utilities.
- New packages provide stable public APIs and compile.
- Mandatory large-file decomposition completed without behavior regression.
- Workspace build/lint/type checks pass.
