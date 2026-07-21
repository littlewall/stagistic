# Character highlight → underline

**Date:** 2026-07-07
**Status:** Approved design

## Problem

Character names in the editor render as **pills** (`.characterTag`: colored
background, border, horizontal padding). The padding + border add horizontal
width to every name, so a multi-character cue line (`TOMMY / REBECCA / MICHAEL`)
is ~16px-per-name wider in the editor than the same text in the PDF export's
plain-monospace model. The editor therefore wraps such lines earlier than the
export, and the two paginate differently.

The editor paginates by **measuring rendered DOM**; the export computes layout
**mathematically** on a fixed monospace grid (Courier Prime, 0.6em advance).
Any decoration that changes horizontal layout width fights that grid and forces
the export to approximate. Right/left indent, spacing, and page geometry are
already proven identical between the two; the pill padding is the remaining
structural divergence for character lines.

## Decision

Replace the character-highlight **pill** with an **underline** — a decoration
with **zero layout-width impact**. Character names then sit on the exact
monospace grid, so the editor wraps character lines identically to the export.
Parity is achieved by construction, with no export-side approximation.

This is the default (and, for now, only) highlight style. A future setting will
let users switch highlight intensity:

1. Underline (this design; default)
2. Name background fill
3. Name + spoken/sung text fill

Levels 2–3 are **out of scope** here; the architecture below makes them additive.

## Scope

**In scope**
- Switch `.characterTag` visual treatment from pill to underline, for both
  render paths (confirmed = mark, unconfirmed = decoration).
- Mode-ready architecture: a root `data-character-highlight` attribute + CSS
  scoped by mode. Value is a constant `"underline"` now.

**Out of scope**
- Settings schema field, persistence, and switcher UI (comes with the switcher).
- Fill / fill-text modes.
- `.characterSeparator` (unchanged — plain muted `/`).
- Music pills (`MusicPill.module.css .tagBody`) — they carry the same
  grid-shifting box padding and will need equivalent treatment later for music-label
  export parity. Tracked as a follow-up, not done here.

## Architecture (Approach 1: root data-attribute + mode-scoped CSS)

- **Root attribute.** `EditorShell` root `<div>` (already carries
  `data-character-tag-scope`) also renders `data-character-highlight`. Its value
  comes from a single default constant in the editor package
  (e.g. `DEFAULT_CHARACTER_HIGHLIGHT = 'underline'`), ready to be driven by a
  setting later. No settings-schema change now.

- **Shared class stays mode-agnostic.** `.characterTag` is emitted by both
  `CharacterTagMark` (confirmed characters) and `buildCharacterRuntime`
  decorations (unconfirmed tokens), configured with the same hashed module class
  from `CharacterTagDecorations.module.css`. Its base keeps only what is
  mode-independent: character color var, `text-transform: uppercase`,
  `white-space: nowrap`. It **drops** `background`, `border`, `padding`,
  `border-radius` — the grid-shifting properties.

- **Mode treatment is CSS, scoped by the root attribute.** In
  `CharacterTagDecorations.module.css`:
  ```css
  :global([data-character-highlight='underline']) .characterTag { … underline … }
  ```
  Adding a fill mode later is a new `:global([data-character-highlight='fill'])`
  block — **no JS, decoration, or mark changes**.

## Underline visual

- **Color:** underline uses the character color
  (`text-decoration-color: var(--character-tag-vivid-color)`). The **name text
  stays the normal script ink color** — only the underline carries color.
- **Confirmed** (`[data-character-id]`): `text-decoration-style: solid`.
- **Unconfirmed** (`:not([data-character-id])`): `text-decoration-style: dashed`.
  This mirrors the current solid-fill vs. outline semantic and the music
  open/hit (solid/dashed) convention.
- **Thickness / offset:** tuned during implementation (prefer existing design
  tokens); values chosen so the underline reads as a character marker, not plain
  text emphasis. Must not affect layout height/width.

## Export parity

With pills replaced by a zero-layout-width underline, editor character lines
occupy the exact monospace grid. The editor renders multi-character lines
tightly (`TOMMY/REBECCA/MICHAEL`, no spaces around slashes — the pill padding
that used to imply spacing is gone), so the export renders the block's raw text
verbatim to match, with **no space-insertion around slashes**. Editor and export
then wrap at the same points. Existing export tests remain green.

## Testing

- **Browser test (editor):** for a character block, assert the `.characterTag`
  computed style has `text-decoration-line: underline`, zero horizontal
  padding, and no border contribution (underline does not change layout).
  Assert confirmed → `solid`, unconfirmed → `dashed`
  `text-decoration-style`.
- **Regression (export):** existing `transcribeExportPlan` tests
  (cue transcription, `' / '` delimiter) stay green; no change expected.
- **Visual parity:** manual — user confirms editor page-1 block set matches the
  export for the sample script.

## Follow-ups (not in this change)

- Music pill (`.tagBody`) padding causes the same grid shift; give music pills an
  equivalent zero-layout treatment for long music-title export parity.
- Highlight-intensity setting: schema field + switcher UI + fill / fill-text
  mode CSS (levels 2–3).
