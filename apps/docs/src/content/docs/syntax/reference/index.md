---
title: File model and interpretation
description: The file structure, ordered recognition rules and interoperability limits of Stagistic Syntax.
---

Read a `.stagistic` file as optional YAML frontmatter followed by a line-oriented script body. The body produces semantic blocks such as Scene, Character, Dialogue, Lyrics, Aside, Stage direction and Note.

```text
# A garden. Dusk.

PETER
Sorry I'm late.
```

This body contains a Scene, a Character cue and a Dialogue block. Frontmatter is optional; a body with no script blocks is rejected. Explicit headings are useful for structure but are not required for the reader to recognize a body block.

## Lines and whitespace

- The reader removes an initial Unicode BOM and normalizes CRLF and CR line endings to LF.
- A blank or whitespace-only line ends speech context and does not create a block.
- Each nonempty body line is interpreted separately. Adjacent speech lines are separate blocks, not one automatically joined paragraph.
- Line prefixes `!`, `#` and `##` are recognized from column one. Indenting them changes recognition.
- Case tests and parenthetical recognition use trimmed text. Leading literal tabs on lyric lines remain part of the text.

Before classifying body lines, the reader checks whether any raw line begins with `##` followed by whitespace. This selects the heading interpretation described in [Acts and scenes](/syntax/reference/structure/). Keep heading lines outside speech context.

## Recognition outside a speech

After handling an empty line, apply these rules in order:

| Order | Recognition | Result |
| --- | --- | --- |
| 1 | Column-one `!` | Forced Stage direction; parse the remaining text and music markers |
| 2 | Column-one `#` or `##` followed by whitespace | Act or Scene according to the file's heading mode |
| 3 | Trimmed line enclosed in `[[` and `]]` | Note |
| 4 | Trimmed line enclosed in parentheses | Parenthetical Stage direction |
| 5 | Recognizable cue prefix followed by a colon, subject to the quoted-name limitation | Character, optional cue Aside, then Dialogue; enter speech context |
| 6 | Recognizable cue line | Character and optional cue Aside; enter speech context |
| 7 | Anything else | Stage direction with inline text and music markers |

A cue may be uppercase, explicitly forced with `@`, or quoted. See [Cues, dialogue and asides](/syntax/reference/speech/) for the exact forms.

## Recognition inside a speech

A blank line leaves speech context. Otherwise:

| Order | Recognition | Result |
| --- | --- | --- |
| 1 | Trimmed line equal to `~` | One empty block of the last speech type; keep speech context |
| 2 | Column-one `!` | Stage direction; keep speech context |
| 3 | Trimmed line enclosed in parentheses | Aside; keep speech context |
| 4 | Line with letters equal to its uppercase form | Lyrics |
| 5 | Other text | Dialogue |

Consecutive `~` lines produce only one empty block. A new cue, heading or Note is not recognized by its usual outside-speech rule until speech context has ended. For example, an uppercase name on the next line can be lyric text belonging to the current speaker.

After block recognition, music markers are resolved into open musical units or Hits. This is a separate pass described in [Music and lyrics](/syntax/reference/music/).

## Writing and normalization

The reference writer emits YAML frontmatter, separates body sections with blank lines, groups speech under its cue and ends the file with LF. It can rewrite cue quoting, spaces around `/`, music numbers and inline-mark delimiters. Frontmatter dates can also be resolved at export time.

Treat this as a semantic text format, not a byte-preserving storage format. Names and music labels in the file are not persistent application IDs. Application settings, catalog details and attachments are outside this reference; portable-package handling is covered in [Editor file documentation](/editor/scripts/download/).

## Current interoperability limits

The current reader and writer are not a universal round-trip guarantee:

- An uppercase Dialogue line supplied through an inline cue can become Lyrics when the writer puts it on its own line. See [Inline cues](/syntax/reference/speech/#inline-cues).
- A colon inside a quoted cue name is not reliably protected during cue recognition. Some such names are mis-split and rejected; see [Inline cues](/syntax/reference/speech/#inline-cues).
- Ordinary text escapes are decoded by the reader, but the writer does not escape every literal emphasis character again. See [Escapes and re-export](/syntax/reference/text/#escapes-and-re-export).
- A Hit inside a continuing speech can be emitted with its end marker on the same forced line; re-reading that form resolves open-style markers instead of a Hit. See [Writer compatibility](/syntax/reference/music/#writer-compatibility).
- Quoting protects cue separators while reading, but decoded cue text can be retokenized on writing. Do not rely on a quoted literal `/` or `+` inside a speaker's name surviving that cycle as one name.

When implementing another reader or writer, verify block types, speaker boundaries, marks and music modes on representative files. Requiring only that both parses succeed will miss these changes.

## Errors and extensions

Malformed quoted literals, invalid frontmatter and inconsistent numbered open-music endings can produce errors. Some errors include the original one-based file line; metadata validation does not always provide a line.

Unknown frontmatter fields are rejected. Unrecognized body text can fall back to ordinary text, so it is not safe to invent new markers and assume that readers will reject them as unsupported. There is no version field in the supported frontmatter schema.

Continue with [Frontmatter](/syntax/reference/frontmatter/) or use the [complete example](/syntax/examples/).
