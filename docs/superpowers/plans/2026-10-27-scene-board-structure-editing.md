# Board — krok 2: Script session a editace struktury

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Delegovat jen podle výslovně zvolené metody. Nikdy nestageovat ani necommitovat.

**Goal:** Z Wall přejmenovat, vložit a přesunout scénu, přidat, přejmenovat a odstranit akt; všechny změny sdílejí dokument, historii a ukládání s Editorem.

**Architecture:** Workspace vlastní jednu document session s jednou instancí Tiptapu. Trvalý runtime v `packages/editor` zajišťuje dokument, historii, příkazy a autosave; Editor připojuje plátno, Board volá příkazy bez připojeného plátna. Zachovat existující index a model Boardu, rozšířit jejich zdroj na session. `initialValue` je pouze vstup při načtení, nikoli živý stav.

**Tech Stack:** React, Tiptap/ProseMirror, stávající `@dnd-kit/react` + `@dnd-kit/dom`, React Aria přes `@stagistic/ui`, Vite+ node/browser testy, moon.

**Spec:** [2026-10-27-scene-board-design.md](../specs/2026-10-27-scene-board-design.md), krok 2 a související části Wall / Úpravy dokumentu mimo editor.

## Global Constraints

- Nikdy nestageovat ani necommitovat. Na konci připravit návrh commit message pro uživatele.
- Žádné změny DB, stepkg ani `SCRIPT_DOCUMENT_SCHEMA_VERSION`. Outline, věty a ruční přítomnost patří do kroku 3.
- Mimo rozsah: „samotné mazání scén na boardu (board jen přenese do editoru)“, „přesun aktů“, nové lenses a export Boardu.
- „Board uložené verze nebo snapshotu je jen pro čtení, bez editačních ovládacích prvků.“ Guard musí být i v příkazech, ne pouze v UI.
- „Šířka karty 18rem.“ Zachovat schválenou lištu, filtr a nezávislé volby Characters on stage / Mentioned characters.
- `PRODUCT.md` a `.agents/skills/stagistic-general-codestyle/SKILL.md`: anglické UI, soubory do 300 řádků, routes skládají komponenty bez CSS, prezentační komponenty v `ui`, DnD orchestrace v `app-routes`.
- Bez nových závislostí a bez druhé nezávislé kopie dokumentu nebo historie pro Board.
- Kontroly přes moon a sdílený runner. Jeden vlastník finální verifikace; browser suity postupně. Celé `root:test-all` až před mergem.
- Neodvozovat aktuální chybový stav z historických výsledků kroku 1. Nově zjištěnou nesouvisející chybu jednou reprodukovat nebo porovnat na izolovaném základu; nestashovat cizí změny.

## Review Focus

1. Board otevřený přímou URL bez předchozího Editoru: první změna se uloží, přežije reload a návrat do Editoru ji nepřepíše. Testy úloh 1, 3 a 7.
2. Rychlé změny a přepínání Editor / Board / Export, včetně StrictMode a změny nastavení: stejný dokument a historie, jediný autosave, žádné staré callbacky. Testy úloh 1 a 3.
3. Hranice aktů: implicitní akt, první explicitní akt vložený doprostřed, prázdné a sousední akty, konec sekce. Vkládání i přesun respektují skutečnou pozici v dokumentu. Testy úloh 2, 5 a 6.
4. Přesunutá scéna s hudbou, komentáři a existující synopsí: ID a obsah zůstávají, undo vrátí jedinou operaci. Testy úloh 2 a 7.
5. Filtr, sbalené karty, IME a klávesnice: editace ani přesuny nepřeskočí skrytou pozici, Escape nic nemění a textové pole má vlastní undo. Testy úloh 4–6.

## Co už existuje a co nelze jen znovu použít

- `editorSurfaceCache.ts` drží editor přes změnu pohledu. Nevlastní ale autosave ani lifecycle; ty se odpojí s `Editor.tsx`.
- `useEditorLifecycle.ts` vlastní revision, inicializaci, update listenery i `useBuildActCommands`. Inicializace je hlídaná lokálním `WeakMap`; po přesunu do session se nesmí znovu aplikovat `initialValue` při připojení plátna.
- `useEditorIndexPublication.ts` publikuje poslední index při odchodu z Editoru. Board pak používá index nebo load-time fallback; editace Boardu potřebuje vlastní čerstvou publikaci.
- `structureReorder.ts` a `sceneReorder.ts` už umí celý segment scény. Zachovat je; přejmenování/vložení/odstranění headingu dělat cílenými transakcemi, nikoli plošným `setContent`.
- `setPlainTextContent` dnes přejmenovává jen akty a převádí je na uppercase. Není hotovým příkazem pro název scény.
- `buildInsertActContent` při nulovém počtu aktů přepíše cíl na první blok. To neodpovídá „Start new act here“ doprostřed dokumentu ani „Add act“ na konec.
- `ScriptSessionContext.tsx` už existuje pro sidebar; není document session. Rozšířit jeho umístění a hodnotu, nevytvořit druhý stejnojmenný context.
- `useCharacterState` drží vlastní ref dokumentu; `useCharacterDocumentActions` vydává `editorOverrideValue`. Tyto cesty nesmějí přepsat novější session starou kopií.
- `export/useExportScriptData.ts` čte `initialValue`. V rámci přechodu na sdílený dokument musí číst aktuální session, jinak Export po změně na Boardu ukáže starý scénář.

## Soubory a odpovědnosti

Nové soubory (testy vedle implementace):

| Soubor / adresář | Odpovědnost |
| --- | --- |
| `packages/editor/src/editor/session/types.ts` | Veřejný kontrakt document session a runtime bindingu |
| `packages/editor/src/editor/session/createScriptDocumentSession.ts` | Stabilní facade, guardy, připojení runtime, čtení aktuálního dokumentu |
| `packages/editor/src/editor/session/useScriptDocumentRuntime.ts` | Trvalá instance, inicializace, historie, autosave, publikace |
| `packages/editor/src/editor/session/useScriptDocumentRuntime.browser.test.tsx` | Detached runtime, připojení plátna, persistence a historie |
| `packages/editor/src/editor/session/structureTransactions.ts` | Cílené transakce pro headingy; využití stávajícího scene reorderu |
| `packages/editor/src/editor/session/structureTransactions.browser.test.tsx` | Obsah, ID, undo/redo a neplatné cíle |
| `packages/app-routes/src/routes/script/workspace/ScriptDocumentSessionHost.tsx` | Napojení runtime na workspace, nastavení a katalogy |
| `packages/app-routes/src/routes/script/workspace/ScriptDocumentSessionHost.browser.test.tsx` | Hydratace, změna skriptu, autosave a konsumující pohledy |
| `packages/app-routes/src/routes/script/board/boardInsertionTargets.ts` | Převod pozice v aktu na `beforeBlockId` |
| `packages/app-routes/src/routes/script/board/useBoardStructureActions.ts` | Stav inline editace/vkládání a mapování akcí na session |
| `packages/app-routes/src/routes/script/board/BoardSceneItem.tsx` | Složení karty s editací a drag handlem |
| `packages/app-routes/src/routes/script/board/useBoardSceneDnd.ts` | Drag & drop, cíle a přístupná oznámení |
| `packages/ui/src/board/BoardInlineHeading.tsx` + `.module.css` | Přístupné přejmenování scény/aktu |
| `packages/ui/src/board/BoardSceneComposer.tsx` + `.module.css` | Prázdná karta pro lokální návrh nové scény |
| `packages/ui/src/board/BoardInsertSceneButton.tsx` + `.module.css` | Viditelný a klávesnicí dosažitelný bod vložení |

Upravit:

- `packages/editor/src/editor/{Editor.tsx,contracts.ts,useEditorExtensions.ts}` a `packages/editor/src/index.ts`: runtime sdílený se session, připojení plátna, veřejné exporty. Ponechat standalone režim Editoru pro současné konzumenty/testy; vlastní stejný runtime lokálně.
- `packages/editor/src/editor/surface/{editorSurfaceCache.ts,useScriptEditorInstance.ts,useSurfaceCharacterRefs.ts}`: sjednotit vlastnictví instance, referencí a inicializace se session; cache nesmí zničit aktivní session při změně prezentačního signature.
- `packages/editor/src/editor/hooks/{useEditorLifecycle.ts,useEditorAutosave.ts,useEditorIndexPublication.ts}` a `actCommands/useBuildActCommands.ts`: vyjmout trvalou část, zachovat pouze jeden owner listenerů a save controlleru. Stávající act commands ve workspace delegují na session; `moveBlock` dál funguje.
- `packages/editor/src/editor/hooks/actBlockMutations.ts`: explicitní pravidlo cíle prvního aktu; upravit všechny dotčené call sites a testy.
- `packages/app-routes/src/routes/script/{ScriptWorkspaceRoute.tsx,ScriptEditorRoute.tsx,ScriptBoardRoute.tsx,ScriptExportRoute.tsx}`: vlastnictví session, připojení Editoru, save status a flush všech pohledů.
- `workspace/{ScriptWorkspaceContext.tsx,ScriptSessionContext.tsx,useScriptCharactersContextValue.ts}`, `settings/ScriptSettingsModalProvider.tsx`, `editor/characters/{useCharacterState.ts,useCharacterDocumentActions.ts,useScriptEditorCharacters.types.ts}`: sjednotit čtení a změny dokumentu.
- `editor/DeferredScriptEditor.tsx`, `board/{BoardWall.tsx,useSceneBoardSource.ts,buildWallView.ts}`, `export/useExportScriptData.ts`: pracovat s aktuální session; zachovat deferred nastavení plátna.
- `packages/ui/src/board/{SceneCard.tsx,SceneCard.module.css,BoardActSection.tsx,BoardActSection.module.css}`, `packages/ui/src/index.ts`: sloty pro inline heading, akce aktu, drag handle a vložení. DOM zůstává validní seznam.
- Testy vedle změněných komponent a `apps/web/src/boardView.browser.test.tsx`; nové integrační případy případně oddělit do `apps/web/src/boardStructureEditing.browser.test.tsx` kvůli limitu 300 řádků.

## Úloha 1: Sdílený runtime před první editací Boardu

**Interfaces:** `createScriptDocumentSession({initialValue, isReadOnly, liveStore})` vrací stabilní `ScriptDocumentSession`. Veřejné metody: `getDocument(): ScriptDocument`, `flush(): Promise<boolean>`, `undo(): boolean`, `redo(): boolean`, `applyDocumentChange(value: ScriptDocument): boolean`, `dispose(): void`; dále `liveStore: EditorSnapshotStore` a `commands` z úlohy 2. React odebírá `subscribe(listener: () => void): () => void` a stabilní `getSnapshot(): {revision: number, isReady: boolean, canUndo: boolean, canRedo: boolean}` přes `useSyncExternalStore`; snapshot neobsahuje serializovaný dokument. Před připraveností čtení vrátí načtený dokument, mutace selžou a ovládání je neaktivní. `applyDocumentChange` je most pro existující katalogové operace, ne druhý save controller.

- [ ] **1. Napsat browser testy** `useScriptDocumentRuntime.browser.test.tsx`: runtime bez připojeného plátna načte dokument; po `applyDocumentChange(next)` platí `expect(session.getDocument()).toEqual(next)`, `undo()` obnoví původní obsah a `redo()` vrátí změnu. Připojení/odpojení plátna zachová tutéž instanci a historii. StrictMode nevytvoří přeživší duplicitní instance/listenery. Save failure ponechá dirty stav a další `flush()` může uspět.
- [ ] **2. Spustit RED:** `moon run root:verify -- editor:test-browser -- src/editor/session/useScriptDocumentRuntime.browser.test.tsx --no-file-parallelism`. Očekávat chybějící session/runtime nebo neuloženou změnu.
- [ ] **3. Implementovat runtime a facade.** Přesunout inicializaci/sanitizaci, revision, historii, update listener a `useEditorAutosave` z lifetime plátna do lifetime workspace session. Zachovat prodlevu psaní **1500 ms**, serializaci při save místo každého stisku a existující ochranu proti souběžným save.
  - Použít stejnou sadu extensionů jako Editor. Detached zde znamená nepřipojený editor view v browseru; nevyžaduje SSR ani absenci DOM API. Žádné skryté připojené plátno pro měření.
  - Callbacky zachycené extensiony musí číst aktuální binding/ref. Editor připojí své UI callbacky a při odchodu je odpojí; trvalé katalogy/refy přežijí. Nezachovat closure na zrušený modal.
  - Nastavení/zoom/přepnutí pohledu nesmí znovu načíst `initialValue` ani zničit historii. Parametry plátna aktualizovat odděleně od identity dokumentu. Nový dokument, obnova verze a změna workspace vytvářejí novou session.
  - Runtime a standalone Editor používají tutéž implementaci. `EditorProps.session?: ScriptDocumentSession` připojuje externí session; bez ní Editor vlastní lokální session. Neponechat dva paralelní lifecycle mechanismy.
  - Při odchodu z workspace zachytit poslední hodnotu a naplánovaný save dokončit před zničením instance; save běžící pro A nesmí po přechodu zapisovat do B. Read-only příkazy i ukládání jsou no-op.
- [ ] **4. Spustit GREEN** stejným příkazem a doplnit případy: `flush()` před mountem plátna, změna nastavení s neuloženým textem, opožděný save po přepnutí skriptu, readonly guard. Nepokračovat k editačnímu UI, dokud detached změna, save a společné undo neprojdou.

## Úloha 2: Strukturní příkazy a přesné hranice

**Interfaces:** `session.commands` má `renameScene(id: string, title: string): boolean`, `insertScene(beforeBlockId: string | null, title: string): string | null`, `moveScene(id: string, beforeBlockId: string | null): boolean`, `insertAct(beforeBlockId: string | null): string | null`, `renameAct(id: string, title: string): boolean`, `deleteAct(id: string): boolean`. Insert vrací nové heading ID; neplatný cíl/readonly/prázdný název scény vrací neúspěch. `null` jako cíl znamená konec dokumentu.

**Position interface:** `resolveBoardInsertionTarget(index: ScriptBlockIndexSnapshot, actBlockId: string | null, beforeSceneId: string | null): {beforeBlockId: string | null} | null` v `boardInsertionTargets.ts`. Vnitřní `null` je validní konec dokumentu; vnější `null` znamená neexistující nebo neplatný cíl.

- [ ] **1. Napsat testy** `structureTransactions.browser.test.tsx` a `boardInsertionTargets.test.ts`. Fixture: úvod, scéna A s replikou, act B bez scén, act C se scénou C. Ověřit vkládání před první scénou, mezi scénami, na konci každého aktu a do prázdného aktu. Konec aktu = před následující act heading, poslední akt = konec dokumentu; prázdný akt = za jeho obsahem před následující hranicí. Nepřesunout úvodní text jiné sekce.
- [ ] **2. Spustit RED:** `moon run root:verify -- editor:test-browser -- src/editor/session/structureTransactions.browser.test.tsx --no-file-parallelism` a `moon run root:verify -- app-routes:test -- src/routes/script/board/boardInsertionTargets.test.ts`.
- [ ] **3. Implementovat cílené transakce.** Přejmenování mění pouze inline obsah správného heading typu, vložení přidává normální scene/act blok s `createNodeId`, odstranění aktu odstraňuje jen jeho heading. Respektovat casing nastavení scene headingu a dosavadní uppercase názvy aktů. Whitespace scény odmítnout, stejný název je no-op. Chybějící/špatný typ ID nesmí změnit jiný blok.
  - Přesun použije `moveSceneSegment` jako referenci rozsahu a `buildSceneReorderTransaction` pro PM transakci. Zachovat všechny bloky, attrs, music markery, character tagy a comment anchors až po další act/scene heading.
  - Každá dokončená operace = **jeden undo krok**; oddělit sousední strukturní operace hranicí historie. Zrušené/no-op operace do historie nepatří. Všechny doc-changing transakce, včetně undo/redo, publikuje a ukládá jediný runtime.
  - Opravit cílení prvního aktu: explicitní `beforeBlockId` se respektuje i bez aktů; `null` přidává na konec. Pokud stávající sidebar potřebuje vytvoření aktu na začátku, předá ID prvního bloku explicitně. Scény před novým prvním headingem zůstávají v implicitním aktu.
- [ ] **4. Spustit GREEN** oběma příkazy. Přidat přesun do jiného/prázdného aktu, vlastní segment a neexistující cíl jako no-op; smazání prvního/posledního aktu; přesně jeden undo/redo krok; nezměněná ID a úplný obsah segmentu po přesunu. Rozšířit existující testy sidebar příkazů podle změněného pravidla prvního aktu.

## Úloha 3: Workspace, aktuální dokument a ukládání všech pohledů

**Interfaces:** `ScriptWorkspaceValue.documentSession: ScriptDocumentSession` je dostupná nad Settings i Characters providery. `ScriptDocumentSessionHost` pod oběma providery připojí runtime po hydrataci nastavení/katalogů; stejnou session předá Editoru a rozšířenému `ScriptSessionContextValue.documentSession`.

- [ ] **1. Napsat testy** `ScriptDocumentSessionHost.browser.test.tsx`: Board-first → změna → save bez plátna; Editor → poslední neuložený stisk → Board; Board → Editor → Export sdílí poslední hodnotu; opakované přepínání nespouští dvojí save. Změna postavy z Attribute Manageru po vložení scény zachová scénu. Snapshot session odmítá všechny mutace.
- [ ] **2. Spustit RED:** `moon run root:verify -- app-routes:test-browser -- src/routes/script/workspace/ScriptDocumentSessionHost.browser.test.tsx --no-file-parallelism`.
- [ ] **3. Zapojit session.** Stabilní facade vytvořit při načtení workspace, host umístit do `ScriptSettingsModalProvider` pod `ScriptCharactersProvider` kolem obsahu pohledů. Tím host čte hydratovaná nastavení i katalog; catalogue getter čte facade z workspace bez závislosti na host contextu.
  - `getEditorValue` čte aktuální session; `applyDocumentChange` posílá změnu do session. `editorOverrideValue` v session režimu nesmí vyvolávat rebuild z uloženého dokumentu; standalone fallback lze zachovat. Nepřidat per-keystroke serializaci jen pro aktualizaci refu postav.
  - `useSceneBoardSource` bere index z aktuální session. Při vstupu na Board a jeho změnách/undo zajistit čerstvý index; během psaní v Editoru zachovat levnou cestu a nebudovat JSON/index na každý stisk bez potřeby konzumenta.
  - Po každé změně dokumentu bez naměřeného plátna zneplatnit `scenePlacement` a page-count metadata; Board ukazuje „–“. Nové měření v Editoru zpřístupní strany znovu. Nezobrazovat staré strany po undo jen podle shodného heading ID.
  - `useExportScriptData` čte session dokument/index. Download, ruční save a ukládání draftu/verze z Editoru, Boardu i Exportu používají `session.flush()` a při chybě nevytvoří stav ze starého uloženého obsahu. Aktuální nastavení/title page dál zůstávají ve svých draft providerech.
  - V Board hlavičce přidat stejný `scriptSyncState` jako v Editoru. Selhání save ukázat existujícím Notice/toast vzorem, obsah ponechat dostupný pro retry.
- [ ] **4. Spustit GREEN** stejným příkazem. Aktualizovat testy lifecycle/autosave a cache pro jediné vlastnictví; ověřit, že existující Scene delete/convert, hudební akce, komentáře a focus requesty stále používají aktuální UI binding.

## Úloha 4: Přejmenování scén a aktů na místě

**Interfaces:** `BoardInlineHeading` přijímá `value`, `label`, `onCommit(value: string): boolean`, `isReadOnly?`, `kind: 'scene' | 'act'`. `SceneCard` a `BoardActSection` dostanou volitelný `heading: ReactNode`; při nepředání zachovají současný textový heading. Route drží editaci podle heading ID, ne podle pořadového čísla.

- [ ] **1. Napsat browser testy** `BoardInlineHeading.browser.test.tsx`: aktivace klikem/Enter, Enter a blur potvrdí právě jednou; Escape obnoví původní hodnotu a nevolá commit; prázdný scene title nepotvrdí; composition Enter neukončí editaci. Fokus se vrátí na trigger, readonly vykreslí text. `Mod+Z` uvnitř pole nepřejmenuje jinou scénu ani nevrátí celý dokument.
- [ ] **2. Spustit RED:** `moon run root:verify -- ui:test-browser -- src/board/BoardInlineHeading.browser.test.tsx --no-file-parallelism`.
- [ ] **3. Implementovat komponentu a route binding.** Název klidný bez chrome, neutral hover, plný field při editaci. Scéna Courier Prime, ovládání Plex Sans. Doplňující „Rename scene“ v menu pro nalezitelnost. Prázdné potvrzení aktu zachová dosavadní podporu defaultního zobrazovaného názvu.
  - Implicitní akt (`actBlockId === null`) nemá heading k přejmenování ani smazání. Nabídnout „Name act…“: vytvoří explicitní heading před prvním blokem tohoto implicitního úseku a otevře jeho název. Nevytvářet heading pouhým focusem.
  - Globální undo/redo Boardu zapojit jen při fokusu mimo input/textarea/contenteditable a mimo otevřená menu/popover. `Mod+Z`, `Mod+Shift+Z` a na Windows `Ctrl+Y` volají session; návrh textu používá undo svého pole. Guard readonly i při vyvolání z klávesnice.
- [ ] **4. Spustit GREEN** stejným příkazem; doplnit route browser test pro nový název na kartě, v Editoru a po undo. Přepsání jedné scény nepřejmenuje sousední kartu a dlouhý název neroztáhne kartu přes 18rem.

## Úloha 5: Vložení scén a správa aktů

**Interfaces:** `BoardSceneComposer` přijímá `onSubmit(title: string): boolean` a `onCancel(): void`; draft je lokální, document transaction vznikne až potvrzením. `useBoardStructureActions` převádí pozice přes `resolveBoardInsertionTarget` a rozlišuje menu akce podle jejich ID.

- [ ] **1. Napsat browser testy** composeru a route: potvrzení neprázdného názvu volá insert jednou, Escape nic nevloží, IME Enter čeká na konec composition. Zrušení vrací fokus na příslušné „+“. Pro akt ověřit „Start new act here“, „Add act“, rename a smazání pouze headingu. Snapshot nemá žádný composer, insert button ani editaci aktu.
- [ ] **2. Spustit RED:** `moon run root:verify -- ui:test-browser -- src/board/BoardSceneComposer.browser.test.tsx --no-file-parallelism`. Pro route použít `moon run root:verify -- app-routes:test-browser -- src/routes/script/board/BoardWall.browser.test.tsx --no-file-parallelism` (nový soubor).
- [ ] **3. Implementovat vložení.** Malé „+“ před první kartou, mezi kartami a za poslední včetně prázdného aktu. Nezpůsobovat změnu šířky/sloupců při hoveru; wrappery i composer jsou validní položky seznamu. Právě jeden composer, vložení přes Enter; při blur návrh zachovat, nevložit ani nezahodit text bez výslovné akce. Přidat dostupné „Add scene“ a „Cancel“ pro ovládání bez klávesnice.
  - Prázdný Board nabídne „Add scene“; existující prázdné akty se vykreslí. „Add act“ zůstává dostupné na konci i před první scénou. Readonly prázdný stav si ponechá navigaci Open Editor.
  - Nová scéna bez vybraných postav by se filtrem sbalila. Po vložení ji dočasně rozbalit a fokusovat její heading; filtr neměnit. Výjimku ukončit po odchodu fokusu z karty a nepersistovat ji jako metadata.
  - Menu karty „Start new act here“ vloží act heading přímo před scénu a nabídne jeho přejmenování. „Add act“ přidá heading na konec; oba příkazy respektují úlohu 2 i při nulovém počtu aktů.
  - Menu explicitního aktu „Delete act“ odstraní pouze heading. Předchozí akt převezme scény; při smazání prvního vzniká implicitní sekce. „Delete scene…“ stále jen naviguje do Editoru, nevolá delete transakci ani automatické potvrzení modalů.
- [ ] **4. Spustit GREEN** uvedenými příkazy a ověřit začátek/prostředek/konec dokumentu, prázdné akty, defaultní akt, aktivní filtr a obnovu fokusu po odstranění aktu. Vložení scény/aktu a jeho následné přejmenování jsou dva záměrné undo kroky.

## Úloha 6: Přesun celých scén myší i klávesnicí

**Interfaces:** `useBoardSceneDnd` dostává celý nefiltrovaný model aktů/scén a `session.commands.moveScene`. DnD stav žije v route; `SceneCard` dostane slot pro handle a prezentační stav drag/drop target. Žádná DnD závislost v `packages/ui`.

- [ ] **1. Napsat testy** `useBoardSceneDnd.browser.test.tsx`: Space/Enter zvedne kartu, šipky vyberou pozici, potvrzení přesune, Escape ponechá pořadí. Ověřit přesun přes hranici aktu, do prázdného aktu a sbalené karty při filtru; po dropu fokus zůstává na handle přesunuté scény. Pointer test přenese celý segment a klik na název/menu/„+“ nespouští drag.
- [ ] **2. Spustit RED:** `moon run root:verify -- app-routes:test-browser -- src/routes/script/board/useBoardSceneDnd.browser.test.tsx --no-file-parallelism`.
- [ ] **3. Implementovat přesun** podle existujících `editor/structure/{structureDndConfig.ts,useStructureSidebarDnd.ts}`: stejná knihovna, pointer distance **5 px**, KeyboardSensor a přístupná oznámení. Nerecyklovat naslepo sidebar indexy: jeho aktový anchor není karta a jeho pořadí se liší od mřížky.
  - Drop/keyboard target je pozice v konkrétním aktu převedená resolverem úlohy 2. Prázdný akt je explicitní droppable, defaultní akt má stabilní vlastní key. Po odebrání zdroje z cílového pořadí znovu určit anchor; `null` neznamená neplatný cíl.
  - V mřížce zachovat čitelné pořadí zleva doprava, pak další řádek; klávesnice musí dosáhnout první/poslední pozice i sousední prázdné sekce. Oznámit cílový akt a pozici. Filtr nemění pořadí ani dostupné cíle.
  - Preview nesmí zapisovat do dokumentu. Jeden drop = jedna transakce a save; cancel/no-op = žádná. Akt není draggable. Samostatný drag handle neobaluje interaktivní potomky karty.
- [ ] **4. Spustit GREEN** stejným příkazem, doplnit resize/zalamování mřížky, vlastní pozici jako no-op a odstraněný cíl během drag jako bezpečné zrušení. Pro typické přesuny zkontrolovat `expect(session.undo()).toBe(true)` a původní kompletní dokument.

## Úloha 7: Integrační ověření a předání

- [ ] **1. Doplnit web browser testy** `boardStructureEditing.browser.test.tsx` se skutečným repository: přímá URL Boardu → vložit/přejmenovat → počkat na save → reload → otevřít Editor; zkontrolovat normální scene heading na správném místě. Editor typing → Board edit → undo na Boardu → další undo vrátí předchozí editorovou změnu; redo funguje i po přepnutí pohledu.
- [ ] **2. Přidat integrační případy**: přesun scény s replikou, hudbou, comment anchors a existující synopsí zachová heading/block ID a načtená metadata po save/reload; odstranění aktu zachová všechny scény. Board → Export/draft obsahuje poslední změnu i před autosave; při selhání flush nedojde k vytvoření zastaralého draftu. Snapshot UI i přímé příkazy změnu odmítnou.
- [ ] **3. Spustit focused RED/GREEN:** `moon run root:verify -- web:test-browser -- src/boardStructureEditing.browser.test.tsx --no-file-parallelism`. Při selhání nejdřív opakovat konkrétní selhaný test.
- [ ] **4. Provést fixery a aktualizovat graf.** Jen změněné JS/TS/CSS přes odpovídající moon `root:lint-js-fix`, `root:format`, `root:stylelint-fix`; pak `graphify update .`. Graph update i dokumentační změny dokončit před finální sadou, aby výsledky sdíleného runneru zůstaly použitelné.
- [ ] **5. Finální ověření jedním vlastníkem.** Změny runtime zasahují Editor a jeho konzumenty; browser suity níže jsou tedy záměrně širší než samotný Board. Už platný totožný výsledek sdílet; nesčítat překryvné `test-related` k úplným scoped node suitám bez konkrétní mezery v pokrytí.

```sh
moon run root:verify -- editor:test
moon run root:verify -- app-routes:test
moon run root:verify -- editor:test-browser -- --no-file-parallelism
moon run root:verify -- ui:test-browser -- --no-file-parallelism
moon run root:verify -- app-routes:test-browser -- --no-file-parallelism
moon run root:verify -- web:test-browser -- --no-file-parallelism
moon run root:verify -- editor:typecheck
moon run root:verify -- ui:typecheck
moon run root:verify -- app-routes:typecheck
moon run root:verify -- web:typecheck
moon run root:verify -- desktop:typecheck
moon run root:verify -- editor:lint
moon run root:verify -- ui:lint
moon run root:verify -- app-routes:lint
moon run root:verify -- web:lint
moon run root:verify -- root:duplicates-changed
git diff --check
```

Navíc `moon run root:verify -- root:format-check -- <sorted changed JS/TS files>`. CSS ověřuje `moon run root:stylelint-fix -- <sorted changed CSS files>` v kroku 4: musí skončit s exit 0; všechny jeho změny musí předcházet finálním kontrolám. Je to mutující příkaz, nepouštět ho přes sdílený runner a jeho výsledek nehlásit jako cached verification. Samostatný nemutující `root:stylelint` task v současném `moon.yml` neexistuje. `script`/`db` testy nepřidávat, pokud se jejich implementace ani kontrakty nezmění. Pro upravené společné kontrakty rozšířit typecheck na skutečné konzumenty.

- [ ] **6. Ručně ověřit** světlý/tmavý motiv, 3–5 aktů, prázdné akty, dlouhé názvy, filtr, zalomení mřížky a keyboard-only vložení/přesun/undo. Udělat screenshoty editace, composeru a drag targetu. Desktop Tauri runtime ověřit, pokud je dostupný; samotný desktop typecheck neprezentovat jako runtime test.
- [ ] **7. Předat** rozsah změn, příkazy a výsledky (fresh/reused), neověřené plochy a přesné nesouvisející chyby. Návrh commitu: `feat(board): edit script structure through a shared document session`. Žádný commit, staging, PR ani merge. Před případným mergem následně čerstvé `moon run root:verify -- --fresh root:test-all`.

## Kontrola plánu před implementací

- Úlohy 1–3 jsou podmínkou bezpečné editace; samostatné UI bez nich se nepovažuje za dokončený krok 2.
- Akceptace kroku 2: aktuální Board bez reloadu, přesun celého segmentu + undo, normální vložený scene heading, ukládání bez připojeného Editoru a readonly snapshot. Metadata z kroku 3 se zde needitují; již existující synopsis a vazby se nesmějí ztratit.
- Volby nad rámec detailu specu v tomto plánu: blur composeru ponechá návrh, nová scéna při filtru zůstane do odchodu fokusu rozbalená, implicitní akt se pojmenuje vytvořením skutečného headingu. Jde o implementační návrhy k revizi.
