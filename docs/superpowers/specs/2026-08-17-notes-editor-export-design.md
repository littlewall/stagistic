# Notes editor and export design

## Goal

Make `note` blocks visibly use the Stagistic `[[ ... ]]` syntax in the editor,
print them by default, and let writers hide them from an export.

## Editor presentation

- Render `[[` before and `]]` after every `note` block.
- Render the delimiters as non-editable CSS-generated content, following the
  existing `aside` parenthesis pattern. They are not stored in the document,
  cannot be selected or deleted, and do not change serialized content.
- Keep the existing note layout settings. Change the note block default to
  italic.
- Empty note blocks still show both delimiter pairs around the caret position.

## Block type conversion

- When converting a block to `note`, remove one complete outer `[[ ... ]]`
  pair already present in the editable text. This prevents duplicated visual
  delimiters.
- Preserve text that has only an opening or closing delimiter, or whose outer
  delimiters do not form the complete pair.
- Apply the same normalization through single-block, selection-preserving, and
  multi-block type-change paths.
- Existing `aside` parenthesis normalization remains unchanged.
- Converting away from `note` needs no cleanup because generated delimiters are
  never stored in the document.

## Export

- Add `showNotes: boolean` to the shared Basic export configuration. Its default
  is `true`; Integrated Score inherits the same default and behavior.
- Add a compact `Content` module before `Page breaks`, containing a `Show notes`
  switch.
- When `showNotes` is false, remove `note` blocks from the document before
  pagination and PDF transcription. The remaining document is repaginated.
- The setting composes with character filtering and applies to both Basic and
  Integrated Score export templates.

## Landing syntax page

- Keep `[[ ... ]]` as the documented author-note syntax.
- Remove every claim that notes are never printed, including examples and the
  syntax reference label.

## Tests

- Editor command tests cover complete, incomplete, single-block, and bulk note
  delimiter normalization.
- Browser/CSS coverage verifies visible, generated note delimiters and italic
  default styling.
- Export tests verify `showNotes` defaults to true, preserves notes by default,
  removes them when disabled, and composes with pagination behavior.
- Export UI tests verify the switch label, default state, and emitted config.
- Existing parser and serializer tests continue to prove `[[ ... ]]` syntax
  round-trips without storing delimiters in the note content.

## Non-goals

- No broader export settings redesign.
- No stored document schema change and no
  `SCRIPT_DOCUMENT_SCHEMA_VERSION` bump.
- No database schema change.
