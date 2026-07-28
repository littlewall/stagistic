# Music pill editor regressions

## Scope

Fix five stage-direction behaviors without changing the stored script document
schema:

1. A music start pill wrapped onto a new visual line must open its menu above
   that line, not above the preceding line.
2. Selecting stage-direction content must visibly include the complete music
   start pill, including its derived number and title.
3. Copying stage-direction content must not reproduce music nodes when pasted.
4. Assigning catalog music in the editor must move it out of the sidebar's
   Unassigned section immediately.
5. A stage direction containing a music pill is not empty for Enter handling.

## Wrapped pill menu

The start-pill menu will pilot the native
[Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) with
`popover="auto"`. The browser top layer will provide light dismiss, Escape
handling, and single-auto-popover exclusivity.

The visual pill body containing the rendered number and title will receive a
unique CSS anchor. The popover will use
[CSS Anchor Positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Anchor_positioning)
to appear above that anchor. The outer inline node-view wrapper may still
contain collapsible spacing for document layout, but that spacing will not
participate in menu positioning.

React state will mirror native popover toggle events so the pill's active visual
state remains correct after light dismiss or Escape. This pilot applies only to
the `musicStart` action menu; existing tooltips and other application menus are
out of scope.

## Selection behavior

The complete visible start pill—derived number and title—will participate in the
browser's selection highlight when a ProseMirror selection covers its atom.
Selection remains text-like for presentation while the editor continues to
model the pill as one structural atom.

The structural `musicOut` node remains zero-width and has no selection text or
highlight.

## Clipboard behavior

The editor will transform copied ProseMirror slices without mutating the source
document:

- `musicStart` becomes ordinary bold text matching the pill's visible label:
  its current formatted number followed by its title.
- `musicOut` is omitted because it has no visual text representation.
- Text, formatting, and character-tag marks remain intact.

The transformed representation is used for both internal and external clipboard
consumers. Pasting back into Stagistic therefore produces bold text, never a new
music start or out node.

## Sidebar assignment behavior

The Music sidebar will treat the editor's live music projection as the immediate
source of assignment state. Catalog assignment metadata remains the fallback
before the live editor projection is available.

This keeps the sidebar consistent with the document transaction that inserted
the selected music. Persistence may update later without leaving the row in the
Unassigned section until refresh.

## Enter behavior

Empty-block detection will distinguish whitespace-only text from semantic inline
content. A block is empty only when it contains neither non-whitespace text nor
a non-text inline node.

A stage direction containing only a music pill therefore follows its configured
normal Enter transition on the first keypress. The empty-block type chooser does
not open.

## Tests

Regression coverage will verify:

- A wrapped music start opens its native popover relative to the pill's visual
  line rather than the preceding line.
- The native popover closes through Escape and light dismiss without leaving the
  pill visually active.
- A selection covering stage-direction content visibly includes both the music
  number and title.
- Copy/paste converts a music start to bold text, omits a music out, preserves a
  character tag, and inserts no music nodes.
- Live editor assignment moves an otherwise-unassigned catalog row into the
  assigned sidebar section immediately.
- One Enter on a stage direction containing only a music pill creates the
  configured next block and leaves the empty-block chooser closed.

No database schema, stored `ScriptDocument` shape, or document schema version
changes are required.
