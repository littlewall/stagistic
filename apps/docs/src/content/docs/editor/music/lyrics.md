---
title: Write lyrics and spoken lines
description: Write sung words, interrupt them with an aside and switch to a spoken reply.
---

Robin sings `The road is calling me.` during `Time to go`. Alex answers `Wait for me.` as a spoken line while the music continues.

## Write the first sung line

1. [Choose Robin as the speaker](/editor/characters/speakers/) in a **Character** block.
2. Press <kbd><span aria-hidden="true">⏎</span> Enter</kbd>. The default next type is **Dialogue**.
3. Open **Change block type** in the toolbar and choose **Lyrics**.
4. Write `The road is calling me.`

Lyrics gives the text its sung role. Placing a Song does not automatically turn the following Dialogue into Lyrics; choose the type for the words you are writing.

## Continue the lyrics

At the end of a nonempty Lyrics block, <kbd><span aria-hidden="true">⏎</span> Enter</kbd> creates another Lyrics block with the default writing flow. Write `Beyond the open door.`

Your [flow settings](/editor/writing/customize-flow/) can change the next type. At the end of a nonempty Lyrics block, <kbd><span aria-hidden="true">⇧</span> Shift</kbd> + <kbd><span aria-hidden="true">⏎</span> Enter</kbd> continues with Lyrics too.

## Add a note about the singing

1. After a sung line, create an empty Lyrics block.
2. Press <kbd><span aria-hidden="true">⇥</span> Tab</kbd> to change it to **Aside**.
3. Write `quietly`.
4. Press <kbd><span aria-hidden="true">⏎</span> Enter</kbd> at the end to resume Lyrics and write the next sung line.

Using an empty block puts the note between lines. Pressing <kbd><span aria-hidden="true">⇥</span> Tab</kbd> in a filled Lyrics block changes that whole block to Aside instead.

## Give Alex a spoken reply

1. After the final sung line, create another empty block.
2. If it is **Lyrics**, press <kbd><span aria-hidden="true">⏎</span> Enter</kbd> while it is empty. It becomes **Character**. If your flow gave another type, choose Character from the type menu.
3. Choose `Alex` as the speaker and press <kbd><span aria-hidden="true">⏎</span> Enter</kbd>.
4. Use **Dialogue** for `Wait for me.`; choose it from the type menu if your flow gives a different type.

For a spoken passage by the same speaker, choose Dialogue directly in the block for that passage. To sing again, choose Lyrics. On macOS, <kbd><span aria-hidden="true">⌥</span> Option</kbd> + <kbd><span aria-hidden="true">⇥</span> Tab</kbd> also switches directly between Dialogue and Lyrics.

Switching the text type does not end the music. [Choose its ending](/editor/music/range/) separately.

## Related tasks

- [Write for multiple speakers or a character group](/editor/characters/multiple-speakers/).
- [Understand the general writing flow](/editor/writing/flow/).
