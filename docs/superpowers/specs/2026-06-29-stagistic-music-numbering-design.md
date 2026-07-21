# Stagistic Music Numbering — Design

**Date:** 2026-06-29
**Status:** Approved (design); implementation pending
**Depends on:** [Stagistic Music — Editor & Data Design](2026-06-24-stagistic-music-editor-design.md)
(the music nodes, `deriveMusic`, the pill NodeViews) and the structure/sidebar
projection.
**Scope:** Automatic, scene-derived **numbering** of music — the number shown
on the music pill and the out pill, the scene number shown in the Structure
sidebar, the default number format, and **persistence of the numbering into
the relational projection** (`script_scenes` / `script_music`). Numbering is
**data**; the textual format is a **swappable default** (future per-user
config).

---

## 1. Motivation

Music currently render only a title (musicStart) or "out" (musicOut). Authors
need each music to carry a stable, human-readable **number** derived from the
scene it sits in, and the out to name the music it closes. The number must be
automatic and consistent with how scenes are numbered in the Structure
sidebar — and available to downstream consumers (import/export, music sheets)
straight from the relational projection.

## 2. Scope and non-goals

**Covers:**
- A global, continuous **scene number** (1…N), surfaced in the Structure
  sidebar as `"<n>. <title>"`.
- **Music numbers** derived from the scene number, with a letter suffix when a
  scene holds more than one music.
- The **out** label: the closed music's number + `out` + its title.
- Rendering the numbers on the pills, recomputed **only** when the scene/music
  structure or a music title changes.
- **Persisting** the structured numbering into the relational projection
  (`script_scenes.scene_number`, `script_music` columns) so consumers read it
  directly.

**Non-goals (deferred):**
- **Format customization** (leading zeros, no-dot, dash, lowercase letters,
  per-act reset, …) — only the *default* below is built now; §13 keeps the
  door open.
- Any **user override** of a scene/music number — the stored value is the
  computed default (the persistence shape leaves room for it later — §9).

## 3. Scene numbering (global, continuous)

The **scene number** of a scene is its 1-based position among `scene`-type
blocks in document order, counted **globally** across acts (decision: not
reset per act). `act` blocks are not scenes and do not count.

The same rule is used by every consumer (sidebar §8, music numbering §4, DB
§9), so they always agree: `blockType === 'scene'`, in order.

## 4. Music numbering data (structured, format-free)

`deriveMusic` (`@stagistic/script`) is extended so each `DerivedMusic` carries
the structured numbering **in place of** the current global `number`:

- `sceneNumber: number` — the scene number (§3) the music's **start** is in
  (`0` if it precedes the first scene — §11).
- `indexInScene: number` — 0-based position of this music among the music
  **starts** in that scene, in document order.
- `sceneMusicCount: number` — total music **starts** in that scene.

Only **musicStarts** are numbered (hits included — a hit is a music). **Outs get
no number of their own**; they borrow their music's (§6). The old global
`number` field is **removed**; all consumers (snapshot `music`, DB extract)
move to the structured fields.

`deriveMusic` computes these in its single walk by tracking the running scene
ordinal, then grouping the collected music by scene to fill `indexInScene` /
`sceneMusicCount`.

## 5. Default format (a swappable formatter)

Pure helpers in `@stagistic/script` (`music/`), the **only** place format
lives:

- `musicLetter(index): string` — `0→A, 1→B, … 25→Z, 26→AA, …` (spreadsheet
  style).
- `formatMusicNumber({sceneNumber, indexInScene, sceneMusicCount}): string`:
  - `sceneMusicCount <= 1` → `"${sceneNumber}"` (e.g. `"3"`).
  - else → `"${sceneNumber}.${musicLetter(indexInScene)}"` (e.g. `"3.A"`).
- `formatMusicOutLabel(closedMusic): string`:
  - with a title → `"${formatMusicNumber(closedMusic)} out (${title})"`
    (e.g. `"3.A out (Night)"`).
  - empty title → `"${formatMusicNumber(closedMusic)} out"`.

## 6. Out label

A `musicOut` shows the **closed music's** number + `out` + name — never its own
number. Pairing is positional (`deriveMusic`): the out in block X closes the
music whose `endBlockId === X`. So the out's label is `formatMusicOutLabel` of that
music. An **orphan** out (closes nothing) shows just `"out"`.

## 7. Rendering via node decorations (with recompute gating)

A ProseMirror plugin owns a `DecorationSet` in its state and pushes labels
onto the music atoms; the pill NodeViews read them. This avoids any
live-context dependency.

- **`apply(tr, set)`** runs every transaction but is cheap by default:
  `set.map(tr.mapping, tr.doc)` to keep positions valid, and **nothing
  else** unless a relabel is warranted.
- **Relabel** (`deriveMusic` + format + rebuild the `DecorationSet`) happens
  **only** when the transaction changed the **scene/music structure or a music
  title** — i.e. a scene block or music atom was inserted / removed / reordered,
  a music moved between scenes, or a `musicStart`'s title changed. Detected by a
  cheap **structural+title signature** (ordered scene ids + per-scene musicStart
  ids and titles + musicOut block ids): recompute only when the signature
  differs from the last. Plain prose typing / caret moves leave the signature
  unchanged → no relabel, no pill re-render.
- **Decorations:** one node decoration per music atom, carrying its label in
  the decoration `spec`:
  - `musicStart` → `{musicNumber: "3.A"}`.
  - `musicOut` → `{outLabel: "3.A out (Night)"}` (or `{outLabel: "out"}` for an
    orphan).
- **Pills** read `props.decorations` for their label:
  - `musicStart` shows the number **before** the title input → `3.A` ` ` `[title▸]`.
  - `musicOut` shows the full out label → `3.A out (Night)`.

**Implementation risk (verify in the plan):** that node-decoration `spec`
data reliably reaches a React NodeView's `decorations` prop. Fallback if not:
the plugin keeps a `Map<musicId, label>` (+ out-by-block-id) in its state and
the pill reads it via tiptap's `useEditorState` selector.

## 8. Structure sidebar scene numbers

The structure projection (`buildStructureSnapshotFromBlocks`) numbers scene
rows: each `EditorLiveSceneRow` gains `sceneNumber` (the §3 ordinal). The
Structure sidebar renders the scene as `"<sceneNumber>. <title>"`
(e.g. `"3. Zahrada"`). Acts are unchanged.

## 9. DB persistence (relational projection)

The relational projection is already a denormalized read-model of the
document (block order, scene/act links, character refs). The numbering joins
it — there is no drift, because the persister re-projects on every structural
change (it already re-runs `deriveMusic` via the block extractor). No
production data exists yet, so column changes are a clean break.

- **Scenes — `script_scenes.scene_number`** (existing `text`, currently
  null): the persister fills it with the computed scene ordinal (§3), as
  text (`"1"`, `"2"`, …). Left as text + nullable so a future **user
  override** can replace the computed default without a schema change.
- **Music — `script_music`**: **replace** the global `music_number`
  (`integer NOT NULL`) with two columns:
  - `scene_number` `integer NOT NULL` — the music's scene ordinal (`0` before
    the first scene).
  - `index_in_scene` `integer NOT NULL` — 0-based position among music starts
    in that scene.

  `sceneMusicCount` is **not** stored — a reader derives it by counting music
  that share `scene_number` within the script, then applies the formatter
  (§5). The stored data is format-free.
- **Migration:** a new hand-written `drizzle/000N_*.sql`
  (drop `music_number`, add `scene_number` + `index_in_scene`), then
  `pnpm --filter @stagistic/db db:compile-migrations` (per CLAUDE.md;
  drizzle-kit generate is unusable here).
- **Extract / persist:** `ExtractedMusicRow` swaps `musicNumber` for
  `sceneNumber` + `indexInScene` (sourced from the extended `deriveMusic`);
  the music reconcile writes them. The scene projection writes
  `scene_number`. Both ride the persister's existing structural re-projection.

## 10. Architecture / where the logic lives

- **`@stagistic/script` `music/`** (pure, tested): the structured numbering on
  `DerivedMusic` (extended `deriveMusic`, global `number` removed) and the
  formatters (`musicLetter`, `formatMusicNumber`, `formatMusicOutLabel`).
- **Editor:** a music-numbering decoration plugin (`musicNumbering`) registered
  in `useEditorExtensions`; the pill NodeViews read labels from decorations.
- **Editor sidebar projection:** `buildStructureSnapshotFromBlocks` adds the
  scene ordinal; the sidebar scene-row component renders the prefix.
- **DB (`@stagistic/db`):** schema + migration, `ExtractedMusicRow`, the music
  reconcile, and the scene projection (§9).

## 11. Edge cases

- **Before any scene** (script with music but no scene heading yet): the music's
  `sceneNumber = 0`, rendering `"0"` / `"0.A"` and stored as `scene_number 0`
  — an accepted placeholder (rare; refine via config later).
- **> 26 music in one scene:** `musicLetter` continues `…Z, AA, AB, …`.
- **Orphan out:** label `"out"` (no number, no name).
- **Empty-title music:** the musicStart pill shows just the number (its input is
  empty/placeholder); an out closing it shows `"3.A out"` (no parens).
- **Hit music:** numbered like any music; has no out, so no out label.

## 12. Testing

- **`deriveMusic` numbering (unit):** scene ordinals 1..N; one music → index 0 /
  count 1; two music → indices 0,1 / count 2; music spread across scenes; a hit
  counts; a music before the first scene → `sceneNumber 0`.
- **Formatters (unit):** `"3"`, `"3.A"`/`"3.B"`, letter overflow past Z, out
  label with / without title, orphan handling.
- **Sidebar scene numbers (unit):** structure projection scene rows carry the
  right `sceneNumber`.
- **DB (PGlite):** persisting a doc writes `script_scenes.scene_number` and
  `script_music.scene_number` / `index_in_scene`; a structural edit (add a 2nd
  music to a scene) re-projects the rows; the migration applies cleanly.
- **Pills (browser):** a musicStart shows its number; adding a 2nd music to a
  scene flips `"3"` → `"3.A"` + `"3.B"`; a musicOut shows `"<n> out (title)"`;
  editing the music's title updates the out's `(title)`; plain prose typing does
  not change any label.

## 13. Future (customization)

User-configurable numbering swaps **only the formatter** (§5) — the
structured `{sceneNumber, indexInScene, sceneMusicCount}` data (in memory and
in the DB) is stable. That covers leading zeros, dot vs dash vs none,
lowercase letters, and (with a small change to §3's scene counter) per-act
scene reset, without touching derivation, rendering, or storage. A user
override of a scene/music number drops into the same `text`/`integer` columns.
