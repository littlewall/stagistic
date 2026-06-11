# Script Formatting Best Practice — NMI Comparison

Source: [NMI Format Guidelines 2017](https://nmi.org/wp-content/uploads/2017/09/Format-Guidelines-2017.pdf), Part Two: The Script (pages 13–16, "Samuel French Broadway format"). Each item compares the guideline with the current Stagistic implementation and proposes what to change.

**Unit mapping used below:** the editor renders at 96 dpi with Courier (10 cpi at 12 pt), so `1" = 96 px = 10 ch`. Block indents are defined in `ch` (`indentLeftChars`) in [packages/script/src/blocks/specs/](../packages/script/src/blocks/specs), page geometry in px in [defaults.ts](../packages/script/src/settings/defaults.ts).

Status legend: ✅ compliant · 🔧 adjust existing · 🆕 not implemented yet

---

## 1. Page & typography

- [ ] 🔧 **Margins — 1" on all four sides**
  Guideline: 1" top, bottom, right, left.
  Current: top/right/bottom `96px` (1" ✅) but left `144px` (1.5" — screenplay binding margin).
  Proposed: change `marginLeftPx` default to `96`. Keep the 1.5" value available as a preset for users who bind scripts.

- [ ] 🔧 **Page size — US Letter for this format**
  Guideline: implied US Letter (Samuel French/Broadway submission format).
  Current: default page is `794×1123px` = A4.
  Proposed: add a page-size preset (A4 / US Letter `816×1056px`) in page settings; the "NMI/Broadway" preset should select Letter. Keep A4 default for European users, but make the choice explicit.

- [x] ✅ **Courier 12 pt**
  Guideline: Courier, 12 point.
  Current: `--font-family-mono: 'Courier Prime', 'Courier New', …` and `typography.fontSizePx: 16` (16 px = 12 pt at 96 dpi). Compliant.

## 2. Front matter

- [ ] 🆕 **Cover page — title and authors**
  Guideline: cover page with title and authors, ordered bookwriter → composer → lyricist.
  Current: title-page fields exist in the DB (`script_title_page_fields`) and in the settings panel (`TitlePageSettingsPanel`), but no cover page is rendered in the editor canvas or pagination.
  Proposed: render a generated cover page as page 1 (pagination decoration or a dedicated read-only first page) from the title-page fields. Add structured author roles (bookwriter / composer / lyricist) so the ordering rule can be applied automatically.

- [ ] 🆕 **Second page — cast, time, place**
  Guideline: second page lists cast of characters, time, and place.
  Current: not rendered. The data largely exists — `script_characters` already holds the cast (with genders); time/place fields do not exist yet.
  Proposed: auto-generate a "Cast / Time / Place" page from `script_characters` (optionally with vocal ranges later, per the score checklist) plus new `time` and `place` title-page fields. Editable overrides per script.

## 3. Book (dialogue) layout

- [ ] 🔧 **Character names indented 3"**
  Guideline: 3" from left margin.
  Current: `character.indentLeftChars: 20` = 2".
  Proposed: change default to `30` (3"). Keep per-script overrides as today.

- [ ] 🔧 **Dialogue flush left**
  Guideline: dialogue starts at the left margin (stage format, unlike screenplay).
  Current: `dialogue.indentLeftChars: 10` (1") + `indentRightChars: 3`.
  Proposed: change defaults to `indentLeftChars: 0`, `indentRightChars: 0`.

- [ ] 🔧 **Asides (parentheticals) — indented 1", lowercase, in parentheses**
  Guideline: 1" indent, lowercase, wrapped in parentheses; asides must not be full sentences (full sentences belong in stage directions).
  Current: `parenthetical.indentLeftChars: 16` (1.6"), `casing: 'normal'`, italic by default. No `lowercase` casing option exists (`BLOCK_CASING_OPTIONS = ['normal', 'uppercase']`).
  Proposed: set indent default to `10` (1"); add `'lowercase'` to `BLOCK_CASING_OPTIONS` ([options.ts](../packages/script/src/settings/options.ts)) and make it the parenthetical default; drop default italics. Nice-to-have: a soft lint that flags asides ending in sentence punctuation ("promote to stage direction").

- [ ] 🆕 **No "cont'd" — currently violated**
  Guideline: do **not** use "cont'd", neither at page bottoms nor after stage directions.
  Current: pagination actively renders `(MORE)` and `CHARACTER (CONT'D)` overlays ([buildPaginationState.ts:213-214](../packages/editor/src/editor/tiptap/extensions/pagination/layout/buildPaginationState.ts)).
  Proposed: add a pagination option `continuationMarkers: 'screenplay' | 'none'` and default the stage/musical format to `'none'`. (Screenplay users may still want it, so keep it switchable rather than deleting.)

## 4. Stage directions

- [ ] 🔧 **Subsequent stage directions — indented 1" from left AND right**
  Guideline: stage directions inside a scene indent 1" on both sides.
  Current: the `action` block is full width (`indentLeftChars: 0`, no right indent).
  Proposed: change `action` defaults to `indentLeftChars: 10`, `indentRightChars: 10`.

- [ ] 🆕 **Initial stage direction of a scene — indented to center, no parentheses**
  Guideline: the first stage direction of each scene starts at the page center and is not parenthesized.
  Current: no concept of an "initial" stage direction; all action blocks share one style.
  Proposed: two options — (a) automatic: style the first `action` block following a `sceneHeading` with `indentLeftChars: ~30` via a derived style (no new block type, works on reorder); or (b) explicit: a `sceneDirection` block spec with its own defaults. Recommend (a) for zero authoring overhead; the renderer already styles per block type, so this needs a "first-after-scene-heading" flag in the block index.

- [ ] 🆕 **Capitalize the character who acts**
  Guideline: in stage directions, capitalize names/pronouns of whoever performs the action, not the recipient ("HE kisses Maria").
  Current: character tagging exists for character/dialogue blocks (`script_block_character_refs`), but no caps rendering of tagged names in action blocks.
  Proposed: when a tagged character mention appears in an `action`/`note` block, render it uppercase via a decoration (data unchanged). Pronoun capitalization stays authorial — document it as a writing hint rather than automating.

## 5. Page furniture

- [ ] 🆕 **Page numbers — Act-Scene-Page, upper right**
  Guideline: `2-3-67` or `II-3-67` in the upper right of each page.
  Current: pagination renders no page numbers at all.
  Proposed: pagination already knows page boundaries and the block index knows act/scene per block — add a per-page header decoration that resolves the act/scene at the top of the page and formats `act-scene-page`, with a setting for arabic vs roman act numerals.

- [ ] 🆕 **Draft date footer — bottom left, 8–9 pt**
  Guideline: every page footer carries the draft date (`4.26.05`, `4/26/05`, or `April 26, 2005`).
  Current: not implemented; no draft-date field exists.
  Proposed: add a `draftDate` script setting (default: last manual-save date, overridable), render it as a small footer decoration in pagination and in exports.

- [ ] 🆕 **New scene begins a new page**
  Guideline: each scene starts on a fresh page.
  Current: pagination flows scenes continuously; no forced break on `sceneHeading`.
  Proposed: pagination option `breakBeforeSceneHeading: boolean` (default on for this format) — force a page boundary before every `sceneHeading` block in `buildPaginationState`.

## 6. Songs & lyrics

- [ ] 🔧 **Lyrics in caps, indented 0.5"**
  Guideline: lyric lines in capitals, indented 0.5" (A-sections).
  Current: `lyrics.casing: 'uppercase'` ✅, but `indentLeftChars: 10` (1") and italic by default (not part of the guideline).
  Proposed: change default indent to `5` (0.5"); reconsider default `isItalic: true` — the Samuel French sample uses plain caps. Italics could remain a house-style toggle.

- [ ] 🆕 **Lyric section levels — B/C/intro indents**
  Guideline: B-sections indent 1.0", C-sections 1.5", each further section +0.5"; intro sections indent 1.5"+ so they aren't mistaken for A-sections.
  Current: a single flat `lyrics` block; no section concept.
  Proposed: add an `indentLevel` (0–n) attribute to the lyrics block; Tab/Shift-Tab adjusts the level in the editor; rendered indent = `5 + level × 5` ch. Serializer/parser round-trips the level (e.g. Fountain `~` lyrics with leading tabs/spaces).

- [ ] 🆕 **Hanging indent for wrapped lyric lines**
  Guideline: long lyric lines get a 0.5" hanging indent on wrap.
  Current: wrapped lyric lines align to the block's left edge.
  Proposed: CSS-only — `padding-left: +5ch; text-indent: -5ch` on lyric blocks (added to the per-block vars in [cssVars.ts](../packages/editor/src/editor/editorSettings/cssVars.ts)). Also apply in print/PDF export.

- [ ] 🆕 **Song cue — bolded title as the last thing before the lyric**
  Guideline: the song title (with its number) appears bolded at the end of a stage direction immediately before the lyric page, preceded by some non-bolded direction text ("HE smiles. **6. Bite the Apple.**").
  Current: no song/musical-number concept; lyrics blocks are free-floating.
  Proposed: introduce a lightweight "song" entity (number + title) or a `songCue` inline mark/block: a stage-direction block whose trailing song-title span renders bold. Minimal version: a "Song cue" toggle on an action block that bolds its trailing `N. Title.` segment; fuller version ties into a future musical-numbers table for the score side.

## 7. Multiple characters singing

- [ ] 🔧 **Multi-character separator — "/" instead of "+"**
  Guideline: simultaneous singers are joined with `/` on the character line (`THEODORE/GINGER`), with `and` + a second line when the list is long.
  Current: the delimiter is `+` ([characterNames.ts](../packages/script/src/fountain/characterNames.ts) — `CharacterDelimiter = '+' | ' + '`, splitter checks `char === '+'`, joiner emits `+`).
  Proposed: switch the canonical delimiter to `/`: update `splitCharacterTokens`, the join helper, character suggestions, rename logic, and the Fountain serializer/parser. Accept both `+` and `/` on input (and in import) for backwards compatibility; normalize to `/` on write. Note `/` cannot appear inside parenthetical extensions — the existing paren-depth guard in the splitter already covers that.

- [x] ✅ **Alternating solo/unison lines**
  Guideline: mark each solo with its own character line; unison lines use the combined `NAME/NAME` line.
  Current: already expressible with separate character + lyric blocks; works once the `/` separator lands. No extra work beyond the item above.

- [ ] 🆕 **Simultaneous different lyrics — side-by-side columns**
  Guideline: when characters sing different words at the same time, lay the parts out side by side (tables; 0.3" hanging indent and 10 pt font allowed to help wrapping). The "(simultaneous with X, above)" note is explicitly called a poor fallback.
  Current: no column layout in the editor — but the DB schema is already prepared: `script_blocks.column_group_id` / `column_index` exist ([schema.ts:209-210](../packages/db/src/schema.ts)) and the block extractor walks column groups.
  Proposed: implement the editor surface for column groups: a two-column container node that pairs character+lyrics stacks, rendered side by side, serialized through the existing `column_group_id`/`column_index` columns. Pagination must treat a column group as one unsplittable (or row-wise splittable) unit. Until then, do not promote the "(simultaneous with…)" workaround in UI copy.

## 8. Out of scope for the editor (noted for later)

- **Underscoring & score integration** (page 16): cue-per-page, "singer never flips backwards", dialogue duplicated into the score, segue/attacca markers — these concern the score document. Relevant to Stagistic only when a score/export module exists; the script-side rule it implies is to place underscored dialogue *before* the lyric/cue that follows it, which the current block order already allows.
- **Double-sided collated script/score with running page numbers** (page 13): an export/print concern — when PDF export lands, support a running page number at the bottom in addition to the act-scene-page header.
- **No copyright notices** (page 13): nothing to implement — just avoid adding a copyright field to generated cover pages.
