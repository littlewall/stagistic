# Rewrite TODO Plan (Full Platform + Strangler)

## Shrnutí
- Cíl je přepsat architekturu podle [decisions.md](/Users/milanzitka/dev/stagistic/docs/decisions.md) (D1–D18) z aktuálního monolitu (`fountainBlock`, `script_latest`, `ScriptRepository` v1) na normalizovaný, modulární model.
- Scope je `Full platform`, ale `D16` pouze v režimu `Views only` (permissions enforcement se zatím neaktivuje).
- Rollout je `Strangler`: dočasně poběží legacy a rewrite cesta paralelně za feature flagy, s řízeným cutoverem.

## Zdrojové dokumenty
- [decisions.md](/Users/milanzitka/dev/stagistic/docs/decisions.md)
- [architecture-overview.md](/Users/milanzitka/dev/stagistic/docs/architecture-overview.md)
- [database.md](/Users/milanzitka/dev/stagistic/docs/database.md)
- [editor.md](/Users/milanzitka/dev/stagistic/docs/editor.md)
- [state-management.md](/Users/milanzitka/dev/stagistic/docs/state-management.md)
- [sync.md](/Users/milanzitka/dev/stagistic/docs/sync.md)

## Cílový TODO dokument
- Vytvořit master checklist: [rewrite-todo.md](/Users/milanzitka/dev/stagistic/docs/rewrite-todo.md).
- Formát každé položky: `ID`, `stav`, `owner`, `závislosti`, `akceptační kritérium`.
- Statusy: `todo`, `in_progress`, `blocked`, `done`.
- Každá fáze níže se do tohoto souboru přepíše 1:1 jako checklist.

## Fáze 0: Guardrails a rollout kostra
- [ ] `RW-000` Založit feature flagy: `rewrite_db_v2`, `rewrite_editor_v2`, `rewrite_state_v2`, `rewrite_repo_v2`, `rewrite_layers_views`, `rewrite_scene_versions`.
- [ ] `RW-001` Přidat runtime přepínač flagů do desktop i web bootstrapu.
- [ ] `RW-002` Zavést compatibility policy: žádné odstranění legacy API před fází cutover.
- [ ] `RW-003` Přidat baseline metriky: load time editoru, latency typing, error rate migrace.
- [ ] `RW-004` Dopsat do TODO mapování D1–D18 na konkrétní deliverables.
Gate: aplikace běží beze změny chování s vypnutými flagy.

## Fáze 1: DB schema v2 (core + full platform tabulky)
- [x] `RW-100` Přidat migraci `0006_normalize_blocks.sql` podle D1/D3/D8 (script_blocks, scenes, acts, locations, block refs).
- [x] `RW-101` Rozšířit `script_characters` o `notes`, `backstory`.
- [x] `RW-102` Přidat migraci `0007_layers_views_annotations.sql` (`script_layers`, `script_block_annotations`, `script_views`).
- [x] `RW-103` Přidat migraci `0008_scene_versions_and_production_entities.sql` (`script_scene_versions`, `script_props`, `script_costumes`, `script_cue_sheets` + junction tabulky).
- [x] `RW-104` Připravit `script_members` a `script_permissions` schema/query scaffold bez enforcementu.
- [x] `RW-105` Přidat plánovanou cleanup migraci `0009_drop_legacy_tables.sql` (spouští se až po cutoveru).
- [x] `RW-106` Aktualizovat [packages/db/src/schema.ts](/Users/milanzitka/dev/stagistic/packages/db/src/schema.ts) a query exporty.
Gate: migrace projdou na čisté DB i na legacy DB snapshotu bez ztráty dat.

## Fáze 2: Data migrace a parity validace
- [x] `RW-200` Implementovat jednorázový migrátor `script_latest.content_json -> script_blocks` (`packages/db/scripts/migrate-json-to-blocks.ts`).
- [x] `RW-201` Přidat validační script: rebuild dokumentu z `script_blocks` a porovnání s původním JSON.
- [x] `RW-202` Přidat lazy fallback: pokud script nemá `script_blocks`, dočasně načíst legacy a vyvolat migraci.
- [x] `RW-203` Zalogovat migrace s výsledkem `success|partial|failed` pro audit.
Gate: 100% parity na testovacím datasetu, nulová ztráta bloků/pořadí/character refs.

## Fáze 3: Script-core v2 model
- [x] `RW-300` Převést `ScriptDocument` z `fountainBlock + attrs.blockType` na explicitní node-per-type.
- [x] `RW-301` Dodat mapování `node_type <-> block_type` dle D2/D9.
- [x] `RW-302` Refaktor indexace a struktur helperů na nové node names.
- [x] `RW-303` Přidat kompatibilní převodníky `legacy <-> v2` pro strangler režim.
- [x] `RW-304` Označit legacy konstanty a helpery jako deprecated.
Gate: serializer/parser/indexing funguje pro legacy i v2 vstup.

## Fáze 4: Editor UI v2
- [x] `RW-400` Zavést `createFountainNode(config)` a samostatné node soubory pro všechny block typy.
- [x] `RW-401` Rozdělit `FountainBlockExtension` na `FountainBehaviorExtension`, `CharacterTagDecorationsExtension`, `StructureMarkerDecorationsExtension`.
- [x] `RW-402` Přidat `PlaceholderExtension` a `FountainDetectionExtension`.
- [x] `RW-403` Implementovat `AnnotationDecorationsExtension` (D10 revised) nad `script_block_annotations`.
- [x] `RW-404` Implementovat layer/view filtering v editoru (`LayerToggle`, `ViewFilter` behavior).
- [x] `RW-405` Zachovat D17 implicitní character grouping při move/delete/copy.
- [x] `RW-406` Přesunout app-level shortcuty na `@tanstack/react-hotkeys` (D18), editor-internal nechat v ProseMirror.
Gate: plná funkční parita editace + nové annotation/layer/view chování za flagem `rewrite_editor_v2`.

## Fáze 5: State pipeline v2
- [x] `RW-500` Zavést TanStack DB collections v [packages/app-core/src](/Users/milanzitka/dev/stagistic/packages/app-core/src).
- [x] `RW-501` Zavést TanStack Pacer (`wait=400ms`, `maxWait=2000ms`) pro flush do PGlite.
- [x] `RW-502` Zavést TanStack Store pro ephemeral UI state (`activeBlockId`, `sidebarTab`, `scrollPosition`).
- [x] `RW-503` Implementovat `BlockDiffEngine` (fast/medium/full path) a `BlockSyncController`.
- [x] `RW-504` Přepojit sidebar mutace na collections + pacer (bez editor roundtripu).
Gate: typing path má stabilní nízkou latenci, debounced flush je deterministický, UI je optimistic.

## Fáze 6: Repository v2 + shared bootstrap
- [x] `RW-600` Rozdělit [packages/sync-core/src/scriptRepository.ts](/Users/milanzitka/dev/stagistic/packages/sync-core/src/scriptRepository.ts) na composite sub-repositories.
- [x] `RW-601` Zavést query moduly `blocks/scenes/acts/locations/blockCharacterRefs/layers/annotations/views/sceneVersions/props/costumes/cueSheets`.
- [x] `RW-602` Přesunout PGlite bootstrap do shared db layer dle D12 a používat ho v obou appkách.
- [x] `RW-603` Dodat legacy adapter, který mapuje staré `ScriptRepository` volání na nové repos.
- [x] `RW-604` Opravit web app wiring, aby používala repository provider stejně jako desktop.
Gate: desktop i web běží přes v2 repo za flagem `rewrite_repo_v2`, legacy API stále dostupné přes adapter.

## Fáze 7: Full platform features (Views-only ABAC depth)
- [x] `RW-700` Implementovat CRUD a UI pro `script_layers`.
- [x] `RW-701` Implementovat CRUD a UI pro `script_views` + aktivní view přepínání.
- [x] `RW-702` Implementovat offset mapping lifecycle anotací (`active`, `orphaned`, `resolved`).
- [x] `RW-703` Implementovat user-initiated scene snapshots (`script_scene_versions`) v UI scény.
- [x] `RW-704` Implementovat data vrstvu a minimální UI scaffold pro props/costumes/cue sheets.
- [x] `RW-705` Přidat `script_members`/`script_permissions` pouze jako schema + query scaffold bez enforcementu.
Gate: view filtrování a scene versioning jsou funkční; permissions logika není vynucena.

## Fáze 8: Cutover a cleanup
- [x] `RW-800` Zapnout v2 flagy defaultně pro desktop canary.
- [x] `RW-801` Po stabilizaci zapnout v2 default i pro web.
- [x] `RW-802` Odstranit legacy editor části (`FountainBlockExtension`, `ScriptSidebarProjectionExtension`, `ScriptBlockIndexExtension`, `EditorLiveStore`).
- [x] `RW-803` Odstranit legacy DB tabulky migrací `0009_drop_legacy_tables.sql`.
- [x] `RW-804` Odebrat legacy repository adapter a deprecated API exports.
- [x] `RW-805` Aktualizovat docs tak, aby `decisions` + implementace byly konzistentní.
Gate: žádné runtime volání do legacy cest, žádné reference na odstraněné tabulky/typy.

## Důležité změny veřejných API/typů
- `@stagistic/sync-core`: monolitické `ScriptRepository` metody se přesunou na composite API (`scripts`, `blocks`, `scenes`, `acts`, `characters`, `locations`, `configs`, `blockCharacterRefs`, `layers`, `annotations`, `views`, `sceneVersions`).
- `@stagistic/script-core`: `ScriptDocument` přestane být založený na `fountainBlock`; veřejné helpery budou pracovat s node-per-type.
- `@stagistic/editor-ui`: registrace extensions se změní na modulární; `FountainBlockExtension` bude odstraněn.
- `@stagistic/db`: přibudou nové tabulky a query moduly; legacy tabulky budou dočasně read-compatible a pak odstraněny.
- `@stagistic/app-core`: data přístup se přesune na TanStack DB/Pacer/Store hooky místo legacy projection/index přístupu.

## Testy a scénáře
1. Migrace legacy scriptu zachová pořadí bloků, block typy, text, marks, refs.
2. Rebuild dokumentu z `script_blocks` je ekvivalentní k původnímu dokumentu.
3. Fast-path typing generuje pouze 1 `update` změnu bloku.
4. Enter/Tab/Delete/Paste správně produkují `insert/update/delete` s korektním `order_no`.
5. Drag&drop scén/aktů synchronizuje editor i DB bez rozbití FK vazeb.
6. Layer visibility přepíná pouze decorations bez změny textového document state.
7. Editace textu správně remapuje annotation offsety; smazání textu označí anotaci `orphaned`.
8. Scene snapshot vytvoří verzi pouze pro danou scénu a restore funguje izolovaně.
9. Desktop i web používají stejný repository/bootstrap a mají stejné chování.
10. Strangler flags umožní bezpečný rollback na legacy cestu bez ztráty dat.
11. Build a lint gates: `pnpm lint`, `pnpm build`, `pnpm db:check`, `pnpm db:compile-migrations`.
12. Performance gate: load velkého scriptu splní cílový budget uvedený v docs (`<500ms` end-to-end target).

## Doplňující TODO
- [ ] `RW-900` Script Info panel: přidat UI pro editaci `script_title_page_fields` (title page metadata z importu).
- [ ] `RW-901` Přidat UI review/edit toku pro `script_scenes.synopsis` importované z Fountain `=` řádků.

## Předpoklady a zvolené defaulty
- Scope je `Full platform`, ale ABAC enforcement je mimo tento rewrite; implementuje se pouze views/layers runtime filtrování.
- Cloud sync/collaboration se v této vlně neimplementují, outbox zůstává připravený.
- Rollout je strangler s desktop canary před web default cutoverem.
- Master TODO bude veden centrálně v [rewrite-todo.md](/Users/milanzitka/dev/stagistic/docs/rewrite-todo.md).
- Legacy kompatibilita se drží až do fáze cleanup, aby šel kdykoli provést rollback.
