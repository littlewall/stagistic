# Board — krok 3: Metadata scén a postav

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Delegovat jen podle výslovně zvolené metody. Nikdy nestageovat ani necommitovat.

**Goal:** Na kartě scény psát outline, přidávat postavy a psát jim větu (posun, motivace). Záznamy na kartě žijí nezávisle na scénáři a Board ukazuje, kdy se se scénářem rozešly.

**Architecture:** Doklady ze scénáře dál počítá čistý model z dokumentu (`buildSceneBoardModel`). Uživatelská metadata jsou v DB, klíčovaná ID scene headingu: outline v `script_scenes.synopsis`, záznamy postav v nové tabulce `script_scene_characters` bez FK na `script_scenes`. Smazání headingu metadata jen deaktivuje; vrácení headingu (undo) je obnoví. Definitivní úklid proběhne při vytvoření draftu nebo verze. Board spojí doklady a záznamy ve view modelu Wall.

**Tech Stack:** Drizzle + PGlite (`packages/db`), reaktivní zdroje a hooky (`packages/db/src/reactive`, `app-core`), stepkg (`packages/stepkg`), React Aria přes `@stagistic/ui`, Vite+ node/browser testy, moon.

**Spec:** [2026-10-27-scene-board-design.md](../specs/2026-10-27-scene-board-design.md), sekce „Model postav ve scéně“ (včetně „Identita scény“), „Wall“, „Data“ a krok 3 v „Pořadí dodávek“.

## Global Constraints

- Nikdy nestageovat ani necommitovat. Na konci každé části připravit návrh commit message.
- Dvě samostatně mergnutelné části: **3a data** (úlohy 1–7) a **3b karta** (úlohy 8–12). 3a nemění vzhled karty kromě zrušení úrovně „zmíněná“.
- Po každé změně `packages/db/src/schema` nebo `drizzle/*.sql` spustit `moon run db:db-compile-migrations` (`db:generate` to dělá sám).
- `SCRIPT_DOCUMENT_SCHEMA_VERSION` se nemění: dokument ani jeho význam se nemění, jde o DB a stepkg.
- Pravidla identity scény ze specu jsou závazná: rozdělení = nová scéna bez metadat; smazání headingu = deaktivace, úklid při draftu/verzi; undo = obnova; copy/paste = nové ID bez metadat; přesun = metadata jdou se scénou.
- Změny metadat nejsou v historii dokumentu (undo/redo Boardu je nevrací). V textovém poli platí Escape a undo prohlížeče.
- Board uložené verze nebo draftu je jen pro čtení, metadata ukazuje ze snapshotu. Guardy i v repository/akcích, ne jen v UI.
- `arcValue` se v kroku 3 jen ukládá, přenáší a kopíruje; editace přijde s Arcs (krok 5).
- Mimo rozsah: Matrix, Arcs, Numbers, editace barvy a míst scény na Boardu.
- Anglické UI, soubory do 300 řádků, prezentační komponenty v `ui`, orchestrace v `app-routes`, data v `db`/`app-core`.
- Kontroly přes moon a sdílený runner (`moon run root:verify -- …`), browser suity postupně, jeden vlastník finální verifikace. `root:test-all` až před mergem.

## Review Focus

1. Smazání headingu a undo v Editoru i na Boardu: synopse, barva, místa a věty postav se vrátí. Testy úloh 3 a 12.
2. Draft, verze a záložní draft při obnovení: neaktivní data zmizí z DB i ze snapshotu, aktivní zůstanou. Testy úlohy 4.
3. Stepkg: starší balíček bez nové sekce, remap ID bloků a postav, duplikace skriptu, obnova snapshotu. Testy úlohy 5.
4. Postava smazaná ze scény ve scénáři zůstane na kartě s prázdným kolečkem a větou; postava s dokladem nejde z karty odebrat. Testy úloh 8 a 10.
5. Skupiny, nepotvrzené postavy, filtr a sbalené karty se záznamy jen na kartě. Testy úloh 1 a 8.

## Co už existuje

- `buildSceneBoardModel` (`packages/script/src/board`) počítá doklady z bloků `character`, `stageDirection`, `aside` (přítomná) a `dialogue`, `lyrics` (zmíněná). Character tag jde v editoru napojit jen v `stageDirection` (`characterTagInput/composeState.ts`).
- `reconcileActsAndScenes.ts` při strukturálním uložení zachová synopsi, barvu a místo přeživších scén, řádky zmizelých scén ale smaže (s nimi i `script_scene_locations` přes cascade). Totéž platí pro `rebuildScriptProjection.ts`.
- ID scény je deterministické: `makeSceneId(scriptId, headingBlockId)` v `packages/db/src/blocks/extract.ts`. Vrácený heading dostane stejný řádek.
- Synopse se dnes zapisuje jen při importu (`extractHelpers.ts`, `sceneSynopses`); UI ani zápisové API neexistuje. Vzor API: `replaceSceneAssignments` v `repo/locations.ts` (transakce, timestamp skriptu, `recordOutbox`, `syncDb`).
- Snapshoty: `repo/snapshots.ts` (`create` pro draft i verzi), `app-core/src/snapshots/scriptSnapshotOperations.ts` (vytvoření z aktuálního stavu, obnova se záložním draftem).
- Stepkg: povinné soubory v `readStepkg.ts` (`REQUIRED_PATHS`), volitelná sekce má vzor v `data/comments.json`. Remap: `remapStepkgBlockIds.ts`, `remapStepkgIds.ts`. Zdroj a zápis balíčku: `scriptPackageSource.ts`, `scriptPackageWrite.ts`, `repo/package/importPackage.ts`, `readScriptPackageSource.ts`. Duplikace: `queries/scripts/duplicate.ts`.
- Reaktivní zdroje: `repo/createLocalPgliteReactiveSources.ts` (např. `getScriptSceneLocationsSource`); read-only repository pro snapshoty: `repo/readOnlyScriptRepository.ts`.
- Paste: `@tiptap/extension-unique-id` (`useEditorExtensions.ts`) přiděluje nová ID duplicitním blokům. Ověřit testem, že vložený heading dostane nové ID a že cut + paste ID zachová (chová se jako přesun).
- Modaly `DeleteSceneHeadingModal.tsx` a `ConvertSceneHeadingModal.tsx` dnes říkají „Its synopsis and places“.
- Wall: `buildWallView.ts`, `BoardSceneItem.tsx`, `SceneCard`, `CharacterChipStack`, `boardPreferences.ts` (`showOnStage`, `showMentioned`), `BoardViewMenu`.

## Soubory a odpovědnosti

| Soubor | Odpovědnost |
| --- | --- |
| `packages/db/src/schema/sceneCharacters.ts` | `script_scene_characters`, `script_detached_scenes` |
| `packages/db/src/queries/scripts/sceneCharacters.ts` | list / upsert / delete záznamů, úklid neaktivních |
| `packages/db/src/queries/scripts/detachedScenes.ts` | uložení a obnova metadat zmizelých scén |
| `packages/db/src/repo/sceneMetadata.ts` | repository API: synopse a záznamy postav |
| `packages/db/src/repo/document/persist/reconcileActsAndScenes.ts` | deaktivace a obnova metadat scén |
| `packages/db/src/repo/snapshots.ts` | úklid při vytvoření draftu/verze |
| `packages/stepkg/src/schemas/scene-characters.v1.schema.json` | schéma nové sekce |
| `packages/app-core/src/sceneMetadata/` | reaktivní hooky a akce pro Board |
| `packages/script/src/board/buildSceneBoardModel.ts` | doklady jen z repliky a tagu v režijní poznámce |
| `packages/app-routes/src/routes/script/board/buildWallView.ts` | spojení dokladů a záznamů, stavy čipů, pořadí, filtr |
| `packages/ui/src/board/` | outline, řádek postavy s větou, prázdné kolečko, popover, přidání postavy |

## Část 3a — data

### Úloha 1: Doklady jen z repliky a tagu v režijní poznámce

- [x] V `buildSceneBoardModel` počítat jen cue v `character` a tag v `stageDirection`. Odstranit úroveň `mentioned` z typů modelu, `buildWallView`, `CharacterChipStack` (styl i popisky) a ze sumarizace filtru.
- [x] Odstranit `showMentioned` z `boardPreferences` (staré uložené preference s tímto klíčem se načtou bez chyby) a volbu „Mentioned characters“ z `BoardViewMenu`.
- [x] Testy: tag v `dialogue`, `lyrics`, `aside` a `note` postavu do scény nepřidá; skupina v cue přidá všechny členy; stará preference se načte.

### Úloha 2: Schéma a repository API

- [x] `script_scene_characters`: `script_id` (FK `scripts`, cascade), `heading_block_id` (not null), `character_id` (FK `script_characters`, cascade), `note` (text, null), `arc_value` (integer, null, kontrola −3…3), `created_at`, `updated_at`; PK (`script_id`, `heading_block_id`, `character_id`); index (`script_id`).
- [x] `script_detached_scenes`: `script_id` (FK `scripts`, cascade), `heading_block_id`, `synopsis`, `color_hex`, `location_ids` (jsonb pole), `detached_at`; PK (`script_id`, `heading_block_id`).
- [x] `moon run db:db-compile-migrations`.
- [x] Repository (`ScriptRepository` + implementace + read-only varianta, která zápisy odmítne):
  - `listSceneCharacters(scriptId)`: jen aktivní záznamy (heading existuje v `script_scenes`);
  - `putSceneCharacter(scriptId, headingBlockId, characterId, {note?, arcValue?})`: vytvoří nebo upraví záznam; normalizuje prázdnou větu na `null`;
  - `removeSceneCharacter(scriptId, headingBlockId, characterId)`;
  - `updateSceneSynopsis(scriptId, headingBlockId, synopsis)`: prázdná = `null`; neexistující heading = no-op s výsledkem `false`.
- [x] Každý zápis: transakce, timestamp skriptu, `recordOutbox` (op typy `scene.character.put`, `scene.character.remove`, `scene.synopsis.update`), `syncDb`.
- [x] Testy v `packages/db` (PGlite template přes `createTestDb`): CRUD, cascade při smazání postavy a skriptu, aktivní filtr, odmítnutí v read-only repository.

### Úloha 3: Deaktivace a obnova metadat scény

- [x] V `reconcileActsAndScenes` (a stejné cestě v `rebuildScriptProjection`): před smazáním zmizelých scén uložit jejich synopsi, barvu a místa do `script_detached_scenes` (jen když něco z toho není prázdné).
- [x] Při upsertu scény, jejíž heading má řádek v `script_detached_scenes`, metadata obnovit (synopse, barva, `script_scene_locations`) a řádek smazat.
- [x] Záznamy `script_scene_characters` se při zmizení scény nemažou; neaktivní jsou jen skryté.
- [x] Testy: smazání headingu → synopse, místa a věty zmizí z čtení; dokument s vráceným headingem → vše zpět. Rozdělení scény: nová scéna prázdná, původní beze změny. Copy/paste headingu (editor browser test) dá nové ID. Ověření ukázalo, že cut headingu blokuje stávající `SceneGuard`; vložení jeho kopie přidělí nové ID. Přesuny přes příkazy Editoru/Boardu ID zachovají.

### Úloha 4: Úklid při draftu a verzi

- [x] V `snapshots.create` (draft i verze; záložní draft při obnovení jde stejnou cestou) ve stejné transakci smazat neaktivní `script_scene_characters` a všechny `script_detached_scenes` skriptu. Úklid až po flush dokumentu, který `createScriptSnapshotFromCurrent` dělá.
- [x] Snapshot payload obsahuje jen aktivní záznamy.
- [x] Testy: smazaný heading + nový draft → data pryč a undo je už nevrátí; aktivní data v draftu i po jeho otevření; obnova snapshotu nahradí záznamy daty ze snapshotu.

### Úloha 5: Stepkg, import a duplikace

- [x] Kontrakt `StepkgSceneCharacter` (`headingBlockId`, `characterId`, `note`, `arcValue`, `createdAt`, `updatedAt`) a `sceneCharacters: {items: StepkgSceneCharacter[]}` ve `StepkgSnapshot`; soubor `data/scene-characters.json` se schématem `scene-characters.v1`.
- [x] Zápis v `buildEntries`; čtení v `readStepkg` jako volitelné (chybějící soubor = prázdné pole). Záznamy s neznámou postavou nebo headingem import zahodí s varováním v issues, nespadne.
- [x] `remapStepkgBlockIds` remapuje `headingBlockId`, `remapStepkgIds` remapuje `characterId`.
- [x] `scriptPackageSource` / `readScriptPackageSource`, `scriptPackageWrite` / `importPackage`, `mapScriptPackageSource` a `mapStepkgSnapshotToPackageWrite` v `app-core`.
- [x] `duplicate.ts` kopíruje aktivní záznamy s novými ID skriptu, bloků a postav podle stávajícího mapování.
- [x] Testy: round-trip, starší balíček bez sekce, remap, duplikace, validace.

### Úloha 6: Reaktivní data pro Board

- [x] Reaktivní zdroje `getScriptSceneCharactersSource` a `getScriptSceneSynopsesSource` (synopse podle `headingBlockId`) v `createLocalPgliteReactiveSources`; read-only varianta čte ze snapshotu.
- [x] `app-core`: hooky `useScriptSceneCharacters`, `useScriptSceneSynopses` a akce (`putSceneCharacter`, `removeSceneCharacter`, `updateSceneSynopsis`) s guardem read-only.
- [x] Testy: změna z jiné cesty (např. import) se v hooku projeví; read-only akce odmítne.

### Úloha 7: Modaly smazání a převodu headingu

- [x] `DeleteSceneHeadingModal` a `ConvertSceneHeadingModal`: místo „Its synopsis and places“ vyjmenovat „Its outline, places and character notes from the Board“. Smazání jde vrátit přes Undo, dokud nevznikne draft nebo verze; modal to řekne jednou větou.
- [x] Testy modalů a `deleteAttributeManagerScene` (komentář a chování).
- [x] Návrh commit message pro 3a.

## Část 3b — karta

### Úloha 8: View model karty

- [ ] `buildWallView` spojí doklady (model) a záznamy (úloha 6): čip má stav `script` (plné kolečko) nebo `card` (prázdné kolečko), `note` a `isConfirmed`.
- [ ] Pořadí: postavy s větou podle první repliky (bez repliky na konec), pak ostatní ve scénáři, pak ostatní jen na kartě.
- [ ] Filtr počítá i postavy jen na kartě. Skupiny se nezobrazují.
- [ ] Unit testy všech kombinací stavu, pořadí a filtru.

### Úloha 9: Outline na kartě

- [ ] V `ui` víceřádkové pole na místě (stejný jazyk jako `BoardInlineHeading`: podbarvení, bez inputu, `break-spaces`). Enter = nový řádek, Cmd/Ctrl+Enter nebo opuštění pole uloží, Escape zruší. Prázdný outline ukáže na kartě jen nenápadné „Add outline“ při hoveru/fokusu.
- [ ] Volba „Outline“ ve View menu (preference `showOutline`, výchozí zapnuto). Sbalená karta outline neukazuje.
- [ ] Na snapshotu jen čtení.
- [ ] Browser testy komponenty: uložení, zrušení, více řádků, vložení textu.

### Úloha 10: Postavy s větou a popover

- [ ] Řádek postavy s větou: barevný proužek, jméno, věta. Ostatní postavy ve stacku; `card` stav jako prázdné kolečko (i v řádku s větou).
- [ ] Klik na čip nebo řádek otevře popover: věta (víceřádková, uloží opuštění pole / Cmd+Enter), „Remove from card“ jen pro postavu bez dokladu (smaže záznam), u postavy s dokladem „Clear note“. Nepotvrzená postava: jen „Confirm character“.
- [ ] Klik na čip nesmí spustit drag karty (tlačítka už sensor ignoruje; ověřit).
- [ ] Browser testy v `ui` a `app-routes`.

### Úloha 11: Přidání a založení postavy

- [ ] Na kartě nenápadné „+“ za stackem otevře combobox (React Aria) s potvrzenými postavami, které na kartě ještě nejsou; volba vytvoří záznam.
- [ ] Neznámé jméno nabídne „Create “NAME”“: založí potvrzenou postavu (barva z palety, stávající API `confirmScriptCharacter`) a přidá záznam.
- [ ] Testy: výběr, založení, klávesnice, Escape, read-only.

### Úloha 12: Integrační ověření a předání

- [ ] Web integrační testy: věta přežije reload; postava smazaná ze scény ve scénáři zůstane s prázdným kolečkem; smazání headingu v Editoru + undo vrátí outline i věty; nový draft je uklidí; Board draftu ukáže metadata jen pro čtení.
- [ ] Spec: doplnit vše, co se při implementaci rozhodlo jinak.
- [ ] Finální sada: dotčené node a browser testy, `db`, `stepkg`, `app-core`, `app-routes`, `ui`, `web` typecheck a lint, format-check, stylelint, duplicity. `moon run root:verify -- --fresh root:test-all` před mergem.
- [ ] `graphify update .`
- [ ] Návrh commit message pro 3b.

## Kontrola plánu před implementací

- Pokrytí specu: doklady (úl. 1), záznamy a stavy (2, 8, 10), identita scény 1–5 (3, 4), úklid (4), stepkg a duplikace (5), modaly (7), outline (9), přidání postavy (11), View menu (1, 9), read-only (2, 6, 9, 12).
- Neověřené předpoklady: chování `UniqueID` při paste a cut + paste (úl. 3); že všechny cesty k draftu a verzi jdou přes `snapshots.create` (úl. 4); výkon reaktivního spojení při velkém skriptu (úl. 8).

## Poznámky implementace 3a

- `script_detached_scenes` navíc uchovává starší `location_id` (nullable FK), aby se po undo vrátilo i původní hlavní místo nezávisle na `location_ids`.
- Import balíčku jako nového skriptu remapuje také ID bloků. Bez toho balíček načtený vedle svého zdroje neměl vlastní obsah kvůli globálním klíčům bloků; integrační test pokrývá oba skripty.
- Cut/paste není přesun headingu: editor jeho vyjmutí blokuje. Stávající ochrana zůstává; clipboard test ověřuje nové ID při vložení kopie.
- Synopse a záznamy postav mají reaktivní zdroje i na read-only snapshot repository; Board je začne zobrazovat/editovat v 3b.

### Ověření a předání 3a

Finální rozsah: node suity `db:test`, `stepkg:test`, `script:test`, `app-core:test`; `app-routes:test` pro Board a odstranění headingu; browser testy `ui` (Board toolbar a čipy), `editor` (identita clipboardu), `app-core` (reaktivní hooky), `app-routes` (modaly), `web` (Board a strukturální editace). Dále lint dotčených souborů, format-check, duplicity a typecheck celého grafu kvůli sdílenému repository kontraktu. Příkazy běží přes `root:verify`; plné `root:test-all` až před mergem.

Známá nesouvisející chyba: `packages/db/tests/mcp/localMcp.e2e.test.ts:109`, TS2339 při čtení `result.prompts`, které není v lokálním `RpcResponse` typu. Soubor je totožný s `HEAD`; nevzniklo to změnou Boardu.

Návrh commit message:

```text
feat(board): persist scene and character metadata

Preserve scene metadata through heading deletion and undo, clean up inactive
records when saving drafts or versions, and carry active records through
packages, snapshots and duplication. Add reactive metadata APIs and count
characters only from cues and stage-direction tags.
```
