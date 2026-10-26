---
title: Undo and redo edits
description: Return to a previous wording or reapply an edit in the script.
---

You changed `Wait for me.` to `Give me a moment.` and want to compare it with the previous wording.

## Undo a script edit

Use <img class="kb-editor-icon" src="/icons/editor/undo.svg" alt="" aria-hidden="true" /> **Undo** in the editor toolbar. It reverses the latest available edit in the script's history, including a text replacement.

If Undo is disabled, there is no available edit to reverse in the current history.

## Redo an undone edit

Use <img class="kb-editor-icon" src="/icons/editor/redo.svg" alt="" aria-hidden="true" /> **Redo** to reapply an edit you just undid. If you start a new edit after undoing, the old redo path is replaced by that new work.

## Use the keyboard in the script

Place the cursor in the script text, then use:

| Action | macOS | Windows/Linux |
| --- | --- | --- |
| Undo | <kbd><span aria-hidden="true">⌘</span> Command</kbd> + <kbd>Z</kbd> | <kbd>Ctrl</kbd> + <kbd>Z</kbd> |
| Redo | <kbd><span aria-hidden="true">⌘</span> Command</kbd> + <kbd><span aria-hidden="true">⇧</span> Shift</kbd> + <kbd>Z</kbd> | <kbd>Ctrl</kbd> + <kbd>Y</kbd> |

If you are typing in a comment or another input field, return to the script before using these shortcuts to undo a script edit. The toolbar buttons act on the script editor directly.

## Restore an accidentally deleted comment

After deleting a whole comment thread, use **Undo** in the **Comment deleted** notification. That action restores the thread and its messages. See [Reply and resolve comments](/editor/review/threads/#delete-a-reply-or-a-whole-thread).

## Keep an earlier draft for later

The edit history belongs to the running editor; it is not saved as a permanent history of versions. Reloading the app starts a new editor history.

To keep the writing at a point you can revisit or restore, [save a draft or version](/editor/scripts/drafts-and-versions/). You keep writing in Current, and the saved writing stays fixed.

For a backup outside the browser, [download a `.stepkg` package](/editor/scripts/download/). To develop another script alongside the original, [create a separate working copy](/editor/scripts/copies/) or restore a saved draft as a new script.

## Related tasks

- [Try a single replacement before changing all matches](/editor/review/replace/).
- [Understand local saving](/editor/scripts/saving/).
