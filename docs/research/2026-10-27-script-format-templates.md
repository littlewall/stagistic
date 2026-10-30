# Script format templates — research (2026-10-27)

> Page-rule evidence and export interactions were re-audited on 2026-10-29:
> [template/export audit](2026-10-29-template-export-audit.md). That audit
> distinguishes source requirements from the assumptions in the initial research.

Units below use Stagistic's model: `indentLeftChars` counts Courier 12 pt
characters (1 char = 0.1 in) from the page content edge; 16 px = 12 pt;
96 px = 1 in. Page: A4 = 794 × 1123 px, US Letter = 816 × 1056 px.

## Sources

- DG general guide (identical PDF is hosted as the "Samuel French guide"):
  https://www.dramatistsguild.com/sites/default/files/2020-01/General-SFI-Formatting-Guidelines-Complete.pdf
- DG Traditional sample: https://www.dramatistsguild.com/sites/default/files/2020-01/traditionalformat-New.pdf
- DG Modern sample: https://www.dramatistsguild.com/sites/default/files/2019-12/modernformat-New.pdf
- DG Musical sample: https://www.dramatistsguild.com/sites/default/files/2019-12/musicalformat-New.pdf
- Final Draft "DG Modern" element spec: https://www.garrettahughes.com/StagecraftFolder/FormattingGuidelinesFolder/FinalDraftDramtistsGuildModenStageplayFormatSpecs.pdf
- Sketchworks sample: https://www.sketchworkscomedy.com/downloads/Sketch-Formatting-Sample.pdf
- UK stageplay (BBC-based) per WriterDuet: https://www.writerduet.com/article/391-uk-stageplay-template
- BBC Writersroom's own format pages now 404; no primary BBC stage-play PDF found.

Measurements for DG and Sketchworks were taken from PDF text coordinates
(`pdftotext -bbox`), not from prose.

## Stagistic Default (current, from code)

Page A4, margins T/R/B 1 in, L 1.5 in. Courier Prime 12 pt, line-height 1.2.

| Block | Before | Indent L/R | Align | Case | B/I/U | Other |
|---|---|---|---|---|---|---|
| act | 2.0 (+1.0 after) | 0 | center | UPPER | B·U | next: scene |
| scene | 1.0 | 0 | left | UPPER | B·U | number `1.` |
| stageDirection | 1.0 | 0 | left | normal | – | |
| character | 1.0 | 20 / 3 | left | UPPER | B | |
| dialogue | 0 | 10 / 3 | left | normal | – | |
| aside | 0 | 16 / 12 | left | lower | I | |
| lyrics | 0 | 10 / 10 | left | UPPER | I | |
| note | 1.0 | 0 | left | normal | I | |

## DG — Traditional

Letter; margins L 1.5 in (binding), others 1 in. Courier 12 (sample), single
spaced, blank line between speeches.

| Block | Stagistic mapping |
|---|---|
| character | center, UPPER, no bold, indent 0 |
| dialogue | indent 0 (full width) |
| stageDirection | indent 15 (3 in from page edge), in parentheses, not italic, blank line before/after |
| aside | ~indent 20, centered under cue, parentheses, normal case |
| act | new page, center, UPPER (`ACT II`) |
| scene | new page, center, Title case (`Scene 6`), underlined |
| lyrics | UPPER, indent 5 ("one indent") |

Page numbers top right; `II–1–51` (act–scene–page) is the preferred form.

## DG — Modern

Letter; same margins. Times New Roman 12.
Final Draft spec (inches from page edge): character 4.00, parenthetical
3.63–6.38, dialogue 1.50–7.50, action 4.25–7.50, scene heading 1.50 UPPER.

| Block | Stagistic mapping |
|---|---|
| character | left at 25 chars (reads as centred), UPPER |
| dialogue | indent 0 |
| stageDirection | indent 27–28 (starts mid-page), **no parentheses, not italic** |
| aside | indent 21, right 11 |
| scene | left, UPPER, 2 lines before |

## DG — Musical (from APPLAUSE sample)

As Traditional, Times New Roman. Stage direction at 3 in from page edge
(indent 15) in parentheses; cue parentheticals centred under the name.
Lyrics: UPPER, indent ~0.4–0.5 in (5 chars), not italic, stanzas separated by a
blank line, song title UPPER + underlined inside the stage direction.
Duets: side-by-side columns.

## Samuel French / Concord — Manuscript

Publisher's hosted guide = DG general guide. Delta vs DG Traditional:
stage directions **parenthesised and italic** (SF in-house uses both);
character names inside stage directions UPPER. Brief direction may sit on the
cue line: `JOHN (laughing)`. Continued speech: `JOHN (Cont.)`.

## Sketch Comedy — Sketchworks

Letter; margins 1 in all sides (left 96 px, not 144). Courier 12.

| Block | Stagistic mapping |
|---|---|
| character | indent 25, left, UPPER, no bold |
| dialogue | indent 15 |
| aside | indent 20, `(italic)` inside parentheses |
| stageDirection | indent 0, normal case, names UPPER |
| scene | n/a — sketch title block (title / by / date / characters / setting) |
| cues | `LIGHTS:`, `SFX:`, `MUSIC:` at indent 0, label underlined; `LIGHTS OUT` right-aligned |

## UK / International (BBC)

Weakest evidence (secondary source only). A4, Courier 12.
Character name **left, on the same line as dialogue** (two columns);
action UPPER in an indented right column (WriterDuet) — UK publishers
(Nick Hern, Methuen) use italic stage directions instead. Scene numbers right.

## Proscenium (open source, MIT) — formats/*.json

https://github.com/proscenium-app/proscenium/tree/main/formats — same seven
names as our list (+ `stage-us-modern` "Proscenium House"). Inches from the
content margin; Stagistic chars = inches × 10. All formats use **Courier Prime
12** (their FMT-115 rejects other faces), so Times in the DG samples is not
carried over.

| Format | Page / margins L | lh | character | dialogue | stageDirection (action) | aside (paren) | lyrics | act / scene |
|---|---|---|---|---|---|---|---|---|
| DG Traditional | Letter / 1.5 | 1.2 | 25, UPPER | 0 | 15, `( )` | 20, `( )` | 5, italic | center UPPER, act new page / center UPPER |
| DG Modern | Letter / 1.5 | 1.2 | 25, UPPER | 0 | 25, plain | 20, `( )` | 5, italic | as Traditional |
| DG Musical | Letter / 1.5 | 1.2 | 25, UPPER | 0 | 15, `( )` | 20, `( )` | 4, UPPER, 1 line before/after | as Traditional |
| Samuel French | Letter / 1.5 | 1.0 | 20, UPPER | 0 | 15, `( )` | 15, `( )` | 5, UPPER, 1 before/after | act new page / scene center **underlined**, new page |
| Sketchworks | Letter / **1.0** | 1.13 | 25, UPPER | 15, max 35 wide | 0 | 20, max 35, italic `( )` | 15, UPPER | left UPPER bold |
| UK (BBC) | **A4** / 1.0 | 1.0 | 0, UPPER, `:` suffix, **beside dialogue** | 15 | 25, UPPER | 15, UPPER, run-in | 5, italic | act beside scene, new page |

Header: `{page}.` top right everywhere except Sketchworks (`{page}`) and UK
(footer centre `-{page}-`). Pagination: reprint cue with `(CONT'D)` after a
page split (SF: `(Cont.)`; UK: no reprint); min 2 dialogue lines each side.

## UX decisions (reviewed with Milan, 2026-10-27)

- **Model (decided):** two ways to apply a template.
  - **Lock:** store only the template id on the script/draft/version. Format
    values resolve **live** from the template definition — read-only in
    settings and export. A later code update to the standard flows into every
    locked script and its PDF (chosen: live binding, for consistency).
  - **Apply as copy / Unlock:** materialise the template's values into custom
    settings, no stored association, freely editable; future template changes
    do **not** propagate. Chip may show the matching template name by value
    comparison until the user edits anything → then “Custom”.
  - **Reset** = apply Stagistic Default (as a copy).
  - So: locked = pointer (resolved live); unlocked = materialised custom values.
- **Sidebar** of Script settings splits into two groups: **Script** first
  (Title page, Initial pages, Visual preferences, Danger zone — never touched
  by a template), then **Format** (Page format, Header and footer, Block
  settings). The standard picker chip sits to the right of the **Format**
  group header, e.g. `🔒 DG Traditional ▾`.
- **Locked panels** show a lock banner directly under the panel's *Format*
  section heading (scoped to that section): “Format follows DG Traditional.”
  + `Change…` (opens the picker menu) + `Unlock`. Block panels keep a separate
  **Typing** section (shortcut, After-Enter) that no template ever controls —
  candidate to move to author-level global settings later.
- **Picker menu:** list of standards (Stagistic Default first, labelled
  *reset*). Bottom action is `Unlock — keep values, edit freely` when locked.
- **Apply confirmation modal:** sample page in the standard + a short *Changes*
  list + a “Lock to template” toggle (default on). No “what stays” list.
- **Header/footer:** template may force specific cells (page-number cells);
  those lock, free cells stay editable. Banner: “Some cells are set by …”.
- **Export:** editor-visible format lives in Script settings (PDF inherits it);
  PDF-only flow (act/scene on new page, repeat name after break, continuation
  mark) stays in the export sidebar's *Page flow*, preset + locked by the same
  template with the same banner. Continuation mark is a select with **none**
  default (then `(CONT'D)` / `(Cont.)`).
- **New script dialog:** standard picker + “Lock to template” toggle (default
  on).
- **Naming (decided):** our format presets keep the word **“Template”** (chip
  `🔒 DG Traditional ▾` by the Format group, menu “Templates”). The *export*
  “template” (Basic / Integrated score) is what gets renamed — to **“Export
  type”** (wording still soft: could be Export layout/format). UI-string change
  only: visible label in `ExportControlPanel.tsx` and `ariaLabel` in
  `TemplatePicker.tsx`; internal `EXPORT_TEMPLATES` keys/components unchanged.
- **Parentheses:** Stage direction gets a “Wrap in parentheses” block setting,
  rendered via pseudo-elements like aside/note (not stored in text).
- **Font:** new “Script font” in Page format; monospace only (char-based
  indents would break with a proportional face). Stagistic keeps Courier Prime;
  a template may set its own; user can always override.
- **Out of phase 1:** UK/BBC (side-by-side cue+dialogue needs dual-dialogue
  layout first). Technical cues (LIGHTS/SFX) out of scope.

## Gaps vs current settings model (reviewed with Milan)

1. Font family — not needed for templates (all Courier Prime). Milan wants a
   format-level section; the Page layout panel gets renamed to cover it.
2. Side-by-side cue + dialogue (UK) — deferred with dual dialogue; UK template
   left out of phase 1.
3. Page break before act/scene — export concern only; editor stays continuous.
4. Render-only parentheses (`parenWrap`) — **to add** as a block setting.
5. Act–scene–page numbering — already exists (`{{page}}` page mark).
6. `CONT'D` — export pagination concern; technical cues out of scope.
7. Letter / A4 — already a preset choice in Page layout.
8. Possible bug: `spacingAfterEm` and `sceneNumberFormat` have no columns in
   `script_settings_blocks` and are not referenced in `packages/db/src` —
   verify they survive a reload.
