# Board — lišta (varianta A) a širší karty

**Goal:** Nahradit současnou lištu Boardu (MultiComboBox „Characters“, přepínač „Title | Characters“, samostatné „Mentioned“) schválenou variantou A a rozšířit karty.
**Spec:** `docs/superpowers/specs/2026-10-27-scene-board-design.md`, sekce „Lišta Boardu (varianta A)“ a „Wall“.
**Mockup:** `/tmp/board-mockups/a.html` (+ `mock.css`, `mock.js`); jen orientačně, implementace se řídí tokeny a komponentami `packages/ui`.
**Navazuje na:** `docs/superpowers/plans/2026-10-27-scene-board-wall-readonly.md` (necommitnutá práce v pracovním stromu).

## Constraints

- Nikdy necommitovat ani nestageovat. Na konci jen navrhnout commit message.
- Dodržet `AGENTS.md` (včetně „Agent verification workflow“ a sdíleného `moon run root:verify`) a `.agents/skills/stagistic-general-codestyle/SKILL.md`: soubory do 300 řádků, routes bez CSS, navigace (ink edge) ≠ výběr (Creamed Corn), plovoucí prvky smí mít stín, jen angličtina.
- Board zatím nepublikován: preference v localStorage není třeba migrovat. Neznámé hodnoty se tiše nahradí výchozími.

## Tasks

- [x] **Záložky pohledů**: komponenta v `packages/ui/src/board/` s ink podtržením aktuálního pohledu. Vykreslit jen hotové pohledy (zatím Wall), napojit na `/board/:lens`.
- [x] **Filtr postav**: trigger + popover v `packages/ui/src/board/`, postavený na existujících primitivech (`IconPopover`/Overlay, `SearchInput`, `Checkbox`, `ListRow`, `IconButton`).
  - Stavy triggeru: žádná / jedna (tečka + jméno) / víc (stack teček + „N characters“). Při výběru stav výběru a samostatné tlačítko ✕ „Clear character filter“, ne vnořené do triggeru.
  - Popover: vyhledávání, řádky se zaškrtávátkem, tečkou, jménem a „N scenes“, „Clear filter“ (neaktivní bez výběru).
  - Plná klávesnicová obsluha, přístupná jména a fokus po zavření zpět na trigger.
- [x] **View popover**: „Show on cards“ se zaškrtávátky Characters a odsazeným Mentioned only (neaktivní, když Characters vypnuté). Outline zatím nevykreslovat.
  - Nahradit `BoardDensity` booleany `showCharacters` / `showMentioned` v `BoardToolbar`, `boardPreferences` a `buildWallView`.
- [x] **Lišta**: přestavět `BoardToolbar` na jeden řádek (záložky vlevo, filtr a View vpravo, hairline pod). Odstranit použití `MultiComboBox` a `ToggleButtonGroup` z lišty.
- [x] **Karty**: `--board-card-width` 18rem.
- [x] **Testy**: browser testy nových komponent (stavy triggeru, vyhledávání, clear, klávesnice, disabled Mentioned only), aktualizovat `BoardToolbar`, `boardPreferences` a `apps/web/src/boardView.browser.test.tsx`.
- [x] **Ověření**: focused testy během práce. Na konci jedna sada přes `moon run root:verify`: dotčené browser suity (`ui`, `app-routes`, `web`, postupně), typecheck dotčených projektů, format-check a test-related změněných souborů, duplicity. Screenshot Boardu ve světlém i tmavém motivu. `graphify update .`.

## Review focus

- Trigger s 1 a s 8 vybranými postavami se nerozbije a nepřeteče (stack teček má strop, např. 5 + „…“).
- ✕ vyčistí filtr bez otevření popoveru.
- Filtr s postavou, která zmizela ze scénáře, se tiše vyčistí a trigger nezobrazí prázdný stav výběru.
- Vypnuté Characters skryjí postavy na kartách, filtr dál sbaluje scény.

## Result

Board toolbar is one row: lens tabs on the left (`BoardLensTabs`, ink underline on the current lens, only Wall is listed), character filter and View on the right. Cards are 18rem wide.

- `BoardCharacterFilter`: trigger shows "Characters", a dot and name, or up to 5 overlapping dots and "N characters". While filtering it takes the Creamed Corn state with a separate "Clear character filter" button beside it. The panel has "Find character…", checkbox rows (dot, name, "N scene(s)"), and "Clear filter". The caller orders characters by first appearance, those without scenes last (`buildFilterCharacters`).
- `BoardViewMenu`: "Show on cards" with Characters and an indented Mentioned only, disabled while Characters is off. Outline is not rendered yet.
- `BoardMenuButton` (text button with caret opening a panel) and `ColorDot` are shared by both. `BoardToolbar` no longer uses `MultiComboBox` or `ToggleButtonGroup`.
- `BoardDensity` is gone. Preferences hold `showCharacters` and `showMentioned`; the retired `density` key is ignored. Hiding Characters hides the chips; the filter still collapses scenes.
- A selection whose character left the catalog is dropped silently before the toolbar sees it, so the trigger never shows an empty choice.

Deviations:

- `Checkbox`'s label now has `flex: 1 1 auto`, so a row can push its scene count to the far edge.
- Rows are checkboxes in tab order (not a listbox with arrow keys). Search gets focus on open, Escape returns focus to the trigger.
- Filter panel counts every scene a character appears in, mentions included.

## Verification — 2026-10-27

Through `moon run root:verify`. Browser suites ran one at a time with `--no-file-parallelism`. Nothing was reused; every result is a fresh run.

| Check | Result |
| --- | --- |
| `ui:test-browser` | PASS (new: filter 13, toolbar 4; updated section and card widths) |
| `app-routes:test-browser` | PASS |
| `web:test-browser` | PASS (7 Board tests, 1 new for filter, clear and View) |
| `app-routes:test -- src/routes/script/board` | 14 tests passed (new `buildFilterCharacters`, updated preferences) |
| `ui:typecheck`, `app-routes:typecheck`, `web:typecheck`, `script:typecheck` | PASS |
| `ui:lint`, `app-routes:lint`, `web:lint` | PASS |
| `root:format-check` and `root:test-related` on changed TS/TSX files | PASS |
| `root:duplicates` | PASS |
| `git diff --check HEAD` | PASS |
| `graphify update .` | Passed |

Not rerun: `editor:test-browser` (the editor package is untouched in this change; its one `sceneDeletion` ArrowLeft failure was shown to be pre-existing earlier) and `root:typecheck` / `root:lint` (they fail at baseline in `packages/db` and the Astro apps, evidence from step 1).

Screenshots (light and dark, filter panel open and closed, View panel): `/tmp/board-toolbar-shots/`.

## Suggested commit

`feat(board): one-row toolbar with character filter and View menu`

Replace the Board toolbar (character combo box, density toggle, lone Mentioned toggle) with lens tabs, a character filter popover with clear button, and a "Show on cards" View popover. Widen scene cards to 18rem. Preferences move from `density` to `showCharacters`.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

No commit or staging operation was performed by the agent. Review the changes and commit manually.


## Follow-up — 2026-10-27

User review of the toolbar:

- **Clear ✕ inside the control.** `BoardCharacterFilter` is one bordered control (the group carries border and Creamed Corn state). The trigger reserves a slot before its caret while filtering (`BoardMenuButton` `hasTrailingSlot`) and the clear `IconButton` is laid over that slot. It stays a sibling button, after the trigger in tab order. The caret stays on the right edge, so the control grows leftwards and View does not move. Clearing with ✕ returns focus to the trigger.
- **View options.** "Characters on stage" and "Mentioned characters" ("Named in dialogue or lyrics only") are independent checkboxes: no nesting, no disabled state. Preferences are `showOnStage` (default true) and `showMentioned` (default false); retired keys fall back to defaults. With mentions off they do not count for the filter; on-stage characters always count, even when their chips are hidden.

Verification (through `moon run root:verify`, all fresh, browser suites one at a time with `--no-file-parallelism`): `ui:test-browser`, `app-routes:test-browser`, `web:test-browser`, `app-routes:test`, typecheck of `ui`, `app-routes`, `web`, `script`, lint of `ui`, `app-routes`, `web`, `root:format-check` and `root:test-related` on changed TS/TSX files, `root:duplicates`, `git diff --check HEAD`: all PASS. New tests: clear button position and its own-button DOM, tab order, focus back to the trigger, stable right edges, independent View options, `showOnStage` filtering. Screenshots: `/tmp/board-toolbar-shots/zz-{selection,view}-{light,dark}.png`.
