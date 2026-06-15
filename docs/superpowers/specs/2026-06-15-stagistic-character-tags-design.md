# Stagistic — Inline Character Tags in Stage Directions — Design

**Date:** 2026-06-15
**Status:** Approved (design); implementation pending
**Scope:** How a writer tags a character inline inside a `stage_direction`
block in the editor — both confirmed (cast) and unconfirmed characters,
with autocomplete for confirmed ones. The editor surface, data
representation, and character aggregation are all in scope. Structural
cues (`@@cue` / `@@out`) are a **separate downstream spec**.

Builds on `docs/superpowers/specs/2026-06-14-stagistic-syntax-design.md`
(§11 character tag, §12 quoting rule).

---

## 1. Motivation

The Stagistic syntax (§11) lets a writer tag the character who *performs
the action* inside a stage direction: `@Petr vejde tiše` renders **PETR**
and stores a machine-readable character reference. Re-enabling import is
not worthwhile until the editor can author these tags directly. This
document designs that editing surface and its data model.

Convention (NMI, syntax §11): in stage directions, capitalize the
character who *has* the action, not the recipient. Tagging is therefore
an **explicit, per-occurrence** authorial choice — never auto-detected.

## 2. Scope

In scope:

- Authoring a character tag inside a `stage_direction` block.
- Confirmed vs. unconfirmed tags; autocomplete for confirmed cast.
- Visual styling, unified with the existing character-block tag.
- Feeding tagged references into the existing character aggregation
  (sidebar, counts, link / unlink / rename).
- Persistence and round-trip to Stagistic plain-text syntax.

Out of scope (see §10):

- Structural cues `@@cue` / `@@out` (separate spec).
- Tags in any block other than `stage_direction`.
- Passive "suggestion" highlighting of untagged cast names in prose.
- Forced lowercase / canonical-case display (phase 1 is uppercase-only).
- Confirming a character from inside the prose (confirmation stays a
  sidebar action).

## 3. Text vs. mark & per-occurrence semantics

This is the core design decision.

A tag is **pure prose text enriched by metadata (a mark)** — *not* stored
syntax displayed differently. There are two representations:

**A) Rich document form (ProseMirror JSON / stored `contentJson`)** — what
is stored and edited:

- The text is literally the prose, including the plain name:
  `Anna is going to her room. Steve is following Anna.`
- A `characterTag` mark is attached to a **specific text range** (one
  occurrence), not to the block.
- **No `@` is stored here.** The `@` is not part of the document.

**B) Stagistic plain-text syntax form (import / export only):**

- The `@` lives only here. Serializing a marked span `Anna` produces
  `@Anna` (and `@"Anna Maria"` for multi-word names, per syntax §12).
  Parsing `@Anna` produces prose `Anna` + a `characterTag` mark.
- The `@` is purely a syntax-layer token.

**Per-occurrence is inherent.** Because the mark is range-scoped (unlike
the character block, whose whole text is a list of names that are token-
scanned), the same name can be tagged in one place and plain text in
another:

```
Anna is going to her room. Steve is following Anna.
└┬─┘                       └─┬─┘            └┬─┘
 tag (mark)                 tag (mark)      plain text — no mark
```

The first `Anna` and `Steve` carry the action and are marked; the second
`Anna` (the recipient) is plain text. They coexist as independent ranges.
This directly supports the best-practice rule (tag only the acting
character) as an authorial choice at the occurrence level.

**Why a mark, not the character-block model:** the character (cue) block
is nothing *but* names, so it token-scans the whole block and treats every
occurrence of a key as the character. Stage directions are mixed prose
where only some occurrences are tags, so the unit of truth must be the
span, i.e. a mark.

## 4. Data representation

A new ProseMirror **mark** `characterTag`, applied to the tagged name
span:

| Attr | Type | Meaning |
|---|---|---|
| `characterKey` | `string` | Normalized key (same normalization as cue tokens). Present on every tag, including unconfirmed. |
| `characterId` | `string \| null` | Set only when the tag is **confirmed** (linked to a cast character via the sidebar). `null` while unconfirmed. |

- The mark is **`inclusive: false`** — typing immediately before or after a
  finished tag is normal prose, not part of the tag.
- Round-trips through `contentJson` (it is plain ProseMirror mark JSON,
  like `bold` / `italic` / `underline`).
- Allowed only on text inside `stage_direction` blocks.

**Relationship to `block_character_refs`.** The existing per-block ref
table (`blockId, characterKey, characterId`) records, for confirmed tags,
"this block references key → characterId" — used for linking persistence
and as the lookup that fills a tag's `characterId` by key. It does **not**
encode which occurrence is tagged; the mark does. Counts of how many times
a character is tagged are derived from the **marks**, not from ref-table
rows. Unconfirmed tags have no ref-table row (no `characterId`); they are
carried solely by the mark in `contentJson`.

## 5. Authoring interaction (lifecycle)

States: **inactive → active-composing → committed**.

- **Start.** Typing `@` in a `stage_direction` enters *active-composing*: a
  forming pill appears and the autocomplete overlay opens, offering
  **confirmed cast only** (`persistentCharacters`), reusing the cue
  overlay's logic. The `@` itself is never shown as a literal character —
  the pill (mark) represents it.
- **Compose.** Typed letters go into the mark; the overlay filters the
  cast. A **single space is part of the name** (multi-word characters,
  consistent with the character block).
- **Commit / exit the active tag** by any of:
  - selecting an entry from the overlay (inserts the character's name and
    commits the tag);
  - pressing **double space** — the cursor leaves the pill into normal
    prose and the leading/trailing space inside the pill is removed;
  - pressing **Enter** or **Tab** — commits the current pill value and
    exits.
  After commit, following text is normal prose.
- **Edit a committed tag.** The cursor may enter a finished tag and edit
  its letters; while the mark's text is non-empty it stays a tag (its key
  re-derives from the text).
- **Empty-prune.** Deleting a tag down to empty (or typing `@` then
  nothing) removes the mark and its conceptual `@` — the pill disappears
  and the text continues as normal prose. To start a new tag the writer
  types `@` again.

Because single spaces are allowed inside the pill, **multi-word
unconfirmed tags can be typed by hand** (e.g. `@Anna Maria` then double
space); multi-word confirmed names are also reliably created by selecting
from the overlay.

## 6. Confirmed vs. unconfirmed & visual styling

A tag's state mirrors the character's state elsewhere in the app:

- **Confirmed** (`characterId` set; key is in the cast): **filled
  background** in the character's color — the same style as a tag inside
  the character block.
- **Unconfirmed** (only `characterKey`): **no background, dashed border**;
  the character's color is preserved (border/text).

**Styling unification.** Apply this confirmed/unconfirmed styling
consistently to **stage-direction tags** *and* **tags inside the character
block** (the character block is updated so unconfirmed names also get the
dashed-border treatment). The **sidebar is not changed** — it already
distinguishes confirmed (filled dot) from unconfirmed (outlined dot)
correctly; the tag styling simply matches that existing semantic.

**Confirmation stays a sidebar action** (this phase). A tag created in
prose contributes an unconfirmed character to the sidebar; the writer
confirms it there, which links its key to a `characterId` and flips every
matching tag to the confirmed style.

## 7. Character aggregation (cross-cutting)

Today all character logic flows only through character (cue) blocks —
`mapCharacterBlockNodes` / `visitCharacterBlocks` filter on
`blockType === 'character'`. Stage-direction tags must feed the **same**
aggregation so that `@Petr` in a stage direction and `PETR` in a cue
resolve to one character via the normalized key.

This requires extending, to also scan `characterTag` marks in
`stage_direction` blocks:

- `collectScriptCharacterStats` (counts + (un)confirmed roster for the
  sidebar) — counting tag occurrences from marks.
- `characterRefsInScriptDocument` link / unlink / replace / rename, so a
  sidebar confirm/rename/merge also updates stage-direction tags.
- The editor's `CharacterRefSyncExtension` and the token/runtime scan
  (color resolution, live counts).
- Persistence: confirmed tag refs persist into `block_character_refs`
  (the table is already per-`blockId` and key-agnostic); unconfirmed tags
  persist only as marks in `contentJson`.

The sidebar remains the single source of truth for confirmation; tag refs
simply flow into it.

## 8. Casing

**Phase 1: always uppercase** (e.g. `PETR`), rendered via CSS — consistent
with the character cue (`casing: 'uppercase'`) and syntax §11. The stored
key/name stays normalized. Forced lowercase / canonical-case display
(which the syntax permits via forced names) is deferred.

## 9. Persistence & round-trip

- **Rich form:** the `characterTag` mark is stored in the block's
  `contentJson`; `textContent` is the plain prose (the names without `@`).
- **Confirmed refs:** stored in `block_character_refs`.
- **Syntax export:** a marked span serializes to `@Name`
  (`@"Multi Word"` per §12).
- **Syntax import:** `@Name` parses to prose + `characterTag` mark; the key
  matches the cast case-insensitively (§11).

After any change to `packages/db/src/` schema or `drizzle/*.sql`, run
`pnpm --filter @stagistic/db db:compile-migrations` (per CLAUDE.md). The
existing `block_character_refs` table already supports tag refs, so a
schema change may not be needed — to be confirmed during planning.

## 10. Out of scope / future

- **Structural cues** `@@cue` / `@@out` — separate downstream spec.
- **Passive suggestion** — highlight/underline an untagged cast name in
  prose and offer a one-click link, without auto-tagging. Designed-around
  but not built now (the mark model leaves room for it).
- **Forced lowercase / canonical-case** display of tags.
- **Tags outside stage directions.**
- **Confirming from prose** (stays a sidebar action this phase).

## 11. Open questions for planning

- Exact ProseMirror mechanics for the active-composing pill (suggestion
  plugin vs. live mark) that produce the lifecycle in §5.
- Whether tag counts and the sidebar roster need any schema change, or the
  existing `block_character_refs` + `contentJson` marks suffice.
- How rename/merge in the sidebar rewrites the *text* of stage-direction
  tags (the character block has `renameCharacterText`; tags need an
  equivalent that edits marked spans).
