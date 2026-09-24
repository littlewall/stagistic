# Comments — implementation progress

Plan: `docs/superpowers/plans/2026-09-23-comments.md`
Spec: `docs/superpowers/specs/2026-09-23-comments-design.md`

- [x] Task 1: Script — comment anchor constants and schema version
- [x] Task 2: DB — comment tables, migration, queries
- [x] Task 3: DB — repository handlers and reactive sources
- [x] Task 4: Package pipeline — comments in `.stepkg`
- [x] Task 5: app-core — comments store and hook
- [x] Task 6: Editor — `CommentAnchorMark` and paste stripping
- [x] Task 7: Editor — `CommentsExtension`
- [x] Task 8: Editor — host contract, hooks, gutter menu entry
- [x] Task 9: Editor — selection toolbar (Comment / Copy)
- [x] Task 10: Editor — margin markers
- [x] Task 11: app-routes — Beside layout and filtering
- [x] Task 12: UI — toast action, thread card, list view
- [x] Task 13: app-routes — Comments panel, Beside view, route wiring
- [x] Task 14: Final verification

## Rulings

- Setup: no worktree, no commits — work in place on `rewrite`; user commits (AGENTS.md golden rule). TODO.md is the ledger instead of `.superpowers/sdd/`.
- Task 2: fixed `documentProjection.test.ts` literal schemaVersion 3 → constant (fallout of Task 1 bump).
- Task 3: `root:typecheck` has pre-existing unrelated errors (CSS-module/`?url` decls, `import.meta.env.DEV`, characterSuggestions/model.test.ts) — verify via filtered output, not exit code.
- Task 4: `serializeSnapshot.test.ts` entry-list expectation extended with `data/comments.json` (intended new entry). Export-archive assertion for `data/comments.json` covered by serializeSnapshot + readStepkg round-trip tests instead of `exportScriptPackage.test.ts`.
- Task 4: `restoreScriptFromPackage` now deletes comment threads before rewriting (cascade removes messages); pinned in restorePackage.test.ts.
- Task 5: `useScriptComments` has no dedicated test; covered by Task 13 panel browser tests (as planned).
- Task 6: PDF-unchanged test (transcribeExportPlan) is a regression pin — passes without new code by design (export whitelists marks). Export tests run via `moon run root:test -- packages/export/...` (no project-level include).
- Task 7: shortcut test dispatches `metaKey` on mac / `ctrlKey` elsewhere (plan set both → no `Mod` match). Paste-strip test chains all `transformPasted` handlers (UniqueID also defines one), matching ProseMirror.
- Task 7: plugin uses a `commit` meta instead of a separate `commentsActivate` meta (same behaviour, one meta channel).
- Task 7: an empty block (size 0) joined away is not reported as merged → its block comment becomes Detached (undo restores). Cost if wrong: rare detached block comments on empty lines.
- Task 8: `CommentsExtension` takes `getCallbacks: () => callbacks` instead of `callbacksRef` — Tiptap `configure()` deep-merges plain-object options, which copied the ref and froze the first (empty) callbacks.
- Task 8: added `CommentIcon` (iconoir `ChatBubbleEmpty`) to `@stagistic/ui` for the gutter action.
- Task 8: "Add comment" is on every block's gutter menu, so the ⋮ trigger now shows on the first scene and after adding music. Updated tests to the new intent: first scene menu has no "Delete scene heading" (sceneActions); music test asserts the menu closes instead of the trigger vanishing; keyboard-nav test parks the pointer on "Music" (stale pointer hovered "Add comment").
- Task 8: PRE-EXISTING reds, not touched: `useEditorLifecycle.browser.test.tsx` (scene numbers "1." vs "1") and `MiniScriptEditor.browser.test.tsx` (dataset.sceneNumber "1." vs "1") — scene-number format, unrelated to comments.
- Task 9: toolbar uses existing `--bubble-menu-*` tokens; listens to `transaction`/`focus`/`blur` (selectionUpdate is a subset of transaction).
- Task 10: added `requestCommentsReveal()` command so the marker reuses the extension's host callback instead of threading a new prop through EditorShell/EditorCanvas.
- Task 10: `script:lint` fails on untouched `src/parsing/inline.ts:110` (no-useless-assignment) — pre-existing.
- Task 12: added `MoreActionsMenu` molecule to `@stagistic/ui` (app-routes has no react-aria dep for `MenuTrigger`); comment DB types re-exported through `@stagistic/app-core` (app-routes has no `@stagistic/db` dep); no `clsx` in app-routes → local `classNames`.
- Task 12: toast grid switched to auto-flow columns so the optional action button sits inline before the close button.
- Task 13: extracted `useCommentsEditorBridge` (thread refs + editor callbacks) so the route and the panel browser tests share the same wiring; panel tests use an in-memory `ScriptCommentsState` fake with the same contract.
- Task 13: `ScriptCommentsState` is an explicit interface in app-core (live-query rows carry TanStack virtual fields).
- Task 13: `useCommentAnchorTops` also reports the unsaved draft's top under `COMMENT_DRAFT_ANCHOR_KEY` so the Beside view aligns the draft card.
- Task 13: added `useEditorSidebars.browser.test.tsx` for `revealPanel` / `isPanelOpen` (not in plan).
- Task 13: PRE-EXISTING/unrelated reds: `ExportAccordion.browser.test.tsx` (export controls timeout, renders only ExportControlPanel); `useScriptEditorSettingsDraft` flaky (passes in isolation).
- Task 14: `root:format` NOT run — format-check flags 1186 files repo-wide (config drift); the commit hook formats staged files. Stylelint `--fix` applied to new CSS only; route CSS headers added.
- Task 14: `MoreActionsMenu` added to the dev catalog (tokens coverage test). Remaining coverage red `Checkbox` is pre-existing.
- Task 14: PRE-EXISTING/unrelated reds in root:test: `apps/landing/test/index.test.ts` (2), `apps/web/src/documentMetadata.test.ts` (build in beforeAll). root:lint: 73 errors, none in changed files.
- Task 14: `graphify update .` refused (new graph 0 nodes vs 8887) — not forced; needs a manual full re-extraction.
- Task 14: `web:build` OK; comment CSS (underline shorthand, bubble-menu tokens) present in built CSS.

## Final review (fresh reviewer, opus)

- Final: fixed Detached threads unreachable (couldn't be activated → no Resolve/Delete) — `a detached thread in List view can be activated, resolved and deleted` RED→GREEN.
- Final: fixed block merge lost when another plugin appends a doc change in the same step (e.g. CharacterRefSync) — `still reports a merge when another plugin appends a doc change to the same step` RED→GREEN.
- Final: minor (deferred): `duplicateScript` copies `commentAnchor` marks but not thread/message rows → duplicate has no comments and invisible orphan anchors.
- Final: minor (deferred): save/delete failures that throw (not return null) are unhandled → typed draft lost / anchor removed without toast.
- Final: minor (deferred): ⌘⌥M with no script block at the caret (node selection) returns false → macOS may insert `µ`.
- Final: minor (deferred): undo/redo of a merge doesn't re-sync `anchor_block_id` (redo leaves the block thread Detached).
- Final: minor (deferred): perf — comments plugin walks the doc and rebuilds decorations on every doc change, even with zero comments; markers overlay re-reads layout per change.
- Final: minor (deferred): Beside view blank (no empty line) when every visible thread is Detached; empty-state copy shows under Resolved filter; toast Undo after switching scripts targets the old editor.
- Final: fixed SelectionToolbarOverlay cleanup touching `editor.view.dom` of a destroyed editor (threw on editor replacement) — `pagination.browser.test.tsx > does not bring the initial loader back…` RED→GREEN; editor browser suite 236/238 (2 pre-existing scene-number reds).

## Tuning round 1 (user feedback)

- Removed the left block-edge line (`.blockActive` node decoration) for block anchors and block drafts; the margin dot is the only block indicator. Active/hovered thread → dot gets a ring (`data-active`); an unsaved block draft shows an active dot.
- Dot moved to the outer half of the gutter (`right: gutter / 2`, centred), clear of the music rail; single dot 6px, count badge 12px; colour `--state-selected-strong`.
