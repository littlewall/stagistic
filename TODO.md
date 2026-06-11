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

- [ ] Sdílená funkce stavby struktury (jádro `buildStructureRuntime` / `buildSidebarProjectionFromIndex`)
- [ ] **[z předchozí analýzy]** Cross-package klony: character color math ([script/color.ts](packages/script/src/characters/color.ts) ≡ [ui/colorUtils.ts](packages/ui/src/editor-panels/characterRowConfirmed/colorUtils.ts)), block indexing ([scriptBlockIndex.ts:175-194](packages/script/src/indexing/scriptBlockIndex.ts:175) ≡ [buildIndexSnapshotFromPmDoc.ts:144-166](packages/editor/src/editor/runtime/buildIndexSnapshotFromPmDoc.ts:144)), token scanning ([characterTokenScan.ts:42-64](packages/editor/src/editor/characters/characterTokenScan.ts:42) ≡ [tokenUtils.ts:8-30](packages/editor/src/editor/components/characterSuggestions/model/tokenUtils.ts:8)) — přesunout do nejnižšího vlastnícího balíčku
- [ ] **[z předchozí analýzy]** Zbylé self-clones: `structureReorder.ts:71-84 vs 161-174`, `useImportScriptModalState.ts:135-156 vs 163-184`, `characterSuggestions/model.ts:75-88 vs 179-192`, `coreMutations.ts:132-158 vs 162-186`, `createPaginationPlugin.ts:108-119 vs 221-231`
- [ ] Sdílený `dialogForm.module.css` pro `NewScriptModal` + `ImportScriptModal`
- [ ] **[z předchozí analýzy]** Config/CSS klony: `apps/desktop/vite.config.ts` ≡ `apps/web/vite.config.ts`, `PageHeader.module.css` zkopírovaný do `ScriptSettingsRoute.module.css`, 12řádkový self-clone v landing `index.module.css`
- [ ] Landing: lokální CSS tokeny v `global.css`, nahradit hardcoded `oklch()` v `index.module.css`

## Fáze 5 — Dead code, dokumentace, schema hygiena

- [ ] **[z předchozí analýzy]** Prune ~70 unused exports a 52 unused exported types (`npx knip --include exports,types`): `editor/live/index.ts` barrel, `documentCodec.ts` (`serializeDocument`/`parseDocument`/`computeContentHash`), `blocks/registry.ts` (`*Binding` exporty), `transactionGuards.ts`, `apps/web/src/db/index.ts` (`runMigrations`/`prepareLocalDb*`)
- [ ] **[z předchozí analýzy]** Boot loader: napojit `prepareLocalDbWithProgress` na `LoaderOverlay` (progress teď skáče 0→1), nebo progress UI zjednodušit
- [ ] Komentář k fractional-ordering strategii v `persistDocumentDelta.ts` (klíče z `fractional-indexing`, unique constraint záměrně odstraněn migrací 0004/0005)
- [ ] Test na duplicitní `block_order` po reorderu (vitest + PGlite)
- [ ] Schema komentáře: `scriptBlocks.contentJson` (účel), `syncOutbox` nullable sloupce (záměr)
- [ ] Zdůvodnění existence `packages/shared` a `packages/app-core` (komentář/README)

## Verifikace (po každé fázi)

- [x] Fáze 1: `pnpm lint` ✓ + `pnpm test` (19/19) ✓ + `tsc -b` ✓; vrstvení modal/sidebar ověřeno, toast/tooltip/loader otestuje uživatel ručně
- [x] Fáze 2: lint ✓ + testy (19/19) ✓; smoke test editoru otestuje uživatel ručně
- [x] Fáze 3: lint + testy + smoke test editoru; `wc -l` kontrola — žádný zdrojový soubor >300 ř.
- [ ] Fáze 4: lint + testy + build `apps/landing`
- [ ] Fáze 5: lint + testy + `pnpm db:check`

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
