---
title: Syntax
description: Stagistic Syntax for implementers and people working in plain-text editors.
template: splash
hero:
  layout: banner
  title: Stagistic Syntax
  tagline: A structured text format for theatre and musical scripts. Rules and examples for implementers and plain-text writing.
  actions:
    - text: Format reference
      link: /syntax/reference/
      icon: right-arrow
    - text: Complete example
      link: /syntax/examples/
      variant: secondary
---

Stagistic Syntax represents a theatrical script in a `.stagistic` text file: structure, speakers, dialogue, lyrics, stage directions, music markers and selected title-page metadata.

This reference is for people implementing the format in other tools and for writers using plain-text editors. It describes the current Stagistic reader and writer, including context-sensitive interpretation and known round-trip limits.

## Choose an entry point

| I need… | Start here |
| --- | --- |
| The file model and recognition rules | [Format reference](/syntax/reference/) |
| A complete file to read or try | [Complete example](/syntax/examples/) |
| The meaning of a particular marker | [Marker reference](/syntax/markers/) |

## Read by area

- [Frontmatter](/syntax/reference/frontmatter/): supported metadata fields and validation.
- [Acts and scenes](/syntax/reference/structure/): heading forms with and without acts.
- [Cues, dialogue and asides](/syntax/reference/speech/): speaker recognition and speech context.
- [Stage directions and notes](/syntax/reference/directions/): action, character references and forced interpretation.
- [Music and lyrics](/syntax/reference/music/): music markers, Hits, lyric lines and soft breaks.
- [Inline text and literals](/syntax/reference/text/): emphasis, quoting and escapes.

For writing through the Stagistic application, use the [Editor documentation](/editor/). For the motivation behind the format, see [Stagistic Syntax on the website](https://stagistic.com/editor/syntax).
