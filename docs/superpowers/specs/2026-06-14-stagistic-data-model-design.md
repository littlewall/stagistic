# Stagistic Data Model — Design

**Date:** 2026-06-14
**Status:** Approved (design); implementation pending
**Depends on:** [Stagistic Syntax — Design](2026-06-14-stagistic-syntax-design.md)
**Scope:** How the Stagistic syntax constructs are represented in data —
the editor document model and the relational schema. This is downstream
spec #1 of the syntax rewrite (data model → parser/serializer →
editor/import → migration).

---

## 1. Motivation

The [syntax spec](2026-06-14-stagistic-syntax-design.md) defines the
plain-text format. This spec defines what that syntax *parses into* and
how it is stored. The current model is built around **Fountain**: types,
node names, the package directory, and stored identifiers all carry a
`fountain*` / `ELEMENT_*` prefix and screenwriting vocabulary
(`action`, `sceneHeading`, `parenthetical`). We are moving off Fountain,
so the model needs a clean break on naming and a few additive concepts.

## 2. Approach — evolution + clean break

The current architecture is largely right and worth keeping; the friction
is naming, legacy cruft, and a few genuinely new concepts. We therefore
**evolve** the structure and take a **clean break** on naming.

**Keep:**
- The dual representation: a ProseMirror/Tiptap JSON document for editing
  + a relational projection for query/sync.
- The relational schema (acts, scenes, characters, per-block character
  refs, column groups, title-page fields, locations, genders).
- The block-spec registry pattern (one spec file per block,
  `packages/script/src/blocks/specs/`) and the editor binding pattern.
- The storage optimization: `script_blocks.text_content` plus
  `content_json` *only* when marks/attrs prevent plain-text round-trip.

**Clean break (enabled by having no production data — see §3):**
- Rename `fountain*` → neutral domain names; drop the `ELEMENT_*` /
  `legacyType` duality entirely.
- Drop the legacy node mode (the monolithic `fountainBlock` node,
  `FOUNTAIN_BLOCK_NODE_NAME`).
- Clean screenwriting identifiers (`action` → `stageDirection`,
  `sceneHeading` → `scene`, `parenthetical` → `aside` internally).
- No coercion/permanent migration code — see §9.

**Add (the new concepts):** music, inline character tag, lyric section
level. Of these, only what the editor can render today is built now; the
rest is *reserved as specification* (§7–§8).

## 3. Data situation

There is **no production data**. The only data to preserve is **one local
test script**. So migration is not a hard requirement: a **temporary,
one-shot** load-time migration (§9) handles that single script, then is
deleted. This is what makes the clean break cheap — we rename freely and
regenerate/migrate the one script rather than writing permanent coercion.

## 4. Scope and non-goals

**This spec covers:**
- The clean-break block vocabulary and identifier scheme.
- The mapping of every syntax construct to stored data.
- A *specification* of how the not-yet-in-editor constructs (music, inline
  tag) will be stored, so a later exporter has a target.
- The temporary migration.

**Explicit non-goals (downstream specs):**
- The parser and serializer (text ↔ document). This spec only defines the
  *target* shape.
- Building editor entities/UX for music and inline tagging.
- Tuning import (done after the new editor features land) and export
  (more complex; only its target spec matters now).

**Principle (set by the product owner):** *the syntax is ready as a
specification, but in code we build only what the editor can actually
display and work with now.*

## 5. Block vocabulary

The Stagistic block set and its clean identifiers. Each block is
identified by `nodeType` (camelCase Tiptap node name) and `blockType`
(snake_case stored identifier). The `legacyType` / `ELEMENT_*` field is
**removed**.

| Block | `nodeType` | `blockType` (stored) | Was (nodeType / blockType) |
|---|---|---|---|
| Scene | `scene` | `scene` | `sceneHeading` / `scene_heading` |
| Act | `act` | `act` | `act` / `act` (unchanged) |
| Stage direction | `stageDirection` | `stage_direction` | `action` / `action` |
| Aside | `aside` | `aside` | `parenthetical` / `parenthetical` |
| Character | `character` | `character` | `character` / `character` (unchanged) |
| Dialogue | `dialogue` | `dialogue` | `dialogue` / `dialogue` (unchanged) |
| Lyrics | `lyrics` | `lyrics` | `lyrics` / `lyrics` (unchanged) |
| Note | `note` | `note` | `note` / `note` (unchanged) |

Notes:
- **Scene** drops the screenwriting `INT./EXT.` semantics: its heading is
  free text (location/time/anything). Location is *assigned* (via
  `script_locations` / `script_scenes.location_id`), not parsed out of
  the heading text.
- `enterFallback` / `nextElement` reference `nodeType`/`blockType`, not
  the removed `ELEMENT_*` constants.
- The dynamic `#`/`##` rule (scene is the base unit; act is an optional
  layer) is a **parser** concern. The data model simply has both `act`
  and `scene` block types; the parser decides which a `#` maps to.

## 6. Naming and structure

Neutral domain names (the package is already `@stagistic/script`, so a
brand prefix is redundant):

| Was | Becomes |
|---|---|
| `FountainBlockSpec` | `BlockSpec` |
| `FountainJSONContent` | `ScriptNode` |
| `FountainElementType` | *(removed)* |
| `FOUNTAIN_BLOCK_NODE_NAME` + legacy node mode | *(removed)* |
| `packages/script/src/fountain/` | `packages/script/src/syntax/` |

The two node-mode concept (`legacy` / `default`) collapses to a single
node-per-type model. `ScriptDocumentNodeMode`, `createLegacyScriptBlockNode`,
and the `fountainBlock` resolution path are removed.

## 7. Construct → storage mapping

### Built now (the editor renders these)

| Syntax construct | Storage | Note |
|---|---|---|
| Act / Scene | `script_acts` / `script_scenes` (+ `heading_block_id`); blocks tagged `act_id` / `scene_id` | rename `scene_heading` → `scene` |
| Character cue + unison `/` | `character` block; `/` in `text_content` | exists (R1-5) |
| Dialogue / Lyrics / Stage direction / Aside / Note | the respective blocks | renamed per §5 |
| Character refs (on character/dialogue) | `script_block_character_refs` (with `is_confirmed`) | exists |
| Inline emphasis | ProseMirror marks | exists |
| **Lyric section level** | **leading tabs in `text_content`** (R1-7 mechanism, `tab-size: 5`) | **already works** — no new attr now |
| Frontmatter | `script_title_page_fields` | storage exists; the YAML ↔ fields mapping is import/export, done later |

The block index (`buildScriptBlockIndex`) keeps tagging each block with
its `act`/`scene` context and deriving character refs; identifiers are
renamed but its shape is unchanged.

### Lyric section level

The syntax sets a lyric's section level by **leading tabs** (0 = A, 1 =
B, …). This maps directly onto the existing R1-7 mechanism: literal
leading tabs stored in `text_content`, rendered at `tab-size: 5`
(0.5"/level). **No new attribute is added now.** A structured
`sectionLevel` attribute is a possible future refinement (it would make
the level queryable and decouple it from literal whitespace), but is not
required for the editor to render nesting today.

## 8. Reserved bindings (specification only — not built now)

These constructs exist in the syntax but not yet in the editor. The model
**reserves** how they will be stored so that a later exporter has a
concrete target and import → store → export can round-trip. **No code is
written for these now.**

### Music (`@@music` / `@@out`)

- **Editor intent:** typing `#` opens a custom inline input; the
  writer selects or creates a music entry; metadata is stored bound to that
  position, the way character references are. The `@@music` / `@@out`
  markup is **not visible** in the editor — it is purely the import/export
  serialization of that bound metadata.
- **Reserved storage:** music metadata (number, title, kind:
  song/instrumental, role: start/out) bound to a position inside a
  `stageDirection` block — analogous to `script_block_character_refs`
  binding a character to a block. A dedicated `script_music` relational
  entity (mirroring `script_scenes`/`script_acts`, with
  `start_block_id`/`end_block_id`) and block-index `music_id` tagging are
  the expected fuller shape **when music lands in the editor**.
- **Round-trip rule for the exporter:** music with no `@@out` is
  assumed to end at the end of its scene; the kind is `song` if lyrics
  fall within its interval, otherwise generic.

### Inline character tag (in stage directions)

- **Reserved storage:** an inline mark (carrying `characterKey`) on the
  tagged span inside a `stageDirection` block, plus an extension of
  `script_block_character_refs` so a `stageDirection` block can carry
  character references (today only character/dialogue blocks do).
- **Render intent:** the tagged (acting) character renders uppercase;
  matching is case-insensitive against the cast (`@Petr` ↔ `PETR`).
- Not built now.

## 9. Temporary migration

To preserve the one local test script across the rename + legacy-mode
drop, add a **temporary, one-shot, load-time migration** following the
R1-5 precedent (`migrateCharacterDelimiters` + the one-shot hook in
`useScriptLoader`):

- Map old `blockType` / `nodeType` strings → new (`action` →
  `stage_direction`/`stageDirection`, `scene_heading`/`sceneHeading` →
  `scene`, `parenthetical` → `aside`, strip `fountain_*` legacy element
  ids).
- Coerce any legacy `fountainBlock` monolithic nodes → node-per-type.
- Normalize any residual `+` character delimiter → `/`.

It runs on editor load, saves immediately, and is then **deleted** (not
left behind as a flag) once the test script has been opened and saved
once.

## 10. What this enables / downstream

With the model defined, the remaining specs are:

1. **Parser + serializer** — text ↔ document against this target shape,
   including the whole-document `#`/`##` pre-scan, case+position
   detection, soft-break (`~`) handling, and case-correct lyric export.
2. **Editor + import** — editing surfaces and the import flow (and, in
   time, the music inline-input and inline-tag UX that turn the reserved
   bindings into built features).
3. **Export** — serialization to `.stagistic` text per the syntax spec.
