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

Quoting protects spaces and punctuation in names and allows escaped quotes in titles. Cue `/` separators are split outside quotes. Inline-cue colon recognition has a [quoted-name limitation](/syntax/reference/speech/#inline-cues); do not assume that quoting protects a colon in a cue name. After a quoted cue name, only the remaining recognized cue syntax is allowed; arbitrary suffix text is rejected.

The writer quotes names containing whitespace, `.`, `@`, `/`, `"` or `\`. It can also quote an inline reference to keep immediately following punctuation or text outside the name.

## References beside marks or punctuation

Bare reference names run to the next whitespace. Quote the name when an emphasis delimiter or punctuation must follow it directly:

```text
!**@"Peter"** turns away. @"Anna", wait.
```

This gives Peter a bold character reference and leaves the comma after Anna outside her reference. Bare `@Peter**` would absorb the asterisks into the reference text rather than reliably close the bold span.

## Escapes and re-export

In ordinary inline text, the reader decodes escapes only for `*`, `_` and `\`:

```text
!Use \*literal stars\* and \_literal underscores\_.
```

Other backslash pairs are not general escapes. For example, backslash before `@` does not guarantee a literal, unreferenced `@name`. A leading `!` controls block recognition; it is not a replacement for inline escaping.

The current writer does not re-escape every ordinary text run. Re-exporting the example above can expose the formerly literal delimiters, and re-reading can then produce emphasis. Preserve or regenerate the required escapes in an implementation that needs that distinction to survive.

For block-level collisions, see [Stage directions and notes](/syntax/reference/directions/). For YAML values, see [Frontmatter](/syntax/reference/frontmatter/).
