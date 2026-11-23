---
title: Inline text and literals
description: Emphasis, quoted names and titles, supported escapes and re-export limits.
---

Inline text supports three emphasis marks. These rules are not a general Markdown implementation.

| Form | Meaning |
| --- | --- |
| `*text*` | Italic |
| `**text**` | Bold |
| `_text_` | Underline |

```text
!Use *italic*, **bold** and _underline_ in this note.
```

## Mark recognition

The reader checks `**` before `*`, then `_`. A matching marker toggles its active style; an opening marker requires a later occurrence of the same marker in that line. Styles can combine, and their state is local to the parsed inline string.

Unmatched markers can remain literal text. This is not a balanced-delimiter validator: overlapping marks are handled by the active-style toggles. For portable output, emit paired marks with clear boundaries.

The writer wraps underline inside italic inside bold when combining styles. For example, a run carrying all three can be emitted as `***_text_***`.

## Quoted literals

Names and music titles use double-quoted literals. Inside them, only these escapes are supported:

| Escape | Decoded character |
| --- | --- |
| `\"` | Double quote |
| `\\` | Backslash |

An unsupported escape such as `\n` or an unclosed literal is an error. These rules differ from YAML frontmatter string syntax.

```text
"Mrs. Washington"
We meet again.

The door opens. @@music 1 "She Said \"Yes\""
```

Quoting protects spaces and punctuation in names and allows escaped quotes in titles. Cue `/` separators are split outside quotes. A quoted cue name may contain a colon: an inline cue is split at the first colon outside quotes. After a quoted cue name, only the remaining recognized cue syntax is allowed; arbitrary suffix text is rejected.

The writer quotes names containing whitespace, `.`, `@`, `/`, `"` or `\`. It can also quote an inline reference to keep immediately following punctuation or text outside the name.

## References beside marks or punctuation

Bare reference names run to the next whitespace. Quote the name when an emphasis delimiter or punctuation must follow it directly:

```text
!**@"Peter"** turns away. @"Anna", wait.
```

This gives Peter a bold character reference and leaves the comma after Anna outside her reference. Bare `@Peter**` would absorb the asterisks into the reference text rather than reliably close the bold span.

## Escapes and re-export

In ordinary inline text, a backslash escapes `\`, `*`, `_`, `@`, `~`, `^`, `!`, `(` and any whitespace character; the escaped character is read as plain text. A backslash before any other character is a literal backslash.

```text
!Use \*literal stars\*, \_literal underscores\_ and mail jane\@example.com.
```

A leading `!` also controls block recognition; inside text, `\!` is the escape that keeps a literal `!`.

The writer escapes `\`, `*`, `_` and `@` wherever they are plain text, so exporting and reading a script gives back what was written. It also protects a few starts of line in Dialogue, where the first characters would otherwise change the block type: a leading `!` becomes `\!`, a leading `^` becomes `\^`, a Dialogue that is only `~` becomes `\~`, an all-uppercase Dialogue gets a leading `\`, and a Dialogue line that looks like an Aside, such as `(softly)`, gets `\(`. A reader of your own should decode these the same way.

An empty quoted name, `@""`, is not a character reference: it stays literal text.

### `@@out` and the text after it

`@@out` is a marker only when no letter or digit follows it directly. `@@outro` and `@@out2` are plain text. After a marker, the writer puts a backslash before a letter or digit that directly follows it (`@@out\ro`) and before a digit that follows a bare `@@out` and spaces (`@@out \7`), so the text is not read as part of the marker or as its number. The reader removes that backslash. An `@@out N` that does not match the open music is an error.

For block-level collisions, see [Stage directions and notes](/syntax/reference/directions/). For YAML values, see [Frontmatter](/syntax/reference/frontmatter/).
