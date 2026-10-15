---
title: Stage directions and notes
description: Action lines, forced interpretation, inline character references and author notes.
---

Outside speech, a line that does not match a higher-priority rule is a Stage direction.

```text
Anna stands at the window. @Peter enters quietly from behind.
```

This contains ordinary action text and a character reference to Peter. The visible referenced text is the name; `@` supplies its reference role.

## Force an action line

```text
!ALL LIGHTS SNAP OUT

!@MICHAEL
```

Column-one `!` is removed before reading the action content. It prevents the first line from becoming an uppercase cue and the second from becoming a forced cue. It also allows action [inside a continuing speech](/syntax/reference/speech/#action-within-a-speech).

Only a column-one prefix has this role. Leading spaces before `!` do not give it forced-action semantics. To represent action text beginning with a literal `!`, use two at the start: `!!The warning is painted in red.` removes the first and retains the second.

## Character references

Use `@Name` for a bare inline reference or `@"Name"` for a quoted one. Bare reference text continues until whitespace; punctuation is not automatically detached from the name.

```text
!@"Peter", waits beside @"Mrs. Washington".
```

The comma and period here are ordinary punctuation outside the quoted references. In `@Peter,`, the comma instead becomes part of the bare reference's lookup key.

Quoted literals are decoded before the reference is created. The reference reader preserves display spelling. For its lookup key, it trims and collapses whitespace, repeatedly removes a trailing parenthetical suffix, then uppercases the remaining name. The common inline reader also recognizes references in speech text; their presence does not create a new speaker.

For a reference alone outside speech, force the action with `!@Peter`; `@Peter` alone matches a cue. Music's `@@` directives have their own [recognition rules](/syntax/reference/music/).

## Parenthetical action

A whole parenthetical line outside speech is a Stage direction and retains its outer parentheses. Inside speech, it is an Aside whose outer parentheses are removed. Use context or `!` to express the intended role.

## Author notes

```text
[[ still need to reconsider the transition into scene 2 ]]
```

Outside speech, a whole trimmed line enclosed in `[[` and `]]` creates a Note. The inner text is trimmed and supports [inline marks](/syntax/reference/text/).

This is a single-line form. It is not a multiline comment fence, and it does not represent the application's comment threads. Within speech it follows ordinary speech-line rules, so put a blank line before a Note that should be its own block.

## Writer output

The reference writer adds `!` when action text would collide with a recognized heading, cue or Note form. Action within a continuing speech also uses `!`. It writes Note blocks as `[[ ... ]]`.

Character references are emitted with quoting where required, including when following punctuation or text must be kept outside the name. See [Inline text and literals](/syntax/reference/text/) for escaping and re-export limits.
