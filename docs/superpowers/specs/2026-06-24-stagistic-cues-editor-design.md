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

The syntax (§10) defines a **structural cue**: a firing point for a
**musical** number (a song or instrumental), written inline at the end of
a stage direction as `@@cue N "title"`, optionally closed later by `@@out
N`. The data model (§8) reserved how this would be stored but built
nothing. (Sound / light / vfx cues are a separate, future kind — §3.2.)

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
  atom nodes), in two shapes: a durational **open** cue (default) and a
  rare zero-duration **hit** (§3).
- Two entry paths: an inline `@@` compose and a new generic right-click
  **block context menu** (scoped to the stage direction block, for now).
- Editing and deletion UX via a **pill context menu**; no destructive
  keystroke.
- The relational `script_cues` entity and its derivation/sync from the
  document.
- The **serialization contract** (the target shape) for the downstream
  import/export spec.

**Explicit non-goals (deferred):**

- The vertical duration line / any graphical rendering of a cue's extent.
- A rendered "ghost" implicit-end marker at its computed position (only
  the *rule* is specified here; only the *chip's open/closed state* is
  rendered).
- Choosing the cue **kind** (song / instrumental) in the UI — the field
  is reserved, set by nothing now.
- Sound / light / vfx cues — not this (musical) cue; they are separate
  future cues (§3.2). A sound effect over music is written into the music
  or becomes a future fx cue.
- Drag-and-drop reordering of cues.
- The import and export **code** (this spec defines only the target).
- Visual polish of the cue pills.

**Principle (carried from the data-model spec):** build only what the
editor can display and work with now; reserve — don't build — the rest.

## 3. Domain rules — open cues, hits, and non-overlap

This is the core of the model and the reason most of the UI simplifies.
These are **musical** cues; they come in two shapes.

**Open cue (default) — durational.**

- **At most one open cue is in progress at any point in the document.**
- An open cue is started by a `cueStart` (mode `open`). It is closed by
  **either**:
  - an explicit `cueOut`, **or**
  - implicitly, by the **next open `cueStart` in the same scene**, **or**
  - implicitly, by the **end of its scene** (a cue never crosses a scene
    boundary).
- Therefore open cues **cannot overlap or nest as intervals**. Starting a
  new open cue while one is in progress implicitly ends the previous one at
  the new cue's position.

**Hit cue — zero duration (rare).**

- A `cueStart` with mode `hit` is a **point**: its end is its start. It has
  **no `cueOut`** and **no implicit end**.
- A hit is not an interval, so it **does not** open a durational interval
  and **does not** close or interrupt an open cue — a hit may fire *within*
  an open cue (e.g. a musical stinger during a song). Non-overlap is about
  durational intervals; a point trivially doesn't overlap. (Sound effects
  over music are not this — §3.2.)

**Pairing (both shapes).**

- **Positional and recomputed on every edit — never stored by id.** A
  `cueOut` closes *whatever open cue is in progress at its position*, not a
  cue it remembers. Moving an open `cueStart` in front of an existing
  `cueOut` re-pairs that out to the newly-open cue — the whole model is
  recomputed, not patched.
- A `cueOut` with no open cue in progress at its position (after a scene
  boundary, or after an explicit out already closed the cue) is an
  **orphan**: ignored by the projection and cleaned up by the editor.

### 3.1 Pairing algorithm (single deterministic pass)

Walk the document in order. Maintain `openCue` (none, or the open cue in
progress) and a running `number`.

1. On a **scene** block: set `openCue = none` (the previous open cue's
   implicit end is the end of the scene just left).
2. On a **`cueStart` with mode `open`**: `number += 1`; emit
   `{ cueId, number, mode: 'open', title, kind, startBlockId = current
   block, endBlockId = null }`; set `openCue` to it. (If a cue was already
   open, it keeps `endBlockId = null` — an implicit end at this point.)
3. On a **`cueStart` with mode `hit`**: `number += 1`; emit
   `{ cueId, number, mode: 'hit', title, kind, startBlockId = current
   block, endBlockId = current block }`; **do not touch `openCue`** (a hit
   neither opens an interval nor closes the open cue).
4. On a **`cueOut`**: if `openCue` is set, set its `endBlockId = current
   block` and `openCue = none`; otherwise the out is an **orphan** (drop
   it).

For an open cue, `endBlockId = null` means "no explicit out — relies on the
implicit end"; consumers (export, future duration UI) compute that position
as "start of the next open cue in the same scene, else end of scene." For a
hit, `endBlockId = startBlockId` (end = start).

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
| Cue start | `cueStart` | yes (inline, atomic) | `cueId` (stable), `mode` (`'open'` \| `'hit'`, default `'open'`), `title` (string), `kind` (string \| null, reserved) |
| Cue end | `cueOut` | yes (inline, atomic) | *(none)* — only an open cue has one; a hit never does |

- **Identity** lives on `cueStart` as `cueId` (generated like a block id).
  It is the `script_cues` row key and the handle for title editing. It is
  **not** used for pairing.
- `cueOut` carries **no attrs**: which cue it closes, and the number it
  prints, are computed positionally (§3.1). This is what makes the
  recompute-on-move behavior correct by construction.
- **Number `N`** is the derived ordinal from §3.1 — never stored on a
  node (numbering is data; "structure is a first-class feature").
- **Mode** (`open` default, or `hit`) lives on `cueStart` and is toggled
  from the pill menu (§6.2). A hit has no `cueOut` node.

### 4.1 End-of-block invariant

Within a `stageDirection` block, the single cue atom sits at the **very
end** of the block; prose always precedes it. Enforcement:

- A stage direction carries **at most one cue atom** — a start OR an out,
  never both. (To close one cue and open another at the same beat, the
  writer uses two stage directions.) Insertion is rejected when the block
  already holds a cue atom.
- The cue atom is only ever inserted at the end of the block's inline
  content (§5.3).
- Prose insertion (typing, paste) that would land after the trailing cue
  atom is redirected to **before** it.

Because cue atoms are non-text nodes, a block that contains any cue is
serialized to `content_json` (the existing rule: `text_content` alone
can't round-trip non-text nodes).

### 4.2 Rendering (minimal)

Each atom renders via a NodeView as a small pill (visual polish deferred):

- `cueStart`: shows `N` and the title. Its state distinguishes three cases
  — **hit** (a point), **open with an explicit out**, and **open relying on
  its implicit end** — the last with a tooltip ("ends at end of scene /
  next cue"). State is read live from the cue model (§6.1), not stored.
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
  - **Create:** type a title → commit inserts a `cueStart` (open by
    default, number auto-assigned; switch to a hit later via the pill
    menu, §6.2).
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
happened, the cue atom is appended at the **end of the block**, per the
§4.1 one-per-block rule. This snap-to-end is the structural cue's policy;
future position-bound cues (§3.2) will not use it.

## 6. Editing and deletion

### 6.1 Live cue model (rides the existing index snapshot)

The cue model — numbers, each start's shape (hit / open-with-explicit-out /
open-implicit-end), and the open cue in progress at a position — is derived
as a field of the **live index snapshot**, the
same mechanism that already powers the live sidebar projections
(`buildIndexSnapshotFromPmDoc` rebuilt by `BlockUiEventsExtension`, fed to
`buildSidebarProjectionFromIndex`). No bespoke plugin is needed; the
`cueStart`/`cueOut` NodeViews, the context menu, and the `@@` overlay read
the cue model from that live projection (exact read-plumbing is a plan
detail).

The pairing algorithm (§3.1) is implemented **once** as a pure helper in
`@stagistic/script` (`deriveCues`), consumed by every derivation site so
they cannot drift: `buildScriptBlockIndex` (JSON, live sidebar) and
`buildIndexSnapshotFromPmDoc` (PM doc, live editor) for the UI, and
`extractScriptBlocks` (`@stagistic/db`) for persistence (§7.1). Each site
only extracts cue atoms from its own representation, then calls
`deriveCues`; shared test vectors cover the helper (§10).

### 6.2 Pill context menu

Clicking a cue pill opens a context menu — the same generic context-menu
component as the block menu (§5.2), anchored to the pill with its own items
(*compose, don't sprawl*). All per-cue actions live here, labelled in
English (the editor UI is English):

- `cueStart`:
  - **Edit title** — opens the title input.
  - **Switch to hit** / **Switch to open** — toggles `mode` (§4).
    Switching to a hit removes the cue's explicit `cueOut` if it has one (a
    hit has no end node); switching back to open leaves it on its implicit
    end.
  - **Delete cue** — see §6.3.
- `cueOut`:
  - **Delete end** — see §6.3.

### 6.3 Deletion (no destructive keystroke, no one-click delete)

- **Backspace / Delete never removes a cue atom.** The handler intercepts
  it next to a cue atom (at most selecting the pill). (Deleting the *whole*
  stage-direction block still takes its cues with it — a deliberate action,
  not a single slip.)
- **Deletion is only via the pill context menu (§6.2)** — never a hover
  close-button. The safeguard is the two deliberate steps (open the menu,
  then click delete), so there is **no inline confirm**.
  - `cueStart` → **Delete cue**: removes the start **and its paired
    explicit out** (if any), so the cue goes as a unit and no orphan is
    left.
  - `cueOut` → **Delete end**: removes only the out; the open cue reverts
    to its implicit end.
- Any deletion triggers the §3.1 recompute (live snapshot and projection).

## 7. Relational projection — `script_cues`

A dedicated relational entity, mirroring `script_scenes` /
`script_acts`. Added to `packages/db/src/schema.ts` and to `dbSchema`.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | = `cueId` |
| `scriptId` | text, not null → `scripts.id` cascade | |
| `cueNumber` | integer, not null | derived ordinal (§3.1) |
| `mode` | text, not null default `'open'` | `'open'` \| `'hit'` |
| `title` | text, not null default `''` | |
| `kind` | text, nullable | **reserved**; set by nothing now |
| `startBlockId` | text, not null | block holding the `cueStart` |
| `endBlockId` | text, nullable | open: explicit `cueOut` block, null = implicit end · hit: = `startBlockId` |
| `createdAt` / `updatedAt` | bigint (mode `'number'`), not null | |

Index on `scriptId` (mirroring the other entities). After the schema
change, run `pnpm --filter @stagistic/db db:compile-migrations` (or
`db:generate`, which compiles automatically), per CLAUDE.md.

### 7.1 Derivation and sync

- **Live UI:** `ScriptBlockIndexSnapshot` gains a `cues: IndexedCue[]`
  field, produced via `deriveCues` (§6.1) in both `buildScriptBlockIndex`
  and `buildIndexSnapshotFromPmDoc`. `IndexedCue = { cueId, number, mode,
  title, kind, startBlockId, endBlockId }`.
- **Persistence:** the DB projection is built by a *separate* pipeline —
  `extractScriptBlocks` (`packages/db/src/blocks/extract.ts`) feeds the diff
  in `createDocumentPersister`
  (`packages/db/src/repo/persist/persistDocumentDelta.ts`), which already
  reconciles `script_blocks` / `script_scenes` / `script_acts` /
  `script_block_character_refs`. `extractScriptBlocks` gains a
  `cues: ExtractedCueRow[]` (via `deriveCues`), and the persister gains a
  scene/act-style upsert+delete reconciliation of `script_cues` through a
  new `ScriptCuesRepository` (`packages/db/src/scriptRepository.ts`, queries
  in `packages/db/src/queries/scripts/cues.ts`). (`CharacterRefSyncExtension`
  is **not** a DB path — it only resolves refs inside the document.)
- Orphan outs (§3.1) never produce a row; a cue's stable `cueId` node attr
  is its `script_cues.id`.

## 8. Serialization contract (target for the import/export spec)

This spec defines the **target**, not the parser/serializer code.

- **Open cue:** `cueStart{ title }` ↔ `@@cue N "title"`, where `N` is the
  derived ordinal. The title is wrapped in double quotes per the syntax
  quoting rule (§12); `kind` is **not** serialized (the syntax has no kind
  token). Its `cueOut` ↔ `@@out N` (`N` = the number of the cue it closes
  positionally); if absent, the open cue relies on its implicit end.
- **Hit cue:** ↔ `@@cue N "title"` immediately followed by `@@out N`
  (nothing between them — end = start), so it stays within the existing
  syntax with no new marker. On import, an `@@cue` immediately followed by
  its `@@out` (no content between) is read back as a hit.
- **Implicit end rule (canonical):** a cue with no explicit out ends at
  the **start of the next cue in the same scene**, otherwise at the **end
  of its scene**. (Recorded here because the exporter and any future
  duration UI need it; not stored, not rendered as a position now.)
- **Kind inference (future exporter):** a cue is a song if lyrics fall
  within its interval, otherwise generic — derivation only, never written
  into the `@@cue` line.
- **One cue atom per block (editor constraint, §4.1):** a source line with
  more than one `@@` marker is split on import into one stage direction per
  marker; export emits each cue/out on its own stage-direction line.

## 9. Architecture / file layout

Mirrors `characterTagInput` deliberately.

**`packages/script/src/`** (domain, JSON model):
- `cues/` — node-name and attr constants, `collectCueAtoms(blockNode)`, and
  the §3.1 pairing helper `deriveCues(orderedBlocks)`, beside
  `characters/`.
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
- `schema.ts` (+ `dbSchema`) and the generated migration; `blocks/extract.ts`
  (+ `blocks/types.ts`) for `ExtractedCueRow` / `cues`;
  `repo/persist/persistDocumentDelta.ts` for `script_cues` reconciliation;
  `queries/scripts/cues.ts` + `scriptRepository.ts` for the repository.

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
- **Derivation parity (§6.1)** — three sites extract cue atoms
  (`buildScriptBlockIndex`, `buildIndexSnapshotFromPmDoc`,
  `extractScriptBlocks`) but share the single `deriveCues` helper, so only
  the mechanical atom-extraction can drift. Cover `deriveCues` and each
  extractor with shared test vectors.

## 11. What this enables / downstream

With cues representable, editable, and projected, the next spec is the one
this whole rewrite has been building toward: **import / export** of
`.stagistic` text against the syntax — for which §8 is the contract. The
deferred UI (duration line, ghost implicit-end marker, kind selection,
drag-and-drop) and the future **production cues** (§3.2) come after, on
top of the seams this spec leaves in place.
