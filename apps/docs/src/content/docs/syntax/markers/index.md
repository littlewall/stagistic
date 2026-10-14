---
title: Marker reference
description: Look up a marker's meaning in its line, block or inline context.
---

Read the context column as part of each rule. The same visible text can be interpreted differently inside a speech and outside it.

| Marker or form | Context | Meaning | Details |
| --- | --- | --- | --- |
| `---` fences | Exact first line and matching closing line | YAML metadata | [Frontmatter](/syntax/reference/frontmatter/) |
| `# text` | Column one, outside speech | Scene without `##` in the body; Act when `##` is present | [Acts and scenes](/syntax/reference/structure/) |
| `## text` | Column one, outside speech | Scene; also selects the file's act/scene heading mode | [Acts and scenes](/syntax/reference/structure/) |
| Uppercase name | Outside speech, after higher-priority rules | Character cue | [Cue forms](/syntax/reference/speech/#cue-forms) |
| `@name` | Recognizable cue outside speech | Forced Character cue | [Cue forms](/syntax/reference/speech/#cue-forms) |
| `"name"` | Recognizable cue outside speech | Quoted Character cue | [Quoted literals](/syntax/reference/text/#quoted-literals) |
| `/` | Between cue names, outside quotes | Shared cue separator | [Cue forms](/syntax/reference/speech/#cue-forms) |
| `CUE: text` | Outside speech; recognizable cue prefix, with a quoted-name caveat | Character followed by Dialogue on that line | [Inline cues](/syntax/reference/speech/#inline-cues) |
| `!text` | Column one | Forced Stage direction; retains speech context if active | [Forced action](/syntax/reference/directions/#force-an-action-line) |
| `@Name` or `@"Name"` | Inline text | Character reference; bare names run to whitespace | [Character references](/syntax/reference/directions/#character-references) |
| `(text)` | Whole trimmed line inside speech | Aside, with outer parentheses removed | [Speech context](/syntax/reference/speech/#speech-context-and-new-speakers) |
| `(text)` | Whole trimmed line outside speech | Stage direction, with parentheses retained | [Parenthetical action](/syntax/reference/directions/#parenthetical-action) |
| `[[ text ]]` | Whole trimmed line outside speech | Author Note | [Author notes](/syntax/reference/directions/#author-notes) |
| `@@music N "title"` | Stage direction content | Music start; mode resolved by following markers | [Music and lyrics](/syntax/reference/music/) |
| `@@out N` or `@@out` | Stage direction content | Numbered or unnumbered music ending | [Music endings](/syntax/reference/music/#open-music-and-endings) |
| Start then matching pure out block | Adjacent parsed blocks | Hit; intervening blank lines are allowed | [Hits](/syntax/reference/music/#hits) |
| Uppercase text | Inside speech; contains letters | Lyrics | [Lyrics](/syntax/reference/music/#lyrics-and-tab-levels) |
| Leading U+0009 tabs | Lyric text | Lyric-section level prefix | [Tab levels](/syntax/reference/music/#lyrics-and-tab-levels) |
| `~` | Whole trimmed line inside speech | Empty continuation of the last speech type | [Soft breaks](/syntax/reference/music/#soft-breaks) |
| Blank line | Body | End speech context; no new block | [File model](/syntax/reference/#lines-and-whitespace) |
| `*text*`, `**text**`, `_text_` | Inline text | Italic, bold, underline | [Inline marks](/syntax/reference/text/) |
| `\"`, `\\` | Quoted name or title | Quote and backslash escapes | [Quoted literals](/syntax/reference/text/#quoted-literals) |
| `\*`, `\_`, `\\` | Ordinary inline text | Literal emphasis character or backslash | [Escapes](/syntax/reference/text/#escapes-and-re-export) |

For recognition precedence and current reader/writer limits, start with [File model and interpretation](/syntax/reference/). For a complete file, use [Complete example](/syntax/examples/).
