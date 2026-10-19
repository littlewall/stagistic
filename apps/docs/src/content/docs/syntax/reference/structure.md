---
title: Acts and scenes
description: Heading recognition for scripts with acts and scripts containing scenes only.
---

Headings start in column one with one or two `#` characters followed by whitespace. Their meaning depends on the whole body's heading mode.

## Scripts with acts

```text
# Act One

## A garden. Dusk.

The garden is empty.

## The hallway.
```

Because the body contains a raw `##` heading line, `#` denotes an Act and `##` denotes a Scene. The text after the prefix is the heading content; it is not parsed into separate scene-number and title fields.

For example, a heading containing `1 — A garden. Dusk.` retains that whole text. The number is not an ID or a separate numbering directive in the file format.

## Scripts without acts

```text
# A garden. Dusk.

The garden is empty.

# The hallway.
```

When the body has no raw column-one `##` followed by whitespace, its `#` headings are Scenes. A single `# Act One` line therefore does not establish an Act by its title alone.

The reader prescans raw lines before applying speech recognition. Even a `##` line accidentally left inside a speech affects this mode. Writers should keep actual headings outside speech and choose a consistent heading scheme.

## Boundaries and collisions

- Separate a heading from a preceding speech with a blank line. While speech is active, heading-looking text follows speech rules.
- An indented `#` is not a column-one heading. A prefix without following whitespace is not a heading either.
- There are no `###` subscene headings in this grammar.
- To represent heading-looking text as an action, use column-one `!`, for example `!# The sign is painted on the door.`

## Writer output

The reference writer checks whether its document contains any Acts. It emits Acts with `#`, and Scenes with `##` when Acts are present. Without Acts, it emits Scenes with `#`. Heading text is trimmed on writing.

A Scene resets the reader's current open-music number. See [Music endings](/syntax/reference/music/#open-music-and-endings) before carrying a numbered musical unit across that boundary.

Continue with [Cues, dialogue and asides](/syntax/reference/speech/).
