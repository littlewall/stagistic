# Stagistic Cue Numbering — Design

**Date:** 2026-06-29
**Status:** Approved (design); implementation pending
**Depends on:** [Stagistic Cues — Editor & Data Design](2026-06-24-stagistic-cues-editor-design.md)
(the cue nodes, `deriveCues`, the pill NodeViews) and the structure/sidebar
projection.
**Scope:** Automatic, scene-derived **numbering** of cues — the number shown
on the cue pill and the out pill, the scene number shown in the Structure
sidebar, and the default number format. Numbering is **data**; the textual
format is a **swappable default** (future per-user config).

---

## 1. Motivation

Cues currently render only a title (cueStart) or "out" (cueOut). Authors
need each cue to carry a stable, human-readable **number** derived from the
scene it sits in, and the out to name the cue it closes. The number must be
automatic and consistent with how scenes are numbered in the Structure
sidebar.

## 2. Scope and non-goals

**Covers:**
- A global, continuous **scene number** (1…N), surfaced in the Structure
  sidebar as `"<n>. <title>"`.
- **Cue numbers** derived from the scene number, with a letter suffix when a
  scene holds more than one cue.
- The **out** label: the closed cue's number + `out` + its title.
- Rendering the numbers on the pills, recomputed **only** when the scene/cue
  structure or a cue title changes.

**Non-goals (deferred):**
- **No DB / `script_cues` changes.** The scene-based number is display-only
  (derived live); the relational `cueNumber` (global ordinal) is untouched.
  Persisting the structured number waits for a consumer.
- **Format customization** (leading zeros, no-dot, dash, lowercase letters,
  per-act reset, …) — only the *default* below is built now; §12 keeps the
  door open.

## 3. Scene numbering (global, continuous)

The **scene number** of a scene is its 1-based position among `scene`-type
blocks in document order, counted **globally** across acts (decision: not
reset per act). `act` blocks are not scenes and do not count.

The same rule is used by both consumers (sidebar §8 and cue numbering §4),
so they always agree: `blockType === 'scene'`, in order.

## 4. Cue numbering data (structured, format-free)

`deriveCues` (`@stagistic/script`) is extended so each `DerivedCue` carries,
in addition to its existing fields:

- `sceneNumber: number` — the scene number (§3) the cue's **start** is in
  (`0` if it precedes the first scene — §10).
- `indexInScene: number` — 0-based position of this cue among the cue
  **starts** in that scene, in document order.
- `sceneCueCount: number` — total cue **starts** in that scene.

Only **cueStarts** are numbered (hits included — a hit is a cue). **Outs get
no number of their own**; they borrow their cue's (§6). The existing global
`number` field stays (it still feeds `script_cues`, unchanged — §2).

`deriveCues` computes these in its single walk by tracking the running scene
ordinal, then grouping the collected cues by scene to fill `indexInScene` /
`sceneCueCount`.

## 5. Default format (a swappable formatter)

Pure helpers in `@stagistic/script` (`cues/`), the **only** place format
lives:

- `cueLetter(index): string` — `0→A, 1→B, … 25→Z, 26→AA, …` (spreadsheet
  style).
- `formatCueNumber({sceneNumber, indexInScene, sceneCueCount}): string`:
  - `sceneCueCount <= 1` → `"${sceneNumber}"` (e.g. `"3"`).
  - else → `"${sceneNumber}.${cueLetter(indexInScene)}"` (e.g. `"3.A"`).
- `formatOutLabel(closedCue): string`:
  - with a title → `"${formatCueNumber(closedCue)} out (${title})"`
    (e.g. `"3.A out (Night)"`).
  - empty title → `"${formatCueNumber(closedCue)} out"`.

## 6. Out label

A `cueOut` shows the **closed cue's** number + `out` + name — never its own
number. Pairing is positional (`deriveCues`): the out in block X closes the
cue whose `endBlockId === X`. So the out's label is `formatOutLabel` of that
cue. An **orphan** out (closes nothing) shows just `"out"`.

## 7. Rendering via node decorations (with recompute gating)

A ProseMirror plugin owns a `DecorationSet` in its state and pushes labels
onto the cue atoms; the pill NodeViews read them. This avoids any
live-context dependency.

- **`apply(tr, set)`** runs every transaction but is cheap by default:
  `set.map(tr.mapping, tr.doc)` to keep positions valid, and **nothing
  else** unless a relabel is warranted.
- **Relabel** (`deriveCues` + format + rebuild the `DecorationSet`) happens
  **only** when the transaction changed the **scene/cue structure or a cue
  title** — i.e. a scene block or cue atom was inserted / removed / reordered,
  a cue moved between scenes, or a `cueStart`'s title changed. Detected by a
  cheap **structural+title signature** (ordered scene ids + per-scene cueStart
  ids and titles + cueOut block ids): recompute only when the signature
  differs from the last. Plain prose typing / caret moves leave the signature
  unchanged → no relabel, no pill re-render.
- **Decorations:** one node decoration per cue atom, carrying its label in
  the decoration `spec`:
  - `cueStart` → `{cueNumber: "3.A"}`.
  - `cueOut` → `{outLabel: "3.A out (Night)"}` (or `{outLabel: "out"}` for an
    orphan).
- **Pills** read `props.decorations` for their label:
  - `cueStart` shows the number **before** the title input → `3.A` ` ` `[title▸]`.
  - `cueOut` shows the full out label → `3.A out (Night)`.

**Implementation risk (verify in the plan):** that node-decoration `spec`
data reliably reaches a React NodeView's `decorations` prop. Fallback if not:
the plugin keeps a `Map<cueId, label>` (+ out-by-block-id) in its state and
the pill reads it via tiptap's `useEditorState` selector.

## 8. Structure sidebar scene numbers

The structure projection (`buildStructureSnapshotFromBlocks`) numbers scene
rows: each `EditorLiveSceneRow` gains `sceneNumber` (the §3 ordinal). The
Structure sidebar renders the scene as `"<sceneNumber>. <title>"`
(e.g. `"3. Zahrada"`). Acts are unchanged.

## 9. Architecture / where the logic lives

- **`@stagistic/script` `cues/`** (pure, tested): the numbering fields on
  `DerivedCue` (extended `deriveCues`) and the formatters (`cueLetter`,
  `formatCueNumber`, `formatOutLabel`).
- **Editor:** a cue-numbering decoration plugin (`cueNumbering`) registered
  in `useEditorExtensions`; the pill NodeViews read labels from decorations.
- **Editor sidebar projection:** `buildStructureSnapshotFromBlocks` adds the
  scene ordinal; the sidebar scene-row component renders the prefix.
- **No DB changes** (§2).

## 10. Edge cases

- **Before any scene** (script with cues but no scene heading yet): the cue's
  `sceneNumber = 0`, rendering `"0"` / `"0.A"` — an accepted placeholder
  (rare; refine via config later).
- **> 26 cues in one scene:** `cueLetter` continues `…Z, AA, AB, …`.
- **Orphan out:** label `"out"` (no number, no name).
- **Empty-title cue:** the cueStart pill shows just the number (its input is
  empty/placeholder); an out closing it shows `"3.A out"` (no parens).
- **Hit cue:** numbered like any cue; has no out, so no out label.

## 11. Testing

- **`deriveCues` numbering (unit):** scene ordinals 1..N; one cue → index 0 /
  count 1; two cues → indices 0,1 / count 2; cues spread across scenes; a hit
  counts; a cue before the first scene → `sceneNumber 0`.
- **Formatters (unit):** `"3"`, `"3.A"`/`"3.B"`, letter overflow past Z, out
  label with / without title, orphan handling.
- **Sidebar scene numbers (unit):** structure projection scene rows carry the
  right `sceneNumber`.
- **Pills (browser):** a cueStart shows its number; adding a 2nd cue to a
  scene flips `"3"` → `"3.A"` + `"3.B"`; a cueOut shows `"<n> out (title)"`;
  editing the cue's title updates the out's `(title)`; plain prose typing does
  not change any label.

## 12. Future (customization)

User-configurable numbering swaps **only the formatter** (§5) — the
structured `{sceneNumber, indexInScene, sceneCueCount}` data is stable. That
covers leading zeros, dot vs dash vs none, lowercase letters, and (with a
small change to §3's scene counter) per-act scene reset, without touching
the derivation or rendering.
