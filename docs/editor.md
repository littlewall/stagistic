# Editor Architecture

TipTap editor architektura pro Stagistic po rewrite.

**Framework:** TipTap 3 (ProseMirror)
**Package:** `packages/editor-ui/`
**React binding:** `@tiptap/react`

---

## Přehled změn oproti stávajícímu stavu

| Oblast | Před (stávající) | Po (rewrite) |
|--------|-------------------|--------------|
| Block nodes | Jeden `fountainBlock` s atributem `blockType` | Oddělený `Node.create()` per element typ |
| Node definice | Vše v `FountainBlockExtension.ts` (monolith) | Factory pattern `createFountainNode()` + soubor per typ |
| Behavior | Keyboard/input handling v jedné extension | Samostatná `FountainBehaviorExtension` |
| Character decorations | Plugin v `FountainBlockExtension` | Samostatná `CharacterTagDecorationsExtension` |
| Structure markers | Plugin v `FountainBlockExtension` | Samostatná `StructureMarkerDecorationsExtension` |
| Block index | `ScriptBlockIndexExtension` (ProseMirror plugin) | Nepotřeba — bloky přímo v DB, query přes TanStack DB |
| Sidebar projection | `ScriptSidebarProjectionExtension` (609 řádků) | Nepotřeba — sidebar data z TanStack DB live queries |
| Live store | Custom `EditorLiveStore` | TanStack DB collections + TanStack Store |

---

## Document Schema

Definice v `packages/editor-ui/src/editor/editorDocument.ts`:

```typescript
DocumentWithSettings = Document.extend({
  content: '(sceneHeading | act | action | character | dialogue | parenthetical | transition | lyrics | note | dualDialogueCharacter | fountainColumnGroup)+',
  addAttributes() {
    return {
      settings: { default: null },
      structure: { default: null },
    }
  }
})
```

`action` je první v seznamu → ProseMirror ho použije jako default node type pro prázdné dokumenty a nové řádky.

---

## Node typy

### Adresářová struktura

```
packages/editor-ui/src/editor/tiptap/nodes/
├── createFountainNode.ts        # Shared factory
├── sceneHeadingNode.ts          # scene_heading
├── actNode.ts                   # act
├── actionNode.ts                # action (default)
├── characterNode.ts             # character
├── dualDialogueCharacterNode.ts # dual_dialogue_character
├── dialogueNode.ts              # dialogue
├── parentheticalNode.ts         # parenthetical
├── transitionNode.ts            # transition
├── lyricsNode.ts                # lyrics
├── noteNode.ts                  # note
└── index.ts                     # barrel export
```

### Factory: createFountainNode(config)

Sdílená factory funkce pro generování TipTap Node definic.

```typescript
interface FountainNodeConfig {
  /** TipTap node name (camelCase) — e.g. 'sceneHeading' */
  name: string;
  /** DB block_type value (snake_case) — e.g. 'scene_heading' */
  blockType: string;
  /** CSS class for rendering — e.g. 'fountain-scene-heading' */
  cssClass: string;
  /** Additional node-specific attributes */
  extraAttrs?: Record<string, AttributeSpec>;
  /** Whether this node can be a drag target */
  draggable?: boolean;
}

function createFountainNode(config: FountainNodeConfig): Node {
  return Node.create({
    name: config.name,
    group: 'block',
    content: 'text*',
    defining: true,
    draggable: config.draggable ?? false,

    addAttributes() {
      return {
        id: { default: null },     // Managed by UniqueID extension
        ...config.extraAttrs,
      }
    },

    parseHTML() {
      return [{ tag: `p.${config.cssClass}` }]
    },

    renderHTML({ HTMLAttributes }) {
      return ['p', mergeAttributes(HTMLAttributes, {
        class: config.cssClass,
        'data-block-type': config.blockType,
      }), 0]
    },
  })
}
```

### Definice všech node typů

| Node name | Block type | CSS class | Extra attributes | Popis |
|-----------|------------|-----------|------------------|-------|
| `sceneHeading` | `scene_heading` | `fountain-scene-heading` | `sceneId: string \| null` | Hlavička scény. `sceneId` odkazuje na `script_scenes.id`. |
| `act` | `act` | `fountain-act` | — | Nadpis aktu |
| `action` | `action` | `fountain-action` | — | Akce / popis. **Default node type.** |
| `character` | `character` | `fountain-character` | `characterRefs: Record<string, string> \| null` | Jméno postavy. `characterRefs` mapuje normalized key → character ID. |
| `dualDialogueCharacter` | `dual_dialogue_character` | `fountain-dual-dialogue-character` | `characterRefs: Record<string, string> \| null` | Postava v dual dialogue |
| `dialogue` | `dialogue` | `fountain-dialogue` | — | Dialog |
| `parenthetical` | `parenthetical` | `fountain-parenthetical` | — | Herecká poznámka |
| `transition` | `transition` | `fountain-transition` | — | Přechod (CUT TO:) |
| `lyrics` | `lyrics` | `fountain-lyrics` | — | Text písně |
| `note` | `note` | `fountain-note` | — | Poznámka ke scénáři |

### Column extensions (beze změn)

| Node name | Popis |
|-----------|-------|
| `fountainColumnGroup` | Container pro dual-dialogue/multi-column. Content: `fountainColumn{1,}` |
| `fountainColumn` | Jeden sloupec. Content: `(sceneHeading \| act \| action \| character \| ...)+`. Attr: `width` |

---

## Extensions

### Adresářová struktura

```
packages/editor-ui/src/editor/tiptap/extensions/
├── FountainBehaviorExtension.ts          # Keyboard behavior, Fountain detection
├── CharacterTagDecorationsExtension.ts   # Character name color decorations
├── StructureMarkerDecorationsExtension.ts # Music segment markers
├── FountainPaginationExtension.ts        # Page breaks, pagination (preserved)
├── FountainColumnExtensions.ts           # Column group + column nodes (preserved)
├── BlockUiEventsExtension.ts             # Block mutation events (updated)
├── PlaceholderExtension.ts               # Empty block placeholder text (NEW)
├── FountainDetectionExtension.ts         # Auto-detect types from text (NEW)
└── index.ts
```

### FountainBehaviorExtension (nová, nahrazuje keyboard/input logiku z FountainBlockExtension)

`Extension.create()` — nemá vlastní node, přidává sdílené keyboard/input behavior.

> **Pozn.:** Tato extension řeší **editor-internal** klávesy (Enter, Tab, Backspace, Fountain prefixes). App-level zkratky (Mod+S, panel toggle, navigace) řeší `@tanstack/react-hotkeys` — viz D18.

**Zodpovědnosti:**
- **Enter behavior** — vytvoří nový blok správného next-type (viz mapa níže)
- **Tab behavior** — cykluje block type na aktuálním řádku
- **Fountain prefix detection** — `.` → scene, `@` → character, `!` → action, `>` → transition, `#` → section
- **ALL CAPS auto-detection** — automaticky změní action na character pokud text je celý uppercase
- **handleKeyDown, handleTextInput, handlePaste** — input routing
- **Character delimiter cleanup** — `appendTransaction` pro normalizaci `+` v character blocích

---

## Klávesové zkratky — dvouvrstvá architektura (D18)

| Vrstva | Engine | Příklady |
|--------|--------|----------|
| **Editor-internal** | ProseMirror `handleKeyDown` / `handleTextInput` v `FountainBehaviorExtension` | Enter (next type), Tab (cycle type), Backspace (merge/delete), `.` `@` `>` `!` (Fountain prefixes), ALL CAPS detection |
| **App-level** | `@tanstack/react-hotkeys` — `useHotkey()` | `Mod+S` (save), `Mod+Z` (undo), `Mod+F` (find), `Mod+P` (export/print), `Mod+\` (toggle sidebar), `Mod+Shift+L` (toggle layer) |
| **Editor formatting** | `@tanstack/react-hotkeys` scoped na editor wrapper | `Mod+B` (bold), `Mod+I` (italic), `Mod+U` (underline) |

**Proč two-layer:**
- ProseMirror **musí** interceptovat Enter/Tab/Backspace *před* browserem (zamezit `<br>`, `\t`, default behavior)
- App-level zkratky fungují i mimo editor (sidebar focus, modal, command palette)
- `@tanstack/react-hotkeys` + ProseMirror se neperou — PM interceptuje uvnitř editoru, TanStack Hotkeys na document/element scope s automatickým input filtering

**Plánované app-level shortcuty:**

| Shortcut | Akce | Scope |
|----------|------|-------|
| `Mod+S` | Save script | Global |
| `Mod+Z` | Undo | Editor (deleguje na TipTap History) |
| `Mod+Shift+Z` | Redo | Editor |
| `Mod+F` | Find & replace | Editor |
| `Mod+P` | Export / print | Global |
| `Mod+,` | Settings | Global |
| `Mod+\` | Toggle left sidebar | Global |
| `Mod+Shift+\` | Toggle right sidebar | Global |
| `Mod+Shift+L` | Toggle layer visibility | Editor |
| `Mod+1..9` | Jump to scene by index | Editor |
| `Escape` | Close modal / deselect | Global (conditional) |

**Enter → next type mapa:**

| Aktuální typ | Next typ po Enter |
|-------------|-------------------|
| `act` | `sceneHeading` |
| `sceneHeading` | `action` |
| `action` | `action` |
| `character` | `dialogue` |
| `dualDialogueCharacter` | `dialogue` |
| `parenthetical` | `character` |
| `dialogue` | `character` |
| `transition` | `sceneHeading` |
| `lyrics` | `lyrics` |
| `note` | `action` |

**Tab cycling order:**
`action` → `character` → `sceneHeading` → `transition` → `parenthetical` → `note` → `lyrics` → `action`

### CharacterTagDecorationsExtension (extrahována z FountainBlockExtension)

`Extension.create()` — ProseMirror plugin pro inline `Decoration.inline` na character jménech.

**Logika:**
1. Prochází character/dual_dialogue_character bloky
2. Parsuje text přes `splitCharacterTokens()` (split na `+`)
3. Normalizuje klíč: `"JIMMY (V.O.)"` → `"JIMMY"`
4. Lookup `characterRefs[key]` → resolved character ID → barva
5. Vytváří `Decoration.inline` s CSS `--character-tag-color`

**Konfigurace:**
- `colorByCharacterIdRef: React.RefObject<Map<string, string>>` — ref na mapu character ID → hex color
- `characterColorSaturation: number`

### StructureMarkerDecorationsExtension (extrahována z FountainBlockExtension)

`Extension.create()` — widget decorations pro music segment start/end markery.

### FountainPaginationExtension (zachována, upravena)

Existující paginace. Úpravy:
- Update node type references (`fountainBlock` → nové node names)
- Zachovat commands: `updatePaginationSettings`, `forcePaginationRecalc`

### BlockUiEventsExtension (zachována, upravena)

Detekce strukturálních mutací. Úpravy:
- Update event typy pro nové node names
- Zachovat: `blockInserted`, `blockRemoved`, `blockReordered`, `blockTypeChanged`, `activeBlockChanged`

### PlaceholderExtension (nová)

Inspirace: `__scriptio/src/lib/screenplay/extensions/placeholder-extension.ts`

Zobrazuje placeholder text v prázdných blocích:

| Block type | Placeholder text |
|------------|-----------------|
| `sceneHeading` | "INT./EXT. LOCATION — TIME" |
| `action` | "Action…" |
| `character` | "CHARACTER NAME" |
| `dialogue` | "Dialogue…" |
| `parenthetical` | "(parenthetical)" |
| `transition` | "TRANSITION:" |
| `lyrics` | "Lyrics…" |
| `note` | "Note…" |

### FountainDetectionExtension (nová)

Inspirace: `__scriptio/src/lib/screenplay/extensions/fountain-extension.ts`

Auto-detekce block typů z textu (via `appendTransaction`):

| Pattern | Detekovaný typ |
|---------|---------------|
| Text začíná `.` | `sceneHeading` |
| Text začíná `@` | `character` |
| Text začíná `!` | `action` |
| Text začíná `>` | `transition` |
| Text je celý UPPERCASE (a blok je `action`) | `character` |

---

## Extensions — kompletní seznam (v pořadí registrace)

```typescript
const extensions = [
  DocumentWithSettings,
  FountainPaginationExtension,
  Text,
  History,
  Bold, Italic, Underline,
  // Column extensions
  FountainColumnGroupExtension,
  FountainColumnExtension,
  // Block node types
  SceneHeadingNode,
  ActNode,
  ActionNode,
  CharacterNode,
  DualDialogueCharacterNode,
  DialogueNode,
  ParentheticalNode,
  TransitionNode,
  LyricsNode,
  NoteNode,
  // Behavior extensions
  UniqueID.configure({ types: ALL_FOUNTAIN_NODE_NAMES, attributeName: 'id' }),
  FountainBehaviorExtension,
  FountainDetectionExtension,
  PlaceholderExtension,
  // Decoration extensions
  CharacterTagDecorationsExtension,
  StructureMarkerDecorationsExtension,
  // Event extensions
  BlockUiEventsExtension,
]
```

---

## Third-party TipTap extensions

| Package | Verze | Účel |
|---------|-------|------|
| `@tiptap/core` | ^3.19 | Core framework |
| `@tiptap/react` | ^3.19 | React binding |
| `@tiptap/pm` | ^3.19 | ProseMirror access |
| `@tiptap/extension-document` | ^3.19 | Base document (extended) |
| `@tiptap/extension-text` | ^3.19 | Inline text node |
| `@tiptap/extension-bold` | ^3.19 | Bold mark |
| `@tiptap/extension-italic` | ^3.19 | Italic mark |
| `@tiptap/extension-underline` | ^3.19 | Underline mark |
| `@tiptap/extension-history` | ^3.19 | Undo/redo |
| `@tiptap/extension-unique-id` | ^3.19 | Auto-generated block IDs |

---

## Inline anotace — Marks vs. Decorations (D10 revised)

**Klíčové architektonické rozhodnutí:** Rozlišujeme dva typy inline anotací s různým storage a rendering modelem.

### A) Script-intrinsic marks (TipTap Marks v content_json)

Pro formátování, které je **součástí textu scénáře**:

| Mark | Popis | Behavior při editaci |
|------|-------|---------------------|
| `bold` | Tučné písmo | Šíří se při split/join ✅ |
| `italic` | Kurzíva | Šíří se při split/join ✅ |
| `underline` | Podtržení | Šíří se při split/join ✅ |

Tyto marks žijí v `content_json` na bloku a jsou součástí ProseMirror document modelu.

### B) Production annotations (DB záznamy + ProseMirror Decorations)

Pro anotace, které **nepatří do textu scénáře**, ale jsou vizuálním overlay od produkčních oddělení:

| Typ anotace | Department | Popis |
|-------------|-----------|-------|
| `cue_light` | lighting | Světelné cues na konkrétních momentech |
| `cue_sound` | sound | Zvukové cues |
| `cue_choreography` | choreography | Taneční/pohybové poznámky |
| `comment` | any | Komentáře s thread podporou |
| `direction_note` | direction | Režijní poznámky |
| `blocking_note` | direction | Blocking / pozice na jevišti |
| `highlight` | any | Barevné zvýraznění |
| `actor_note` | acting | Osobní herecké poznámky |

**Tyto anotace:**
- Jsou uloženy v tabulce `script_block_annotations` (s `start_offset`, `end_offset`, `layer_id`)
- Renderují se jako `Decoration.inline()` — vizuální overlay, NEmodifikují document state
- Patří do vrstvy (layer) → filtrování dle view/permissions
- NEšíří se při split/join — pozice se přemapují přes Block Sync Engine
- Nikdy se nemíchají s textem scénáře v `content_json`

### Budoucí AnnotationDecorationsExtension

```typescript
AnnotationDecorationsExtension.configure({
  // Ref na aktuálně viditelné anotace (filtrované dle active view/layers)
  visibleAnnotationsRef: useLatestRef(visibleAnnotations),
  // Barvy per layer
  layerColorsRef: useLatestRef(layerColors),
})
```

ProseMirror plugin:
1. Na každý doc change: přemapuj offsety přes `tr.mapping`
2. Pro každou viditelnou anotaci: `Decoration.inline(start, end, { class, style, data-annotation-id })`
3. Widget decorations pro annotation markers (ikony cues v marginu)

---

## Budoucí extensions (neimplementovat teď)

### Screenplay extensions

| Extension | Priorita | Inspirace z __scriptio | Popis |
|-----------|----------|------------------------|-------|
| `SceneIdDedupExtension` | P2 | `scene-id-dedup-extension.ts` | Deduplikace scene IDs při paste |
| `ContdExtension` | P3 | `contd-extension.ts` | "(CONT'D)" labely pro continuation dialogue |
| `OrphanPreventionExtension` | P3 | `orphan-prevention-extension.ts` | Prevence widows/orphans na page breaks |
| `SearchHighlightExtension` | P2 | `search-highlight-extension.ts` | Find & replace s highlighting |
| `SceneBookmarkExtension` | P3 | `scene-bookmark-extension.ts` | Scene color bookmarks v marginu |

### Production platform extensions

| Extension | Priorita | Popis |
|-----------|----------|-------|
| `AnnotationDecorationsExtension` | P2 | Renderuje production annotations jako Decorations. Přemapovává offsety při editaci. |
| `CueMarginWidgetsExtension` | P3 | Ikony cues v marginu stránky (widget decorations) |
| `LayerToggleExtension` | P2 | Commands pro toggle viditelnosti vrstev v editoru |
| `ViewFilterExtension` | P3 | Filtrování bloků dle view config (skrytí nepotřebných blok typů) |

---

## Odebrané extensions (deprecated)

| Extension | Důvod odebrání | Náhrada |
|-----------|----------------|---------|
| `FountainBlockExtension` (monolith) | Rozdělena na node-per-type + behavior extensions | Jednotlivé nodes + `FountainBehaviorExtension` |
| `ScriptBlockIndexExtension` | Blok index nepotřeba — bloky přímo v DB | TanStack DB live queries |
| `ScriptSidebarProjectionExtension` | Sidebar data nepotřeba derivovat z ProseMirror | TanStack DB live queries (`useScenes`, `useCharacters`) |

---

## Klíčové design patterns

### 1. Ref-heavy extension pattern (zachováno z __scriptio)

Extensions potřebují přístup k často se měnícímu state (highlighted characters, search term). Pattern: extension přijímá **React refs**, ne state hodnoty. Refs se aktualizují bez re-creating extensions.

```typescript
FountainBehaviorExtension.configure({
  blockNextElementsRef: useLatestRef(blockNextElements),
  blockShortcutsRef: useLatestRef(blockShortcuts),
})
```

### 2. shouldRerenderOnTransaction: false (zachováno)

Editor React component se nikdy nere-renderuje na ProseMirror transakcích. State propagace je manuální přes `editor.on('transaction')` → TanStack DB mutations.

### 3. Compound component pattern (zachováno)

```tsx
<FountainEditor document={doc} settings={settings} onAutoSave={handleSave}>
  <FountainEditor.LeftSidebar>
    <StructureSidebar />
  </FountainEditor.LeftSidebar>
  <FountainEditor.RightSidebar>
    <CharactersSidebar />
  </FountainEditor.RightSidebar>
</FountainEditor>
```

### 4. Block grouping a hromadné operace (D17)

Bloky tvoří logické skupiny, které je třeba přesouvat/mazat jako celek.

**Strukturální hierarchie (Act → Scene → Block):**
- Acts a Scenes jsou wrapping ProseMirror nodes → přesun v sidebaru = přesun celého node i s obsahem
- FK `scene_id`/`act_id` na `script_blocks` se aktualizují přes Block Sync Engine po transakci

**Character group (implicit z document order):**

Character group = CHARACTER node + všechny bezprostředně následující siblings typu `dialogue | parenthetical | lyrics`.

```typescript
// Utility v FountainBehaviorExtension
const CHARACTER_CHILD_TYPES = new Set(['dialogue', 'parenthetical', 'lyrics'])

function getCharacterGroupRange(doc: Node, characterPos: number): { from: number; to: number } {
  const $pos = doc.resolve(characterPos)
  const parent = $pos.parent
  const startIndex = $pos.index()
  let endIndex = startIndex + 1

  while (endIndex < parent.childCount) {
    const child = parent.child(endIndex)
    if (!CHARACTER_CHILD_TYPES.has(child.type.name)) break
    endIndex++
  }

  const from = $pos.posAtIndex(startIndex)
  const to = $pos.posAtIndex(endIndex)
  return { from, to }
}
```

Použití:
- **Drag & drop** — při tahu CHARACTER node se expanduje selekce na celý group
- **Delete** — smazání CHARACTER node nabídne smazat celý group
- **Move up/down** — přesune celý group v rámci scény
- **Cut/Copy** — vybere celý group do clipboard

**Budoucí extensible groups:**

| Typ skupiny | Mechanismus | Příklad |
|-------------|-----------|--------|
| Muzikální číslo | Nový wrapping ProseMirror node `musicalNumber` | Zahrnuje lyrics + character + dialogue sekvence |
| Montáž | Nový wrapping node `montage` | Série krátkých scén |
| Flashback | Nový wrapping node `flashback` | Scény v rámci flashbacku |
| Dual dialogue | Existující `fountainColumnGroup` | Dva paralelní character groups |

### 5. Node type → DB block_type mapping

Konverze mezi TipTap node name (camelCase) a DB block_type (snake_case):

```typescript
const NODE_TO_BLOCK_TYPE: Record<string, string> = {
  sceneHeading: 'scene_heading',
  act: 'act',
  action: 'action',
  character: 'character',
  dualDialogueCharacter: 'dual_dialogue_character',
  parenthetical: 'parenthetical',
  dialogue: 'dialogue',
  transition: 'transition',
  lyrics: 'lyrics',
  note: 'note',
}

const BLOCK_TYPE_TO_NODE: Record<string, string> = Object.fromEntries(
  Object.entries(NODE_TO_BLOCK_TYPE).map(([k, v]) => [v, k])
)
```
