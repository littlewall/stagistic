// --- Table of contents -----------------------------------------------------
export const toc = [
    {id: 'core', n: '01', title: 'The core idea'},
    {id: 'frontmatter', n: '02', title: 'Frontmatter'},
    {id: 'structure', n: '03', title: 'Acts & scenes'},
    {id: 'dialogue', n: '04', title: 'Cues & dialogue'},
    {id: 'asides', n: '05', title: 'Asides'},
    {id: 'lyrics', n: '06', title: 'Lyrics'},
    {id: 'soft-break', n: '07', title: 'Soft breaks'},
    {id: 'stage-directions', n: '08', title: 'Stage directions'},
    {id: 'music', n: '09', title: 'Music'},
    {id: 'quoting', n: '10', title: 'Quoting'},
    {id: 'inline', n: '11', title: 'Inline marks'},
    {id: 'example', n: '12', title: 'Full example'},
    {id: 'reference', n: '13', title: 'Marker reference'},
];

// --- Example sources (rendered as plain text) ------------------------------
export const exFrontmatter = `---
title: When Night Falls
subtitle: A musical in two acts
credits:
  - credit: Book
    authors:
      - Jane Smith
  - credit: Music
    authors:
      - Peter Gray
  - credit: Lyrics
    authors:
      - Jane Smith
      - Alex Green
source: Based on the novel by Sam Gray
draftDate: 2026-07-01
contact: jane@example.com
copyright: © 2026 Jane Smith
---`;

export const exStructure = `# Act One

## 1 — A garden. Dusk.`;

export const exDialogue = `PETER
(from the doorway)
Sorry I'm late.

ANNA
It's fine. I was waiting.`;

export const exUnison = `ANNA / PETER
AND THE WORLD WILL STOP`;

export const exInlineCue = `JANE: I told you already.`;

export const exAside = `ANNA
(quietly)
You shouldn't have come.
(she turns away)
Not tonight.`;

export const exLyrics = `ANNA
WHEN NIGHT FALLS AND THE LIGHTS GO DOWN
\tAND I'LL BE STANDING HERE`;

export const exSoftBreak = `PETER
FIRST LINE OF THE SONG
SECOND LINE OF THE SONG
~
A LATER LINE — STILL PETER, NOT A NEW CHARACTER`;

export const exStageDir = `Anna stands at the window. @Peter enters quietly from behind.`;

export const exForcedStageDir = `!ALL LIGHTS SNAP OUT

!@MICHAEL`;

export const exForcedStageDirInSpeech = `MICHAEL
!He pauses, listening.
AND THEN HE SINGS AGAIN`;

export const exMusic = `The lights slowly fade. @@music 1 "When Night Falls"

ANNA
WHEN NIGHT FALLS AND THE LIGHTS GO DOWN

The lights come up. @@out 1`;

export const exQuoting = String.raw`"Mrs. Washington"
@"Mrs. Washington"
@@music 1 "She Said \"Yes\""`;

export const exMarks = `*italic*  **bold**  _underline_

[[ a note to self ]]`;

export const exFull = `---
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
\tAND I'LL BE STANDING HERE

PETER
SO I'LL COME CLOSER

ANNA / PETER
AND THE WORLD WILL STOP

The lights come up. @@out 1

[[ still need to reconsider the transition into scene 2 ]]`;

// --- Marker reference ------------------------------------------------------
export const markers = [
    ['--- … ---', 'Frontmatter block (file start)'],
    ['!text', 'Forced stage direction (block start: tie-breaker; in a speech: only way)'],
    ['#  /  ##', 'Act / scene'],
    ['@name', 'Forced character cue (at the start of a block)'],
    ['@Name  /  @"Name"', 'Character tag (inside a stage direction)'],
    ['/', 'Unison separator on a cue line'],
    ['@@music N "title"  /  @@out N', 'Music — start / end'],
    ['(...)', 'Aside (in a speech) or parenthetical stage direction (at block start)'],
    ['[[ ... ]]', 'Author note'],
    ['*   **   _', 'Italic / bold / underline'],
    ['leading tab(s)', 'Lyric section level'],
    ['~ (alone on a line)', 'Soft break — empty in-speech block, no cue reset'],
    ['"..."', 'Literal name or title (the quoting rule)'],
];
