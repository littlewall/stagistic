---
title: Music and lyrics
description: Music starts and endings, Hit inference, lyric lines and soft breaks.
---

Music markers belong to Stage direction content. They use double `@@`; a single `@` belongs to cue or character-reference recognition.

## Open music and endings

```text
The lights slowly fade. @@music 1 "When Night Falls"

ANNA
WHEN NIGHT FALLS AND THE LIGHTS GO DOWN

The lights come up. @@out 1
```

`@@music N "title"` introduces a music start with a quoted title. An optional kind word may sit between the number and the title, as in `@@music 1 overture "When Night Falls"`; it starts with a letter and continues with letters, digits, `_` or `-`, and the writer emits it when the music has a kind. `@@out N` ends the currently tracked numbered music. A marker can follow ordinary action text on the same line.

`@@out` is a marker only when no letter or digit follows it directly: `@@outro` and `@@out2` are plain text (see [Escapes and re-export](/syntax/reference/text/#escapes-and-re-export)).

For interoperable output, generate distinct positive integer labels, preferably consecutive from `1`. The labels connect text markers; they are not persistent music IDs. Titles use the [quoted-literal rules](/syntax/reference/text/#quoted-literals).

The reference reader tracks one current open number, not a stack. A new open start replaces that tracked number. A Scene clears it. A numbered `@@out` must match the current open number, and is an error when no music is open; a bare `@@out` clears it without a number check and is also accepted without a current open unit.

Ordinary open declarations reject non-positive or unsafe integer numbers and a repeated open declaration number. Use explicit matching endings when generating files rather than depending on replacement of the tracked number. The older `@@cue` directive is rejected.

## Hits

```text
A bell rings. @@music 1 "Bell"

@@out 1
```

The reader recognizes a Hit when:

1. A parsed action block has exactly one music marker, a start at the end of its content.
2. The next parsed block contains only its matching numbered out marker.

Blank lines do not create blocks, so the pair can have blank lines between its source lines. The end block is consumed and the start is marked as a Hit. A Hit does not replace the tracked open musical unit.

Keep the standalone end line free of additional text or trailing spaces when relying on this inference. Putting the two directives on one line produces open-style start/end markers rather than a Hit.

The current Hit branch bypasses the normal open-declaration number checks. It can accept zero or reused Hit labels; interoperable writers should still use positive distinct numbers and should not rely on that permissive edge case.

## Music inside a speech

Use column-one `!` for music-bearing action while speech is active:

```text
@@music 1 "When Night Falls"

ANNA
WHEN NIGHT FALLS
!The lights come up. @@out 1
```

Without `!`, the common speech-line reader treats the ending line as Dialogue or Lyrics; it does not resolve music directives there. A bare `@@out` can be used when an unnumbered ending is intended.

A line `!@@out` that holds only the marker attaches it to the preceding block rather than becoming a separate action block. A stage direction that holds only an out is written as an empty `!` line followed by `!@@out`. Implementations should preserve its endpoint meaning, not assume one semantic action block for each marker-only line.

## Lyrics and tab levels

Within speech, a line containing letters that equals its uppercase form becomes Lyrics, and so does any line that starts with `^` (after its leading tabs). A line without either becomes Dialogue. To keep an uppercase line as Dialogue, put a `\` before it; the backslash is removed.

```text
ANNA
WHEN NIGHT FALLS AND THE LIGHTS GO DOWN
	AND I'LL BE STANDING HERE
```

The second lyric line begins with a literal tab, U+0009. Leading tabs provide lyric-section levels; the reference reader preserves them as a text prefix, and the writer retains that prefix. Spaces are not an equivalent tab-level marker. Lyrics in lowercase are written with a `^` after the tabs: `^la la la` is Lyrics with the text `la la la`.

Lyrics are recognized by speech context and casing, independently of whether an open music marker has been supplied.

## Soft breaks

```text
PETER
FIRST LINE OF THE SONG
SECOND LINE OF THE SONG
~
A LATER LINE
```

A line containing only `~` after trimming creates an empty Dialogue block without resetting the speaker, whatever the lines before it were. Every `~` line makes its own block; consecutive soft-break lines do not collapse. A Dialogue whose text is only `~` is written as `\~`.

A real blank line ends the speech instead. Outside speech, `~` is ordinary Stage direction text, not a soft break.

## Writer compatibility

The reference writer assigns fresh consecutive music numbers in document order. It always quotes music titles. A standalone Hit is written as a start followed by a separate matching out section.

For a Hit in an action that continues a speech, the out marker is written on its own forced `!@@out N` line, so the Hit mode survives a re-read.

Use the [complete example](/syntax/examples/) for an open musical passage in a full file.
