---
title: Customize your writing flow
description: Choose which block comes next and assign the number shortcuts that suit your writing.
---

You can change what happens after a completed block. For example, if you often write several parts of one speech, make **Dialogue** continue with another Dialogue instead of a new Character block.

These are settings for the current script. **Next element** changes how you continue writing; it does not convert blocks you have already written.

## Change what comes after Dialogue

1. In the app header, use <img class="kb-editor-icon" src="/icons/editor/settings.svg" alt="" aria-hidden="true" /> **Open script settings**.
2. In the settings sidebar, expand **Block settings** if it is collapsed, then choose **Dialogue**.
3. Under **Next element**, choose **Dialogue**.
4. Choose **Close settings** to return to the editor. Changes apply as you make them and are saved automatically.
5. At the end of `We should go.` in a Dialogue block, press <kbd><span aria-hidden="true">⏎</span> Enter</kbd>.
6. The new block is also Dialogue. Continue with `Before they find us.`

You can choose the next element for other block types from their own **Block settings** pages. The available choices are Stage direction, Character, Aside, Dialogue and Lyrics.

## When the next-element setting applies

The setting controls the normal transition from the **end of a nonempty block**. Other writing actions keep their own behavior:

- Splitting ordinary writing text in the middle preserves its type.
- At the end of a nonempty Dialogue or Lyrics block, <kbd><span aria-hidden="true">⇧</span> Shift</kbd> + <kbd><span aria-hidden="true">⏎</span> Enter</kbd> continues with the same type.
- Empty blocks have their own chooser or type change.
- An Aside within a sung passage resumes Lyrics.
- <kbd><span aria-hidden="true">⇥</span> Tab</kbd> retains its type-specific behavior: switching a speech block to or from Aside, or indenting a Stage direction.

See [Continue writing](/editor/writing/flow/) for cursor positions and empty blocks, and [Write dialogue and asides](/editor/writing/dialogue/) for inserting a note within a speech.

## Assign a different number shortcut

For example, use the number <kbd>6</kbd> to choose Dialogue instead of its default <kbd>5</kbd>:

1. Use <img class="kb-editor-icon" src="/icons/editor/settings.svg" alt="" aria-hidden="true" /> **Open script settings**, then choose **Block settings** → **Dialogue**.
2. Under **Shortcut**, choose `6`. Give each block type a different number.
3. Choose **Close settings**.
4. Place the cursor in a writing block and press <kbd><span aria-hidden="true">⌃</span> Control</kbd> + <kbd>6</kbd> on macOS, or <kbd>Alt</kbd> + <kbd>6</kbd> on Windows/Linux, to change it to Dialogue.

The editor toolbar's **Change block type** menu displays your current assignments. Changing this number does not change formatting shortcuts or the keys used to cycle through types.

## Return to the default flow

To restore only the Dialogue transition, open **Block settings** → **Dialogue** and set **Next element** back to **Character**. To restore only its number shortcut, set **Shortcut** back to `5`.

For all defaults of that type, use **Reset** at the top of the Dialogue settings page. This button appears when the type has custom settings. It also resets its appearance, spacing and number shortcut, so use the individual fields when you want to keep those other changes.

## Related tasks

- [Understand the default writing flow](/editor/writing/flow/).
- [Find keyboard shortcuts](/editor/writing/shortcuts/).
