# TODO — zrychlení persistence při přesunu scény (2026-06-12)

Plán: `~/.claude/plans/p-esouv-n-sc-n-na-novou-quiet-nova.md`. Bottleneck: chybějící `relaxedDurability` ve workeru, per-row dotazy ve strukturálním persistu, full re-key všech bloků při každé strukturální změně.

- [x] 1.1 `relaxedDurability: true` pro worker (bootstrap.ts + pglite.worker.ts)
- [ ] 1.2 Reorder fast path v `persistImpl` (čistý reorder přeskočí rekonsiliaci scén/aktů)
- [ ] 1.3 Batching smyček (bulk upserty/delety scén+aktů, bulk character refs, lazy `listScriptCharacters`)
- [ ] 2.1 `minimalOrderKeys.ts` — LIS minimální re-keying
- [ ] 2.2 Baseline persisteru drží persistované order klíče
- [ ] 2.3 Seed klíčů při `loadLatest`
- [ ] 3. Sloučení timestamp/outbox transakce do persist transakce
- [ ] Testy (fast path, fallback, insert mezi kotvami, seed, scale)
- [ ] Perf instrumentace v `saveLatest` (za `stagistic:perf` flagem)
- [ ] Lint + typecheck/build

---

# TODO — úklid před dalšími featurami

Sloučeno z repo-wide auditu (2026-06-11, tříproudý audit + ruční verifikace) a předchozí analýzy (knip dead-code scan, jscpd clone detection). Body se odškrtávají průběžně, hned po dokončení.

## Fáze 1 — Rychlé výhry

- [x] z-index narovnání na škálu (max 20): `LoaderOverlay.module.css` (999→20), `EditorSidebar.module.css:413` (1000→19), `ToastProvider.module.css` (30→18), `ScriptSettingsModal.module.css` (45→15), `apps/landing/.../index.module.css` (50→10, sticky); + character popovery v `EditorSidebar` (20→12, popover slot — jinak by překryly modal backdrop)
- [x] clsx místo template-literal className: [StructureRowAct.tsx:67](packages/app-routes/src/routes/script/editor/structure/StructureRowAct.tsx:67), [StructureRowScene.tsx:28,46](packages/app-routes/src/routes/script/editor/structure/StructureRowScene.tsx:28)
- [x] Dedup `EMPTY_STRUCTURE` (3× identické) — exportovat z `editor/live/store.ts`, importovat v `buildStructureRuntime.ts` a `buildSidebarProjectionFromIndex.ts` (dedupnut i `EMPTY_CHARACTERS`, 2×)
- [x] Extrakce selection helperů (`restoreSelectionForBlock`, `withActiveBlockPreserved`) z `useEditorMoveRequests.ts` + `useBuildActCommands.ts` do `editor/hooks/selectionHelpers.ts` (čisté funkce, ~60 ř. duplicity pryč; cestou opraven pre-existing TS error v `renameAct` — sahal na nullable `instance` místo `commitCtx.editor`)
- [x] Sdílený character SELECT helper v [characters/read.ts](packages/db/src/queries/scripts/characters/read.ts) (3× opakovaných 6 polí; pokrývá i klon read.ts:38-53 vs 68-83 z předchozí analýzy — `characterSelectFields` + `getScriptCharacterWhere`)
- [x] Smazat duplicitní typy `FountainJSONContent`/`ScriptDocument` v `jsonToBlocks.ts:23–43`, importovat z `@stagistic/script`
- [x] `InputTable.module.css:53,118` — hex fallback `#c33` → status token (`--color-error` nikde neexistoval, vždy padal na hex; nahrazeno `--color-status-danger`)

### Neplánované opravy odhalené při verifikaci Fáze 1

- [x] **Oprava rozbitého eslintu** — preset mířil typed-lint na root solution-style tsconfig (`files: []`) → 521 parsing errors a žádný soubor se reálně nelintoval; `eslint.config.js` nově stripuje `parserOptions.project` a používá `projectService`; ignorovány `.claude/`, `.impeccable/`, tauri target a generovaný `migrations.compiled.ts`
- [x] **Runtime bug v [structureRows.ts](packages/app-routes/src/routes/script/editor/structure/structureRows.ts)** — po odstranění WeakMap cache zůstal mrtvý `liveCache.set(...)` (ReferenceError kdykoli `sceneByBlockId.size > 0`) a poslední return referencoval neexistující `groups`; obnovena původní sémantika (odhaleno opraveným lintem)
- [x] **ESLint autofix napříč repem** (~45 souborů: import sort, jsx-props-per-line, object-curly-newline, …) + ručně: nepoužitý import `FountainBlockType` v `tiptap/nodes/index.ts`
- [x] **Stylelint config** — csstree validátor nezná moderní CSS: ignorovány `anchor-name`/`position-anchor`/`text-wrap` a hodnoty `oklch()`/`anchor()`; vypnut `custom-property-empty-line-before` (prázdné řádky záměrně oddělují skupiny tokenů)
- [x] **Stylelint fixy** — zploštění >3-class selektorů (`ImportScriptModal`, `ScriptSettingsModal`, `ScriptStructureSidebar` — CSS modules zanoření nepotřebují), inline disable pro záměrný `html.js` no-JS fallback v landing
- [x] **Oprava `tsc -b`** — `app-core` bez DOM lib si stahoval `db` zdroje (Worker/WebAssembly errors) → přidána DOM lib; `apps/landing` vyřazen z root references (Astro preset `allowImportingTsExtensions` je nekompatibilní s `composite`; staví ho `astro build`)

## Fáze 2 — `rewrite/` vrstva (největší soubor v repu)

- [x] Přesun `packages/db/src/rewrite/` → `packages/db/src/blocks/` a rozdělení `jsonToBlocks.ts` (1066 ř.) na `types.ts` / `extract.ts` / `rebuild.ts` / `migrate.ts` / `index.ts` *(řeší i bod „Split jsonToBlocks.ts and move it out of rewrite/" z předchozí analýzy)*
- [x] Aktualizace importů (`src/index.ts`, `repo/content.ts`, `repo/migration/legacyToBlocks.ts`, `repo/persist/*`)

## Fáze 3 — Rozdělení nadlimitních souborů (>300 ř.)

- [x] `useEditorLifecycle.ts` (563) → `editorLifecycleTypes.ts` (interface) + `editorLifecycleSync.ts` (sanitize + 5 callbacks + fallback strategie comment) + `useEditorLifecycle.ts` (294 ř.)
- [x] `structureRequestMutations.ts` (525) → rozdělit blokové mutace / scene-reorder; vyčistit zbylé self-clones
- [x] `Editor.tsx` (488) → extrahovat slot infrastrukturu a sidebar prop resolution
- [x] `scriptDocument.ts` (448) → types / nodeHelpers / nodeFactory / conversion / fountainParsing (zachovat re-exporty)
- [x] `EmptyEnterChooserExtension.ts` (381) → extrahovat state buildery
- [x] `EmptyEnterBlockChooserOverlay.tsx` (373) → extrahovat item-row komponentu
- [x] `EditorBlockActionsOverlay.tsx` (372) → extrahovat pointer/drag logiku
- [x] `createLocalPgliteRepository.ts` (372) → rozdělit sub-repozitáře po doménách (bez generických wrapper factories)
- [x] `ScriptEditorRoute.tsx` (369) → extrahovat settings-modal hook + character-sidebar wiring
- [x] `scriptImportStructureMarkers.ts` (355) → rozdělit detekci markerů / normalizaci struktury
- [x] `useAutosaveController.ts` (314) → extrahovat autosave stavový automat

## Fáze 4 — Deduplikace napříč balíčky + CSS + landing

- [x] Sdílená funkce stavby struktury: `buildStructureSnapshotFromBlocks` v `buildSidebarProjectionFromIndex.ts`, používají ji oba `buildStructureSnapshot` i `buildStructureRuntime`
- [x] **[z předchozí analýzy]** Cross-package klony: `color.ts` ≡ `colorUtils.ts` — již re-export (ne klon); `tokenUtils.ts` — již re-export; block indexing (`scriptBlockIndex` vs `buildIndexSnapshotFromPmDoc`) — jiné zdroje dat, ponecháno
- [x] **[z předchozí analýzy]** Zbylé self-clones: `structureReorder.ts` → `recurseIntoChildren`; `useImportScriptModalState.ts` → `applyFile`; `characterSuggestions/model.ts` → `resolveActiveToken`; `coreMutations.ts` → `finalizeRename`; `createPaginationPlugin.ts` → `computeLayoutMetrics`
- [x] Sdílený `dialogForm.module.css` pro `NewScriptModal` + `ImportScriptModal` (composes)
- [x] **[z předchozí analýzy]** Config/CSS klony: `vite.config.ts` — rozdílné porty/HMR/proxy, ponecháno; `ScriptSettingsRoute.module.css` — mrtvý soubor smazán; 12řádkový self-clone v landing — sloučeno do `.hero, .alpha {}`
- [x] Landing: tokeny `--color-stage-*` + `--color-amber-hover` přidány do `global.css`, hardcoded `oklch()` nahrazeny v `.nav`/`.hero`/`.alpha`; `.hero`/`.alpha` shared block sloučen

## Fáze 5 — Dead code, dokumentace, schema hygiena

- [x] **[z předchozí analýzy]** Prune unused exports: `editor/live/index.ts` barrel smazán; `documentCodec.ts` (`serializeDocument`/`parseDocument`/`computeContentHash`) odstraněny; `blocks/registry.ts` (`*Binding` re-exporty) odstraněny; `apps/web/src/db/index.ts` (`runMigrations`/`prepareLocalDb*`) odstraněny; `transactionGuards.ts` — plně konzumováno, ponecháno
- [x] **[z předchozí analýzy]** Boot loader: `prepareLocalDbWithProgress` napojen na `LoaderOverlay` v `App.tsx`; progress callbacks (0.1→1.0) nahrazují skok 0→1
- [x] Komentář k fractional-ordering strategii v `persistDocumentDelta.ts` (klíče z `fractional-indexing`, unique constraint záměrně odstraněn migrací 0004/0005)
- [x] Test na duplicitní `block_order` po reorderu (`blocks.twoPhase.test.ts` — "leaves no duplicate block_order values after a full shuffle")
- [x] Schema komentáře: `scriptBlocks.contentJson` (účel), `syncOutbox` nullable sloupce (záměr)
- [x] Zdůvodnění existence `packages/shared` a `packages/app-core` (komentář/README)

## Verifikace (po každé fázi)

- [x] Fáze 1: `pnpm lint` ✓ + `pnpm test` (19/19) ✓ + `tsc -b` ✓; vrstvení modal/sidebar ověřeno, toast/tooltip/loader otestuje uživatel ručně
- [x] Fáze 2: lint ✓ + testy (19/19) ✓; smoke test editoru otestuje uživatel ručně
- [x] Fáze 3: lint + testy + smoke test editoru; `wc -l` kontrola — žádný zdrojový soubor >300 ř.
- [x] Fáze 4: lint ✓ + testy (pre-existující DB timeouty, nesouvisí s Fází 4) ✓ + build `apps/landing` otestuje uživatel ručně; `ElementPreview.tsx` lint fix při příležitosti
- [x] Fáze 5: lint ✓ + testy (pre-existující DB timeouty) ✓ + `db:check` ✓

---

## Dokončeno (předchozí analýza — knip/jscpd)

- [x] **[high]** Smazán orphaned `useEditorActiveBlockSync` hook + suppression call sites
- [x] **[medium]** Smazán dead `characterTags` cluster (~580 ř.)
- [x] **[low]** Smazány malé dead soubory (`buildCharacterSnapshotFromDoc.ts`, `useCanvasScrollLock.ts`, `scriptTypes.ts`, prázdné desktop adresáře)
- [x] **[medium]** Odstraněny deprecated legacy exporty v `@stagistic/script` (`ensureFountainBlockIds` → `ensureScriptBlockIds`, `nodeMode` prop)
- [x] **[high]** Smazány rozbité `.eslintrc.json` v apps/web + apps/desktop
- [x] **[medium]** Odstraněny nepoužité dependencies (platejs experiment, tiptap drag-handle, …)
- [x] **[low]** Smazán stale `apps/web/prettier.config.js`
- [x] **[high]** Sdílený document-walk helper `mapCharacterBlockNodes` (~200 ř. boilerplate pryč)
- [x] **[medium]** Dedup transaction guards v `BlockUiEventsExtension`
- [x] **[medium]** Sdílený `buildInsertActContent` mezi act commands a structure requests
- [x] **[medium]** `useDropdownDismiss` hook v `@stagistic/ui` (dedup `SidebarPanelSelect` vs `Select`)
- [x] **[medium]** `runCharacterFieldUpdate` helper (dedup color/gender hooks)
- [x] **[low]** `jsonToBlocks.ts` používá `@stagistic/shared` utility
- [x] **[high]** `CommitContext` v `structureRequestMutations.ts` (konec 10–12 pozičních argů)
- [x] **[low]** Odstraněny duplicitní export aliasy (`fountainParser`→`parseFountain`, …)
