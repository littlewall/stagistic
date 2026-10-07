---
title: Continue writing
description: Move to the next speaker, continue the same speech or split text at the cursor.
---

Where the cursor sits matters. At the end of a block, <kbd><span aria-hidden="true">⏎</span> Enter</kbd> continues the writing flow. In the middle of text, it splits the text at the cursor.

## Move to the next part of the script

1. Finish `We should go.` in a **Dialogue** block.
2. Press <kbd><span aria-hidden="true">⏎</span> Enter</kbd> at the end of the text.
3. With the default settings, the next block is **Character**. Enter `Alex`.
4. Press <kbd><span aria-hidden="true">⏎</span> Enter</kbd> and write `Give me a moment.` in the new Dialogue block.

These are the default transitions when you press <kbd><span aria-hidden="true">⏎</span> Enter</kbd> at the end of a nonempty block:

| Current type | Next type |
| --- | --- |
| Scene | Stage direction |
| Stage direction | Character |
| Character | Dialogue |
| Dialogue | Character |
| Aside | Dialogue |
| Lyrics | Lyrics |
| Notes | Stage direction |

To change these transitions, see [Customize your writing flow](/editor/writing/customize-flow/). The editor follows your next-block settings. An Aside within a sung passage resumes Lyrics.

## Continue the same speech

At the end of a nonempty Dialogue block, press <kbd><span aria-hidden="true">⇧</span> Shift</kbd> + <kbd><span aria-hidden="true">⏎</span> Enter</kbd>. The next block is also **Dialogue**, ready for another part of the same speaker's speech.

For example, continue `We should go.` with `Before they find us.` without adding another speaker name. This creates a separate Dialogue block; it is not a line break inside the existing block. In Lyrics, the same combination continues with another Lyrics block.

## Split text you have already written

Place the cursor between `Before they ` and `find us.` in a Dialogue block, then press <kbd><span aria-hidden="true">⏎</span> Enter</kbd>. The text after the cursor moves into another **Dialogue** block, and the cursor starts there.

This preserves the type when splitting ordinary writing blocks in the middle. A Scene heading is different: its trailing text moves into the configured next type, rather than becoming another scene heading.

If text is selected when you press <kbd><span aria-hidden="true">⏎</span> Enter</kbd>, the selection is replaced as part of the operation. Collapse the selection first when you want to keep all the text.

## Choose what to write in an empty block

In an empty **Scene**, **Stage direction** or **Character** block, press <kbd><span aria-hidden="true">⏎</span> Enter</kbd> to open the compact type chooser.

- Choose <img class="kb-editor-icon" src="/icons/editor/scene.svg" alt="" aria-hidden="true" /> **Scene**, <img class="kb-editor-icon" src="/icons/editor/stage-direction.svg" alt="" aria-hidden="true" /> **Stage direction** or <img class="kb-editor-icon" src="/icons/editor/character.svg" alt="" aria-hidden="true" /> **Character** to use that type for the empty block.
- From the keyboard, use <kbd><span aria-hidden="true">←</span> Arrow left</kbd> or <kbd><span aria-hidden="true">→</span> Arrow right</kbd> to select a different type, then <kbd><span aria-hidden="true">⏎</span> Enter</kbd> to apply it.
- Press <kbd>Esc</kbd> to close the chooser and keep the current block.

If you keep the current type selected and press <kbd><span aria-hidden="true">⏎</span> Enter</kbd> again, the editor inserts another empty block of that type. Clicking its current-type button instead closes the chooser without inserting a block.

An empty **Dialogue**, **Lyrics** or **Aside** block behaves differently: <kbd><span aria-hidden="true">⏎</span> Enter</kbd> changes it to **Character**, ready for another speaker. It does not open this chooser.

## Related tasks

- [Insert an Aside between parts of a speech](/editor/writing/dialogue/).
- [Choose a type directly from the toolbar](/editor/writing/blocks/).
