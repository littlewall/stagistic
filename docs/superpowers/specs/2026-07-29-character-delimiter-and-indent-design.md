# Character Delimiter and Default Indent Design

## Goal

Make multi-character cue entry atomic and compact, and restore the default character cue position shown in the supplied reference.

## Scope

- In a `character` block, typing `/` after a character name and whitespace produces `NAME/` in one editor transaction.
- The legacy `+` input keeps producing the canonical `/` delimiter.
- Delimiters inside parentheses remain literal content.
- The default character block left indent changes from `30ch` to `20ch`.
- The default right indent remains `3ch`.
- Explicit per-script character indent overrides remain unchanged.

## Design

### Character delimiter input

The character input handler will build the prospective block text from the current selection and typed delimiter, normalize it with `normalizeCharacterEditorDelimiters`, and replace the block content once. The caret will be placed immediately after the canonical `/`.

This removes the current two-transaction sequence, which exposes an intermediate `NAME /` document state to editor plugins and subscribers before normalization.

### Default layout

`characterSpec.defaultSettings.indentLeftChars` will be `20`. With the default A4 page and margins, the element settings preview resolves to:

- Start: `3.50"`
- Content: `3.5" / 35 chars`
- End: `1.30"`

No color, typography, motion, or component API changes are included.

## Testing

- A unit regression test observes dispatched document states and requires only `ALEX/`, never an intermediate `ALEX /`.
- The test also verifies the final caret position after `/`.
- A default-settings test verifies the consumer-facing character layout values.
- Run editor and script package tests, typechecks, and lint for changed files.

## Non-goals

- Migrating explicit settings already stored in scripts.
- Changing the landing-page mini editor.
- Changing paste normalization or serialization formats.
