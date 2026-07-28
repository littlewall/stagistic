# Stagistic Music — Editor & Data Design

**Date:** 2026-06-24
**Status:** Approved (design); implementation pending
**Depends on:** [Stagistic Syntax — Design](2026-06-14-stagistic-syntax-design.md)
(§10 structural music), [Stagistic Data Model — Design](2026-06-14-stagistic-data-model-design.md)
(§8 reserved music binding)
**Scope:** Bringing the **structural music** (`@@music` / `@@out`) into the
editor as a real, editable construct with a relational projection — so
import/export against the syntax can be built next. This is the spec that
turns the data-model spec's *reserved* music binding (§8) into a *built*
feature.

---

## 1. Motivation

The syntax (§10) defines a **structural music**: a firing point for a
**musical** number (a song or instrumental), written inline at the end of
a stage direction as `@@music N "title"`, optionally closed later by `@@out
N`. The data model (§8) reserved how this would be stored but built
nothing. (Sound / light / vfx cues are separate, future kinds — §3.2.)

This spec designs the built feature: how a music is represented in the
editor document, how the writer enters and edits it, how it projects to a
relational `script_music` entity, and the serialization target the (next)
import/export spec will hit. The character-tag feature
(`CharacterTagInputExtension` + `CharacterTagMark` + the
`characterSuggestions` overlay + block-index derivation) is the direct
precedent and the structural template for most of this work.

## 2. Scope and non-goals

**This spec covers (built now):**

- The editor document representation of music start and music end (inline
  atom nodes), in two shapes: a durational **open** music (default) and a
  rare zero-duration **hit** (§3).
- Inline music entry via a single-`#` compose (an editor-vs-syntax divergence
  — §5.1). The dedicated **block action menu** (§5.2) is planned, not built
  yet.
- Editing and deletion UX via a **pill context menu**; no destructive
  keystroke.
- The relational `script_music` entity and its derivation/sync from the
  document.
- The **serialization contract** (the target shape) for the downstream
  import/export spec.

**Explicit non-goals (deferred):**

- The vertical duration line / any graphical rendering of a music's extent.
- A rendered "ghost" implicit-end marker at its computed position (only
  the *rule* is specified here; only the *chip's open/closed state* is
  rendered).
- Choosing the music **kind** (song / instrumental) in the UI — the field
  is reserved, set by nothing now.
- Sound / light / vfx cues — not this script-bound music; they are separate
  future cues (§3.2). A sound effect over music is written into the music
  or becomes a future FX cue.
- Drag-and-drop reordering of music.
- The import and export **code** (this spec defines only the target).
- Visual polish of the music pills.

**Principle (carried from the data-model spec):** build only what the
editor can display and work with now; reserve — don't build — the rest.

## 3. Domain rules — open music, hits, and non-overlap

This is the core of the model and the reason most of the UI simplifies.
These are **musical** music; they come in two shapes.

**Open music (default) — durational.**

- **At most one open music is in progress at any point in the document.**
- An open music is started by a `musicStart` (mode `open`). It is closed by
  **either**:
  - an explicit `musicOut`, **or**
  - implicitly, by the **next open `musicStart` in the same scene**, **or**
  - implicitly, by the **end of its scene** (a music never crosses a scene
    boundary).
- Therefore open music **cannot overlap or nest as intervals**. Starting a
  new open music while one is in progress implicitly ends the previous one at
  the new music's position.

**Hit music — zero duration (rare).**

- A `musicStart` with mode `hit` is a **point**: its end is its start. It has
  **no `musicOut`** and **no implicit end**.
- A hit is not an interval, so it **does not** open a durational interval
  and **does not** close or interrupt an open music — a hit may fire *within*
  an open music (e.g. a musical stinger during a song). Non-overlap is about
  durational intervals; a point trivially doesn't overlap. (Sound effects
  over music are not this — §3.2.)

**Pairing (both shapes).**

- **Positional and recomputed on every edit — never stored by id.** A
  `musicOut` closes *whatever open music is in progress at its position*, not a
  music it remembers. Moving an open `musicStart` in front of an existing
  `musicOut` re-pairs that out to the newly-open music — the whole model is
  recomputed, not patched.
- A `musicOut` with no open music in progress at its position (after a scene
  boundary, or after an explicit out already closed the music) is an
  **orphan**: ignored by the projection and cleaned up by the editor.

### 3.1 Pairing algorithm (single deterministic pass)

Walk the document in order. Maintain `openMusic` (none, or the open music in
progress) and a running `number`.

1. On a **scene** block: set `openMusic = none` (the previous open music's
   implicit end is the end of the scene just left).
2. On a **`musicStart` with mode `open`**: `number += 1`; emit
   `{ musicId, number, mode: 'open', title, kind, startBlockId = current
   block, endBlockId = null }`; set `openMusic` to it. (If a music was already
   open, it keeps `endBlockId = null` — an implicit end at this point.)
3. On a **`musicStart` with mode `hit`**: `number += 1`; emit
   `{ musicId, number, mode: 'hit', title, kind, startBlockId = current
   block, endBlockId = current block }`; **do not touch `openMusic`** (a hit
   neither opens an interval nor closes the open music).
4. On a **`musicOut`**: if `openMusic` is set, set its `endBlockId = current
   block` and `openMusic = none`; otherwise the out is an **orphan** (drop
   it).

For an open music, `endBlockId = null` means "no explicit out — relies on the
implicit end"; consumers (export, future duration UI) compute that position
as "start of the next open music in the same scene, else end of scene." For a
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
representation (any position is expressible), the `#`-trigger compose
machinery, the NodeView pill pattern,
and the block-action-menu registry. What stays specific to the
structural music: the end-of-block insertion policy (§5.3), the
non-overlap positional pairing (§3.1), and the `script_music` projection
(§7). The atom node is inherently position-capable; "snap to end of
block" is an *insertion policy*, not a property of the node.

## 4. Document representation — inline atom nodes

A music is **not prose** (unlike a character tag, where `PETR` reads inline
in the sentence) and `@@out` carries **no text** to mark. So music are
**inline atom nodes** living in the `stageDirection` block, not marks:

| Node | `nodeType` | Atom | Attrs |
|---|---|---|---|
| Music start | `musicStart` | yes (inline, atomic) | `musicId` (stable), `mode` (`'open'` \| `'hit'`, default `'open'`), `title` (string), `kind` (string \| null, reserved) |
| Music end | `musicOut` | yes (inline, atomic) | *(none)* — only an open music has one; a hit never does |

- **Identity** lives on `musicStart` as `musicId` (generated like a block id).
  It is the `script_music` row key and the handle for title editing. It is
  **not** used for pairing.
- `musicOut` carries **no attrs**: which music it closes, and the number it
  prints, are computed positionally (§3.1). This is what makes the
  recompute-on-move behavior correct by construction.
- **Number `N`** is the derived ordinal from §3.1 — never stored on a
  node (numbering is data; "structure is a first-class feature").
- **Mode** (`open` default, or `hit`) lives on `musicStart` and is toggled
  from the pill menu (§6.2). A hit has no `musicOut` node.

### 4.1 End-of-block invariant

Within a `stageDirection` block, the single music atom sits at the **very
end** of the block; prose always precedes it. Enforcement:

- A stage direction carries **at most one music atom** — a start OR an out,
  never both. (To close one music and open another at the same beat, the
  writer uses two stage directions.) Insertion is rejected when the block
  already holds a music atom.
- The music atom is only ever inserted at the end of the block's inline
  content (§5.3).
- Prose insertion (typing, paste) that would land after the trailing music
  atom is redirected to **before** it.

Because music atoms are non-text nodes, a block that contains any music is
serialized to `content_json` (the existing rule: `text_content` alone
can't round-trip non-text nodes).

### 4.2 Rendering

Each atom renders via a React NodeView as an inline pill:

- `musicStart`: the title is an **inline editable input** in the pill body
  (always editable; commits on blur / Enter, Escape reverts; an empty title
  is allowed and does **not** delete the music). Focusing the pill marks it
  **active**, highlighting the border and revealing a kebab (⋮) **menu
  trigger** (§6.2).
- `musicOut`: shows "out"; same active → kebab → menu affordance.

**Deferred:** the live number `N` and the visual distinction between
open-with-explicit-out / open-implicit-end / hit are not rendered on the
pill yet (the music model §6.1 already exposes them; wiring is a later
refinement).

## 5. Entry

### 5.1 `#` inline compose

The editor trigger is a single **`#`** inside a `stageDirection` — a
**deliberate divergence from the `@@music` on-disk syntax**. (The original
`@@` escalation had to coordinate with the character-tag `@` compose and
proved fragile; `#` is a robust single-key trigger with no such coupling.
Import/export maps `#`-music to `@@music` / `@@out` per the syntax — the next
spec.)

- Typing `#` (when not already composing, in a stage direction with no music
  atom) opens a **music-title compose** anchored at the **end of the block**:
  the caret jumps there and the in-progress title is wrapped in an
  (initially empty) compose pill (a decoration). The `#` itself is swallowed.
- **Commit:** Enter turns the typed title into a `musicStart` (open by
  default; switch to a hit later via the pill menu, §6.2). **Discard:**
  Escape, Backspace on an empty title, or leaving the block/editor — Enter is
  the only commit path.

- **Out:** typing the literal title **`out`** (case-insensitive) commits a
  `musicOut` instead of a titled music — i.e. `#` `out` ⏎. (A deliberate
  stand-in: no open-music validation yet, so an out with nothing to close
  derives as an orphan and is dropped — §3.1. The block action menu §5.2
  adds the validated alternative.)

### 5.2 Block action menu (separate spec)

*Status: not built yet — planned. Until it lands, both music and outs are
entered via the `#` compose (`#`title for a music, `#out` for an out — §5.1).*

Stagistic preserves the native OS/browser right-click menu. Block commands
are opened instead from a dedicated ellipsis trigger beside the existing
block type control. The generic provider contract, conditional trigger,
submenu behavior, and stage-direction music items are defined in
[Stagistic Block Action Menu — Editor Design](2026-06-29-stagistic-block-action-menu-design.md).

For music, that menu exposes `Music` → `Add music` and conditionally
`Add out (<open music title>)`. Music availability and command execution remain
governed by §3.1 and §4.1 of this spec.

### 5.3 Insertion policy (structural-music-specific)

Regardless of where in the block `#` was typed (or whether insertion came
from the block action menu), the music atom is committed at the **end of the
block**, per the §4.1 one-per-block rule. This snap-to-end is the structural
music's policy; future position-bound music (§3.2) will not use it.

## 6. Editing and deletion

### 6.1 Live music model (rides the existing index snapshot)

The music model — numbers, each start's shape (hit / open-with-explicit-out /
open-implicit-end), and the open music in progress at a position — is derived
as a field of the **live index snapshot**, the
same mechanism that already powers the live sidebar projections
(`buildIndexSnapshotFromPmDoc` rebuilt by `BlockUiEventsExtension`, fed to
`buildSidebarProjectionFromIndex`). No bespoke plugin is needed; the
`musicStart`/`musicOut` NodeViews (and, in future, the block action menu) read
the music model from that live projection (exact read-plumbing is a plan
detail).

The pairing algorithm (§3.1) is implemented **once** as a pure helper in
`@stagistic/script` (`deriveMusic`), consumed by every derivation site so
they cannot drift: `buildScriptBlockIndex` (JSON, live sidebar) and
`buildIndexSnapshotFromPmDoc` (PM doc, live editor) for the UI, and
`extractScriptBlocks` (`@stagistic/db`) for persistence (§7.1). Each site
only extracts music atoms from its own representation, then calls
`deriveMusic`; shared test vectors cover the helper (§10).

### 6.2 Pill menu

The pill is **self-contained** — a React NodeView using its own
`updateAttributes` / `deleteNode`, not the generic block menu:

- **Title** is edited inline in the pill input (§4.2), not via a menu item.
- **Menu:** focusing the pill reveals a kebab (⋮) trigger; clicking it opens
  a small **icon** menu:
  - `musicStart`: **toggle open ↔ hit** (open/hit icon) and **delete music**
    (trash icon, danger-styled).
  - `musicOut`: **delete end** (trash icon).

Switching to a hit sets `mode='hit'` (the music becomes a point); any
positionally-paired out then derives as an orphan and is dropped (§3.1).

### 6.3 Deletion (no destructive keystroke, no one-click)

- **Backspace / Delete never removes a music atom by keystroke.** The guard
  intercepts Backspace/Delete adjacent to a music atom; and when a **range
  selection spans music atoms**, the surrounding text is deleted but the music
  atoms are **preserved**. (Deleting the *whole* stage-direction block still
  takes its music with it — a deliberate action, not a single slip.)
- **Deletion is only via the pill menu (§6.2)** — `deleteNode()` removes the
  music atom. No inline confirm; the kebab-then-trash steps are the safeguard.
  - `musicStart` → **Delete music**: removes the start node. A positionally-
    paired explicit out (if any) is left to derive as an orphan and drop
    (§3.1) — outs are rare and block-separate, so no cascading delete.
  - `musicOut` → **Delete end**: removes the out; the open music reverts to its
    implicit end.
- Any deletion triggers the §3.1 recompute (live snapshot and projection).

## 7. Relational projection — `script_music`

A dedicated relational entity, mirroring `script_scenes` /
`script_acts`. Added to `packages/db/src/schema.ts` and to `dbSchema`.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | = `musicId` |
| `scriptId` | text, not null → `scripts.id` cascade | |
| `musicNumber` | integer, not null | derived ordinal (§3.1) |
| `mode` | text, not null default `'open'` | `'open'` \| `'hit'` |
| `title` | text, not null default `''` | |
| `kind` | text, nullable | **reserved**; set by nothing now |
| `startBlockId` | text, not null | block holding the `musicStart` |
| `endBlockId` | text, nullable | open: explicit `musicOut` block, null = implicit end · hit: = `startBlockId` |
| `createdAt` / `updatedAt` | bigint (mode `'number'`), not null | |

Index on `scriptId` (mirroring the other entities). After the schema
change, run `pnpm --filter @stagistic/db db:compile-migrations` (or
`db:generate`, which compiles automatically), per CLAUDE.md.

### 7.1 Derivation and sync

- **Live UI:** `ScriptBlockIndexSnapshot` gains a `music: IndexedMusic[]`
  field, produced via `deriveMusic` (§6.1) in both `buildScriptBlockIndex`
  and `buildIndexSnapshotFromPmDoc`. `IndexedMusic = { musicId, number, mode,
  title, kind, startBlockId, endBlockId }`.
- **Persistence:** the DB projection is built by a *separate* pipeline —
  `extractScriptBlocks` (`packages/db/src/blocks/extract.ts`) feeds the diff
  in `createDocumentPersister`
  (`packages/db/src/repo/persist/persistDocumentDelta.ts`), which already
  reconciles `script_blocks` / `script_scenes` / `script_acts` /
  `script_block_character_refs`. `extractScriptBlocks` gains a
  `music: ExtractedMusicRow[]` (via `deriveMusic`), and the persister gains a
  scene/act-style upsert+delete reconciliation of `script_music` through a
  new `ScriptMusicRepository` (`packages/db/src/scriptRepository.ts`, queries
  in `packages/db/src/queries/scripts/music.ts`). (`CharacterRefSyncExtension`
  is **not** a DB path — it only resolves refs inside the document.)
- Orphan outs (§3.1) never produce a row; a music's stable `musicId` node attr
  is its `script_music.id`.

## 8. Serialization contract (target for the import/export spec)

This spec defines the **target**, not the parser/serializer code.

- **Open music:** `musicStart{ title }` ↔ `@@music N "title"`, where `N` is the
  derived ordinal. The title is wrapped in double quotes per the syntax
  quoting rule (§12); `kind` is **not** serialized (the syntax has no kind
  token). Its `musicOut` ↔ `@@out N` (`N` = the number of the music it closes
  positionally); if absent, the open music relies on its implicit end.
- **Hit music:** ↔ `@@music N "title"` immediately followed by `@@out N`
  (nothing between them — end = start), so it stays within the existing
  syntax with no new marker. On import, an `@@music` immediately followed by
  its `@@out` (no content between) is read back as a hit.
- **Implicit end rule (canonical):** a music with no explicit out ends at
  the **start of the next music in the same scene**, otherwise at the **end
  of its scene**. (Recorded here because the exporter and any future
  duration UI need it; not stored, not rendered as a position now.)
- **Kind inference (future exporter):** a music is a song if lyrics fall
  within its interval, otherwise generic — derivation only, never written
  into the `@@music` line.
- **One music atom per block (editor constraint, §4.1):** a source line with
  more than one `@@` marker is split on import into one stage direction per
  marker; export emits each music/out on its own stage-direction line.

## 9. Architecture / file layout

Mirrors `characterTagInput` deliberately.

**`packages/script/src/`** (domain, JSON model):
- `music/` — node-name and attr constants, `collectMusicAtoms(blockNode)`, and
  the §3.1 pairing helper `deriveMusic(orderedBlocks)`, beside
  `characters/`.
- `indexing/scriptBlockIndex.ts`: the `music` snapshot field (§7.1).

**`packages/editor/src/editor/`**:
- `tiptap/nodes/MusicStartNode.ts`, `MusicOutNode.ts` — inline atom nodes +
  NodeViews (pills).
- `tiptap/extensions/musicInput/` — compose plugin, compose state,
  transactions, types, constants, handlers (parallel to
  `characterTagInput/`).
- `tiptap/extensions/MusicInputExtension.ts` — wraps the plugin + commands
  (`insertMusicStart`, `insertMusicOut`); registered in `useEditorExtensions.ts`.
- `runtime/buildIndexSnapshotFromPmDoc.ts` and
  `tiptap/extensions/BlockUiEventsExtension.ts` — extend the live snapshot
  with the `music` field (§6.1), the PM-side mirror of
  `scriptBlockIndex.ts`.
- `components/` — the music compose overlay (reusing the
  `characterSuggestions` pattern) and the block action menu integration
  defined by the separate menu spec (§5.2).

**`packages/db/src/`**:
- `schema.ts` (+ `dbSchema`) and the generated migration; `blocks/extract.ts`
  (+ `blocks/types.ts`) for `ExtractedMusicRow` / `music`;
  `repo/persist/persistDocumentDelta.ts` for `script_music` reconciliation;
  `queries/scripts/music.ts` + `scriptRepository.ts` for the repository.

## 10. Key technical risks

- **Trigger choice (resolved).** The original `@@` trigger had to
  coordinate with the character-tag `@` compose and was unreliable; it was
  replaced by a single `#` trigger with no such coupling (§5.1). The
  keyboard-independent block action menu (§5.2) is the planned alternative.
- **Block-shortcut ↔ character collision (resolved).** Block-type shortcuts
  used bare Option/AltGr + digit, which on macOS / Czech layouts *is* how
  `@ # &` are typed (⌥2 = `@`, etc.), so those characters were swallowed.
  Fixed: shortcuts use Ctrl + digit on macOS and exclude AltGr on Windows.
- **End-of-block invariant enforcement (§4.1)** — the single music atom stays
  at the block end; prose insertion is kept before it across typing, paste,
  and Enter/Backspace at block edges.
- **Derivation parity (§6.1)** — three sites extract music atoms
  (`buildScriptBlockIndex`, `buildIndexSnapshotFromPmDoc`,
  `extractScriptBlocks`) but share the single `deriveMusic` helper, so only
  the mechanical atom-extraction can drift. Cover `deriveMusic` and each
  extractor with shared test vectors.

## 11. What this enables / downstream

With music representable, editable, and projected, the next spec is the one
this whole rewrite has been building toward: **import / export** of
`.stagistic` text against the syntax — for which §8 is the contract. The
deferred UI (duration line, ghost implicit-end marker, kind selection,
drag-and-drop) and the future **production cues** (§3.2) come after, on
top of the seams this spec leaves in place.
