# Stagistic Syntax — Design

**Date:** 2026-06-14
**Status:** Approved (design); implementation pending
**Scope:** The plain-text *syntax* only — what a writer types in a text
editor and imports. The data model, parser/serializer, editor surfaces,
and migration of existing documents are **separate downstream specs**.

---

## 1. Motivation

The editor was originally built around **Fountain**. Fountain is a sound
plain-text format, but it is built for *screenwriting* — its conventions
(scene-only structure, `INT./EXT.` headings, transitions, screen-centric
"action"/"parenthetical" vocabulary) do not bend to *stagewriting*, and
especially not to **musicals**. No existing stagewriting format covers
what we need either.

We need a format that lives "behind" the editor so a writer can draft a
script independently in any text editor and import it. This document
designs that format: **Stagistic syntax**.

Concrete things Fountain cannot express that this format must:

- Real theatrical structure: **acts *and* scenes** as a hierarchy, not
  loose `#` sections.
- Theatrical vocabulary instead of screenwriting (no transitions, no
  "action", no "parenthetical").
- **Spoken vs. sung** within a single character's speech.
- **Simultaneous/unison singing** (multiple characters, same words).
- **Tagging a character** inside a stage direction (machine-readable
  reference + capitalization of the acting character).
- **Structural cues** — the start (and our addition, the end) of a song,
  instrumental, or sound, written inside a stage direction.
- **Nested lyric sections** (A/B/C section indentation).

## 2. Lineage and philosophy

**A theatrical dialect rooted in Fountain, with markdown-style
structure.**

- Keep Fountain's strength: the *implicit flow of speech* that reads like
  a finished script (CAPS character cue, blank-line separation, dialogue
  flowing under a cue, `(parenthetical)`, inline `*emphasis*`).
- Replace/add only the **theatrical and musical layer**.
- **Implicit where it reads naturally; explicit only where ambiguity
  would otherwise hurt.** Fountain is not "fragile" — it is simply built
  for another industry. We keep its implicit detection and add explicit
  markers solely for constructs that have no natural implicit form.

The reference for theatrical/musical formatting conventions is the NMI
*Crash Course in Writing Musicals* (and its Format Guidelines appendix).
Where this document cites a rule, it follows that source.

## 3. Construct inventory

The syntax must distinguish exactly these constructs:

| Construct | Nature |
|---|---|
| Frontmatter | Optional metadata block |
| Act / Scene | Structure (hierarchy) |
| Character cue | Who speaks/sings; may be unison (`/`) |
| Dialogue | Spoken line |
| Lyrics | Sung line; nestable into sections |
| Stage direction | Narrative/action description |
| Aside | Parenthetical delivery note `(...)` |
| Cue (structural) | Inline in a stage direction: song/instrumental/sound start + end |
| Character tag | Inline reference to a character inside a stage direction |
| Author note | Non-printing note |
| Inline emphasis | bold / italic / underline |

Explicitly **out of scope** for the syntax (handled later as data/render
in downstream specs): scene-initial stage direction styling (3", no
parentheses), Act-Scene-Page page numbers, lyric hanging indent,
*different* simultaneous text (side-by-side columns), production cues
(lights/SFX — these will get their own, different notation).

## 4. Frontmatter (optional)

A YAML block fenced by `---`, at the very start of the file
(Astro/Vue-style frontmatter, *not* Fountain's `Key:` object style). The
script body follows.

````
---
title: Až přijde noc
authors:
  book: Jan Novák
  music: Petr Svoboda
  lyrics: Jan Novák
---
````

The frontmatter is optional. Its internal schema (which keys are
recognized) is a downstream concern; the syntax rule is only: *if the
file begins with a `---` line, everything up to the next `---` line is a
YAML frontmatter block, and the body begins after it.*

## 5. Structure — acts and scenes

Markdown-style heading levels:

- `#` → **act**
- `##` → **scene**
- `###` → **reserved** for a future intermediate level (obraz/výstup);
  not parsed yet.

Text after the marker is a free-form heading (location/time/anything);
numbering is the editor's job (structure is data), so the writer just
writes what they want.

```
# Akt první

## 1 — Zahrada. Soumrak.
```

### Dynamic level rule

Scenes are the base structural unit; acts are an *optional* layer above.

- `##` is **always** a scene.
- `#` is an **act** *if the document contains at least one `##`*; if there
  is no `##` anywhere, `#` is treated as a **scene** (one-act play).

**Consequence (accepted):** the meaning of a `#` line depends on the whole
document, not the line alone. The parser must do a **whole-document
pre-scan** to decide whether any `##` exists before classifying `#`
lines. Adding the *first* `##` silently promotes every existing `#` from
scene to act. This is intended (introducing acts makes your top-level
headings acts); it is the writer's responsibility to manage.

## 6. The detection model — position + letter case

This is the core of the parser. Theatrical convention (NMI): **character
cues and lyrics are both UPPERCASE; spoken dialogue is normal case.**
Humans tell cue from lyric by position; the parser does the same.

Speeches are separated by **blank lines**. The sample integrated script
in the NMI appendix puts a blank line before every character cue, and
runs a cue's content (dialogue/lyrics/asides) on contiguous lines with no
blank lines inside.

### At block start (parser is "expecting a cue" — i.e. after a blank line or at body start)

| Line | Type |
|---|---|
| `#` / `##` | act / scene |
| UPPERCASE, short | **character cue** (may contain `/` for unison) |
| `@name` | **character cue**, forced (for non-caps names) |
| normal case | **stage direction** |
| `(...)` | **stage direction** (parenthetical form) |

### Tie-break: `@name` at block start (forced cue vs. leading tag)

Both a *forced character cue* (§7) and a *character tag* (§11) use `@`.
At block start they are told apart by whether running prose follows on
the same line:

- A line that is **only** `@name` (optionally with a `/` unison and/or a
  trailing `(aside)`) → **forced character cue**.
- A line where `@name` is followed by **non-name prose** → **stage
  direction** whose leading `@name` is a character tag (e.g. `@Petr vejde
  tiše.`).

Inside a stage direction (not at block start) `@name` is always a tag.

### Inside a speech (after a cue, until the next blank line)

| Line | Type |
|---|---|
| UPPERCASE | **lyrics** (sung); leading tab(s) set the section level |
| normal case | **dialogue** (spoken) |
| `(...)` | **aside** (may appear multiple times in one speech) |
| `~` (alone on the line) | **soft break** — empty block, continues the speech (see below) |

### Key rule

**A blank line ends a speech** and resets the parser to "expecting a
cue." Therefore:

- Every character cue is preceded by a blank line.
- A cue's first content line follows the cue immediately, with no blank
  line between them.
- A real blank line between a speech's lines would reset to "expecting a
  cue" — so for an in-speech visual gap, use a soft break instead.

### Soft break — `~`

A line whose only non-whitespace content is `~` is a **soft break**: a
visual "breathing" gap inside a speech that does **not** reset the
in-speech state. Verse/stanza gaps in long lyrics (and gaps in long
spoken passages) are common, so a true blank line — which would end the
speech and make the next UPPERCASE line read as a new cue — is not usable
there. `~` fills that role. (`~` is free because lyrics are detected by
case+position, not by a `~` prefix.)

- It renders as an **empty block whose type is the previous block's
  type** (an empty lyrics block after lyrics, an empty dialogue block
  after dialogue).
- It does **not** reset to "expecting a cue"; the line after it is
  classified by the normal in-speech rules (UPPERCASE → lyrics, normal →
  dialogue).
- It must be **alone on its line**; `~text` is not special (it is literal
  content), so Fountain's old `~lyric` prefix is not revived.
- **Consecutive soft breaks collapse to one.** Several `~` lines in a row
  produce a single empty block — the editor normalizes them down, so a
  writer cannot stack multiple blank lines inside a speech.

```
PETR
PRVNÍ ŘÁDKA LYRICS
DRUHÁ ŘÁDKA LYRICS
~
DALŠÍ ŘÁDKA LYRICS, STÁLE PETR — NE NOVÁ POSTAVA

Nějaká stage direction

PETR
Mluví a mluví
ZPÍVÁ A ZPÍVÁ
Mluví a mluví
~
pořád ještě mluví
```

On export, an empty in-speech block serializes back to `~` so the gap
round-trips.

### Why this resolves the central ambiguity

`ANNA` on a line right after a blank line is a **cue**; `PASS ME THE
SUGAR` on a line inside a speech is **lyrics**. Identical casing — the
*position* decides.

### Shouting

A spoken line shouted in all caps would otherwise be misread as lyrics.
Resolution: **shouting is written with inline emphasis (`**Stop!**`), not
caps.** Caps inside a speech always means lyrics.

## 7. Character cue and dialogue

Canonical (stacked) form — name on its own line, content below:

```
PETR
(od dveří)
Promiň, že jdu pozdě.
```

**Input conveniences** the parser accepts but the editor does *not* emit
on export:

- Inline dialogue: `JMÉNO: text` on one line — parser splits it into a
  character cue + dialogue.
- Inline aside after the name: `PETR (od dveří)` — parser attaches the
  aside to that character.

**Canonical serialization:** the editor always exports stacked — cue,
aside, dialogue, and lyrics each on their own line; an aside is never
left on the name line.

### Unison / multiple characters (same words)

Join names on the cue line with `/`, **with or without spaces**
(`ANNA/PETR` or `ANNA / PETR`). The shared content follows once. (NMI
rule 1/2.)

*Different* simultaneous words (side-by-side columns) are **out of scope**
for now.

## 8. Aside

One construct: `(text)` is an **aside** wherever it appears in the flow of
speech — whether inline after a name, on its own line under the name, or
between dialogue lines. There is **no separate "character extension"
type**; an extension like `(od dveří)` is just an aside attached to the
cue. (NMI: asides are short, lowercase, in parentheses, not full
sentences — full sentences belong in a stage direction; that guidance is
a *lint*, not a parse rule.)

A `(...)` line **at block start** (not inside a speech) is a
**parenthetical stage direction**, not an aside — position disambiguates.

## 9. Lyrics and nesting

Lyrics are detected by casing+position (§6). Section level is set by
**leading tabs** on the lyric line:

- 0 tabs → A-section (NMI .5")
- 1 tab → B-section (1.0")
- 2 tabs → C-section (1.5")
- each further tab → +0.5"

```
ANNA
AŽ PŘIJDE NOC A ZHASNOU SVĚTLA
	A JÁ TU BUDU STÁT
```

(The corresponding rendered indents and hanging-indent-on-wrap are a
render concern, downstream.)

## 10. Structural cue (song / instrumental / sound)

A cue is **generic** — it fires *something* with a duration: most often a
song, but also an instrumental or a sound. (Production cues for
lights/SFX are separate and get a different notation later.)

NMI defines only the **start** ("the cue" — where it fires). The **end**
is *our addition*, needed for typesetting/stylistics (how long the
song/instrumental/sound plays). If no end is given, the cue is assumed to
end at the end of the scene.

Cues are **inline syntax inside a stage direction block**, not a separate
block:

- **Start (fire):** `@@cue <N> "<title>"`
- **End (out):** `@@out <N>`

```
Světla pomalu zhasínají. @@cue 1 "Až přijde noc"

ANNA
AŽ PŘIJDE NOC A ZHASNOU SVĚTLA

Světla najedou. @@out 1
```

- `<N>` is a number — the cue's identity. It matches an `@@out` to its
  `@@cue` and feeds the (downstream) list of musical numbers.
- The double `@@` distinguishes a cue from `@` (a character).
- The pair is **`cue` … `out`** (theatrical "music out") rather than
  "cue end", because a cue is the firing point, not an interval.
- **Type** (song / instrumental / sound) is generic; a cue followed by
  lyrics is a song. (An explicit type may be added later without breaking
  this.)

## 11. Character tag inside a stage direction

NMI: *"In stage directions, capitalize character names and pronouns who
have the action, but not the recipient of the action"* (`HE kisses
Maria`).

A character that **performs the action** is tagged with `@`:

```
Anna stojí u okna. @Petr vejde tiše zezadu.
```

renders as: *Anna stojí u okna. **PETR** vejde tiše zezadu.* (the tag is
capitalized and a character reference is stored).

- **Explicit only.** A character's name may appear in a stage direction
  without being the actor (it may be the recipient); only the acting
  character is tagged. No auto-detection — that would wrongly capitalize
  recipients.
- **Matching is case-insensitive** against the cast: `@Petr`, `@petr`,
  `@PETR` all pair with the character whose cue is `PETR`. Character
  identity is the normalized name (casing is only formatting).
- **Pronouns** (`HE`, `THEY`) stay authorial — the writer capitalizes
  them by hand; they cannot be reliably tied to a character.

## 12. Name/title literals — the quoting rule

> **Double quotes `"..."` delimit a literal name or title anywhere a
> space, period, or special character (`@`, `/`) would otherwise break
> parsing.**

This one rule applies everywhere:

- **Character cue line** with a multi-word/special name: `"Mrs.
  Washington"`, `"AC/DC"`, `"@home"`.
- **Character tag** for a multi-word/special name: `@"Mrs. Washington"`
  (bare `@Mrs. Washington` would tag only `Mrs`).
- **Cue title:** `@@cue 1 "Overture"`.

A bare `@Name` tags exactly one whitespace-delimited token; once a name
contains a space, a period, or a special character, it **must** be
quoted.

## 13. Inline marks and author notes

Carried over from Fountain unchanged:

- **Emphasis:** `*italic*`, `**bold**`, `_underline_`.
- **Author note (non-printing):** `[[ ... ]]`.

## 14. Worked example

```
---
title: Až přijde noc
authors:
  book: Jan Novák
  music: Petr Svoboda
---

# Akt první

## 1 — Zahrada. Soumrak.

Anna stojí u okna. @Petr vejde tiše zezadu.

PETR
(od dveří)
Promiň, že jdu pozdě.

ANNA
To nic. Čekala jsem.

Světla pomalu zhasínají. @@cue 1 "Až přijde noc"

ANNA
AŽ PŘIJDE NOC A ZHASNOU SVĚTLA
	A JÁ TU BUDU STÁT

PETR
TAK PŘIJDU BLÍŽ

ANNA/PETR
A SVĚT SE ZASTAVÍ

Světla najedou. @@out 1

[[ ještě zvážit přechod do scény 2 ]]
```

## 15. Summary of forced/explicit markers

The full set of explicit markers (everything else is implicit by
position + case):

| Marker | Meaning |
|---|---|
| `--- … ---` | frontmatter block (file start) |
| `#` / `##` | act / scene |
| `@name` | forced character cue (block start) |
| `@Name` / `@"Name"` | character tag (inside stage direction) |
| `/` | unison separator on a cue line |
| `@@cue N "title"` / `@@out N` | structural cue start / end |
| `(...)` | aside (in speech) / parenthetical stage direction (block start) |
| `[[ ... ]]` | author note (non-printing) |
| `*` `**` `_` | italic / bold / underline |
| leading tab(s) | lyric section level |
| `~` (alone on line) | soft break — empty in-speech block, no cue reset (§6) |
| `"..."` | literal name/title (quoting rule, §12) |

## 16. Downstream specs (not this document)

1. **Data model** — what the syntax parses into (blocks, refs, cue
   entities, structure).
2. **Parser + serializer** — text ↔ document, including the
   whole-document pre-scan and canonical stacked serialization.
3. **Editor + import** — the import flow and editing surfaces.
4. **Migration** — existing stored (Fountain-based) documents.
