# Test coverage roadmap

Branch: `tests`. Goal: incremental march toward ~100% coverage, per-package (vitest / `vp test`).
Run a single package: `pnpm --filter @stagistic/<pkg> test`.

## Tier 1 — `script` (pure domain logic)
- [x] `settings/options.ts` — `isBlockShortcut`, `clampCharacterColorSaturation`
- [x] `settings/normalize.ts` — `normalizeEditorSettingsBlockType`
- [x] `settings/merge.ts` — `mergeEditorSettings`
- [x] `structure/structureUtils.ts` — `normalizeActName`, `getDefaultActName`, `resolveStructureSettings`
- [x] `structure/collectStructureBlocks.ts` — `collectStructureBlocks`
- [x] `structure/outline.ts` — `buildScriptStructureOutline`
- [x] `indexing/scriptBlockIndex.ts`
- [x] `document/coerceUnknownBlocks.ts`

Also normalized all `script` test imports from `vitest` → `vite-plus/test` (type-aware lint
sees the bundled types; raw `vitest` is not a package dep). Pre-existing source lint debt
remains in `characterRefsInScriptDocument.ts` and `scriptDocumentHelpers.ts` (autofixable).

## Tier 2 — `db` (data integrity, pglite infra exists)
- [x] `repo/persist/minimalOrderKeys.ts` — fractional-indexing ordering
- [x] `repo/documentCodec.ts` — encode/decode
- [x] `repo/characterHandlers/normalization.ts`
- [x] character read/write queries (pglite integration via createTestDb)

Fixed per-package isolation: `db`/`script` lacked a `vite.config.ts`, so
`vp test` followed workspace symlinks in node_modules and ran dependency
packages' tests too (db pulled in all of script's). Added scoped configs
(`include: ['src/**/*.test...']`) mirroring editor; registered both in
`eslint.config.js` allowDefaultProject. Now db runs 10 files, not 24.

## Tier 3 — `shared` (quick wins, wire up `test` script) ✅
- [x] `ids/nodeId.ts`, `ids/uuidv7.ts`
- [x] `utils/number.ts`, `object.ts`, `string.ts`, `platform.ts`
- [x] added `test` script + scoped `vite.config.ts` (registered in eslint.config.js)

## Tier 4 — `editor` browser tests ✅
- [x] `characterTagInput` — confirm-on-select (linked pill) + Escape closes overlay
      (existing overlay test already covered typing/filtering/blur persistence)
- [x] pagination split — divider appears when content overflows a page
      (asserts `[data-pagination-divider]`, not the always-present trailing spacer;
      verified via mutation that a single page produces none)

## Later — React (`ui`, `app-routes`, `app-core`)
- [ ] needs per-package browser config + setup
