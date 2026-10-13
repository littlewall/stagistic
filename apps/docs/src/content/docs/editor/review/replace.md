---
title: Replace text
description: Try a new wording in one occurrence or replace all matches within your search scope.
---

Change Alex's `Wait for me.` to `Give me a moment.`. Start by [finding the original phrase](/editor/review/find/) and checking the highlighted result.

## Replace the current result

1. Enter `Wait for me.` in **Search script**.
2. Use the search-result arrows to highlight the occurrence you want.
3. Use the leading <img class="kb-editor-icon" src="/icons/editor/next-result.svg" alt="" aria-hidden="true" /> **Show replace** control to open the second row.
4. Enter `Give me a moment.` in **Replace with**.
5. Use <img class="kb-editor-icon" src="/icons/editor/replace.svg" alt="" aria-hidden="true" /> **Replace**.

The current occurrence changes. Search results update, ready for you to inspect another match.

## Replace all matching text

For a wider wording change:

1. Search for `a moment`.
2. If you only want spoken text, set **Search filter → Search in → Dialogue**.
3. Check the result count and sample matches.
4. Enter `a little longer` in Replace with.
5. Use <img class="kb-editor-icon" src="/icons/editor/replace-all.svg" alt="" aria-hidden="true" /> **Replace all**.

All current matches in the search scope change. Block-type filters, Match case and Match whole word apply to replacement too.

Leaving Replace with empty removes the matched words. It does not delete the whole script block. Inline music pills stay separate from the text being searched and replaced.

For linked character or music names, use [Manage characters](/editor/characters/manage/) or [Manage musical numbers](/editor/music/manage/).

## Use the keyboard in the correct field

With the cursor in the script, open replacement using:

- **macOS:** <kbd><span aria-hidden="true">⌘</span> Command</kbd> + <kbd><span aria-hidden="true">⌥</span> Option</kbd> + <kbd>F</kbd>.
- **Windows/Linux:** <kbd>Ctrl</kbd> + <kbd>H</kbd>.

While **Replace with** is focused:

- <kbd><span aria-hidden="true">⏎</span> Enter</kbd> replaces the current result.
- <kbd><span aria-hidden="true">⌘</span> Command</kbd> + <kbd><span aria-hidden="true">⏎</span> Enter</kbd> on macOS, or <kbd>Ctrl</kbd> + <kbd><span aria-hidden="true">⏎</span> Enter</kbd> on Windows/Linux, replaces all results.
- <kbd>Esc</kbd> hides the replacement row and returns focus to the search field.

In the search field, Enter navigates results instead of replacing them.

## Return to the previous wording

Use [Undo](/editor/review/history/) in the editor toolbar to reverse a replacement. Hide the replacement row with **Hide replace** when you want to return to finding text.

## Related tasks

- [Reset a block-type search filter](/editor/review/find/#return-to-all-blocks).
- [Add a comment about the new line](/editor/review/comment/).
