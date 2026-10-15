---
title: Choose where music plays
description: Set a musical ending, move it to another block or return to an automatic ending.
---

You want `Time to go` to accompany Robin's lyrics and Alex's spoken interruption, then finish when `The last note fades.`

## Understand the automatic ending

A placed number starts at its music pill. Without an explicit ending, its span ends at the next continuing music start, the next Scene or Act boundary, or the end of the script.

The rail beside the script shows its span and ending. Adding another number or moving a scene can change an automatic ending, so check the result when you rearrange material.

## End music after a chosen block

1. Place the cursor in a block after the music start where you want the number to finish.
2. Open the <span aria-hidden="true">•••</span> **Music actions** control beside the rail.
3. Choose **Place music end here**.

The number now ends after that block. The action is available on a block the current music passes through; a block with a start or end marker instead opens actions for that marker.

You can also open <img class="kb-editor-icon" src="/icons/editor/block-actions.svg" alt="" aria-hidden="true" /> **Block actions** and use **Music → Set music end** when offered. That label includes the number of the music being ended.

## Place the ending from the keyboard

Place the cursor in the script text of a block after the music's start where an ending can be placed, then use:

- **macOS:** <kbd><span aria-hidden="true">⌘</span> Command</kbd> + <kbd><span aria-hidden="true">⇧</span> Shift</kbd> + <kbd>O</kbd>.
- **Windows/Linux:** <kbd>Ctrl</kbd> + <kbd><span aria-hidden="true">⇧</span> Shift</kbd> + <kbd>O</kbd>.

This sets the ending after that block. Use the script text rather than the music-title field when pressing the shortcut.

## Move an ending

Press and hold the ending marker on the rail until eligible positions appear, then drag it to the block you want. Release it to place the ending there.

The destination must be after the music's start, within the same scene, and no later than the next continuing music start. Scene and Act headings are not drop targets. Moving an ending makes it explicit, even if its previous position was automatic.

This moves the ending, while leaving the start where it is. For another starting location, [unassign and place the number again](/editor/music/remove/#unassign-a-number-for-reuse).

## Return to an automatic ending

Click an explicitly placed ending marker and choose **Reset music end**, when offered. The explicit end is removed and the span again follows the next music or structural boundary.

The reset action is hidden at the last block, immediately before a Scene or Act heading, or immediately before another continuing music start. In those positions, returning to the automatic ending would not extend the span farther.

Resetting an end keeps the number in the script. To remove its placement, use [Unassign music](/editor/music/remove/).

An ending marker without a corresponding musical span can appear in imported or edited material. Its rail menu offers **Remove stray end** to remove that marker.

## Recognize a short musical accent

An imported script can contain a short accent such as `Door sting`. It marks one block rather than a continuing span, and does not stop other music already playing through that point.

## Related tasks

- [Find the start and effective end of a number](/editor/music/navigate/).
- [Write a spoken line within a musical span](/editor/music/lyrics/).
