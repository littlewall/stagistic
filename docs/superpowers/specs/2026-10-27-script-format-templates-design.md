# Script format templates — design

> **Export follow-up, approved 2026-10-29:** Score artwork remains at full size. Integrated numbers use the same alignment, margins, font size and vertical position relative to the bottom edge as generated script pages; no extra numbering band or reserved space is added to the score. The user supplies space in the source PDF. Basic/Simple contents is Scenes only; music/combined variants are available only in Integrated score. The blank-page label is “Blank pages after last initial page”. This supersedes the dedicated score-number-band decision below.


> **Scope amendment, approved 2026-10-29:** Templates now apply and lock **block styles only** (including block line height and scene numbering). Page format, global typography, header/footer and export flow remain user-owned through apply/reset/unlock. Typing remains independent; per-block “Reset block settings” still resets Typing too. The full-page-profile sections below describe the earlier design and are superseded by this amendment and [the correction plan](../plans/2026-10-29-block-templates-export-corrections.md).
>
> Adjacent blocks of the same type share outer spacing for every type except Act and Scene. Music start/end boundaries terminate the run; explicit empty paragraphs remain lines. Different-type margins remain additive. Sidebar page/header items move into Script; the template group is Block styles.
>
> Independent export corrections: first scenes obey page rules with their act heading; contents/body retain shared identifiers under character filtering; final assembly counts all script, score and blank pages for odd starts. Basic contents uses a visible compound label if continuous numbering is absent. Integrated exports have an independent continuous sequence; imported score artwork is fitted above a dedicated number band on its original paper size.


Status: draft for review · 2026-10-27
Research + measurements: [docs/research/2026-10-27-script-format-templates.md](../../research/2026-10-27-script-format-templates.md)

## Intent & why

Playwrights submit to houses that mandate a format (Dramatists Guild,
Samuel French, sketch venues). Today a writer must hand-tune every block
setting to match. We want one click to put a script into a recognised
standard, with a clear, reversible relationship between the standard and the
writer's own settings — the writer never loses their custom work by trying a
standard on.

## Goals

- Ship named **Templates** that preset Page format, Header/footer and Block
  settings to a recognised standard.
- Two relationships, both reversible:
  - **Lock** — the script references the template; its format is read-only in
    settings and export and stays in sync with the template definition.
  - **Apply as copy / Unlock** — the template's values are written into the
    script's own (custom) settings and become freely editable.
- A template never touches non-format settings (Title page, Initial pages,
  Visual preferences, block Typing options).
- Template choice available at **new-script** creation and from **Script
  settings**; drafts and versions carry their own template/custom state.
- Export's PDF-only flow (act/scene page breaks, continuation mark) is preset
  and locked by the same template.

## Phase-1 template set

`stagistic-default` (reset target), `dg-traditional`, `dg-modern`,
`dg-musical`, `samuel-french`, `sketch-comedy`. **UK/BBC is out** (needs
side-by-side cue+dialogue, which depends on dual-dialogue layout we don't have).
Concrete per-block values are in the research doc's Proscenium table (MIT, safe
to adapt); convert inches→chars as `chars = inches × 10`.

## Non-goals

- Dual dialogue / side-by-side cue+dialogue (and therefore UK/BBC).
- Technical cue blocks (LIGHTS/SFX/MUSIC).
- A visual template editor or user-authored templates.
- Moving block Typing options (shortcut, After-Enter) to global settings —
  noted as future, only *sectioned off* here.

## Anti-goals (failure even if it "works")

- Applying a template silently destroys the writer's previous custom settings
  with no way back.
- A locked script can be edited in settings but the export ignores the lock
  (or vice-versa) → inconsistent PDF.
- Two different meanings of the word "template" visible in one script.

## Decisions (from brainstorming)

### Data model

- A script's format state is one of:
  - **locked**: persist a `formatTemplateId` (+ a `locked` marker). Format
    values are **resolved live** from the template definition at read time;
    nothing format-related is written to the per-script settings tables while
    locked. Updating a template definition in a future app release changes all
    locked scripts and their PDFs (chosen: live binding).
  - **custom/unlocked**: no association; the per-script settings tables hold
    the values (today's behaviour). This is also the state right after "apply
    as copy", "unlock", and "reset to Stagistic Default".
  - **Applying a template discards the script's previous custom format values.**
    There is no hidden "restore my old settings on unlock" — Unlock writes the
    template's *current* values into custom settings; Reset writes Stagistic
    Default. (Matches the pivot: a template is a preset you apply, not a toggle
    that preserves a shadow copy.)
  - An unlocked format matching all Stagistic Default format values reads
    **"Stagistic Default"**, without a lock or Reset action. Any format
    difference changes it to **"Custom"** and offers Reset; restoring the
    values manually restores the default label. Compare Page format,
    typography, block formatting, Header/footer and PDF flow; Script and
    Typing preferences remain independent. Matching other named templates by
    value comparison is **not** in phase 1.
- Drafts and versions already snapshot full settings; each snapshot likewise
  carries either a locked `formatTemplateId` or materialised custom values.
- `SCRIPT_DOCUMENT_SCHEMA_VERSION` is **not** bumped — this is projection/DB
  and UI, not `ScriptDocument` shape.

### Resolution

A single resolver produces the effective `EditorSettings` for a script/draft:
`locked → DEFAULT merged with template(formatTemplateId)`;
`custom → DEFAULT merged with stored override` (today's path). Editor, export
preview and PDF all consume this resolver so lock holds everywhere.

### UI — Script settings

- Sidebar splits into two groups: **Script** (Title page, Initial pages,
  Visual preferences, Danger zone) then **Format** (Page format, Header and
  footer, Block settings), then a headerless **Danger zone** group last. The
  template select sits to the right of the **Format** group header:
  `🔒 DG Traditional ▾` (lock glyph only when locked).
- **Sidebar select (revised 2026-10-29).** Same compact bordered select, with
  a noninteractive current-format row (lock glyph only when locked), then a
  separator, **Reset to Stagistic Default**, and **Choose template…**. Reset
  is omitted while the format matches Stagistic Default. Reset opens the
  picker on Stagistic Default; Choose opens it on the applied template
  (Stagistic Default when Custom). Neither applies changes immediately.
  The picker marks Stagistic Default as Current when its values match.
- "Page layout" panel is renamed **Page format** and keeps page size
  (A4 / US Letter) + margins already present. **No font picker in phase 1:**
  all six phase-1 templates use Courier Prime (only embeddable monospace;
  char-based indents require monospace). The DG paper standards (Traditional /
  Modern / Musical) are typeset in Times, but honouring that needs a
  proportional-font layout — a later phase. Add a font control when a second
  embeddable monospace face exists.
- **Locked section = framed Format section (mockup B, decided 2026-10-29).**
  When locked, the Format section of each panel (Page format, Header and
  footer forced cells, Block settings) renders as one framed area. Its header
  bar replaces the plain Format heading: lock icon, **Format**, "· set by
  <template>", and one **Edit format ▾** menu button with: *Unlock to edit*
  (keep current values, edit every block freely — confirms "whole template"),
  *Use different template…* (opens the picker modal on the applied template),
  separator, *Reset to Stagistic Default*. Controls inside are visibly
  read-only (dimmed, no hover) — today only the switch looks disabled. Typing
  stays outside the frame and editable. Per-block reset actions hidden.
- Header/footer: a template may force specific cells (page-number cells); only
  those cells sit in the frame. Free cells stay editable.
- **Template picker modal (mockup P1, decided 2026-10-29)** replaces the apply
  confirmation dialog and is the only place a template is applied (sidebar
  quick pick, *Choose template…*, *Use different template…*, new script).
  Layout: vertical template list on the left, styled as our existing tabs
  turned vertical (`AttributeManagerDetailTabs`: muted text, active = text
  colour + indicator bar — on the left edge instead of the bottom), each with a
  one-line description; right side shows the template name, description,
  *changes vs current* chips and the readable sample page
  (`TemplateSamplePage`). ↑/↓ move the selection. Footer: **Lock to template**
  switch + help-icon tooltip, Cancel, primary `Use <template>`. Selection is a
  preview only; nothing changes until the primary action. Reuse existing
  components and tokens; no new visual language.
- "Reset" above the block level = apply Stagistic Default (as a copy).
  **Reset block settings** appears at the block-title level only when that
  block differs from its defaults, including Typing. It resets formatting,
  shortcut and next element for that block alone. Explicitly stored default
  values and changes to other blocks do not make this action appear.

### UI — new script

Template picker + **Lock to template** toggle (default on). Default template
`stagistic-default`.

### UI — export

- Rename the export "Template" selector (Basic / Integrated score) to **Export
  type** — UI strings only (`ExportControlPanel.tsx` label, `TemplatePicker.tsx`
  ariaLabel); `EXPORT_TEMPLATES` keys/components unchanged.
- Export sidebar's **Page flow** gains: each act on a new page, repeat
  character name after a page break, and **continuation mark** select
  (`none` default, then `(CONT'D)`, `(Cont.)`). When the script is locked these
  are preset + locked. In the narrow export panel, show a quiet single-line
  lock icon, template name and small **Edit** menu instead of the framed Format
  banner. Non-template flow options (e.g. scenes on odd pages) stay editable.
  The continuation-mark select is content-width and 26px high, beside its label.

### New block setting

- Stage direction gains **Wrap in parentheses**, rendered via pseudo-elements
  (like aside/note), not stored in text. `dg-traditional`, `dg-musical`,
  `samuel-french` enable it.

## Constraints / prerequisites

- **Persistence gap to fix first:** `spacingAfterEm` and `sceneNumberFormat`
  have no columns in `script_settings_blocks` and are not mapped in
  `packages/db/src/repo/config` — they do not survive a reload today. Templates
  set both, so add the columns + codec mapping. After schema edits run
  `moon run db:db-compile-migrations`. Migrations are hand-written (drizzle-kit
  generate has drifted).
- Indentation is character-based (Courier grid); the font option must stay
  monospace or the standards' indents misalign.
- Toolchain: typecheck/lint/format/tests via `moon run …` per AGENTS.md.
- Never commit — prepare changes + message for Milan.

## Left to the builder

- Exact storage shape for the locked marker (new columns on `scripts` /
  snapshot metadata vs a dedicated row) — pick the least-invasive fit with the
  existing `script_settings_*` tables and snapshot payload.
- Where template definitions live in code (a `packages/script` data module
  mirroring `blocks/specs`, exportable as typed `EditorSettings` overrides +
  PDF-flow presets + forced header/footer cells + font).
- How "chip shows matching template name until edited" is computed for custom
  scripts (value comparison vs. not showing it at all in phase 1).
- Precise disabled-state and a11y wiring for locked controls (reuse existing
  settings form primitives).
- Test coverage: resolver (locked vs custom), reload persistence of the two new
  block fields, apply/lock/unlock/reset transitions, export inheritance of lock.

## Open items to confirm before planning

(All resolved in brainstorming.)

- Final wording of "Export type" (vs Export layout/format) — soft, settle
  during export work.
