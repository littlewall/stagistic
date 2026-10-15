---
title: Complete example
description: A full Stagistic file combining metadata, structure, speech, lyrics, music and a note.
---

This example of `When Night Falls` combines the reference's main forms in one `.stagistic` file. It is suitable for trying a reader or writing in a plain-text editor.

```text
---
title: When Night Falls
credits:
  - credit: Book
    authors:
      - Jane Smith
  - credit: Music
    authors:
      - Peter Gray
draftDate: 2026-07-01
---

# Act One

## 1 — A garden. Dusk.

Anna stands at the window. @Peter enters quietly from behind.

PETER
(from the doorway)
Sorry I'm late.

ANNA
It's fine. I was waiting.

The lights slowly fade. @@music 1 "When Night Falls"

ANNA
WHEN NIGHT FALLS AND THE LIGHTS GO DOWN
	AND I'LL BE STANDING HERE

PETER
SO I'LL COME CLOSER

ANNA / PETER
AND THE WORLD WILL STOP

The lights come up. @@out 1

[[ still need to reconsider the transition into scene 2 ]]
```

The indented lyric line begins with a real tab. Preserve it as U+0009 when testing lyric levels.

## Expected interpretation

| Part | Expected meaning |
| --- | --- |
| Opening YAML | Title, two credit rows and a fixed draft date |
| `#` and `##` headings | Act and Scene, because the body has a `##` heading |
| Opening action | Stage direction with a reference to Peter |
| Peter's first speech | Character, Aside, Dialogue |
| Anna's first speech | Character, Dialogue |
| Music start | Open musical unit titled `When Night Falls` |
| Uppercase speech lines | Lyrics; one line retains a leading tab |
| `ANNA / PETER` | Shared Character cue, followed by Lyrics |
| Final music action | Stage direction with the matching music ending |
| `[[ ... ]]` | Author Note |

The reference reader produces 18 blocks: one Act, one Scene, three Stage directions, five Character cues, one Aside, two Dialogue blocks, four Lyrics blocks and one Note. The music start is open, not a Hit.

## What to verify in another implementation

Check the block roles and speaker boundaries, not just whether the file loads. Verify the inline reference, credit arrays, fixed date, tab prefix, shared cue and music ending separately.

On writing and re-reading this example, the reference preserves that block-type sequence and the open music mode. Formatting, cue spacing, quoting and metadata presentation can be normalized. General limitations are described in [File model and interpretation](/syntax/reference/#current-interoperability-limits).

For focused cases, follow the [reference chapters](/syntax/reference/); for a quick marker lookup, use [Marker reference](/syntax/markers/).
