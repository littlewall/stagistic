---
name: stagistic-architecture
description: >
  High-level architectural principles for the Stagistic project rewrite (D1–D18). Use this skill
  whenever writing, modifying, or reviewing any code in this monorepo — DB schema, editor extensions,
  state management, repository layer, keyboard shortcuts, or sync logic. Prevents violating the agreed
  architectural decisions documented in docs/.
license: MIT
metadata:
  author: stagistic
  version: "1.0.0"
---

# Stagistic Architecture Principles

Authoritative set of constraints extracted from `docs/decisions.md` (D1–D18).
Full rationale and context is in `docs/` — this skill is the actionable summary.

## When to Apply

Always. Any task touching:
- Database schema (`packages/db/src/`)
- Editor extensions (`packages/editor-ui/src/editor/`)
- State management / hooks (`packages/app-core/src/`)
- Repository / sync layer (`packages/sync-core/src/`, `apps/desktop/src/repo/`, `apps/web/src/repo/`)
- New features that store data

---

## Rule 1 — No JSON blobs for content (D1)

**DO NOT** store script content as a JSON blob (e.g., a single `content_json` on the script level).

**DO** store every block as a row in `script_blocks`. Content is per-row, not per-document.

```ts
// ❌ WRONG
scripts: { id, content_json }   // entire document JSON

// ✅ CORRECT
script_blocks: { id, script_id, scene_id, block_type, order_no, text_content, content_json }
```

Existing tables `script_latest`, `script_versions`, `script_block_index_meta`, `script_block_index_rows`
are **scheduled for removal** — do not build on them.

---

## Rule 2 — One TipTap Node per block type (D2, D9)

**DO NOT** add logic to the monolithic `fountainBlock` node or its attribute `blockType`.

**DO** create a new `Node.create()` file per block type using the factory:

```ts
// packages/editor-ui/src/editor/tiptap/nodes/createFountainNode.ts
const sceneHeadingNode = createFountainNode({
  name: 'sceneHeading',
  attributes: { sceneId: { default: null } },
  // ...
})
```

Block types: `sceneHeading`, `act`, `action`, `character`, `dialogue`, `parenthetical`,
`transition`, `lyrics`, `note`, `dualDialogueCharacter`.

---

## Rule 3 — Dual storage per block (D3)

Every `script_blocks` row stores **both**:
- `text_content TEXT` — plain text (for search, stats, export)
- `content_json TEXT NULL` — TipTap inline JSON **only if block has inline marks** (bold/italic/underline)

`content_json` is `NULL` when the block has no marks — do not store redundant JSON.

---

## Rule 4 — ProseMirror is source of truth during editing (D4)

Inside the editor: ProseMirror state is authoritative. Never read DB state to reconstruct
what the user is typing.

Data flow:
```
ProseMirror transaction
  → Block Diff Engine (tr.steps + tr.mapping → BlockChange[])
  → TanStack DB collection (optimistic, immediate)
  → TanStack Pacer (debounce 400ms idle / 2s max)
  → PGlite
```

Sidebar and metadata (outside editor) go directly: `TanStack DB → PGlite`, no editor round-trip.

---

## Rule 5 — TanStack stack for state (D5)

| Need | Use |
|------|-----|
| Reactive collections (blocks, scenes, characters, …) | `@tanstack/db` |
| Debounced/batched DB writes | `@tanstack/pacer` |
| Ephemeral UI state (active block, sidebar tab, scroll) | `@tanstack/store` |
| App-level keyboard shortcuts | `@tanstack/react-hotkeys` |

**Do not** introduce Redux, Zustand, Jotai, or other state libraries.
**Do not** write to PGlite on every keystroke — always go through Pacer.

---

## Rule 6 — PGlite on both platforms (D6, D12)

Both `apps/web` and `apps/desktop` use PGlite (Postgres WASM over IndexedDB) as the local DB.

Shared bootstrap lives in `packages/db/src/pglite/` — both apps import `@stagistic/db/pglite`.
**Do not** add platform-specific DB initialization outside the shared package.

---

## Rule 7 — Extension tables, never ALTER main tables (D8)

New type-specific or feature-specific data → new table with FK to `script_blocks`, `script_scenes`,
or `script_characters`. Never add columns to the core tables for feature-specific data.

```
✅ script_block_character_refs  (FK → script_blocks.id, FK → script_characters.id)
✅ script_block_annotations     (FK → script_blocks.id, future)
✅ script_props                 (FK → script_scenes.id, future)
❌ ALTER TABLE script_blocks ADD COLUMN lighting_cue_id  ← wrong pattern
```

---

## Rule 8 — Production annotations are Decorations, NOT TipTap Marks (D10)

**Two separate tracks for inline content:**

| Type | What | Storage | ProseMirror |
|------|------|---------|-------------|
| Script-intrinsic marks | bold, italic, underline | `content_json` on block | TipTap `Mark.create()` |
| Production annotations | cues, comments, direction notes, highlights | `script_block_annotations` table with `start_offset`/`end_offset` | `Decoration.inline` (view-only overlay) |

**Do not** add production/operational data as TipTap Marks. Marks live in document state,
spread on split/join, are visible to everyone, and mix script text with production metadata.

Decorations are view-only overlays — they do not modify document state, they are filtered per
layer/user, and managed by `AnnotationDecorationsExtension`.

---

## Rule 9 — Layers and Views for production data (D13, D14, D15)

Every production annotation belongs to a **layer** (`script_layers.id`).
A layer belongs to a **department** (`lighting`, `sound`, `choreography`, `direction`, `acting`, `stage_management`).

A **view** (`script_views`) is a named configuration of which layers and block types are visible/editable.
Pre-defined templates: `writer`, `director`, `stage_manager`, `actor`, `lighting_designer`, `sound_designer`, `choreographer`.

When adding a production feature:
1. Check if a layer type covers it — if not, add a `layer_type` value
2. Store data in the appropriate extension table (FK → layer or FK → scene/block)
3. Render via Decoration, never via Mark or document node

---

## Rule 10 — ABAC-ready: permission boundaries = layers + views (D16)

Do not hardcode visibility logic. Permissions will resolve as:
```
user → script_members (role + department + character_id)
  → script_views (visible/editable layer ids + block type filters)
    → SQL WHERE filters + Decoration filters
```

When writing query modules: always accept a `viewConfig` or `layerIds` parameter so the query
can be filtered — even if enforcement is not implemented yet. Never return all data unconditionally
for production entities (annotations, cues, notes).

---

## Rule 11 — Block grouping is implicit, not stored (D17)

**Structural hierarchy** (Act → Scene → Block) uses FK: `script_blocks.act_id`, `script_blocks.scene_id`.
Moving a scene in the sidebar = update `script_scenes.position`; blocks follow via FK.

**Character groups** (CHARACTER + following DIALOGUE/PARENTHETICAL/LYRICS) are derived at runtime
from document order + block type rules. **Do not** add `parent_block_id` or `group_id` to `script_blocks`.

```ts
// ❌ WRONG
script_blocks: { ..., parent_block_id }  // explicit grouping column

// ✅ CORRECT — derive from document order
const CHARACTER_CHILD_TYPES = new Set(['dialogue', 'parenthetical', 'lyrics'])
// scan siblings after CHARACTER node until a non-child type is found
```

Future extensible groups (musical numbers, montages, flashbacks):
- Structural → new wrapping ProseMirror node + new DB table (same pattern as acts/scenes)
- Range-based → DB stored range with `start_block_id` + `end_block_id` (same pattern as annotations)

---

## Rule 12 — Two-layer keyboard shortcut architecture (D18)

| Layer | Engine | Examples |
|-------|--------|----------|
| **Editor-internal** | ProseMirror `handleKeyDown` in `FountainBehaviorExtension` | Enter, Tab, Backspace, Fountain prefixes (`.` `@` `>` `!`), ALL CAPS detection |
| **App-level** | `@tanstack/react-hotkeys` — `useHotkey()` | `Mod+S`, `Mod+F`, `Mod+P`, panel toggles, layer toggles |
| **Editor formatting** | `@tanstack/react-hotkeys` scoped to editor wrapper | `Mod+B`, `Mod+I`, `Mod+U` |

**Do not** use `@tanstack/react-hotkeys` for Enter/Tab/Backspace — ProseMirror must intercept these
before the browser to prevent `<br>`, tab insertion, default behavior.

**Do not** handle app-level shortcuts (save, search, export, panel toggle) inside ProseMirror plugins —
they must work outside the editor (sidebar, modals, command palette).

**Do not** use raw `addEventListener('keydown')` for keyboard shortcuts — use `useHotkey()` for
type-safety, cross-platform `Mod`, automatic input filtering, and scoping.

---

## Quick Reference — Do's and Don'ts

| ✅ DO | ❌ DO NOT |
|-------|----------|
| One row per block in `script_blocks` | Store document as JSON blob |
| `createFountainNode()` factory for new nodes | Add logic to monolithic `fountainBlock` |
| `text_content` + nullable `content_json` per block | Store full TipTap JSON at document level |
| TanStack DB → Pacer → PGlite pipeline | Write to PGlite directly on keystroke |
| Shared PGlite bootstrap in `packages/db/src/pglite/` | Platform-specific DB init |
| Extension tables for new feature data | ALTER TABLE on core tables |
| `Decoration.inline` for production annotations | TipTap `Mark.create()` for cues/comments |
| Layer + department for every production annotation | Flat annotation without layer context |
| Accept `layerIds`/`viewConfig` in query params | Return all production data unconditionally |
| Derive character groups from document order | Add `parent_block_id` / `group_id` to `script_blocks` |
| `useHotkey('Mod+S', …)` for app-level shortcuts | Raw `addEventListener('keydown')` |
| ProseMirror `handleKeyDown` for Enter/Tab/Backspace | `useHotkey('Enter', …)` for editor-internal keys |

---

## Full Documentation

- `docs/decisions.md` — complete ADR log (D1–D18) with rationale
- `docs/architecture-overview.md` — package dependency graph, data flow diagrams, 5-phase plan
- `docs/database.md` — full DB schema, core + future production tables, migration plan
- `docs/editor.md` — node-per-type design, factory pattern, marks vs decorations
- `docs/state-management.md` — TanStack collections, Block Diff Engine, serialization codec
- `docs/sync.md` — PGlite strategy, repository decomposition, outbox, cloud sync roadmap
