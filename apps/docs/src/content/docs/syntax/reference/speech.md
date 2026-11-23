---
title: Cues, dialogue and asides
description: Speaker forms, speech boundaries, shared cues and parenthetical delivery notes.
---

A cue identifies the speaker and enters speech context. The following nonempty lines are interpreted as their speech until a blank line ends that context.

```text
PETER
(from the doorway)
Sorry I'm late.

ANNA
It's fine. I was waiting.
```

This produces Character, Aside and Dialogue for Peter, then Character and Dialogue for Anna. The outer parentheses of an Aside are not part of its content.

## Cue forms

| Form outside speech | Interpretation |
| --- | --- |
| `PETER` | Uppercase cue |
| `@Peter` | Forced cue with its written casing |
| `"Mrs. Washington"` | Quoted cue |
| `ANNA / PETER` | Shared cue, names separated by `/` |
| `PETER (quietly)` | Cue followed by an Aside |

For uppercase recognition, the trimmed cue base must contain at least one letter and equal its uppercase form. The reader uses Unicode letter and case handling rather than an ASCII-only `A–Z` test. Pure numbers or punctuation do not establish an uppercase cue.

A forced unquoted cue name is a single token without whitespace, `.`, `/` or `@`. Use quoted names for spaces and punctuation. Shared cue names are split on `/` outside quoted literals; an optional `@` on a subsequent name is accepted.

`+` is not a shared-cue separator in this text grammar. The editor accepts `+` while typing and turns it into `/`; renaming one name of a shared cue keeps the `/` between the names. In a bare uppercase cue such as `ANNA + PETER`, the current reader leaves it in one decoded name. Do not substitute the editor's input conventions for the file rules.

Cue names are decoded as names, not parsed for inline emphasis. A trailing parenthetical suffix creates an Aside after the Character block.

## Inline cues

```text
JANE: I told you already.
```

A recognized cue prefix followed by a colon can introduce Dialogue on the same line. The text after it is Dialogue even when uppercase. Further lines resume the ordinary speech rules.

The reader looks for the first colon outside quotes, so a quoted cue name may contain a colon: `"CAPTAIN: JANE": Hello.` is the cue `CAPTAIN: JANE` followed by Dialogue. The writer quotes such names.

The reference writer normally emits the cue and its speech on separate lines. For `JANE: HELLO`, the Dialogue is uppercase, so the writer puts a `\` before it (`\HELLO`) and it is read back as Dialogue.

## Speech context and new speakers

Put a blank line before a new cue. Without it:

```text
PETER
ANNA
It's fine.
```

Here `ANNA` is a Lyrics line in Peter's speech, followed by Dialogue. It is not a new speaker. Prefixing a line with `@` while speech is active does not establish a new cue either; it is handled as inline speech text and can contain a character reference.

Whole trimmed parenthetical lines are Asides while speech is active. To write Dialogue that looks like that, put a backslash before the opening parenthesis: `\(softly)` is Dialogue with the text `(softly)`. Likewise `\!Look out` is Dialogue starting with `!`, and `\^caret` is Dialogue starting with `^`. The same parenthetical line outside speech is a Stage direction with its parentheses preserved.

## Action within a speech

```text
MICHAEL
Wait here.
!He pauses, listening.
I'll be back.
```

Column-one `!` creates a Stage direction without ending the speech. The next line can continue the same speaker. Unforced action-looking text here would be Dialogue or Lyrics.

For lyric lines and an empty continuation that retains the speaker, see [Music and lyrics](/syntax/reference/music/). For names containing quotes or backslashes, see [Quoted literals](/syntax/reference/text/#quoted-literals).
