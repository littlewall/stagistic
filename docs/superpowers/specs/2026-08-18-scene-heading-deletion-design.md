# Scene Heading: Protected Deletion — Design

Date: 2026-08-18
Status: Approved for planning
Scope: v1 (single scene-heading deletion only)

## Motivation

A scene is a foundational building block of a script. Scenes are rarely
deleted — they are moved and renamed far more often — and they carry
attached metadata (today: places/locations; more in the future). Deleting
a scene by accident (emptying its text with Backspace/Delete) is too easy
and too destructive.

This change makes a scene heading **impossible to delete through ordinary
text editing**. The block always survives keystrokes; deletion becomes an
explicit, deliberate action from two entry points, behind a confirmation
modal.

## Current State (verified)

- **Scene number** is a live-computed CSS `::before` decoration
  (`data-scene-number`) rendered in the left gutter by
  `SceneNumberingExtension` (`packages/editor/src/editor/tiptap/extensions/SceneNumberingExtension.ts`).
  It is a positional ordinal (1., 2., 3.), not stored text and not stable
  metadata. `scene.module.css` positions it outside the text via
  `right: calc(100% + ...)`.
- **Blocks are a flat top-level sequence.** A scene has no child nodes.
  "Blocks under a scene" = blocks from a scene boundary up to the next
  `scene` **or** `act` boundary (`sceneReorder.ts` already computes these
  boundaries; both `scene` and `act` are boundaries).
- **Scene metadata is a projection.** `scriptScenes` rows are
  projection-owned, matched to a heading block via `headingBlockId`
  (`packages/db/src/schema.ts:218`). On every document persist,
  `documentProjection.ts` upserts scenes present in the document (matched
  by `headingBlockId` to preserve `colorHex`/`synopsis`/`locationId`) and
  **bulk-deletes** rows whose scene id is no longer in the document
  (`documentProjection.ts:171`). `scriptSceneLocations` (places) is removed
  by FK cascade when its `scriptScenes` row is deleted
  (`schema.ts:249`, `onDelete: 'cascade'`).
- **Block action menu** is data-driven: `blockActionRegistry.resolveBlockActions`
  returns items per block, and `BlockGutterControls.tsx:72` renders the
  `⋮` trigger **only when `actionMenu.items.length > 0`**. Today only music
  boundary actions exist; scene blocks have no actions, so no `⋮` trigger.
- Structural-edit guarding infra already exists:
  `transactionGuards.ts` (`transactionTouchesStructureBlocks`,
  `isStructureBlockType` → `act`/`scene`).

## Design

### 1. Scene number moves visually into the text (widget decoration)

The number renders at the **start of the scene block's text** instead of
the left gutter. It stays a decoration — **not** a ProseMirror node and
**not** stored in the DB text — so renumbering on reorder/insert/delete
remains automatic and export is unaffected.

- Replace the gutter `::before` in `scene.module.css` with a **widget
  decoration** injected at position 0 of each scene block by
  `SceneNumberingExtension`.
- The widget is `contenteditable=false`, `user-select: none`,
  `pointer-events: none`, and non-selectable so the caret cannot land
  inside it.
- Export path (`packages/export/src/scenes.ts`) is unchanged; the number
  is never part of block text. A future setting may offer "show scene
  number in exported text" — out of scope here.

### 2. Scene heading is a deletion barrier

A scene node can never be removed by ordinary editing. Behavior:

- **Backspace at the start of a scene block** (caret visually just after
  the number): the caret stops. No merge with the previous block, no node
  deletion. Backspace still deletes text *within* the scene block normally.
- **Delete at the end of the previous block**: does not pull in / delete
  the following scene block. Caret stays put.
- **Range selection / Select-all + Delete spanning a scene**: the scene
  node survives. In v1 the whole deletion is **rejected** (nothing is
  removed) rather than partially applied — the simple, safe interpretation.
  Partial deletion (remove the selected text but keep the scene node) is a
  possible future refinement; v1 blocks the edit outright via the
  transaction guard.
- **Cut** behaves like delete for the scene node: text may be cut, the
  node persists.

The barrier applies to **deletion only**. **Arrow-key navigation is
unaffected**: `ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight` traverse into,
through, and out of a scene block exactly as they do for any other block.
Moving the caret across a scene boundary with the arrows never stops or
merges anything — only Backspace/Delete are constrained. (The caret still
skips the number widget per section 3, but navigation between blocks is
otherwise normal.)

Mechanism (details deferred to the implementation plan): a keymap override
for `Backspace`/`Delete` at scene boundaries, plus a transaction guard
(building on `transactionGuards`) that rejects removal of `scene` nodes
from non-explicit edits. The override targets only the delete keys, so
arrow navigation keeps ProseMirror's default behavior. Explicit deletion
(section 4) bypasses this guard.

### 3. Scene number widget + caret

With the number at text-start, the leftmost caret position is *after* the
widget. `ArrowLeft`/click before the number resolves to the block start
(after the widget), consistent with the barrier in section 2.

### 4. Explicit deletion (v1: heading block only)

Deletion is available only through two explicit entry points and always
deletes **only the scene heading block** (v1). Deleting "the whole scene"
(heading + all blocks under it) is deferred (see Deferred).

Entry points:

- **A — Block action menu.** A new provider in `blockActionRegistry`
  contributes a single `Delete scene heading` command for scene blocks.
- **B — Attribute manager.** `AttributeManagerSceneDetail` gains a delete
  action that drives the same deletion into the live editor document. The
  document is the source of truth for blocks, so this path requires a live
  editor to mutate; if the attribute manager is ever opened without one,
  the delete action is unavailable there (deletion always flows through an
  editor transaction, never a direct DB write). Resolving how the
  attribute manager reaches the editor command is a plan-level detail.

Both open the same confirmation modal (section 5) and run the same
deletion command.

Effect of deletion:

- The scene heading node is removed from the document via a normal editor
  transaction (bypassing the section-2 barrier — this is the sanctioned
  path).
- On the next persist, `documentProjection.ts` prunes the `scriptScenes`
  row (its id is gone from the document) and `scriptSceneLocations`
  (places) cascade away. **Block + metadata are removed together** with no
  extra deletion code.
- The blocks that were under the deleted scene re-parent under the
  **previous** scene, and scene numbers recompute. This is identical to
  today's behavior when a scene heading is removed — no new logic.

### 5. Confirmation modal

A lightweight modal (no typed confirmation in v1, because content is not
lost — it re-parents):

> **Delete scene heading?**
> Its synopsis and places will be removed. Blocks in this scene stay and
> move under the previous scene.
> `[Cancel]` `[Delete heading]`

Wording is deliberate: "scene heading" (not "scene"/"block") to avoid
implying the scene's content is deleted. "Color" is intentionally omitted
(no color feature yet). Synopsis is listed because it will be wired into
the asset manager in phase 1.

### 6. First scene is protected

The first scene of the document can never be deleted (a document always
has at least one scene).

- **Entry A:** the block-action provider returns `[]` for the first scene,
  so `BlockGutterControls` hides the `⋮` trigger entirely for it (no menu
  with an empty option).
- **Entry B:** the attribute manager hides/disables its delete action for
  the first scene.

"First scene" = the first `scene` boundary in document order (in a
multi-act document, the first scene under act 1).

### 7. Document invariant

The first structural block is always a scene (under act 1 in multi-act
documents); there are no blocks before the first scene. Therefore
"re-parent under the previous scene" (section 4) always has a valid
target — scene #2+ always has a preceding scene. A future "number scenes
from 0" setting will cover pre-show content before the first scene; out of
scope here.

## Known Limitations (v1)

- **Undo does not restore metadata.** Deletion is an ordinary undoable
  document change, so undo restores the heading block. But the
  `scriptScenes` row was pruned by the projection, so on undo the
  projection re-creates a **fresh, empty** scene row for that heading —
  `synopsis` and `places` are **not** restored. True metadata-preserving
  undo would require retaining or restoring the pruned row and is
  explicitly out of scope for v1.

## Deferred

- **Delete whole scene** (heading + all blocks up to the next
  scene/act boundary) — waits until a "stash"/safety mechanism exists.
- **Typed confirmation** ("delete block") — reserved for the destructive
  whole-scene deletion above.
- **Metadata-preserving undo** — see Known Limitations.
- **Scene color** and **"number scenes from 0"** setting.

## Files Likely Touched

- `packages/editor/src/editor/tiptap/extensions/SceneNumberingExtension.ts`
  — gutter `::before` → widget decoration at text start.
- `packages/editor/src/editor/blocks/scene/scene.module.css` — remove
  gutter positioning, style the inline number widget.
- New/edited editor extension for the Backspace/Delete + range-delete
  barrier (building on `runtime/transactionGuards.ts`).
- `packages/editor/src/editor/components/blockActions/blockActionRegistry.ts`
  (+ a new scene-actions provider) — `Delete scene heading` command,
  empty for the first scene.
- A confirmation modal component (co-located with editor scene UI) +
  wiring for the delete command.
- `packages/ui/src/dialogs/AttributeManagerSceneDetail.tsx` — delete
  action + first-scene guard, driving the editor deletion command.

## Testing

- **Barrier (browser tests):** Backspace at scene start is a no-op for the
  node; Delete at end of previous block does not consume the scene; range
  and select-all delete preserve the scene node; text inside the scene is
  still editable/deletable.
- **Number widget:** renders at text start, non-selectable, caret cannot
  enter it; renumbers correctly after reorder/delete; export output
  unchanged (existing `packages/export/src/scenes.test.ts`).
- **Deletion:** menu deletes heading, content re-parents under previous
  scene, `scriptScenes` row + `scriptSceneLocations` pruned after persist
  (projection/db test); attribute-manager delete drives the same result.
- **First scene:** no `⋮` action trigger; attribute-manager delete
  hidden/disabled.
- **Undo:** heading block returns; documented that metadata does not
  (assert the current behavior so the limitation is intentional).
