# Architecture Decision Records

Log všech klíčových architektonických rozhodnutí pro rewrite Stagistic.

---

## D1: Plně normalizovaná SQL struktura

- **Status:** Accepted
- **Date:** 2026-02-23
- **Context:** Celý script byl uložený jako jeden JSON blob v `script_latest.content_json`. To znemožňovalo granulární query (per scéna, per postava), efektivní sync a rozšiřitelnost.
- **Decision:** Každý blok scriptu = jeden řádek v tabulce `script_blocks`. JSON blob se odstraní.
- **Consequences:** Umožňuje query per scéna/postava, granulární sync, budoucí verzování per scéna. Vyžaduje Block Diff Engine pro synchronizaci editoru s DB.

---

## D2: Oddělený Node.create() per element typ

- **Status:** Accepted
- **Date:** 2026-02-23
- **Context:** Editor měl jeden univerzální `fountainBlock` node s atributem `blockType`. Veškerá logika žila v jedné monolitické extension. Referenční projekt __scriptio používá oddělené node per typ — výsledek je čitelný a udržitelný.
- **Decision:** Každý element typ (sceneHeading, action, character, dialogue, …) je samostatný TipTap Node definovaný přes `Node.create()`. Sdílený boilerplate přes factory funkci `createFountainNode(config)`.
- **Consequences:** Čistší ProseMirror schema, typově-specifické atributy a validace, snazší rozšiřitelnost. Více souborů, ale každý jednoduchý a jednoznačný.

---

## D3: Dual storage — text_content + content_json per blok

- **Status:** Accepted
- **Date:** 2026-02-23
- **Context:** Fountain textový formát neumí uložit inline anotace (cues, komentáře, highlights). Potřebujeme plain text pro search/statistiky a zároveň plnou věrnost editoru včetně inline marks.
- **Decision:** Každý blok má `text_content` (plain text) + `content_json` (TipTap inline JSON s marks). `content_json` je null pokud blok nemá žádné marks (jen plain text).
- **Alternatives Considered:**
  - _Fountain-formatted text only_ — zavírá cestu k inline anotacím (cues, komentáře, highlights).
  - _Jen TipTap JSON_ — vyžaduje derivaci plain textu pro search, více logiky.
  - _Separátní annotations tabulka s offsety_ — příliš komplexní offset maintenance při každém textu edit.
- **Consequences:** Budoucí marks (comment, cue, highlight) se přidají jako nové TipTap Mark typy. Jejich inline pozice žijí v `content_json`, rich payloady (comment threads, cue timing) v extension tabulce `script_block_annotations`.

---

## D4: ProseMirror jako source of truth, DB jako derived

- **Status:** Accepted
- **Date:** 2026-02-23
- **Context:** Potřebujeme okamžitý optimistic result při editaci. ProseMirror nativně spravuje document state s undo/redo, collaborative editing, a transactions.
- **Decision:** Při editaci je ProseMirror state autoritativní. Na každém transactionu se diff propaguje přes TanStack DB (optimistic) → TanStack Pacer (debounced) → PGlite. Data mimo editor (sidebar character metadata, scene metadata) jdou přímo přes TanStack DB → PGlite bez průchodu editorem.
- **Consequences:** Žádný lag při psaní. DB se aktualizuje na pozadí. Vyžaduje Block Diff Engine a spolehlivou synchronizační pipeline.

---

## D5: TanStack DB + Pacer + Store pro state management

- **Status:** Accepted
- **Date:** 2026-02-23
- **Context:** Potřebujeme reaktivní collections s optimistic mutations (okamžitá UI odezva), debounced persistence do DB (ne na každý keystroke), a lightweight store pro ephemeral UI state.
- **Decision:**
  - `@tanstack/db` — reactive collections pro blocks, characters, scenes, locations, acts. Live queries v React.
  - `@tanstack/pacer` — debounced/batched flush do PGlite (400ms idle, 2s max).
  - `@tanstack/store` — ephemeral UI state (active block, sidebar tab, scroll position).
- **Consequences:** Jednotný reaktivní data layer pro celou aplikaci. Sidebar i editor sdílejí stejné collections.

---

## D6: PGlite pro web i desktop

- **Status:** Accepted
- **Date:** 2026-02-23
- **Context:** Desktop app používá PGlite (Postgres v WASM) přes IndexedDB. Web app neměl žádnou databázi.
- **Decision:** Obě platformy (web i desktop) používají PGlite jako lokální databázi. Sdílený bootstrap kód v `@stagistic/db/pglite`. Budoucí cloud sync se přidá nad tuto lokální vrstvu.
- **Consequences:** Stejná offline-first architektura na obou platformách. Sdílený kód pro DB vrstvu. Web i desktop mají identické chování.

---

## D7: Verzování per scéna, user-initiated

- **Status:** Accepted (budoucí fáze — neimplementuje se teď)
- **Date:** 2026-02-23
- **Context:** Stávající systém ukládal celý dokument jako JSON snapshot. To je neefektivní a neodpovídá scenáristickému workflow.
- **Decision:** Uživatel ručně vytvoří snapshot scény (kliknutím). Verze se ukládají per scéna, ne per dokument. Uživatel může procházet historii změn pro každou scénu zvlášť.
- **Consequences:** Vyžaduje `script_scene_versions` tabulku (budoucí). Granulární historie, menší snapshoty.

---

## D8: Společná script_blocks + extension tabulky

- **Status:** Accepted
- **Date:** 2026-02-23
- **Context:** Různé blok typy mají různé potřeby — character blok potřebuje odkazy na postavy, scene heading potřebuje scene_id. Ale 90% sloupců je sdílených (id, text, order, typ).
- **Decision:** Jedna tabulka `script_blocks` pro všechny blok typy se sdílenými sloupci. Type-specific data v relačních extension tabulkách:
  - `script_block_character_refs` — vazba block ↔ character (pro character a dual_dialogue_character bloky)
  - `script_block_annotations` (budoucí) — cues, komentáře, highlights s rich payloady
- **Consequences:** Jednoduché query přes bloky, JOINy pro type-specific data. Nový typ specifických dat = nová extension tabulka, ne ALTER na hlavní tabulce.

---

## D9: Factory pattern createFountainNode(config)

- **Status:** Accepted
- **Date:** 2026-02-23
- **Context:** 10 block typů sdílí 90% boilerplate (group, content, defining, parseHTML, renderHTML, id attribute). Copy-paste by vedlo k nekonzistencím.
- **Decision:** Factory funkce `createFountainNode(config)` v `packages/editor-ui/src/editor/tiptap/nodes/createFountainNode.ts` generuje Node.create() se sdíleným boilerplate. Specifické atributy a behavior se předávají přes config.
- **Consequences:** DRY, konzistentní behavior, snadné přidání nového blok typu (jen config + CSS).

---

## D10: Rozlišení script-intrinsic marks vs. production annotations (Decorations)

- **Status:** Revised (budoucí fáze — neimplementuje se teď)
- **Date:** 2026-02-23, revised 2026-02-23
- **Context:** Do budoucna potřebujeme na slovo/úsek textu navázat anotace — cue (světla, zvuk, choreografie), komentáře s threads, režijní poznámky, highlights. Původně navrženo vše jako TipTap Marks v `content_json`. Revize po zvážení produkční platformy.
- **Decision:**

  **Dva typy inline anotací s různým storage modelem:**

  **A) Script-intrinsic marks** (TipTap Marks v `content_json`):
  - Formátování, které je _součástí scénáře_ — bold, italic, underline
  - Žijí v document modelu, ProseMirror je nativně spravuje
  - Ukládají se do `content_json` na bloku
  - Šíří se při editaci (split, join) — žádoucí behavior pro formátování

  **B) Production annotations** (DB záznamy + ProseMirror Decorations):
  - Anotace, které _nepatří do textu scénáře_ — cues, komentáře, režijní poznámky, highlights
  - Ukládají se do `script_block_annotations` tabulky s pozicí (start_offset, end_offset)
  - Renderují se jako ProseMirror `Decoration.inline` (vizuální overlay, NEmodifikují document state)
  - NEšíří se při editaci — pozice se aktualizují přes Block Sync Engine (tr.mapping)
  - Patří do vrstvy (layer) a oddělení (department) — viz D14, D15

- **Proč NE marks pro production annotations:**
  - Marks žijí v document modelu → každý editující uživatel musí řešit cizí marks
  - Marks se šíří při split/join → nežádoucí pro cues (cue na slovo "SVĚTLO" by se při Enteru duplicitovalo)
  - Marks patří všem → nelze filtrovat "vidím jen své cues" bez custom logiky
  - Marks jsou v `content_json` → mísení scénáře s produkčními daty

- **Proč Decorations pro production annotations:**
  - Decorations jsou view-only overlay → neovlivňují text scénáře
  - Každý uživatel vidí jen relevantní vrstvy
  - Uložené v separátní tabulce → čistá separace scénář vs. produkce
  - Offset maintenance přes ProseMirror mapping API (tr.mapping.map(pos))

- **Offset maintenance strategy:**
  - Anotace mají `start_offset` a `end_offset` (character positions v rámci bloku)
  - Při každém text edit v bloku: Block Sync Engine namapuje pozice přes `tr.mapping`
  - Volitelně: uložit i `anchor_text` (surrounding text context) pro fallback při složitých editech
  - Pokud text kompletně smazán: anotace se označí `orphaned` a user rozhodne

- **Consequences:** Čistá separace scénáře a produkčních dat. Editor zůstává "čistý" — formátování textu. Produkce je overlay. Umožňuje multi-department annotaci bez kolizí.

---

## D11: Block Diff Engine na ProseMirror tr.steps

- **Status:** Accepted
- **Date:** 2026-02-23
- **Context:** Potřebujeme inkrementálně synchronizovat ProseMirror state do DB. Porovnávání celého dokumentu na každém transactionu by bylo pomalé.
- **Decision:** Block Diff Engine využívá `tr.steps` a `tr.mapping` z ProseMirror k identifikaci změněných bloků.
  - **Fast path (typing):** single step, single block → jen `updateContent` na jednom bloku. Cíl: < 1ms.
  - **Structural changes** (Enter, delete, paste, reorder): diff na dotčené rozsahy.
  - Výstup: `BlockChange[]` = `{ type: 'insert'|'update'|'delete', blockId, data? }`
- **Consequences:** Minimální overhead na každý transaction. Typing neprochází celý doc.

---

## D12: Sdílený PGlite bootstrap v @stagistic/db

- **Status:** Accepted
- **Date:** 2026-02-23
- **Context:** Desktop i web potřebují PGlite. Dosud byl bootstrap jen v `apps/desktop/src/db/`.
- **Decision:** Extrahovat PGlite bootstrap do `packages/db/src/pglite/` jako sdílený modul. Oba apky importují `@stagistic/db/pglite`.
- **Consequences:** Žádná duplikace DB kódu mezi desktop a web. Jedna sada migrací, jeden client factory.

---

## D13: Stagistic jako produkční platforma — rozšiřitelná architektura

- **Status:** Accepted (strategické rozhodnutí — ovlivňuje všechna architektonická rozhodnutí)
- **Date:** 2026-02-23
- **Context:** Stagistic začíná jako editor scénářů, ale cílem je rozšíření na komplexní platformu pro divadelní tvorbu a produkci. To zahrnuje: produkční cues (světla, zvuk, choreografie), rekvizity, kostýmy, blocking, režijní poznámky, herecké anotace, produkční plánování.
- **Decision:** Architektura musí být od začátku navržena pro rozšiřitelnost. Konkrétně:
  - **Extension tables pattern (D8)** — nové produkční entity = nové tabulky s FK na bloky/scény/postavy
  - **Annotation decorations, ne marks (D10 revised)** — produkční data nejsou součástí textu scénáře
  - **Layer system (D14)** — anotace patří do pojmenovaných vrstev
  - **View system (D15)** — pohled = filtr vrstev + bloků + oprávnění
  - **ABAC-ready (D16)** — permissions per vrstva/oddělení/scéna
- **Budoucí produkční entity (extension tabulky):**

  | Tabulka | Popis | Reference |
  |---------|-------|-----------|
  | `script_block_annotations` | Inline anotace (cues, komentáře, poznámky) | FK → blocks |
  | `script_props` | Rekvizity s vazbou na scény | FK → scenes |
  | `script_costumes` | Kostýmy s vazbou na scény + postavy | FK → scenes, characters |
  | `script_blocking_notes` | Blocking/pozice na jevišti per scéna | FK → scenes |
  | `script_cue_sheets` | Seřazené cue listy per oddělení | FK → annotations |
  | `script_rehearsal_notes` | Poznámky ze zkoušek per scéna | FK → scenes |

- **Consequences:** Žádné D1–D12 rozhodnutí nezavírá dveře. Normalizovaná SQL (D1) je ideální pro granulární permissions. Node-per-type (D2) umožňuje budoucí produkční node typy. Extension tables (D8) = pattern pro všechna rozšíření.

---

## D14: Layer system pro produkční anotace

- **Status:** Accepted (budoucí fáze — neimplementuje se teď, ale architektura je připravena)
- **Date:** 2026-02-23
- **Context:** Při produkci divadelního představení pracuje s jedním scénářem mnoho oddělení. Každé potřebuje vlastní sadu anotací (cues, poznámky), které neovlivňují ostatní.
- **Decision:**

  **Vrstva (layer)** = pojmenovaná sada anotací patřící jednomu oddělení nebo účelu.

  Tabulka `script_layers` (budoucí):
  ```
  id            text PK
  script_id     FK → scripts.id
  name          text NOT NULL        ("Lighting Cues", "Director's Notes", ...)
  layer_type    text NOT NULL        ('cue_sheet' | 'notes' | 'annotations' | ...)
  department    text NOT NULL        ('lighting' | 'sound' | 'choreography' | 'direction' | 'acting' | 'stage_management' | ...)
  color_hex     text                 (barva pro vizuální odlišení v editoru)
  is_visible    boolean default true (default viditelnost pro nové pohledy)
  order_no      integer              (pořadí vrstev v UI)
  created_by    text                 (user ID)
  created_at    bigint
  updated_at    bigint
  ```

  Každá `script_block_annotations` záznam patří do jedné vrstvy (FK → `script_layers.id`).

- **Příklady vrstev:**
  - "Lighting Cues" (department: lighting) — LX cues na konkrétních slovech/momentech
  - "Sound Cues" (department: sound) — SFX/music cues
  - "Choreography Notes" (department: choreography) — taneční poznámky
  - "Director's Notes" (department: direction) — režijní poznámky
  - "Actor: Jan Novák" (department: acting) — osobní herecké poznámky
  - "Stage Manager" (department: stage_management) — SM cue sheet

- **Consequences:** Každé oddělení pracuje nezávisle. Editor zobrazuje jen aktivní vrstvy. Budoucí ABAC permissions se navazují na vrstvy.

---

## D15: View system — pohled = filtr vrstev, bloků a oprávnění

- **Status:** Accepted (budoucí fáze — neimplementuje se teď, ale architektura je připravena)
- **Date:** 2026-02-23
- **Context:** Různí uživatelé potřebují vidět různé věci v rámci stejného scénáře. Herec vidí jen své dialogy + režijní poznámky. Stage manager vidí vše + cue sheet. Režisér vidí vše.
- **Decision:**

  **View (pohled)** = konfigurace toho, co uživatel vidí a může editovat.

  Tabulka `script_views` (budoucí):
  ```
  id              text PK
  script_id       FK → scripts.id
  name            text NOT NULL       ("Director's View", "Actor: Jan", "SM Cue Sheet")
  role_template   text                ('director' | 'stage_manager' | 'actor' | 'lighting_designer' | 'custom')
  config_json     text NOT NULL       (view configuration, viz níže)
  created_by      text
  created_at      bigint
  updated_at      bigint
  ```

  **View config:**
  ```json
  {
    "layers": {
      "visible": ["layer_id_1", "layer_id_2"],
      "editable": ["layer_id_1"]
    },
    "blocks": {
      "visible_types": ["scene_heading", "character", "dialogue", "parenthetical"],
      "highlight_characters": ["character_id_jan"],
      "filter_by_character": null
    },
    "ui": {
      "show_scene_numbers": true,
      "show_page_breaks": true,
      "show_statistics": false,
      "sidebar_tabs": ["scenes", "my_notes"]
    }
  }
  ```

- **Předdefinované view šablony:**

  | Šablona | Vidí | Edituje | Popis |
  |---------|------|---------|-------|
  | `writer` | Vše bloky, žádné produkční vrstvy | Text scénáře | Čistý scénář bez produkčního šumu |
  | `director` | Vše bloky, režijní vrstva + SM vrstva | Režijní vrstva | Kompletní pohled + vlastní poznámky |
  | `stage_manager` | Vše, všechny vrstvy | SM vrstva, cue sheets | Master view |
  | `actor` | Scene headings + character's dialogue + action | Herecké poznámky | Filtrovaný pohled per postava |
  | `lighting_designer` | Scene headings + action + lighting cues | Lighting cue vrstva | Zaměřený na momenty |
  | `sound_designer` | Scene headings + action + sound cues | Sound cue vrstva | Zaměřený na zvuk |
  | `choreographer` | Scene headings + lyrics + action + choreo notes | Choreo vrstva | Zaměřený na pohyb a písně |

- **Consequences:** Editor zobrazuje filtrovaný pohled podle aktivního view. ABAC permissions se navazují na view config. Umožňuje "herec vidí jen svůj text" bez duplicity dat.

---

## D16: ABAC-ready architektura pro permissions

- **Status:** Accepted (budoucí fáze — neimplementuje se teď, ale architektura nezavírá dveře)
- **Date:** 2026-02-23
- **Context:** Produkční platforma potřebuje granulární permissions — kdo smí co vidět a editovat. Tradiční RBAC (role-based) nestačí, protože oprávnění závisí na kontextu (která postava, která vrstva, který oddělení).
- **Decision:**

  **ABAC (Attribute-Based Access Control)** model kde permission závisí na:
  - **Subject** — uživatel + jeho role v rámci projektu
  - **Resource** — script, scene, block, layer, annotation, character
  - **Action** — read, create, update, delete
  - **Context** — department, view, character assignment

  Budoucí tabulky:
  ```
  script_members (rozšířit stávající plán):
    user_id       FK → users.id
    script_id     FK → scripts.id
    role          text ('owner' | 'director' | 'stage_manager' | 'actor' | 'designer' | 'viewer')
    department    text nullable ('lighting' | 'sound' | ...)
    character_id  FK nullable → script_characters.id  (pro herce)
    view_id       FK nullable → script_views.id  (předdefinovaný pohled)

  script_permissions (optional, pro custom policies):
    id            text PK
    script_id     FK → scripts.id
    role          text
    resource_type text ('block' | 'layer' | 'annotation' | 'character' | 'scene' | ...)
    action        text ('read' | 'create' | 'update' | 'delete')
    condition_json text (optional filter: {"layer.department": "$user.department"})
  ```

  Permission resolution:
  1. User má `script_members` záznam → role + department + character_id
  2. Role má předdefinovaný `script_views` → viditelné vrstvy + bloky
  3. Optional `script_permissions` pro custom override

- **Příklady permission rules:**
  - Actor Jan: `READ blocks WHERE character IN assigned_characters OR block_type IN [scene_heading, action]`
  - Actor Jan: `CREATE annotations WHERE layer.department = 'acting' AND layer.created_by = self`
  - Lighting Designer: `READ all blocks, CREATE/UPDATE annotations WHERE layer.department = 'lighting'`
  - Stage Manager: `READ/UPDATE all, CREATE annotations WHERE layer.department = 'stage_management'`
  - Writer: `READ/UPDATE blocks (script text), NO access to production layers`

- **Jak to ovlivňuje stávající architektonická rozhodnutí:**

  | Rozhodnutí | Dopad na ABAC | Status |
  |------------|---------------|--------|
  | D1 (Normalizovaná SQL) | ✅ Ideální — permissions na úrovni řádků | OK |
  | D2 (Node per type) | ✅ Filtrování bloků dle typu v SQL WHERE | OK |
  | D3 (text_content + content_json) | ✅ Script text oddělený od anotací | OK |
  | D8 (Extension tables) | ✅ Permissions per extension = per feature | OK |
  | D10 (Decorations, ne marks) | ✅ Produkční data nejsou v document model | OK |
  | D14 (Layers) | ✅ Layer = natural permission boundary | OK |
  | D15 (Views) | ✅ View = materialized permission scope | OK |

- **Consequences:** Žádná existující rozhodnutí nezavírají dveře k ABAC. Normalizovaná SQL + extension tables + layer system vytváří přirozené permission boundaries. **Neimplementovat teď** — jen zajistit, že schema je rozšiřitelná (což je).

---

## D17: Block grouping — implicitní z document order, ne explicitní v DB

- **Status:** Accepted
- **Date:** 2026-02-23
- **Context:** Bloky v editoru tvoří logické skupiny:
  - **Strukturální** — bloky patří do aktu a scény (Act → Scene → Block)
  - **Character group** — CHARACTER blok + následující DIALOGUE/PARENTHETICAL/LYRICS bloky (do výskytu jiného typu)
  - **Budoucí** — muzikální čísla, montáže, flashbacky, dual dialogue sekvence

  Potřebujeme: (1) přesouvat act/scénu v sidebaru, (2) přesouvat character group v editoru (Character + všechny child bloky se přesunou společně), (3) extensibilitu pro budoucí typy skupin.

- **Decision:**

  **Dva modely groupingu:**

  | Typ | Mechanismus | Storage | Příklad |
  |-----|------------|---------|--------|
  | Strukturální hierarchie | FK na `script_blocks` → `scene_id`, `act_id` | SQL FK | Přesun scény v sidebaru |
  | Implicit child grouping | Document order + block type pravidla | Žádný extra sloupec | Character → Dialogue/Parenthetical/Lyrics |

  **Character group** se neukládá do DB explicitně (`parent_block_id` apod.). Grouping je derivovaný za runtime z:
  1. Pozice blocků v ProseMirror documentu (source of truth — D4)
  2. Pravidel typu "CHARACTER blok → všechny následující sibling nodes typu DIALOGUE/PARENTHETICAL/LYRICS, dokud nenarazíme na jiný typ"

  Editor operace "přesuň character group" = ProseMirror transakce:
  1. Najdi CHARACTER node
  2. Expanduj selekci na všechny po sobě jdoucí siblings typu `dialogue | parenthetical | lyrics`
  3. Přesuň celý slice v jedné transakci
  4. Block Sync Engine detekuje position changes a zapíše do DB

  **Budoucí extensible groups** (muzikální čísla, montáže, flashbacky):
  - Strukturální → nový ProseMirror wrapping node + nová DB tabulka (vzor: acts/scenes)
  - Range-based → DB stored range se `start_block_id` + `end_block_id` (vzor: annotations z D14)
  - Obě cesty jsou v architektuře připravené, žádný předčasný extra sloupec nepotřebujeme

- **Alternatives considered:**
  - `parent_block_id` FK na `script_blocks` — zbytečná složitost, musí se udržovat konzistence při insert/delete/reorder, přitom grouping je triviálně derivovatelný z pořadí
  - `group_id` UUID na `script_blocks` — opaque sémantika, neřeší nested groups

- **Consequences:** Žádný nový sloupec v DB. Grouping logika žije v editoru (FountainBehaviorExtension). Sidebar move operace pro acts/scenes využívají stávající FK. Architektura je otevřená pro budoucí typy skupin přes dva proven patterns (wrapping node, DB range).

---

## D18: TanStack Hotkeys pro app-level klávesové zkratky

- **Status:** Accepted
- **Date:** 2026-02-23
- **Context:** Aplikace potřebuje robustní keyboard shortcuts (Cmd+S, Cmd+F, toggle panelů, navigace, export…). V editoru jsou dvě odlišné vrstvy klávesování:
  1. **Editor-internal** — Enter/Tab/Backspace/Fountain prefix detection → řeší ProseMirror `handleKeyDown`/`handleTextInput`
  2. **App-level** — save, undo, search, export, panel toggle, vrstva toggle → potřebuje cross-platform `Mod`, scoping, type-safety

- **Decision:** Použít `@tanstack/react-hotkeys` pro app-level klávesové zkratky.

  **Dvouvrstvá architektura:**

  | Vrstva | Engine | Scope |
  |--------|--------|-------|
  | Editor-internal shortcuts | ProseMirror `handleKeyDown` v `FountainBehaviorExtension` | Uvnitř TipTap — Enter, Tab, Backspace, Fountain detection, ALL CAPS |
  | App-level shortcuts | `@tanstack/react-hotkeys` — `useHotkey()`, `useHotkeySequence()` | Celá aplikace — save, search, export, panel toggle, navigace |

  **Klíčové features TanStack Hotkeys:**
  - `Mod` modifier → `⌘` na macOS, `Ctrl` na Windows/Linux (desktop + web bez podmínek)
  - Type-safe hotkey stringy s autocomplete (`'Mod+S'`, `'Mod+Shift+F'`)
  - Scoping na element ref — sidebar panel, editor wrapper, modal mají izolované zkratky
  - `enabled` flag — zkratky se deaktivují když je otevřený modal / command palette
  - `formatForDisplay('Mod+S')` → `⌘S` / `Ctrl+S` pro tooltips a cheatsheet UI
  - `useHotkeyRecorder()` → budoucí customizable shortcuts (uživatel si přemapuje)
  - Automaticky ignoruje input fieldy by default
  - Devtools plugin pro inspekci registrovaných zkratek

  **Umístění v monorepu:**
  - `@stagistic/app-core` — centrální hotkey registry, shared shortcut definice
  - `@stagistic/editor-ui` — editor-scoped shortcuts (Mod+B = bold, Mod+I = italic)
  - `apps/web`, `apps/desktop` — app shell shortcuts (Mod+S, Mod+,, panel toggles)

- **Alternatives considered:**
  - Raw `addEventListener('keydown')` — žádná type-safety, žádné scoping, platform detection ručně
  - `react-hotkeys-hook` — populární ale méně type-safe, chybí sequences, recording, display formatting
  - Vše přes ProseMirror — nefunguje mimo editor (sidebar, modaly, app shell)

- **Consequences:** Čistá separace editor-internal (ProseMirror) vs app-level (TanStack Hotkeys) keyboard handling. Cross-platform bez podmínek. Budoucí customizable shortcuts s `useHotkeyRecorder`. Konzistentní se zbytkem TanStack stacku (D5).
