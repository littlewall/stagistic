# Comments — design

Date: 2026-09-23
Status: approved (brainstorm), pending implementation plan

## Goal

Private, non-printing comments anchored to a text selection or a whole block,
managed in a new **Comments** sidebar panel. Single user for alpha; data model
ready for collaborative comments later.

Named **Comments** (not Notes) to avoid confusion with the existing printed
`note` block type.

## Scope

In scope (alpha):
- Comment anchored to a text range or to a block.
- One-level thread per comment (root message + flat replies).
- Resolve (reversible) and Delete (destructive) as separate actions.
- Comments panel with two views: **Beside text** and **List**.
- Status filter: Open (default), Resolved, All.
- Comments travel in `.stepkg`.

Out of scope (phase 2, but architecture must allow):
- Full-text search and scene filter (`query`, `sceneId` in `CommentFilter`), applied to both views.
- Multi-user display (author names/avatars), permissions.

Non-goals:
- Comments in `.stagistic` export/import.
- Comments in PDF.
- Nested replies.

## UX

### Invocation

One action, **Add comment**. Anchor is decided by context:
- Text selected → range anchor.
- Caret only → block anchor (active block).

Entry points:
1. Shortcut `⌘⌥M`.
2. "Add comment" in the block gutter menu (the editor has no text right-click menu).
3. **Selection toolbar** — new floating toolbar shown on non-empty text selection,
   with two actions: **Comment** and **Copy**. Lives in the editor overlay layer
   (same family as block actions overlay); extensible for future actions.

After invoking:
- The Comments panel opens (on the side the user has configured; default right)
  with a draft thread focused.
- `⌘Enter` saves. `Esc` discards an empty/unsaved draft and returns focus to the script.

### Canvas indication

Canvas only indicates; all management happens in the panel.
- Range anchor: subtle dotted underline, Creamed Corn tone.
- Margin marker: a small saturated dot centred midway between the music rail and the
  scrollbar, vertically on the block's first text line (like the left gutter controls),
  beside every block that has ≥1 open thread (range or block anchor);
  shows a count when >1. It is the only canvas element that opens the panel and the
  only block-level indicator (no block-edge line). The dot gets a ring when its thread
  is active/hovered, and appears (ringed) on a block with an unsaved block draft.
- Resolved threads: no canvas indication.
- Click on underline:
  - panel open → highlight the thread;
  - panel closed → no action (does not interrupt writing).
- Click on margin marker → opens the panel (if closed) and highlights the thread.
- Hover on a thread card → highlights its anchor in the canvas.

### Panel: header

View switcher `Beside text | List` and status filter. Both views read one
shared `CommentFilter` state.

### Panel: Beside text (default)

- Shows open, anchored threads matching the filter.
- Each card is aligned to its anchor block's vertical position; the card layer
  scrolls in sync with the canvas.
- Collisions: cards stack in document order with a fixed gap. The active card
  snaps to its exact anchor position; others are pushed above/below it.
- 3+ threads on one block collapse into a single "N comments" card that expands in place.
- Resting card: first message clamped to 3 lines + reply count.
- Active card: full thread, reply field, **Resolve**, and `⋯` menu with **Edit** / **Delete**.

### Panel: List

- All threads matching the filter, in script order, grouped by scene.
- Trailing **Detached** section: threads whose anchor no longer exists; shows
  the quoted original text; actions Resolve and Delete.
- Click on a thread scrolls the canvas to its anchor.

### Thread

- Root message + flat replies.
- `authorId` stored on every message; not shown in UI while single-user.
- Editing own message allowed; shows "edited".
- Delete root → deletes the whole thread and its anchor; toast with **Undo**.
- Delete reply → deletes only that reply.
- Resolve → hidden from canvas and from the default (Open) filter; **Reopen** restores.

### Empty state

Single line: "No comments. Select text and press ⌘⌥M."

## Data model

### Document (`SCRIPT_DOCUMENT_SCHEMA_VERSION` 3 → 4)

Bump is required: a new mark type changes the stored `ScriptDocument` shape.

- **Range anchor** = mark `commentAnchor` with attrs `{threadId: string}`.
  - `excludes: ''` — anchors may overlap.
  - `inclusive: false` — typing at an edge does not extend the anchor.
  - Persisted through `script_blocks.content_json` like other marks.
- **Block anchor** is NOT a document attr. The DB projection persists only
  `id`/`blockType`/`characterRefs` block attrs, so a new attr would be lost on reload.
  Block anchors are `script_comment_threads.anchor_block_id` (block ids are stable via UniqueID).
  - Split: UniqueID keeps the id on the first half (moves it to the second half
    when the first half is empty, i.e. Enter at block start) — the anchor follows the id.
  - Merge: the editor reports `{fromBlockId, toBlockId}` when a block's content is
    joined into another; the host reassigns `anchor_block_id`.
- Paste: strip `commentAnchor` marks (copies never duplicate threads).
- Adding/removing an anchor via comment commands uses `addToHistory: false`
  (`⌘Z` after commenting does not remove the comment). Undo of a text edit that
  deleted anchored text restores the anchor as part of that edit.

### DB (new tables)

`script_comment_threads`
- `id` text PK
- `script_id` → `scripts.id`, on delete cascade
- `anchor_kind` text: `range` | `block`
- `anchor_block_id` text nullable (set for `block`; null for `range`)
- `quoted_text` text (anchored text, or the block text for `block`, at creation; used for Detached)
- `status` text: `open` | `resolved`, default `open`
- `resolved_at` bigint nullable
- `resolved_by` text nullable
- `created_by` text
- `created_at`, `updated_at` bigint

`script_comment_messages`
- `id` text PK
- `thread_id` → `script_comment_threads.id`, on delete cascade
- `author_id` text
- `body` text
- `created_at`, `updated_at` bigint
- `edited_at` bigint nullable

Indexes: threads by `script_id`; messages by `(thread_id, created_at)`.

Author/creator ids use the current local user id for alpha.

Repo handlers writing these tables must call `syncToFs` (local PGlite writes are
otherwise lost on refresh).

After schema change: `moon run db:db-compile-migrations`.

### Derived state (not stored)

- **Detached** = range thread whose `threadId` has no mark in the current document,
  or block thread whose `anchor_block_id` is not in the current document.
  Undo that restores the anchor re-attaches the thread automatically.
- **Order and position** come from the editor's anchor index.

### Draft lifecycle

- Nothing is persisted until first save. The draft range is held in the
  `comments` plugin state, mapped through transactions, rendered as a temporary highlight.
- Save creates thread + first message + anchor in one step.
- `Esc` discards the draft with no writes.

### Resolved threads

Anchor stays in the document; decorations skip resolved threads. Reopen shows them again.

## Export

- `.stepkg`: snapshot includes `script_comment_threads` and `script_comment_messages`;
  document carries anchors. Import restores both (ids remapped with the rest of the package).
- `.stagistic`: unchanged. Serializer only emits known marks; anchors are dropped.
- PDF: unchanged. `transcribeExportPlan` only reads `bold`/`italic`/`underline`/`characterTag`;
  anchors are ignored and equal-style segments still merge.

## Architecture

`packages/script`
- Mark constants + anchor collection helper; version bump to 4.

`packages/editor`
- `CommentAnchorMark` (Tiptap).
- `comments` plugin: decorations (underline, margin marker, draft highlight,
  active/hover highlight), anchor index (threadId → positions/blocks), draft state.
- Paste stripping; block-merge detection reported to the host.
- `SelectionToolbar` overlay (Comment, Copy).
- `addComment` command + `⌘⌥M` shortcut; gutter/context menu entries.
- Editor API exposing anchor index and events (marker click, underline click,
  scroll/position updates) to the host.

`packages/app-routes`
- `CommentsPanel` registered as a sidebar panel (`useEditorSidebars`).
- `BesideTextView`, `ListView`, `CommentThread`, shared `CommentFilter` state.
- Pure layout function for Beside text: input = anchor tops + card heights +
  active id; output = card tops (+ collapsed groups).

`packages/db`
- Schema, migrations, repo handlers, reactive queries for threads/messages.

`packages/stepkg`
- Snapshot schema + build/read entries for the two tables; id remap.

## Testing

Unit (`vite-plus/test`)
- Mark: overlap, non-inclusive edges, paste stripping; block split keeps id, merge reported.
- Anchor index + Detached derivation, incl. undo of deleted text re-attaching.
- Beside-text layout function: collision stacking, active card snap, 3+ collapse.
- Export: `.stagistic` and PDF output unchanged with anchors present.

DB (PGlite)
- Thread/message CRUD, resolve/reopen, cascade delete.
- `.stepkg` round-trip preserves threads and anchors.

Browser (`*.browser.test.tsx`)
- Selection → toolbar → Comment opens panel with draft.
- `⌘⌥M` with caret only creates a block comment.
- `Esc` discards draft with no writes.
- Underline click with panel closed does nothing; margin marker click opens panel.
- Beside/List switch; Open/Resolved filter.
- Layout asserts are relative (order, no overlap), not absolute pixels.
