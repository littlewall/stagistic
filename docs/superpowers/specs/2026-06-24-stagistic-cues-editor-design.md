# Stagistic Cues — Editor & Data Design

**Date:** 2026-06-24
**Status:** Approved (design); implementation pending
**Depends on:** [Stagistic Syntax — Design](2026-06-14-stagistic-syntax-design.md)
(§10 structural cue), [Stagistic Data Model — Design](2026-06-14-stagistic-data-model-design.md)
(§8 reserved cue binding)
**Scope:** Bringing the **structural cue** (`@@cue` / `@@out`) into the
editor as a real, editable construct with a relational projection — so
import/export against the syntax can be built next. This is the spec that
turns the data-model spec's *reserved* cue binding (§8) into a *built*
feature.

---

## 1. Motivation

The syntax (§10) defines a **structural cue**: a generic firing point for
a song / instrumental / sound, written inline at the end of a stage
direction as `@@cue N "title"`, optionally closed later by `@@out N`. The
data model (§8) reserved how this would be stored but built nothing.

This spec designs the built feature: how a cue is represented in the
editor document, how the writer enters and edits it, how it projects to a
relational `script_cues` entity, and the serialization target the (next)
import/export spec will hit. The character-tag feature
(`CharacterTagInputExtension` + `CharacterTagMark` + the
`characterSuggestions` overlay + block-index derivation) is the direct
precedent and the structural template for most of this work.

## 2. Scope and non-goals

**This spec covers (built now):**

- The editor document representation of cue start and cue end (inline
  atom nodes).
- Two entry paths: an inline `@@` compose and a new generic right-click
  **block context menu** (scoped to the stage direction block, for now).
- Editing and deletion UX (pill popover; no destructive keystroke).
- The relational `script_cues` entity and its derivation/sync from the
  document.
- The **serialization contract** (the target shape) for the downstream
  import/export spec.

**Explicit non-goals (deferred):**

- The vertical duration line / any graphical rendering of a cue's extent.
- A rendered "ghost" implicit-end marker at its computed position (only
  the *rule* is specified here; only the *chip's open/closed state* is
  rendered).
- Choosing the cue **kind** (song/instrumental/sound) in the UI — the
  field is reserved, set by nothing now.
- Drag-and-drop reordering of cues.
- The import and export **code** (this spec defines only the target).
- Visual polish of the cue pills.

**Principle (carried from the data-model spec):** build only what the
editor can display and work with now; reserve — don't build — the rest.

## 3. Domain rules — the structural cue is non-overlapping

This is the core of the model and the reason most of the UI simplifies.

- **At most one structural cue is open at any point in the document.**
- A cue is opened by a `cueStart`. It is closed by **either**:
  - an explicit `cueOut`, **or**
  - implicitly, by the **next `cueStart` in the same scene**, **or**
  - implicitly, by the **end of its scene** (a cue never crosses a scene
    boundary).
- Therefore cues **cannot overlap or nest**. Opening a new cue while one
  is open implicitly ends the previous one at the new cue's position.
- **Pairing is positional and recomputed on every edit — never stored by
  id.** An `cueOut` closes *whatever cue is open at its position*, not a
  cue it remembers. Moving a `cueStart` in front of an existing `cueOut`
  re-pairs that out to the newly-open cue — the whole model is
  recomputed, not patched.
- An `cueOut` with no open cue at its position (e.g. after a scene
  boundary, or after an explicit out already closed the cue) is an
  **orphan**: ignored by the projection and cleaned up by the editor.

### 3.1 Pairing algorithm (single deterministic pass)

Walk the document in order. Maintain `openCue` (none, or the current open
cue) and a running `number`.

1. On a **scene** block: set `openCue = none` (the previous cue's implicit
   end is the end of the scene just left).
2. On a **`cueStart`**: `number += 1`; emit a cue
   `{ cueId, number, title, kind, startBlockId = current block, endBlockId
   = null }`; set `openCue` to it. (If a cue was already open, it is left
   with `endBlockId = null` — i.e. an implicit end at this point.)
3. On a **`cueOut`**: if `openCue` is set, set its `endBlockId = current
   block` and `openCue = none`; otherwise the out is an **orphan** (drop
   it).

`endBlockId = null` means "no explicit out — relies on the implicit end."
The implicit end **position** is *not* stored; consumers (export, future
duration UI) compute it as "start of the next cue in the same scene, else
end of scene."

### 3.2 Forward-compatibility seam (do not lock out production cues)

Future production cues (light / sound / vfx) will differ on two axes and
get their **own** notation, nodes, and projection — they are not this
model:

- They **can overlap** (multiple open at once) → id-based / layered
  pairing, not the single-open positional pairing above.
- They are **bound to a text span or caret position**, not snapped to the
  end of the block.

What this spec keeps reusable for them: the inline-atom-node
representation (any position is expressible), the `@@`-style input
coordination, the suggestion overlay pattern, the NodeView pill pattern,
and the block-context-menu registry. What stays specific to the
structural cue: the end-of-block insertion policy (§5.3), the
non-overlap positional pairing (§3.1), and the `script_cues` projection
(§7). The atom node is inherently position-capable; "snap to end of
block" is an *insertion policy*, not a property of the node.

## 4. Document representation — inline atom nodes

A cue is **not prose** (unlike a character tag, where `PETR` reads inline
in the sentence) and `@@out` carries **no text** to mark. So cues are
**inline atom nodes** living in the `stageDirection` block, not marks:

| Node | `nodeType` | Atom | Attrs |
|---|---|---|---|
| Cue start | `cueStart` | yes (inline, atomic) | `cueId` (stable), `title` (string), `kind` (string \| null, reserved) |
| Cue end | `cueOut` | yes (inline, atomic) | *(none)* |

- **Identity** lives on `cueStart` as `cueId` (generated like a block id).
  It is the `script_cues` row key and the handle for title editing. It is
  **not** used for pairing.
- `cueOut` carries **no attrs**: which cue it closes, and the number it
  prints, are computed positionally (§3.1). This is what makes the
  recompute-on-move behavior correct by construction.
- **Number `N`** is the derived ordinal from §3.1 — never stored on a
  node (numbering is data; "structure is a first-class feature").

### 4.1 End-of-block invariant

Within a `stageDirection` block, all cue atoms are **contiguous at the
very end** of the block; prose always precedes them. Enforcement:

- A cue atom is only ever inserted at the end of the block's inline
  content (§5.3).
- Prose insertion (typing, paste) that would land at or after a trailing
  cue atom is redirected to **before** the first trailing cue atom.
- When a block carries both an out and a start (e.g. close cue 1, then
  open cue 2 in one direction), the trailing order is **out before
  start** (close-then-open).

Because cue atoms are non-text nodes, a block that contains any cue is
serialized to `content_json` (the existing rule: `text_content` alone
can't round-trip non-text nodes).

### 4.2 Rendering (minimal)

Each atom renders via a NodeView as a small pill (visual polish deferred):

- `cueStart`: shows `N` and the title; its state distinguishes **has an
  explicit out** vs **relies on its implicit end**, with a tooltip on the
  latter ("ends at end of scene / next cue"). State is read live from the
  cue model plugin (§6.1), not stored.
- `cueOut`: shows it closes cue `N` (number read live).

## 5. Entry

### 5.1 `@@` inline compose

Mirrors the existing single-`@` character-tag compose
(`characterTagInput/`), but for `@@`:

- Inside a `stageDirection`, a **second `@`** (so the user has typed
  `@@`) abandons the just-opened character-tag compose and opens the
  **cue compose** instead. The typed `@@` characters are not left in the
  prose.
- The compose is a transient overlay (reusing the `characterSuggestions`
  overlay pattern). It does **not** insert at the caret; on commit it
  appends to the end of the block (§5.3).
- Two modes in one overlay:
  - **Create:** type a title → commit inserts a `cueStart` (number
    auto-assigned).
  - **Close:** if a cue is open at the block end, the overlay offers a
    single "close cue N" action → inserts a `cueOut`. (At most one cue is
    ever open, so there is never a picker.)

### 5.2 Right-click block context menu (new, generic)

A new generic `BlockContextMenu` component: right-click within a script
block opens a small menu whose items come from a per-block-type registry
(`items(blockType)`). This is the foundation for future per-block menus;
**for now only the `stageDirection` block contributes items**, and other
blocks fall through to the native browser menu.

Stage-direction items:

- **Always:** "Add cue" → inserts a `cueStart` at the block end and opens
  its title for editing (same compose as §5.1, create mode).
- **Conditionally:** "Add out *(closes cue N)*" — shown **iff a cue is
  open at the end of this block** (§3.1). Closes that one cue; the label
  includes its number `N` (number only, computed live). Never shown when
  the position is already past a closed interval (nothing open) — this is
  exactly "don't offer an out between an existing start and its out."

### 5.3 Insertion policy (structural-cue-specific)

Regardless of where in the block the `@@` was typed or the right-click
happened, the cue atom is appended at the **end of the block**, respecting
§4.1 ordering. This snap-to-end is the structural cue's policy; future
position-bound cues (§3.2) will not use it.

## 6. Editing and deletion

### 6.1 Live cue model (rides the existing index snapshot)

The cue model — numbers, each start's open/closed state, and the open cue
at a position — is derived as a field of the **live index snapshot**, the
same mechanism that already powers the live sidebar projections
(`buildIndexSnapshotFromPmDoc` rebuilt by `BlockUiEventsExtension`, fed to
`buildSidebarProjectionFromIndex`). No bespoke plugin is needed; the
`cueStart`/`cueOut` NodeViews, the context menu, and the `@@` overlay read
the cue model from that live projection (exact read-plumbing is a plan
detail).

The pairing algorithm (§3.1) is specified once but, like the rest of the
index, exists in **two builders that must agree**: `buildScriptBlockIndex`
over the `ScriptNode` JSON model (`packages/script`) and
`buildIndexSnapshotFromPmDoc` over the live PM document (`packages/editor`).
Shared test vectors keep them in parity (§10).

### 6.2 Editing the title

Clicking a `cueStart` pill opens a small popover with the title field
(and the delete action below). Clicking a `cueOut` pill opens a popover
showing "closes cue N" (and its delete action).

### 6.3 Deletion (no destructive keystroke)

- **Backspace / Delete never removes a cue atom.** The handler intercepts
  it next to a cue atom (at most selecting the pill). This prevents
  accidental loss. (Deleting the *whole* stage-direction block still takes
  its cues with it — that is a deliberate action, not a single slip.)
- Deletion is only via the pill popover:
  - `cueStart` → **"Delete cue"**: removes the start **and its paired
    explicit out** (if any), so the cue goes as a unit and no orphan is
    left. The confirm notes "…also removes its end" when an out exists.
  - `cueOut` → **"Delete end"**: removes only the out; the cue reverts to
    its implicit end. Pairing recomputes.
- **Confirm inline, no modal:** clicking "Delete" swaps the button to
  "Really delete?"; a second click confirms, a click elsewhere cancels.

Any deletion triggers the §3.1 recompute (live plugin and projection).

## 7. Relational projection — `script_cues`

A dedicated relational entity, mirroring `script_scenes` /
`script_acts`. Added to `packages/db/src/schema.ts` and to `dbSchema`.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | = `cueId` |
| `scriptId` | text, not null → `scripts.id` cascade | |
| `cueNumber` | integer, not null | derived ordinal (§3.1) |
| `title` | text, not null default `''` | |
| `kind` | text, nullable | **reserved**; set by nothing now |
| `startBlockId` | text, not null | block holding the `cueStart` |
| `endBlockId` | text, nullable | block holding the explicit `cueOut`; null = implicit end |
| `createdAt` / `updatedAt` | bigint (mode `'number'`), not null | |

Index on `scriptId` (mirroring the other entities). After the schema
change, run `pnpm --filter @stagistic/db db:compile-migrations` (or
`db:generate`, which compiles automatically), per CLAUDE.md.

### 7.1 Derivation and sync

- `ScriptBlockIndexSnapshot` gains a `cues: IndexedCue[]` field, produced
  by the §3.1 pass during the existing single document walk (which already
  tracks the current scene block). It is added to **both** snapshot
  builders (§6.1). `IndexedCue = { cueId, number, title, kind,
  startBlockId, endBlockId }`.
- A `ScriptCuesRepository` is added to
  `packages/db/src/scriptRepository.ts` with queries under
  `packages/db/src/queries/scripts/`, and the existing path that persists
  the relational projection to the DB (the same one writing `script_blocks`
  / `script_block_character_refs`) is extended to upsert / delete
  `script_cues` for the script. Pinning that exact persistence call site is
  a plan task. (`CharacterRefSyncExtension` is **not** that path — it only
  resolves character refs inside the document node attrs.)
- Orphan outs (§3.1) never produce a row.

## 8. Serialization contract (target for the import/export spec)

This spec defines the **target**, not the parser/serializer code.

- `cueStart{ title }` ↔ `@@cue N "title"`, where `N` is the derived
  ordinal. The title is wrapped in double quotes per the syntax quoting
  rule (§12); `kind` is **not** serialized (the syntax has no kind token).
- `cueOut` ↔ `@@out N`, where `N` is the number of the cue it closes
  positionally.
- **Implicit end rule (canonical):** a cue with no explicit out ends at
  the **start of the next cue in the same scene**, otherwise at the **end
  of its scene**. (Recorded here because the exporter and any future
  duration UI need it; not stored, not rendered as a position now.)
- **Kind inference (future exporter):** a cue is a song if lyrics fall
  within its interval, otherwise generic — derivation only, never written
  into the `@@cue` line.

## 9. Architecture / file layout

Mirrors `characterTagInput` deliberately.

**`packages/script/src/`** (domain, JSON model):
- Cue node-name and attr constants; helpers to collect cue atoms from a
  node and the §3.1 pairing (`buildCueModel` / equivalent), beside
  `characters/characterTagMarks.ts`.
- `indexing/scriptBlockIndex.ts`: the `cues` snapshot field (§7.1).

**`packages/editor/src/editor/`**:
- `tiptap/nodes/CueStartNode.ts`, `CueOutNode.ts` — inline atom nodes +
  NodeViews (pills).
- `tiptap/extensions/cueInput/` — compose plugin, compose state,
  transactions, types, constants, handlers (parallel to
  `characterTagInput/`).
- `tiptap/extensions/CueInputExtension.ts` — wraps the plugin + commands
  (`insertCueStart`, `insertCueOut`); registered in `useEditorExtensions.ts`.
- `runtime/buildIndexSnapshotFromPmDoc.ts` and
  `tiptap/extensions/BlockUiEventsExtension.ts` — extend the live snapshot
  with the `cues` field (§6.1), the PM-side mirror of
  `scriptBlockIndex.ts`.
- `components/` — the cue compose overlay (reusing the
  `characterSuggestions` pattern) and the generic `BlockContextMenu`.

**`packages/db/src/`**:
- `schema.ts` (+ `dbSchema`), `scriptRepository.ts`, `queries/scripts/`,
  and the generated migration.

## 10. Key technical risks

- **`@@` vs `@` coordination.** Typing the first `@` opens the
  character-tag compose (it replaces `@` with a zero-width placeholder).
  The cue feature must detect the second `@` while that compose is
  freshly open (empty query), abandon it cleanly (remove the
  placeholder/mark), and open the cue compose. Resolve via extension
  priority and the existing compose-state predicates. This is the main
  interaction to get right; details in the plan.
- **End-of-block invariant enforcement (§4.1)** — redirecting prose
  insertion to before trailing cue atoms, and keeping out-before-start
  order, across typing, paste, and Enter/Backspace at block edges.
- **JSON/PM parity (§6.1)** — the pairing algorithm runs in two snapshot
  builders (`buildScriptBlockIndex` over JSON, `buildIndexSnapshotFromPmDoc`
  over the PM doc); they must agree. Cover with shared test vectors.

## 11. What this enables / downstream

With cues representable, editable, and projected, the next spec is the one
this whole rewrite has been building toward: **import / export** of
`.stagistic` text against the syntax — for which §8 is the contract. The
deferred UI (duration line, ghost implicit-end marker, kind selection,
drag-and-drop) and the future **production cues** (§3.2) come after, on
top of the seams this spec leaves in place.
