# Landing Mini-Editor Design

## Purpose

Replace the static editor preview in the landing-page hero with a constrained,
interactive excerpt of the real Stagistic editor. The demo should let a visitor
experience the editor's script typography, character workflow, inline
character tags, music presentation, and keyboard flow without exposing the
full application's document-management features.

The mini-editor is an editing surface, not a mock application window. The
entire existing preview rectangle becomes the script canvas. It has no header,
status, sidebar, toolbar, settings, or contextual menus.

## Chosen Approach

Add a dedicated `MiniScriptEditor` entry point to `@stagistic/editor`. It uses
the real editor's TipTap script nodes, block styling, character-tag input, and
suggestion UI, but builds a small extension profile with a fixed-document
contract.

This is preferable to embedding the full `ScriptEditor`, which would bring
pagination, autosave, lifecycle, settings, overlays, and commands that the
landing demo must hide. It is also preferable to a landing-only
`contenteditable` imitation, which would duplicate editor behavior and drift
from the application.

The Astro landing app renders `MiniScriptEditor` as a React island. Its state
exists only in memory for the lifetime of the page. No persistence API is
called and the UI does not explain or label this behavior.

## Fixed Document

The initial document is a landing-specific `ScriptDocument` constant copied
from the supplied screenshot of the bundled `One Small Light` example. It
contains exactly these top-level blocks in this order:

1. Scene — `Inside the lighthouse`
2. Stage direction — `An old brass lamp stands beneath the great lens.`
3. Character — `ELI`
4. Dialogue — `No oil. No flame.`
5. Character — `MARA`
6. Dialogue — `My father said this lamp once answered a song.`
7. Character — `ELI`
8. Aside — `skeptically`
9. Dialogue — `Of course it did.`
10. Character — `MARA`
11. Dialogue — `Tonight, we need to believe him.`
12. Stage direction — `Music starts to play.` followed by the locked
    `2) One Small Light` music pill

Every top-level block has a stable ID and type. The music pill has a stable ID
and remains inside the stage-direction block. The initial content can be
edited or emptied, but the fixed structural shell cannot change.

The fixture is already-materialized JSON. The Stagistic parser and the complete
example script are not shipped to the browser for this feature.

## Editing Contract

### Allowed

- Edit or clear inline content in every block.
- Type multiple characters in the Character block using `/`.
- Use the real Character-block suggestions.
- Type `@` in the Stage direction and use the real character-tag composition
  and suggestion flow.
- Edit the music pill's title.
- Indent and outdent the Stage direction with Tab and Shift+Tab.
- Insert a line break inside the current block with Shift+Enter.
- Scroll the canvas when content exceeds its fixed height.

The in-memory character roster is derived from the current document after
editor transactions. Character names typed into the fixed Character block
become available to the Stage-direction `@` suggestions. Existing character
tags remain part of the live character set. No persistent character records
are created.

### Fixed navigation

- Enter moves the caret to the end of the next fixed block and does not create
  or split a block. If that block ends with protected music, the caret stops
  before the music pill.
- Enter in the final block is consumed and does nothing.
- Backspace at the start of a block is consumed and cannot join it to the
  previous block.
- Delete at the end of a block is consumed and cannot join it to the next
  block.
- A destructive selection spanning structural boundaries is rejected rather
  than allowed to merge or remove blocks.

### Not available

- Adding, removing, reordering, joining, or changing the type of a block
- Removing or moving the music pill
- Block-type shortcuts or `Alt+Enter` block cycling
- Undo and redo
- Toolbar actions or text-formatting controls
- Block actions, music actions, menus, popovers, settings, pagination,
  autosave, or application persistence

## Structural Guard

Add a mini-editor-specific TipTap extension that owns both navigation and the
fixed-document invariant.

For every document-changing transaction, the extension verifies:

- the top-level block count is unchanged;
- block IDs, types, and order match the initial signature;
- the protected music node still exists with its original ID;
- the music node remains in its original Stage-direction block.

Transactions that violate this signature are rejected. Key handling consumes
Enter, boundary Backspace/Delete, and destructive cross-block operations before
ProseMirror can apply its normal split or join behavior. Shift+Enter inserts a
hard break without changing the top-level signature.

The guard is deliberately scoped to `MiniScriptEditor`; it does not change the
stored `ScriptDocument` shape or the behavior of the main editor.

## Component Boundaries

### `MiniScriptEditor`

Public component in `@stagistic/editor`. It owns the TipTap instance, fixed
structure signature, live in-memory character projection, and the scrollable
canvas.

Its minimal extension profile includes only the document/text primitives,
actual script block nodes and styles, character-tag mark and input behavior,
the locked music node view, character casing conventions, hard breaks, and the
mini-editor guard. It does not import
the full `Editor`, `EditorCanvas`, or editor shell.

### Locked music presentation

The mini profile uses the real music-pill visual treatment in a locked mode.
The title remains editable, but the node is not selectable or draggable and
does not activate a popover. Removal commands and controls are absent. The
structural guard is the final protection against native or cross-selection
deletion.

### `MiniBlockTypeIndicator`

Displays the existing icon for the active block in the same left-gutter
position as the main editor's block-type control. It is a visual indicator,
not a control:

- no click handler;
- no hover treatment or pointer cursor;
- no menu;
- no keyboard focus;
- hidden from the accessibility tree when the block already exposes its type
  semantically.

It follows the active block while the editor scrolls. The existing
`EditorBlockActionsOverlay` is not reused because it owns interactive menus.

### Character suggestions

Reuse the existing character suggestion models and view. Feed them from the
mini-editor's in-memory projection rather than the application editor's
persistent character store. Suggestion keyboard behavior remains unchanged:
arrow keys move the active option, Enter confirms it, and Escape closes the
overlay.

## Layout

The current hero preview rectangle becomes the mini-editor root. The landing
keeps its overall size, radius, border, shadow, positioning, and surrounding
hero composition, but removes all preview chrome and outline markup.

The root is a fixed-height scroll container. Its desktop width remains
`35rem`, while its `27.25rem` height fits the supplied excerpt plus the normal
bottom padding and about one extra text line. It does not preserve the full A4
height:

- `overflow-y: auto`;
- `overflow-x: hidden`;
- `scrollbar-gutter: stable`;
- contained overscroll so wheel/touch scrolling does not unexpectedly stretch
  the hero.

The editor does not simulate printable page margins. Horizontal space is:

```text
small edge | active-block icon | small gap | block content | small edge
```

The edge and icon gaps use responsive editor/landing spacing tokens, targeting
approximately 8–12 CSS px each. The indicator targets the actual compact block
control size, approximately 24–28 CSS px. The right side has only the small
edge padding.

The script uses the real default typography and block geometry:

- Courier Prime at `16px`;
- base and per-block line-height `1.2`;
- Scene spacing before `2em`;
- Stage direction and Character spacing before `1em`;
- Dialogue and Aside spacing before `0`;
- Character left indent `16ch`;
- Dialogue left/right indents `6ch` / `3ch`;
- Aside left/right indents `12ch` / `8ch`. These mini-editor-only indents
  accommodate the narrower landing preview.

Character-cue text uses `EditorRuntimeExtension` decorations and the real
palette CSS at the maximum supported character-color saturation. The treatment
must match the application character pills shown in the supplied screenshot.

The active block icon uses the real overlay anchor geometry: its center aligns
to the center of the block's first text line after adding computed
`padding-top`, regardless of spacing-before or line-height. It is only the SVG
icon, with no background, border, radius, or button-like container.

The mini profile also includes the main editor's music caret behavior. Clicking
in the trailing whitespace after the final music pill moves the caret before
the pill; typing therefore inserts text before the protected atom.

## Hydration

The mini-editor is above the fold, so the React island hydrates on page load.
The canvas does not render a separate static script fallback. Courier Prime and
IBM Plex Sans are bundled locally. The editor starts mounting immediately while
the hero uses two coordinated entrance tracks from `opacity: 0`. On the text
track, the title runs from `0s` to `.62s`, the description from `.34s` to
`.9s`, and the CTA from `.72s` to `1.2s`. On the preview track, the paper runs
from `.18s` to `.74s` and the editor content uses a separate opacity-only
animation from `.66s` to `1s`. The editor does not wait for a readiness signal.

## Accessibility

- The canvas retains the real editor's focus-visible treatment.
- The active block indicator is not focusable and does not pretend to be a
  disabled button.
- Character suggestions retain listbox/option keyboard semantics.
- The scroll container remains reachable and usable with keyboard and touch
  input.
- Fixed structural behavior must not trap Tab outside the defined
  Stage-direction indentation behavior.

## Testing

### Editor unit tests

- Accept inline edits while preserving the fixed signature.
- Reject block insertion, removal, type changes, joins, and reordering.
- Reject moving or deleting the protected music node.
- Consume Backspace at a block start and Delete at a block end.
- Reject destructive selections spanning block boundaries.
- Move Enter to the next fixed block and consume it in the final block.
- Insert a hard break with Shift+Enter.

### Editor browser tests

- Typing `ANNA / BORIS` updates the live character projection.
- Both names become available in Stage-direction `@` suggestions.
- Suggestion keyboard selection and confirmation work.
- The music title is editable but the pill has no menu and cannot be removed.
- The correct active-block icon appears, is not interactive, and follows its
  first text line while scrolling.
- Blocks with spacing-before and custom line-height keep the icon centered on
  their first text line.
- Clicking after the trailing music pill places the caret before it.
- Character cue names render with the maximum-saturation application palette.
- Long content produces an internal vertical scrollbar without growing the
  hero.

### Landing checks

- The mini-editor replaces the complete old preview, including its top bar and
  outline.
- No toolbar, sidebar, status, or context-menu trigger is rendered.
- The first visible editor frame uses final font metrics and does not reflow
  after hydration.
- Desktop and landing-page mobile layouts keep the canvas inside the viewport.
- Run the canonical focused editor browser tests, landing typecheck/build, and
  repository lint for touched files.

## Compatibility

This feature does not change the persisted `ScriptDocument` shape or semantics,
database schema, or document-to-projection behavior.
`SCRIPT_DOCUMENT_SCHEMA_VERSION` must not change.
