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

- [x] `buildWallView` spojí doklady (model) a záznamy (úloha 6): čip má stav `script` (plné kolečko) nebo `card` (prázdné kolečko), `note` a `isConfirmed`.
- [x] Pořadí: postavy s větou podle první repliky (bez repliky na konec), pak ostatní ve scénáři, pak ostatní jen na kartě.
- [x] Filtr počítá i postavy jen na kartě. Skupiny se nezobrazují.
- [x] Unit testy všech kombinací stavu, pořadí a filtru.

### Úloha 9: Outline na kartě

- [x] V `ui` víceřádkové pole na místě (stejný jazyk jako `BoardInlineHeading`: podbarvení, bez inputu, `break-spaces`). Enter = nový řádek, Cmd/Ctrl+Enter nebo opuštění pole uloží, Escape zruší. Prázdný outline ukáže na kartě jen nenápadné „Add outline“ při hoveru/fokusu.
- [x] Volba „Outline“ ve View menu (preference `showOutline`, výchozí zapnuto). Sbalená karta outline neukazuje.
- [x] Na snapshotu jen čtení.
- [x] Browser testy komponenty: uložení, zrušení, více řádků, vložení textu.

### Úloha 10: Postavy s větou a popover

- [x] Řádek postavy s větou: barevný proužek, jméno, věta. Ostatní postavy ve stacku; `card` stav jako prázdné kolečko (i v řádku s větou).
- [x] Klik na čip nebo řádek otevře popover: věta (víceřádková, uloží opuštění pole / Cmd+Enter), „Remove from card“ jen pro postavu bez dokladu (smaže záznam), u postavy s dokladem „Clear note“. Nepotvrzená postava: jen „Confirm character“.
- [x] Klik na čip nesmí spustit drag karty (tlačítka už sensor ignoruje; ověřit).
- [x] Browser testy v `ui` a `app-routes`.

### Úloha 11: Přidání a založení postavy

- [x] Na kartě nenápadné „+“ za stackem otevře combobox (React Aria) s potvrzenými postavami, které na kartě ještě nejsou; volba vytvoří záznam.
- [x] Neznámé jméno nabídne „Create “NAME”“: založí potvrzenou postavu (barva z palety, stávající API `confirmScriptCharacter`) a přidá záznam.
- [x] Testy: výběr, založení, klávesnice, Escape, read-only.

### Úloha 12: Integrační ověření a předání

- [x] Web integrační testy: věta přežije reload; postava smazaná ze scény ve scénáři zůstane s prázdným kolečkem; smazání headingu v Editoru + undo vrátí outline i věty; nový draft je uklidí; Board draftu ukáže metadata jen pro čtení.
- [x] Spec: doplnit vše, co se při implementaci rozhodlo jinak.
- [x] Finální sada: dotčené node a browser testy, `db`, `stepkg`, `app-core`, `app-routes`, `ui`, `web` typecheck a lint, format-check, stylelint, duplicity — provedeno, viz „Ověření a předání 3b“. `moon run root:verify -- --fresh root:test-all` zůstává povinné před mergem, dosud nespuštěno.
- [x] `graphify update .` (spustil implementér 30. 10. 2026 po fixerech)
- [x] Návrh commit message pro 3b.

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

## Poznámky implementace 3b

- Společný save indikátor (31. 10. 2026): `useSaveIndicator.trackSave` obaluje skutečné Promise zápisů Boardu a je dostupný přes workspace controller. Hlavička i vizuální stavy zůstávají stejné jako v Editoru (spinner po 600 ms, krátká zelená tečka po úspěchu, červená při chybě). Souběžné zápisy sdílejí první timer a chyba skupiny se neztratí, když později uspěje jiný zápis. Nová postava sleduje i navazující propojení dokumentu. Testy pokrývají souběh s dokumentem, chybu a retry, skutečné metadata UI i přepnutí Editor/Board během ukládání.

- Dodatečná optimistická odezva (30. 10. 2026): `sceneMetadataStore` zapisuje přes TanStack kolekce, stejně jako katalog v Editoru; lokální změna je okamžitá, neúspěšný zápis se rollbackne. Zdrojové snapshoty se synchronizují rozdílem klíčů bez okamžitého truncate, aby po potvrzení nepřekryla uložená data původní klientská kopie. Insert handler může vrátit uložený řádek pro potvrzení serverových timestampů. Založení postavy a přiřazení na kartu začnou současně optimisticky; `scriptCharacterPersistence` sdílí čekání na úspěšné založení podle repository, skriptu a ID postavy, včetně opakovaného potvrzení a přidání na další kartu. Metadata zůstávají mimo historii dokumentu. Ověření zahrnuje pozdržené zápisy, rollback, pořadí úprav, přidání/odebrání během zakládání a regresi sdílených kolekcí.

- Model dostal `firstCue` (pořadí první repliky ve scéně) kvůli řazení postav s větou; dokument ani `SCRIPT_DOCUMENT_SCHEMA_VERSION` se nemění.
- `BoardCharacterChip` nese `characterId`, `source` (`script` / `card`) a `note`; úroveň `level` zmizela.
- Potvrzená postava bez barvy (i nově založená z Boardu) má barvu z palety přes `getConfirmedCharacterColor`; barva se neukládá.
- `handleConfirmCharacter` vrací založenou postavu (`Promise<{id} | null>`), aby ji Board mohl rovnou přidat na kartu.
- Outline používá `BoardInlineHeading` s `kind="outline"`, ne novou komponentu: sdílí editaci na místě a start editace kliknutím (táhnutí karty dál funguje i za outline).
- „Clear note“ u postavy ve scénáři smaže celý záznam, pokud nemá oblouk; jinak jen větu.
- Focus ring na nových boardových ovládacích prvcích používá schválený vzor `:global(:root[data-focus-ring-visible]) &:focus`; selektory `[data-focus-visible]` stylelint zakazuje.
- Popover s větou: uložení věty žije v efektu s prázdnými deps a čte aktuální chip/actions přes ref, takže rerender Wallu s čerstvými (ekvivalentními) objekty z `buildWallView`/`characterActions` draft neuloží; ukládá až odmontování panelu, jednou. Escape se řeší capture handlerem na těle panelu (`.body`), takže zahodí edit i z tlačítka v patičce; Cmd/Ctrl+Enter, klik ven i remove/clear zůstávají. Regresní testy v `BoardSceneCast.browser.test.tsx` (rerender, jednorázové uložení, Escape z patičky).
- `handleConfirmCharacter` v sidebaru nyní vrací Promise (Board z něj přidává postavu); callbacky v `ScriptCharactersSidebar` ho řeší úpravou `void ….catch(() => undefined)` jako ostatní akce.
- Kompaktní search input nad menu je sdílený: `.searchinput` v `DropdownMenu.module.css` (malá písmena — stylelint-fix lowercases hodnoty v `composes`, takže deklarace musí být taky lowercase), `ScriptStateMenu.filterInput` i `BoardAddCharacter.input` na něj jen `composes` (vzhled beze změny, duplicita pryč).
- Oprava mimo Board: strukturální příkazy editoru (smazání a převod headingu, akty) zapisovaly obnovení atributu `settings` jako samostatný krok historie, takže první Cmd+Z nic viditelného neudělal. Krok je teď mimo historii; web test smazání headingu + undo to hlídá.
- Dodatečné zúžení menu karty na přání uživatele (30. 10. 2026): „Start new act here" i „Delete scene…" z menu scény zmizely, zůstává jen „Open in Editor" (`boardSceneActions` zjednodušeno, dead callback plumbing odstraněno); akty se zakládají/mažou přes vlastní tlačítka a menu aktů, mazání scény zůstává v editoru. Placeholder outline je „Add scene outline". Zákaz mazání postav z karty (první návrh) uživatel výslovně stáhl — chování popoveru se nemění. Web test aktu přepsán na skutečné ovládání aktů (Add act at the end + přesun scény + Delete act), aserce menu a placeholder aktualizovány.
- Mazání aktu z Boardu se od 30. 10. 2026 nejprve zeptá (`BoardDeleteActModal` přes generický `ConfirmModal`, Cancel má počáteční fokus): popis podle pozice — první skutečný akt (bez výchozí sekce) „Its scenes will become unassigned.", pozdější „Its scenes will move to "<předchozí akt>"; vždy „No scenes will be deleted.". Orchestrace v `useBoardDeleteAct` (target je block ID aktu, popis se počítá z živého modelu, ne z filtrovaného Wallu; zmizelý akt žádost trvale zahodí — adjust-state-during-render, žádné vzkříšení po undo). Fokus: Cancel vrací na trigger aktu, po potvrzení padá na „Add act at the end" (rAF, jako cancelComposer). `useBoardHistoryShortcuts` navíc blokuje Undo/Redo uvnitř nativního `<dialog>` (dříve jen `[role="dialog"]`), takže Cmd/Ctrl+Z za otevřeným potvrzením nezmění dokument. Testy: `apps/web/src/boardActDeletion.browser.test.tsx` (popisy, Cancel/Escape, potvrzení + undo, první skutečný akt s nepřiřazenými scénami před ním, Undo za dialogu), hook test `useBoardDeleteAct.browser.test.tsx`, potvrzení doplněno do stávajících web testů aktů.

### Ověření a předání 3b

Průběžné opravy po review viz výše (popover, Promise, sdílený search input, zastaralá aserce v `boardStructureEditing`). Finální fáze: dvě selhání z celkového web běhu, první opraveno, druhé klasifikováno; poté hlavní vlákno vyhodnotilo výsledky přímo z log.

**Selhání 1 — `boardStructureEditing.browser.test.tsx` „inserts and renames a scene…“:** zastaralá integrační aserce z doby před 3b čekala, že nová scéna nemá vůbec žádné tělo karty. V 3b karta záměrně ukazuje outline i přidání postavy i bez obsazení. Aserce přepsána na smysluplné očekávání (žádné čipy ani postavy s větou, ale „Add outline“ i „Add character to scene 2“ přítomné); red → green přes `root:verify`.

**Selhání 2 — `boardView.browser.test.tsx` „shows a scene and a character typed in the Editor, without waiting for a save“:** jeden celkový web běh hlásil `Characters: ANNA, DO, BENCTOR` — psané ` / BEN` dopadlo doprostřed `DOCTOR`, kurzovka nebyla na konci cue, když psaní začalo. Zaměřený běh nezměněného testu přes `root:verify -t` prošel (1 passed | 6 skipped, log `87255ea9…b1cb`) a závěrečný třísouborový web běh prošel 23/23. Návaznost na 3b nebyla prokázána: metadata hooky (`useWallMetadata`/`BoardSceneBody`) se mountují jen na Board route (`ScriptBoardRoute`), ne v Editoru; Promise v `handleConfirmCharacter` mění jen návratovou hodnotu pro Board (test postavu nepotvrzuje); `addToHistory: false` v `structureRequestMutations` běží až po napsání cue a selection nešahá. Podobná nestabilita kurzovky se v konverzaci před 3b už objevila, ale přesná příčina ani baseline srovnání tohoto konkrétního selhání nejsou doloženy (poznámka v `2026-10-27-scene-board-wall-readonly.md` se baselinou přes `git stash -u` se týká ArrowLeft sceneDeletion testu, ne rychlého psaní do cue). Klasifikace: intermittently failing, pozorovaná limitace; nevyřešeno, bez sleeps a oslabování asercí; při další reprodukci shromáždit čerstvý důkaz.

**Finální výsledky (ověřeno hlavním vláknem přímo v logech):**

- 147 cílených testů prošlo: `script:test -- src/board/` 25; `app-routes:test -- src/routes/script/board/` 29; `ui:test-browser -- src/board/` + `src/layout/header/ScriptStateMenu.browser.test.tsx` 65; `editor:test-browser -- src/editor/session/structureTransactions.browser.test.ts` 3; `app-routes:test-browser -- ScriptCharactersSidebar.browser.test.tsx` 2; závěrečný `web:test-browser` (boardMetadata, boardStructureEditing, boardView) 23/23 čerstvě (log `.git/agent-verification/540e3dd7fc236b02c57b054c5ce354cb03e9635e2e21c85fb512de42c8fadf26-d3bca944-79cd-4f2a-b083-8b1815c61169.log`).
- 8 typechecků PASS: `db`, `stepkg`, `app-core`, `script`, `editor`, `ui`, `app-routes`, `web`. Sedm výsledků platných z předchozích běhů; `web:typecheck` po změně web testu čerstvě (runner výstup PASS, 1393 ms, nikoli REUSED). Žádný výsledek nebyl označen REUSED.
- 5 projektových lintů PASS (`script`, `editor`, `ui`, `app-routes`, `web`; projektový `vp lint` nespouští stylelint ani duplicity); `root:format-check` 37 JS/TS souborů PASS; `root:duplicates-changed` PASS. CSS vstupy prošly `root:stylelint-fix` před finálními kontrolami (včetně lowercase sdílené třídy); pozdější CSS úpravy nenastaly.
- `root:lint` zůstává FAIL: 13 nezměněných souborů v `apps/docs`, `apps/marketing`, `tools/agent-roles/test`, `tools/agent-flows/test`; hlavní vlákno porovnalo všechny chybové soubory, konfigurace, lockfile i root tsconfig+Vite s HEAD — totožné. Jde o Astro error-typed content a node:test floating promises, mimo rozsah 3b. Root lint se zkratuje před stylelint/duplikacemi; toto pokrytí proběhlo samostatně (viz výše). Opravy mimo úlohu neprováděny.
- Vizuální kontrola hlavního vlákna v živém prohlížeči: character picker, popover s větou, header state filter; oba složené inputy mají identické metriky (padding 4px 8px, 1px border, 12px font, 8px radius), dotaz „Draft3“ v header filtru vyfiltroval Draft3. Snímky: `/tmp/board-3b-character-picker.png`, `/tmp/board-3b-note-popover.png`, `/tmp/board-3b-state-filter.png`.
- Poslední běh verifikátoru: `.scratch/agent-roles/board-metadata-3b/verifier/runs/614f4b35-1234-470f-a668-1d433bf31879`.

`moon run root:verify -- --fresh root:test-all` zůstává výslovně povinný před mergem; dosud nespuštěno.

Implementátor během vývoje spouštěl jen fixery na změněných souborech (`root:lint-js-fix`, `root:format`, `root:stylelint-fix` přes `node_modules/.bin/moon`, všechny prošly), `graphify update .` a zaměřené kontroly přes `root:verify`: `ui:test-browser -- src/board/BoardSceneCast.browser.test.tsx` (red → green, 9 testů), `app-routes:lint`, `root:duplicates-changed`, `web:test-browser -- src/boardStructureEditing.browser.test.tsx` (red → green, 11 testů) a `web:test-browser -- src/boardView.browser.test.tsx -t …` (průkaz intermitence).

Finální rozsah 3b: node suity `script:test` (model Boardu, `firstCue`), `app-routes:test` (Board view model, preference, filtr), browser testy `ui` (Board toolbar, čipy, outline, cast, popover, přidání postavy) a `app-routes` (Board a modaly), `web:test-browser` (metadata: reload, smazání headingu + undo, nový draft, read-only Board) a strukturální příkazy editoru (`structureRequestMutations`, undo). Dále typecheck, lint, format-check, stylelint a duplicity dotčených balíků (`script`, `app-routes`, `ui`, `web`, `editor`; `db`, `stepkg`, `app-core` kvůli sdíleným kontraktům z 3a). Vše přes `root:verify`; `moon run root:verify -- --fresh root:test-all` až před mergem.

Návrh commit message:

```text
feat(board): write scene outlines and character notes on cards

Merge script evidence with user records in the Wall view model: characters
with notes sort by their first cue, card-only characters get a hollow dot
and survive removal from the script. Add the outline field with its view
preference, the character popover and creating confirmed characters from a
card. Keep board metadata read-only on snapshots and stop editor structural
commands from writing an invisible first undo step.
```
