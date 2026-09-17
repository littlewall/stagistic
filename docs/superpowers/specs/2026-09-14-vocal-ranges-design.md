# Vocal Ranges Design

## Goal

Add a per-character **vocal range** attribute (voice type + a low and high sung
pitch) and a new **Vocal Ranges** initial page that renders each character's
range on a musical staff, as in the reference layout: the character name with an
optional voice-type parenthesis on the left, and a single staff on the right with
an automatically chosen clef, two whole notes (low on the left, high on the
right) joined by a thin line, plus accidentals and ledger lines where needed.

Two surfaces change:

- **Attribute Manager** — the character detail gains a "Vocal range" section: a
  voice-type text input with autocomplete, and a compact, click-to-edit staff
  widget for picking the low and high notes.
- **Export** — a new initial page type `vocal-ranges`, toggled in the Initial
  Pages settings, drawn as vector graphics in the PDF.

This is character metadata plus export layout. `SCRIPT_DOCUMENT_SCHEMA_VERSION`
does not change — vocal range lives in the character catalog (`scriptCharacters`),
not in the document.

## Terminology

- **Pitch:** a sung note, stored in scientific pitch notation (SPN) — a letter
  `C`–`B`, an optional accidental `#`/`b`, and an octave number, e.g. `F#3`,
  `Bb2`, `C4` (`C4` = middle C).
- **Vocal range:** the pair (`low`, `high`). Considered **set** only when both
  pitches are present.
- **Voice type:** free-text label (e.g. `tenor`, `light baritone`). Independent
  of the range — may be present on its own, absent, or alongside a range.
- **Clef:** one of two rendered clefs — `treble` (G clef) or `treble-8vb` (G clef
  with an `8` below, sounding an octave lower). Chosen automatically per character.
- **Staff position:** a note's vertical placement, measured in half staff-spaces
  from the staff's bottom line, derived from its diatonic step under a clef.
- **Vocal Ranges page:** an initial page of type `vocal-ranges`. One logical page
  that may overflow onto further physical pages.

## Decisions

Settled during brainstorming; not open in implementation:

1. **Storage is SPN strings, not MIDI.** Enharmonic spelling (`F#` vs `Gb`) is the
   user's choice and must be preserved for display. MIDI is derived only for
   comparison, ordering, and clef selection.
2. **Vector rendering, no runtime music font.** The staff, noteheads, ledger
   lines, and connecting line are plain vector primitives. The two clefs use the
   official Bravura SMuFL `gClef` and `gClef8vb` outlines as shared SVG path data;
   the font itself is not embedded or loaded at runtime. Accidentals remain small
   shared vector paths.
3. **Two clefs only: `treble` and `treble-8vb`,** matching the reference. No bass
   or alto clef.
4. **Vocal range is for characters only,** not character groups.
5. **Voice-type autocomplete is a fixed English list;** the field still accepts
   any free text.
6. **The page defaults on but self-suppresses** when no character has a set range,
   which realises "default on when at least one character has a range".
7. **Page ordering reuses the existing `characterOrder`** (name / first-appearance)
   from the Characters page — one ordering concept, no new control.

## Shared pitch module — `@stagistic/script/pitch`

Both `@stagistic/ui` (widget) and `@stagistic/export` (PDF) already depend on
`@stagistic/script`. The pitch/staff/clef math is pure and belongs there, in a new
`packages/script/src/pitch/` submodule, exported from the package index. It is kept
separate from the existing `music/` submodule, which concerns musical numbers/songs,
not pitch.

```ts
export interface Pitch {
    step: 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B',
    alter: -1 | 0 | 1, // flat / natural / sharp
    octave: number,
}

export type Clef = 'treble' | 'treble-8vb';

// SPN, e.g. "F#3", "Bb2", "C4". Returns null on malformed input.
export const parsePitch: (spn: string) => Pitch | null;
export const formatPitch: (pitch: Pitch) => string;

// Semitone number for comparison/ordering/clef math (C4 = 60). Spelling-aware.
export const pitchToMidi: (pitch: Pitch) => number;

// Clef whose comfortable centre is nearer the range midpoint.
// treble centre ~ B4 (71), treble-8vb centre ~ B3 (59).
export const pickClef: (low: Pitch, high: Pitch) => Clef;

// Half staff-spaces from the bottom staff line (E4 line = 0 for treble).
// For treble-8vb, placement uses the pitch one octave higher than it sounds,
// so the notated glyph sits on the same lines as treble.
export const staffPosition: (pitch: Pitch, clef: Clef) => number;
```

**Clef algorithm.** `mid = (pitchToMidi(low) + pitchToMidi(high)) / 2`. Choose
`treble` when `|mid - 71| <= |mid - 59|`, else `treble-8vb`. Deterministic; a
soprano's high-centred range picks `treble`, a tenor/baritone's low-centred range
picks `treble-8vb`, matching the reference.

**Staff/ledger geometry.** The 5 staff lines occupy positions `0,2,4,6,8`
(bottom to top). A note at an odd position sits in a space; even positions sit on
a line. Ledger lines are drawn at every even position below `0` or above `8` that
the notehead reaches or crosses. Accidental glyphs are placed immediately left of
the notehead when `alter !== 0`.

## Data model

Three new nullable columns on `scriptCharacters` (`packages/db/src/schema.ts`):

- `voice_type` — `text('voice_type')`
- `vocal_range_low` — `text('vocal_range_low')` (SPN)
- `vocal_range_high` — `text('vocal_range_high')` (SPN)

A **hand-written** migration adds the columns (drizzle-kit generate is drifted in
this repo). Downstream updates:

- `ScriptCharacterRef` (`packages/db/src/types/characters.ts`) gains
  `voiceType: string | null`, `vocalRangeLow: string | null`,
  `vocalRangeHigh: string | null`.
- Read/write queries (`packages/db/src/queries/scripts/characters/{read,write}.ts`)
  select and persist the three fields.
- Character payloads (`packages/db/src/queries/scripts/payloads.ts`) and the
  script-duplicate path carry them over.
- Persistence follows the same flush path as `outline` (content/settings autosave;
  see the pglite-synctofs note) — no new sync plumbing.

Invalid or partial values are tolerated at the data layer. The editor displays
and edits a partial range; export requires both pitches and suppresses incomplete
entries.

## Attribute Manager widget

`AttributeManagerCharacterDetail.tsx` (`packages/ui/src/dialogs/`) gains a "Vocal
range" `<section>` under Outline, wired like `onSetCharacterOutline`:

- New props `onSetCharacterVoiceType(characterId, voiceType | null)` and
  `onSetCharacterVocalRange(characterId, low | null, high | null)`, threaded up
  through the characters panel and context the same way outline is.

**Voice type field.** Text input with an autocomplete/combobox listing the fixed
English types (`soprano`, `mezzo-soprano`, `alto`, `contralto`, `countertenor`,
`tenor`, `baritone`, `bass`, and common qualifiers such as `light baritone`).
Free text is accepted and stored verbatim; empty clears to `null`. Built on the
existing `react-aria-components` combobox primitives already in `ui`.

**Range widget.** A new `packages/ui` component rendering a compact inline-SVG
staff:

- A character without a stored range displays an unpersisted default of `C3`–`A4`.
  Opening the editor does not write data. The first drag or footer action persists
  both endpoints, including the unchanged default endpoint.
- A two-column header shows **Low** and **High** values in bold. Clicking a header
  value or rendered note selects which endpoint subsequent actions edit.
- The five staff lines span behind the clef. The clef is derived automatically
  from a complete or partial committed range and uses either Bravura `gClef` or
  `gClef8vb`. It stays stable during a drag so the note cannot jump beneath the
  pointer, then recomputes when the parent supplies the committed range.
- Each note is moved by direct vertical drag and snaps to the nearest line or
  space. A short movement threshold distinguishes dragging from selection, so a
  click or small pointer jitter never changes pitch. Empty-staff clicks do not
  move notes. Dragging shows a live preview,
  captures the pointer outside the note, and persists exactly once on pointer
  release; cancellation discards the preview. The drag range includes two dynamic
  ledger lines below and above the staff. The visible noteheads are deliberately
  small while retaining large transparent pointer targets; ledger lines render
  above the interaction halo. Notes use a compact hover indicator and a custom
  keyboard-only `:focus-visible` indicator, never the browser's pointer-focus
  outline.
- A footer appears only after selecting Low or High. It contains explicit
  `Octave down` / `Octave up` actions, which move the selected note by one octave,
  and mutually exclusive `Flat` / `Sharp` pressed buttons. Pressing the active
  accidental again returns the pitch to natural. The footer does not repeat the
  selected pitch value.
- Every editing path preserves `low ≤ high` by sounding pitch, including
  accidentals. Dragging clamps at the other endpoint; octave and accidental
  actions that would invert the range are disabled and ignored.
- A clear affordance resets to the empty ("not set") state.
- **Compact first:** the section is laid out to occupy minimal vertical space —
  voice type and staff read as one tight block, controls inline, not a tall stack.
  Compact means dense and legible, not shrunken to unusable.
- Consumes the shared `@stagistic/script/pitch` helpers for position/clef; shares
  the SVG path constants for clefs and accidentals with the export renderer.

## Export

### Settings

`InitialPagesModule.tsx` gains a "Vocal ranges" toggle row alongside Characters,
Places, and Contents. The value shape in `@stagistic/export` config gains a
`vocalRanges: { enabled: boolean }` block (default `enabled: true`), merged and
defaulted like the other initial-page toggles.

### Plan

A new `InitialPagePlan` variant in `packages/export/src/plan.ts`:

```ts
export interface VocalRangesInitialPagePlan {
    kind: 'vocal-ranges',
    entries: Array<{
        id: string,
        displayName: string,
        voiceType: string | null,
        low: string,  // SPN
        high: string, // SPN
    }>,
}
```

Only characters with a **set** range (both pitches parse) become entries, ordered
by the shared `characterOrder`. When `entries` is empty the plan omits the page
entirely — this is the self-suppression that makes the default-on toggle behave
as "on when at least one character has a range". Collection mirrors
`collectInitialPageData` (voice type comes from the character catalog; range
pitches are validated via `parsePitch`).

### Rendering

Built alongside the other initial pages (`packages/export/src/initialPages/`),
producing page items the PDF layer draws. Because a staff is not text, the vocal
range rows extend the initial-page item model with a structured "staff row" item
(name/voice-type label on the left; a staff drawing spec on the right) rather than
forcing it through `VisualLine`/`VisualRun`.

`drawPdf` draws each staff with `pdf-lib` primitives — `drawLine` for the 5 staff
lines, ledger lines, and the connecting line; `drawEllipse` for whole-note heads;
`drawSvgPath` for the clef and accidental glyphs (the shared path constants). The
left label reuses the existing mono-font text drawing; the parenthesis appears
only when `voiceType` is non-empty.

## Testing

Per repo conventions (`vite-plus/test`, `*.browser.test.tsx` via `test:browser`,
PGlite for db, hand-written migrations):

- **pitch module** — unit tests: `parsePitch`/`formatPitch` round-trips incl.
  accidentals and edge octaves; `pitchToMidi` ordering; `pickClef` boundary cases
  (soprano→treble, tenor→treble-8vb, a range straddling the midpoint); ledger-line
  positions from `staffPosition`.
- **db** — read/write round-trip for the three fields; migration applies cleanly;
  duplicate carries them over.
- **export** — plan/derive tests: only set ranges become entries; empty entries
  suppress the page; ordering follows `characterOrder`; the parenthesis appears
  only with a voice type.
- **widget** — `*.browser.test.tsx`: defaults render without persistence; the first
  edit persists both endpoints; dragging previews without writing and commits once
  on release; cancellation writes nothing; pointer capture works outside the note;
  drag clamps to two ledger lines; accidentals survive a drag; accidental and
  octave buttons update the value; clearing resets to not-set; the clef label flips
  as the range moves.

## Out of scope

- Bass/alto clefs, key signatures, tessitura shading, multiple ranges per role.
- Vocal range on character groups.
- Any change to the document schema or to how ranges sync beyond the existing
  character-attribute persistence path.
