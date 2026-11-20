# Board — krok 1: Wall jen pro čtení

**Goal:** Nový pohled Board s lensem Wall, který živě ukazuje akty, scény, počáteční strany a automaticky odvozené postavy. Board zatím nic needituje; Open in Editor a Delete scene… jen přenesou do editoru na scene heading.
**Spec:** `docs/superpowers/specs/2026-10-27-scene-board-design.md` (kroky 2–6 nejsou součástí plánu).
**Architecture:** Čistý `buildSceneBoardModel` v `packages/script` počítá z `ScriptBlockIndexSnapshot` (bloky už nesou `actBlockId`, `sceneBlockId` a `characterRefs` pro cue i tagy). Route v `app-routes` vybere zdroj indexu, doplní strany ze `scenePlacement` a skládá prezentační komponenty z `packages/ui`.
**Tech stack:** React, React Router, react-aria-components, Vite+ unit a browser testy, moon.

## Constraints

- Nikdy necommitovat ani nestageovat. Na konci jen navrhnout commit message.
- Dokument se nemění, `SCRIPT_DOCUMENT_SCHEMA_VERSION` zůstává. Bez změn DB.
- Řídit se `.agents/skills/stagistic-general-codestyle/SKILL.md`: soubory do 300 řádků, routes bez CSS, pojmenovatelné struktury (karta, sekce, čip) jsou komponenty v `packages/ui`, navigace (ink edge) ≠ výběr (Creamed Corn), jen angličtina.
- Kontroly přes moon. Browser suity jedna po druhé. Nepřepisovat snapshoty ani viewporty kvůli nesouvisejícím chybám.
- Po změně kódu `graphify update .`.

## Tasks

- [x] **Model** (`packages/script/src/board/`): `buildSceneBoardModel(index, catalog)` vrátí akty → scény (číslo, `headingBlockId`, název, `actBlockId`) a pro každou scénu postavy s úrovní `present` nebo `mentioned` v pořadí prvního výskytu.
  - Pravidla: blok `character` (cue, včetně více jmen v jedné cue) a tagy v `stageDirection`/`aside` → present; tagy v `dialogue`/`lyrics` → mentioned; `note` se ignoruje; present přebíjí mentioned.
  - Skupiny se nezobrazují; doklad skupiny se rozpadne na členy (`memberIds`) se stejnou úrovní.
  - Nepotvrzené klíče (bez `characterId` v katalogu) jdou ven jako neutrální položky podle klíče, bez duplicity s potvrzenou postavou stejného klíče.
  - Názvy a výchozí akt stejně jako `buildScriptStructureOutline` (`normalizeActName`, `getDefaultActName`). Parity test proti outline na stejných fixturách.
  - Unit testy: scény před prvním aktem, akt bez scén, dokument bez aktů a bez scén, víc jmen v cue, skupina, nepotvrzená postava, tag i cue téže postavy, `note`.
- [x] **Zdroj dat** (`app-routes/src/routes/script/board/useSceneBoardSource.ts`): index z živého snapshotu (`EditorSnapshotStore`), když už ho editor publikoval; jinak `initialIndexSnapshot ?? buildScriptBlockIndex(initialValue).snapshot` jako v exportu.
  - Nejdřív ověřit, jestli editor plní `liveStore.index` i bez `onIndexChange` subscriberu (`patchFallbackSnapshot` ho přidává jen se subscriberem). Pokud ne, zapnout publikaci indexu, aby Board po přepnutí z editoru viděl poslední úpravy, včetně ještě nevypublikovaného debounce při odchodu z editoru.
  - Strana: `scenePlacement.byBlockId.get(id)?.startPage`, když `hasComputed`, jinak `null` (UI ukáže „–“).
  - Katalog a barvy: `useScriptCharacters()` (`confirmedCharacterRecords`, `confirmedGroupRecords`); barva z `colorHex`, s fallbackem na `characters.displayColorByKey` ze snapshotu.
- [x] **Route a přepínač:** `ScriptView` rozšířit o `'board'`, `VIEW_SWITCHER_ITEMS` v pořadí Editor · Board · Export (aktualizovat `ViewSwitcher.test.tsx`).
  - V `apps/web/src/App.tsx` i `apps/desktop/src/App.tsx`, v živé i snapshot skupině: `board` → index redirect na `wall`, `board/:lens`; neznámý lens → `wall`.
  - `ScriptBoardRoute` skládá `ScriptEditorAppHeader` s `activeView="board"`, stejně jako `ScriptExportRoute`. Přepínač lensů zatím nevykreslovat (přijde v kroku 4).
  - Ověřit, jak se k nové route chová `UnsupportedScreenGate`; řídit se exportem.
- [x] **Skok do editoru:** navigace na `${basePath}/editor` se stavem `{focusBlockId}`. `ScriptEditorRoute` ho jednou spotřebuje (pak `replace` bez stavu), po připravenosti editoru zavolá stejné `focusBlock` jako structure sidebar a scrollne na heading. Používá ho Open in Editor i Delete scene… V snapshotu Delete scene… chybí.
- [x] **UI komponenty** (`packages/ui`, vrstva patterns), každá s browser testem:
  - `BoardActSection`: hlavička aktu (eyebrow), mřížka karet s pevnou šířkou a zalamováním.
  - `SceneCard`: číslo, název (Courier Prime, jen v elementu s názvem), strana „p. 12“ / „–“, slot pro postavy, menu akcí (`IconButton`), varianta `collapsed` (jeden řádek: číslo a název).
  - `CharacterChipStack`: stack barev přítomných (hover/focus ukáže jména, přístupné i z klávesnice), dutá kolečka zmíněných, neutrální varianta pro nepotvrzené.
  - `BoardToolbar`: multi-výběr postav (filtr), hustota (Title / Characters), přepínač „Mentioned“ se stabilním názvem a `aria-pressed`.
  - Prázdný stav: `Notice variant="empty"` „No scenes yet.“ s akcí Open Editor.
- [x] **Wall route:** složí model, toolbar a sekce. Filtr: karta bez žádné vybrané postavy → `collapsed`, u ostatních karet vybrané postavy v plné barvě a zbytek ztlumený. Filtr, hustotu a „Mentioned“ ukládat do localStorage pro každý skript (vzor `sidebarLayoutStorage`).
- [x] **Browser testy aplikace:**
  - Board ukáže akty a scény.
  - Psaní v editoru, pak přepnutí na Board ukáže novou scénu a postavu.
  - Filtr sbalí scény bez postavy.
  - Open in Editor zaměří heading.
  - Snapshot Board nemá Delete scene….
  - Board otevřený jako první (přímá URL) funguje a ukazuje „–“ u stran.
- [x] **Ověření:** `moon run script:test`, `moon run ui:test-browser`, `moon run app-routes:test-browser`, `moon run web:test-browser`, `moon run root:typecheck`, `moon run root:lint`, `moon run root:format-check`, `moon run root:test-related`, `git diff --check`, `graphify update .`. Ručně proklikat v aplikaci (světlý i tmavý motiv) a připravit commit message.

## Review focus

- Board po přepnutí z editoru ukazuje stav po posledním stisku klávesy, ne po posledním autosave.
- Číslování scén a názvy aktů sedí se structure sidebarem.
- Člen skupiny se neobjeví dvakrát (skupina + vlastní cue). Nepotvrzená postava se nezdvojí s potvrzenou.
- Přímé otevření `/board` bez cachovaného editoru nepadá a nespouští editor.
- Navigační stav `focusBlockId` se nespotřebuje dvakrát (StrictMode) a nepřežije reload.
- Filtr s postavou, která mezitím zmizela z katalogu, se tiše vyčistí.

## Result

Board is a third view (Editor · Board · Export) at `/board/:lens`, with the Wall lens read-only. `board` redirects to `wall`, an unknown lens too; live and snapshot groups in both `apps/web` and `apps/desktop`. `UnsupportedScreenGate` is width-based and route-agnostic, so Board follows Export.

`buildSceneBoardModel` (`packages/script/src/board`) derives acts, scenes and per-scene characters from the block index. Groups expand to members at the same level; unconfirmed keys stay neutral entries and never duplicate a confirmed character. Names, grouping and scene order match `buildScriptStructureOutline` (parity test); numbering matches the structure sidebar.

Live-index question: with a provided live store the editor seeds `index` from the load-time document on mount, and without an `onIndexChange` subscriber typing never refreshes it. So it was populated but stale. The editor now publishes a fresh index from its cached document as it unmounts (`useEditorIndexPublication`), avoiding a per-keystroke index build. Board reads `liveStore.index` unless it is still the empty sentinel (`EMPTY_EDITOR_INDEX`, no editor ever mounted), then falls back to `initialIndexSnapshot ?? buildScriptBlockIndex(initialValue)`. Pages come from `scenePlacement` when computed, else "–".

Open in Editor and Delete scene… navigate with router state `{focusBlockId}`; `EditorFocusRequest` (rendered in the editor's left-sidebar slot, the only place inside the editor context that is always mounted) waits for the first measured layout, calls `focusBlock`, then replaces the entry with `state: null`. Delete scene… is absent in snapshots.

Wall components live in `packages/ui/src/board`: `BoardLayout`, `BoardActSection`, `SceneCard`, `CharacterChipStack`, `BoardToolbar`, `BoardEmpty`. Filter, density and Mentioned persist per script (`useLocalPreference`).

Deviations and findings:

- Scenes before the first act heading form a default "ACT 1" section of their own. `buildScriptStructureOutline` would give two groups with the same name and id there.
- `ScriptEditorBlockFocusWatcher` (`?block=` deep links) was rendered as a non-slot child of the editor, which never renders such children, so it was dead. `EditorFocusRequest` replaces it and handles `?block=` too, which makes MCP deep links work. It also took `ScriptEditorRoute.tsx` from 319 (already over 300) to 299 lines.
- Added `BoardEmpty` (not in the plan) so the route carries no CSS.
- The Mentioned toggle is disabled, not hidden, in Title density.
- Board header reuses `useScriptEditorHeaderActions`, so the Download menu works as in the Editor.

## Verification — 2026-10-27

Browser commands used `--no-file-parallelism` and ran one suite at a time.

| Check | Result |
| --- | --- |
| `moon run script:test` | 31 files, 197 tests passed |
| `moon run ui:test-browser -- --no-file-parallelism` | Chromium: 317 tests, 53 files passed |
| `moon run app-routes:test-browser -- --no-file-parallelism` | Chromium: 180 tests, 48 files passed |
| `moon run web:test-browser -- --no-file-parallelism` | Chromium: 14 tests, 5 files passed (6 new Board tests) |
| `moon run editor:test-browser -- --no-file-parallelism` | 290 passed, 1 failed: `sceneDeletion` "ArrowLeft still moves the caret out of the scene block"; fails identically without these changes (baseline via `git stash -u`) |
| `moon run root:typecheck` | Only `packages/db/tests/mcp/localMcp.e2e.test.ts(109,52)` (`prompts`), same at baseline |
| `moon run root:lint` | No findings in changed files. Remaining errors are in `apps/marketing`, `apps/docs`, `packages/db/src/mcp`; root lint also fails at baseline |
| `moon run root:format-check -- <changed TS/TSX files>` | Passed |
| `moon run root:test-related -- <changed TS/TSX files>` | 683 tests, 126 files passed |
| `moon run root:duplicates` | 0 clones |
| `git diff --check HEAD` | Passed |
| `graphify update .` | Passed |
| Manual click-through | Not done interactively. A temporary screenshot test rendered the Board in light and dark; both read correctly. Files removed |

Red/green: with the index publication disabled, the web test "shows a scene and a character typed in the Editor" fails; with it, it passes.

Not covered: a real WebKit run, and the desktop (Tauri) app beyond its route declarations. The web test's teardown can log "Failed to save latest script", because autosave fires after the test deletes its script.

## Suggested commit

`feat(board): add read-only Wall view of scenes by act`

Add a Board view with a Wall lens: acts as sections, scene cards with start page and characters derived from the script (present on stage, mentioned, unconfirmed), a character filter, card density and a Mentioned switch. Open in Editor jumps to the scene heading. The editor publishes its latest index on unmount so Board reflects unsaved keystrokes.

No commit or staging operation was performed by the agent. Review the changes and commit manually.

