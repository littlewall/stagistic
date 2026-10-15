---
title: Find text in your script
description: Find a phrase, move between results and narrow the search to the text you need.
---

Find `Wait for me.` in the open script to return to Alex's reply.

## Find a phrase

1. Click **Search script** in the editor toolbar, shown as **Find in script…**.
2. Enter `Wait for me.`.
3. Read the result position and count beside the field. The current result is highlighted in the script.
4. Use <img class="kb-editor-icon" src="/icons/editor/next-result.svg" alt="" aria-hidden="true" /> **Next search result** or <img class="kb-editor-icon" src="/icons/editor/previous-result.svg" alt="" aria-hidden="true" /> **Previous search result** to move between matches.

If a result is inside a collapsed scene, the editor expands that scene so you can see it.

## Use the keyboard

With the cursor in the script, focus its search using:

- **macOS:** <kbd><span aria-hidden="true">⌘</span> Command</kbd> + <kbd>F</kbd>.
- **Windows/Linux:** <kbd>Ctrl</kbd> + <kbd>F</kbd>.

While the search field is focused, <kbd><span aria-hidden="true">⏎</span> Enter</kbd> moves to the next result. <kbd><span aria-hidden="true">⇧</span> Shift</kbd> + <kbd><span aria-hidden="true">⏎</span> Enter</kbd> moves to the previous one. Navigation wraps around the results.

The editor shortcut belongs to the script editing context. Place the cursor in the script first if you were typing in a comment or another settings field.

## Narrow the matches

The search options appear when the search control is active:

| Control | Use it when |
| --- | --- |
| <img class="kb-editor-icon" src="/icons/editor/match-case.svg" alt="" aria-hidden="true" /> Match case | You want the typed capitalization to match. For example, `Wait` and `wait` are different. |
| <img class="kb-editor-icon" src="/icons/editor/whole-word.svg" alt="" aria-hidden="true" /> Match whole word | You want `me` as a whole word, rather than the same letters within `moment`. |
| <img class="kb-editor-icon" src="/icons/editor/filter.svg" alt="" aria-hidden="true" /> Search filter | You want matches only in particular block types. |

In **Search filter**, use **Search in** to choose **Dialogue** when you only want spoken lines. You can choose several types. A dot on the filter control indicates a narrowed search.

## Return to all blocks

Open Search filter and choose **Reset**. The summary returns to **All blocks**. With no narrowed type selection, all block types are included.

Use <img class="kb-editor-icon" src="/icons/editor/clear.svg" alt="" aria-hidden="true" /> **Clear search** to remove the phrase and reset the case and whole-word options. The block-type filter stays in place until you reset it separately.

Music names inside pills are not ordinary text matches. Use [the Music list](/editor/music/navigate/) to find those numbers.

## Related tasks

- [Replace matching text](/editor/review/replace/).
- [Leave a note on the passage](/editor/review/comment/).
