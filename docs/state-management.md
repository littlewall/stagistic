# State Management

Data flow, state management a persistence pipeline pro Stagistic po rewrite.

---

## Tech Stack

| Knihovna | Účel | Package |
|---------|------|---------|
| `@tanstack/db` | Reactive collections s optimistic mutations | `@stagistic/app-core` |
| `@tanstack/pacer` | Debounced/batched flush do PGlite | `@stagistic/app-core` |
| `@tanstack/store` | Lightweight reactive store pro ephemeral UI state | `@stagistic/app-core` |
| `@tanstack/react-hotkeys` | App-level keyboard shortcuts (cross-platform, type-safe) | `@stagistic/app-core` |
| ProseMirror (via TipTap) | Source of truth při editaci | `@stagistic/editor-ui` |
| PGlite | Lokální persistence (IndexedDB/WASM) | `@stagistic/db` |

---

## Architektura — přehled vrstev

```
┌─────────────────────────────────────────────────────┐
│                    UI Layer                           │
│  React components, sidebars, toolbar, dialogs        │
│  Hooks: useBlocks(), useScenes(), useCharacters()    │
└──────────────────────┬──────────────────────────────┘
                       │ read (live queries)
                       │ write (mutations)
                       ▼
┌─────────────────────────────────────────────────────┐
│              TanStack DB Collections                  │
│  blocksCollection, scenesCollection,                  │
│  actsCollection, charactersCollection,                │
│  locationsCollection, blockCharacterRefsCollection    │
│                                                       │
│  Optimistic mutations — instant UI update             │
└──────────────────────┬──────────────────────────────┘
                       │ flush (batched)
                       ▼
┌─────────────────────────────────────────────────────┐
│              TanStack Pacer                           │
│  Debounce: 400ms idle, 2s max                        │
│  Batch: sbírá changes, deduplikuje, flush najednou   │
└──────────────────────┬──────────────────────────────┘
                       │ SQL operations
                       ▼
┌─────────────────────────────────────────────────────┐
│                    PGlite                             │
│  Postgres v WASM, IndexedDB storage                  │
│  Drizzle ORM queries                                 │
└─────────────────────────────────────────────────────┘
```

Vedle toho existuje **TanStack Store** pro ephemeral state (active block, sidebar tab, scroll position) — nepersistuje se do DB.

---

## TanStack DB Collections

Definice v `packages/app-core/src/scripts/data/`:

### blocksCollection

```typescript
const blocksCollection = createCollection<ScriptBlock>({
  id: 'blocks',
  getId: (block) => block.id,
})
```

Typ `ScriptBlock`:
```typescript
interface ScriptBlock {
  id: string
  scriptId: string
  blockType: string        // 'scene_heading' | 'action' | 'character' | ...
  orderNo: number
  textContent: string
  contentJson: string | null   // TipTap inline JSON s marks
  sceneId: string | null
  actId: string | null
  columnGroupId: string | null
  columnIndex: number | null
  createdAt: number
  updatedAt: number
}
```

### scenesCollection

```typescript
interface ScriptScene {
  id: string
  scriptId: string
  headingBlockId: string | null
  sceneNumber: string | null
  colorHex: string | null
  synopsis: string | null
  locationId: string | null
  createdAt: number
  updatedAt: number
}
```

### actsCollection

```typescript
interface ScriptAct {
  id: string
  scriptId: string
  headingBlockId: string | null
  name: string
  createdAt: number
  updatedAt: number
}
```

### charactersCollection

```typescript
interface ScriptCharacter {
  id: string
  scriptId: string
  characterKey: string
  colorHex: string | null
  genderKey: string | null
  notes: string | null
  backstory: string | null
  createdAt: number
  updatedAt: number
}
```

### locationsCollection

```typescript
interface ScriptLocation {
  id: string
  scriptId: string
  name: string
  description: string | null
  createdAt: number
  updatedAt: number
}
```

### blockCharacterRefsCollection

```typescript
interface ScriptBlockCharacterRef {
  blockId: string
  characterKey: string
  characterId: string
  isConfirmed: boolean
}
```

---

## React Hooks (live queries)

Definice v `packages/app-core/src/scripts/data/hooks/`:

| Hook | Popis | Závislost |
|------|-------|-----------|
| `useBlocks(scriptId)` | Všechny bloky scriptu, seřazené dle `orderNo` | `blocksCollection` |
| `useBlocksByScene(sceneId)` | Bloky jedné scény | `blocksCollection` (filtered) |
| `useBlocksByAct(actId)` | Bloky jednoho aktu | `blocksCollection` (filtered) |
| `useScenes(scriptId)` | Scény scriptu s metadata | `scenesCollection` |
| `useActs(scriptId)` | Akty scriptu | `actsCollection` |
| `useCharacters(scriptId)` | Postavy scriptu s metadata | `charactersCollection` |
| `useLocations(scriptId)` | Lokace scriptu | `locationsCollection` |
| `useCharacterBlockRefs(scriptId)` | Všechny character↔block vazby | `blockCharacterRefsCollection` |
| `useBlockCharacterRefs(blockId)` | Refs jednoho bloku | `blockCharacterRefsCollection` (filtered) |
| `useCharacterBlocks(characterId)` | Bloky jedné postavy | JOIN `blockCharacterRefsCollection` + `blocksCollection` |

**Všechny hooks jsou reaktivní** — UI se automaticky re-renderuje při změnách v collections (i optimistic).

---

## Mutations

### Editor mutations (přes Block Sync Engine)

Viz sekce [Block Sync Engine](#block-sync-engine). Editor produkuje `BlockChange[]` na každém ProseMirror transactionu → TanStack DB mutations → Pacer → PGlite.

### Sidebar / panel mutations (přímé)

```typescript
// Character metadata
const updateCharacterColor = (characterId: string, colorHex: string) => {
  charactersCollection.update(characterId, { colorHex, updatedAt: Date.now() })
  pacer.schedule(() => dbQueries.characters.updateColor(db, characterId, colorHex))
}

// Scene metadata
const updateSceneSynopsis = (sceneId: string, synopsis: string) => {
  scenesCollection.update(sceneId, { synopsis, updatedAt: Date.now() })
  pacer.schedule(() => dbQueries.scenes.updateMetadata(db, sceneId, { synopsis }))
}

// Character rename — ovlivňuje i editor
const renameCharacter = (characterId: string, oldKey: string, newKey: string) => {
  // 1. Update DB collection
  charactersCollection.update(characterId, { characterKey: newKey, updatedAt: Date.now() })
  // 2. Update editor (ProseMirror command)
  editor.commands.renameCharacterText(oldKey, newKey)
  // 3. ProseMirror transaction → Block Sync Engine → standard pipeline
}
```

---

## Block Sync Engine

Modul v `packages/editor-ui/src/editor/sync/`.

### BlockDiffEngine

Zodpovědný za extrakci změn z ProseMirror transakcí.

```typescript
interface BlockChange {
  type: 'insert' | 'update' | 'delete'
  blockId: string
  data?: {
    blockType: string
    orderNo: number
    textContent: string
    contentJson: string | null
    sceneId?: string | null
    actId?: string | null
    characterRefs?: Record<string, string> | null
  }
}

function diffTransaction(
  tr: Transaction,
  prevDoc: ProseMirrorNode,
  blockMap: Map<string, ScriptBlock>
): BlockChange[]
```

**Optimalizační strategie:**

1. **Fast path — typing (single block text change):**
   - Detekce: `tr.steps.length === 1` a step je `ReplaceStep` uvnitř jednoho bloku
   - Akce: jen `{ type: 'update', blockId, data: { textContent, contentJson } }`
   - Cíl: < 1ms

2. **Medium path — single block structural change:**
   - Detekce: Enter (split), Delete (join), Tab (type change) — ovlivňují 1-3 bloky
   - Akce: identifikovat dotčené bloky přes `tr.mapping`, produkovat insert/update/delete

3. **Full path — multi-block structural change:**
   - Detekce: paste, drag-reorder, bulk operations
   - Akce: porovnat `prevDoc` a `tr.doc` v dotčeném rozsahu, produkovat plný diff

4. **Order maintenance:**
   - Při insertu/delete se `order_no` přepočítá pro dotčené bloky
   - Sparse ordering (mezery v order_no) pro minimalizaci updates při vkládání

### BlockSyncController

Orchestrátor celé sync pipeline.

```typescript
class BlockSyncController {
  private diffEngine: BlockDiffEngine
  private pacer: TanStackPacer
  private pendingChanges: Map<string, BlockChange>

  /** Volat na každém ProseMirror transactionu */
  onTransaction(tr: Transaction, prevDoc: ProseMirrorNode): void {
    const changes = this.diffEngine.diffTransaction(tr, prevDoc, this.blockMap)

    // 1. Optimistic update v TanStack DB (okamžité, UI se re-renderuje)
    for (const change of changes) {
      this.applyOptimistic(change)
    }

    // 2. Akumulovat do pending (deduplikace)
    for (const change of changes) {
      this.pendingChanges.set(change.blockId, change)
    }

    // 3. Naplánovat flush přes Pacer
    this.pacer.schedule(() => this.flush())
  }

  /** Flush pending changes do PGlite */
  private async flush(): Promise<void> {
    const changes = Array.from(this.pendingChanges.values())
    this.pendingChanges.clear()

    const upserts = changes.filter(c => c.type !== 'delete').map(c => c.data!)
    const deletes = changes.filter(c => c.type === 'delete').map(c => c.blockId)

    await Promise.all([
      upserts.length > 0 && dbQueries.blocks.bulkUpsert(db, upserts),
      deletes.length > 0 && dbQueries.blocks.bulkDelete(db, deletes),
    ])
  }
}
```

### Pacer konfigurace

```typescript
const pacer = createPacer({
  wait: 400,      // 400ms idle debounce
  maxWait: 2000,  // 2s max wait (force flush)
  leading: false,
  trailing: true,
})
```

---

## Content Serialization

Modul v `packages/script-core/src/serialization/`:

### nodeToBlockRow(node) → BlockRow

Extrahuje z ProseMirror node data pro DB řádek:

```typescript
function nodeToBlockRow(
  node: ProseMirrorNode,
  orderNo: number,
  context: { sceneId?: string, actId?: string }
): BlockRow {
  return {
    id: node.attrs.id,
    blockType: NODE_TO_BLOCK_TYPE[node.type.name],
    orderNo,
    textContent: node.textContent,
    contentJson: hasMarks(node) ? serializeInlineContent(node.content) : null,
    sceneId: context.sceneId ?? null,
    actId: context.actId ?? null,
    characterRefs: node.attrs.characterRefs ?? null,
    // column fields...
  }
}
```

### blockRowToTipTapNode(row) → TipTapJSONContent

Rekonstruuje TipTap node JSON z DB řádku:

```typescript
function blockRowToTipTapNode(row: BlockRow): TipTapJSONContent {
  const nodeName = BLOCK_TYPE_TO_NODE[row.blockType]
  return {
    type: nodeName,
    attrs: {
      id: row.id,
      ...(row.characterRefs ? { characterRefs: row.characterRefs } : {}),
      ...(row.sceneId ? { sceneId: row.sceneId } : {}),
    },
    content: row.contentJson
      ? JSON.parse(row.contentJson)
      : row.textContent
        ? [{ type: 'text', text: row.textContent }]
        : [],
  }
}
```

### buildScriptDocument(blocks, acts, scenes) → ScriptDocument

Sestaví kompletní TipTap document z DB dat:

```typescript
function buildScriptDocument(
  blocks: BlockRow[],
  acts: ActRow[],
  scenes: SceneRow[],
  settings?: EditorSettingsOverride,
  structure?: ScriptStructure
): ScriptDocument {
  // 1. Sort blocks by orderNo
  // 2. Group column blocks into fountainColumnGroup wrappers
  // 3. Convert each block to TipTap node
  // 4. Wrap in document
  return {
    type: 'doc',
    attrs: { settings, structure },
    content: buildContent(sortedBlocks),
  }
}
```

---

## Load Flow (detail)

```
1. User opens script (scriptId)
   │
2. Query PGlite:
   │  blocks = dbQueries.blocks.listByScript(scriptId)
   │  scenes = dbQueries.scenes.listByScript(scriptId)
   │  acts = dbQueries.acts.listByScript(scriptId)
   │  characters = dbQueries.characters.listByScript(scriptId)
   │  locations = dbQueries.locations.listByScript(scriptId)
   │  refs = dbQueries.blockCharacterRefs.listByScript(scriptId)
   │  config = dbQueries.configs.getByNamespace(scriptId, 'editor')
   │
3. Populate TanStack DB collections:
   │  blocksCollection.populate(blocks)
   │  scenesCollection.populate(scenes)
   │  actsCollection.populate(acts)
   │  charactersCollection.populate(characters)
   │  locationsCollection.populate(locations)
   │  blockCharacterRefsCollection.populate(refs)
   │
4. Build TipTap document:
   │  doc = buildScriptDocument(blocks, acts, scenes, config.settings, config.structure)
   │
5. Initialize editor:
   │  editor = useEditor({ extensions, content: doc })
   │
6. Wire Block Sync Controller:
      syncController = new BlockSyncController(editor, collections, pacer, db)
```

---

## Save Flow (detail)

```
1. User types in editor
   │
2. ProseMirror transaction fires
   │  editor.on('transaction', ({ transaction }) => {
   │    syncController.onTransaction(transaction, prevDoc)
   │  })
   │
3. BlockDiffEngine.diffTransaction():
   │  Fast path: single block text change → 1 BlockChange
   │  Structural: multi-block → N BlockChanges
   │
4. Optimistic mutations (instant):
   │  for (change of changes) {
   │    if (change.type === 'insert') blocksCollection.insert(change.data)
   │    if (change.type === 'update') blocksCollection.update(change.blockId, change.data)
   │    if (change.type === 'delete') blocksCollection.delete(change.blockId)
   │  }
   │  → UI hooks (useScenes, useCharacters, ...) re-render immediately
   │
5. Pacer accumulation (deduplicate):
   │  pendingChanges.set(change.blockId, change)  // last wins
   │
6. Pacer flush (after 400ms idle or 2s max):
   │  bulkUpsert(upserts) + bulkDelete(deletes) → PGlite
   │
7. Character refs sync (if character/dual_dialogue_character block changed):
      extractCharacterRefs(block) → replaceForBlock(blockId, refs) → PGlite
```

---

## Ephemeral State (TanStack Store)

Pro UI state, který se nepersistuje do DB:

```typescript
const editorUiStore = createStore({
  activeBlockId: null as string | null,
  sidebarTab: 'structure' as 'structure' | 'characters' | 'locations',
  scrollPosition: 0,
  isEditorFocused: false,
})

// Hooks
const useActiveBlockId = () => useStoreSelector(editorUiStore, s => s.activeBlockId)
const useSidebarTab = () => useStoreSelector(editorUiStore, s => s.sidebarTab)
```

---

## Interaction scénáře

### Scénář 1: Uživatel píše text

```
Keystroke → ProseMirror transaction (typing step)
  → BlockDiffEngine fast path: 1 update (textContent + contentJson)
  → TanStack DB blocksCollection.update (optimistic, instant)
  → Pacer: accumulate, wait 400ms
  → [... user types more ...]
  → Pacer flush: 1 bulkUpsert (final state of that block)
```

Latence pro UI: 0ms (optimistic). DB write: 1 per 400ms idle window.

### Scénář 2: Uživatel změní barvu postavy v sidebaru

```
Click color picker → updateCharacterColor(charId, '#ff0000')
  → TanStack DB charactersCollection.update (optimistic, instant)
  → Pacer: schedule DB write
  → CharacterTagDecorationsExtension: picks up new color via ref → redecorates
  → Pacer flush: 1 UPDATE script_characters
```

### Scénář 3: Uživatel přidá novou scénu (Enter na scene heading)

```
Enter key on scene_heading block
  → ProseMirror: split block → new action block below
  → BlockDiffEngine: 1 update (trimmed scene block) + 1 insert (new action block)
  → TanStack DB: optimistic insert/update
  → Scene detection: new scene_heading block → upsert script_scenes
  → Pacer flush: bulkUpsert blocks + upsert scene
```

### Scénář 4: Uživatel drag-and-drop přeřadí scénu v sidebaru

```
Drag scene in sidebar → moveScene(sceneId, newOrderNo)
  → TanStack DB: batch reorder (optimistic, all affected blocks update orderNo)
  → Editor: editor.commands to move blocks in ProseMirror state
    → ProseMirror transaction (structural change)
    → BlockDiffEngine: multi-block reorder
    → Standard flush pipeline
```

### Scénář 5: Load scriptu s 200 stránkami

```
Open script → PGlite query (~4000 blocks)
  → buildScriptDocument(): ~50ms (JSON assembly)
  → editor.setContent(doc): ~200ms (ProseMirror parsing)
  → TanStack DB populate: ~20ms
  → Total: < 500ms target
```
