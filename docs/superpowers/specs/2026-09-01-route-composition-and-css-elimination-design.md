# Route Composition & CSS Elimination — Design

**Date:** 2026-09-01
**Status:** Awaiting review
**Relationship:** Completes phase 1 of
`2026-08-25-design-system-consolidation-design.md` (steps 5–6) and prepares
phase 2 (UnoCSS). Read that spec first; this one amends and finishes it.

## 1. Purpose

Push route standardization as far as it honestly goes, so the eventual UnoCSS
migration (phase 2) touches `packages/ui` and route-level *layout* only — never
route-local component CSS. Every reusable-looking piece a route currently
hand-rolls becomes a component in `packages/ui`; a route is left with
composition and its own layout.

This is the "biggest possible preparation" before UnoCSS: after it, no route
carries a `.module.css` that reimplements a shared pattern.

## 2. Strategic framing

Stagistic is expected to grow more editor-like applications under one umbrella.
The dividing line is therefore reuse, not tidiness:

- **Reusable skeleton → standardize.** Anything a second app would plausibly
  reuse — the sidebar frame, the list shell, cards, search field, settings
  scaffolding, modal shell, notices — moves into `packages/ui` with a named
  variant set and a variable contract.
- **App-bound content with heavy behaviour → leave it.** The editor's structure
  sidebar (DnD tree, act-title editing, scene rows, drop targets) stays in the
  route. We extract only the *reusable skeleton it sits in* (the sidebar frame,
  the row visual shell), never its content or handlers. A primitive must not
  learn what a scene, an act, or a character is (the Layer Dependency Rule).

## 3. Relationship to the consolidation spec — amendments

The consolidation spec's §10 listed eight steps. Steps 1–4 (audit, `--select-*`
triage, primitives, controls) and most of step 5 (patterns:
`SettingsGroup`/`SettingRow`, `Notice`, `IconButton`, `ModalDialog`) are done.
This spec finishes the remainder with three amendments:

1. **Editor is out of UnoCSS entirely** — and out of forced tokenization. The
   consolidation spec's step 7 (editor tokenization + chrome recomposition) is
   **dropped**. `packages/editor` keeps its CSS modules and its hardcoded
   pixels. It is not touched by this work or by phase 2.
2. **Residual singular route CSS is allowed** — but it does not stay a
   `.module.css` forever. A route that genuinely needs a style no component
   provides keeps a small local module *now* (UnoCSS does not exist yet), and
   phase 2 converts that residue to UnoCSS utilities inside the route. So the
   phase-1 end state is "route modules are either gone or genuinely singular,"
   not "one module remains."
3. **Build for multi-app reuse** (§2). Single-use is not a reason to skip
   extraction: a card or a list that lives in one route today is still promoted
   if a second app would reuse its shape.

Everything else — the layer model, the override contract (variant → variable →
`className`), the `--control-*`/`--menu-*` token names, the DESIGN.md §6 rules —
carries over unchanged.

## 4. Scope

In scope:

- `packages/ui` — five new reusable components (§5.1) and their catalog entries.
- `packages/app-routes` — apply existing and new components; delete route
  modules that reimplement a shared pattern; reduce genuinely-singular modules
  to the minimum and mark them for phase 2.

Out of scope:

- `packages/editor` — untouched. No UnoCSS, no tokenization.
- `apps/landing` — brand register, as before.
- Any UnoCSS introduction — that is phase 2.
- Feature or behaviour changes of any kind. This is a pure recomposition.

## 5. Component inventory

### 5.1 New reusable components (`packages/ui`)

Each owns **look** (frame, dividers, states, slot geometry) and exposes a small
variable contract. It owns no behaviour: selection, drag, editing, and data
live in the consumer, passed in through slots and props.

| Component | Layer | Props (variant set) | Variable contract | What it owns / what stays in the route |
|---|---|---|---|---|
| `ListPanel` | 3 | `bordered`, `inset` | `--list-bg`, `--list-edge`, `--list-radius`, `--list-gap` | Owns: bordered container, row dividers/gap, overflow. Stays: which rows, their data. |
| `ListRow` | 3 | `size` (`compact`\|`library`), `selected`, `interactive` | `--list-row-min-height`, `--list-row-padding`, `--list-row-gap` | Owns: row shell, `leading`/`children`/`trailing` slots, hover echo (`--state-hover`), selected edge (`--state-selected` + `--state-selected-edge`). Stays: drag handle, editable title, delete button, DnD attributes — passed into slots by the consumer. |
| `SidebarShell` | 3 | `—` | `--sidebar-head-height`, `--sidebar-pad` | Owns: sticky header region (`title`/`actions` slots) + scrollable body region + panel edge. Stays: the panel switcher content, the list, everything below the frame. |
| `ActionCard` | 3 | `variant` (`default`\|`primary`), `disabled` | `--action-card-pad`, `--action-card-radius` | Owns: icon + title + description card, hover lift + edge, focus ring, disabled wash, primary icon chip. Stays: the action's handler and copy. |
| `SearchInput` | 2 | `size` (`sm`\|`md`) | `--search-height`, `--search-radius`, `--search-icon-inset` | Owns: rounded field with leading search icon and cancel affordance. Stays: query state, results. |
| `Skeleton` | 1 | `shape` (`line`\|`block`\|`circle`) | `--skeleton-w`, `--skeleton-h`, `--skeleton-radius` | Owns: shimmer block honouring `prefers-reduced-motion`. Stays: how many, arranged how. |

`ListRow`'s two `size` values fold the two list families the audit found — the
28px compact sidebar row (structure/music/characters) and the 58px library row
(home). Height is a variable default per size, overridable per instance.

`Skeleton` is the one primitive here; it earns layer 1 by carrying no domain
knowledge and appearing in both the home library and future loaders. If the
audit finds it used in exactly one place with no second consumer in sight, it
stays a route-local element and is dropped from this list — decided in the
audit, not assumed.

### 5.2 Route migrations to existing components

No new component; the route deletes its module and composes what phase 1 built.

| Route CSS (lines) | Composes |
|---|---|
| 11 settings modules — `header-footer` (144), `page-layout` (84), `document-info` (66), `element/ElementSettingsPanel` (44), `ScriptEditorSettingsPanel` (46), `visual-preferences` (35), `danger-zone` (21), `initial-pages` (20), `element/ElementNumericControls` (12) | `SettingsGroup` / `SettingRow` / `PanelHeader`, `Select`, `SettingSwitch`, `IconButton` |
| 7 modals — `AddCharacterModal` (25), `AddMusicModal` (19), `DeleteMusicModal` (29), `ConvertSceneHeadingModal` (24), `DeleteSceneHeadingModal` (24), `MusicAttachmentPreviewModal` (44), `ScriptAttributeManagerModal` (22) | `ModalDialog` |
| `DraftSaveError` (13), `IntegratedScoreWarning` residue (14) | `Notice` |
| `ElementFormattingToolbar` (50) | `ButtonGroup` / `ToggleButtonGroup` / `IconButton` |

### 5.3 Sidebars — shell-only (the approved boundary)

`ListPanel`/`ListRow` and `SidebarShell` are visual shells. The consumer keeps
its behaviour and passes content into slots.

- **`ScriptStructureSidebar` (253)** — the hard case. It uses `SidebarShell` for
  the frame and `ListRow` for row shells, but keeps in the route: the DnD tree,
  drag handles, act-title editing, delete buttons, `data-dnd-*` states, scene
  placeholders. These ride in `ListRow`'s `leading`/`trailing` slots and as the
  row's own children. Its residual CSS — the drag-handle dot texture, DnD
  drag/drop visuals, act-title input — is genuinely singular and stays as a
  small module marked for phase-2 Uno. If shell-only still leaves the row
  fighting the shell, this one file falls back to fully singular (kept, marked
  for Uno) — the other three sidebars benefit from the shell regardless.
- **`ScriptMusicSidebar` (95)**, **`ScriptCharactersSidebar` (11)** — simpler
  lists; compose `SidebarShell` + `ListPanel`/`ListRow` cleanly, module deleted.
- **`SidebarPanelSelect` (131)** — a `Select` styled as an uppercase panel
  switcher; already on `--control-*`/`--menu-*` tokens from phase 1. Becomes a
  documented `Select` usage (variant or variable overrides), module deleted.
- **`SidebarMiniHeader` (37)** — folds into `SidebarShell`'s header region.

### 5.4 HomeRoute (360) — decomposition

Route keeps only its layout (`.content`/`.library`/`.libraryTools`/
`.listSection` — grid/flex arrangement), marked for phase-2 Uno. Everything
else extracts:

| Home CSS | Becomes |
|---|---|
| `.startAction*` (icon + title + description cards) | `ActionCard` |
| `.scriptList` + `.scriptRow` + `.scriptOpenButton` + `.scriptInfo` + `.scriptMeta` | `ListPanel` + `ListRow size="library"` (script row = row children; `ScriptActionsMenu` in `trailing`) |
| `.searchField` / `.searchIcon` / `.searchInput` | `SearchInput` |
| `.skeleton*` | `Skeleton` |
| `.noResults` / `.emptyLibrary` | `Notice variant="empty"` |
| `.errorState` | `Notice variant="error"` + `Button` |
| `.sortSelect` | `Select` usage (existing) |

### 5.5 Genuinely singular — kept now, Uno in phase 2

Not reimplementations of a shared pattern; they stay as small route modules and
are converted to route-level UnoCSS utilities in phase 2.

| Module (lines) | Why singular |
|---|---|
| `export/ExportPreview` (177) | Page schematic geometry — the consolidation spec already exempts it. |
| `settings/shared.module.css` (148) — the indent dual-range slider | Misnamed; it is one specific `IndentRangeSlider`. Either a dedicated control or kept singular — audit decides. |
| `element/ElementPreview` (60) | Script-content preview (mono register). |
| `export/modules/modules.module.css` (88 → residue) | Whatever remains after `SettingsGroup` extraction (`.countField`/`.orderField`). |
| `export/ExportControlPanel` (23), `ScriptExportRoute` (13), route layouts | Route-level layout. |

## 6. Normalization discipline

Same rule as the consolidation spec: unifying differing values is allowed, never
silently. Step 1 (audit) produces one normalization table covering every value
this recomposition would unify — row heights across the two list families,
card hover treatments, search-field metrics, sidebar header height — with sites
and risk, and **implementation does not begin until it is approved.** Anything
found mid-implementation is appended to the table and waits; it is not unified
on the spot. Screenshot snapshots update only where an approved row accounts for
the change.

## 7. DESIGN.md

The §6 rules from the consolidation spec already cover this work (Layer
Dependency, className Is Position Only, Declared Surface, Component Variables Are
Scoped, Variant Before Override, Routes Carry No CSS). Add one rule and one
note:

**The Reusable Skeleton Rule.** A route may hand-roll CSS only for its own
layout and for genuinely singular geometry. Any structure a second Stagistic
app would plausibly reuse — a frame, a list, a card, a field — is a component in
`packages/ui`, even if only one app uses it today. Single-use is not an
exemption; app-specific *behaviour* is.

Note under The Routes Carry No CSS Rule: the editor package is explicitly
exempt from the route-CSS and UnoCSS rules — it keeps CSS modules.

## 8. Verification

### 8.1 Commands (unchanged from the consolidation spec §9)

- `npx tsc -b`
- eslint + stylelint (`eslint --fix` is the formatter; not `vp lint`/`vp fmt`)
- `pnpm test` (node) and `test:browser` for `ui`, `app-routes`

### 8.2 Baseline discipline

Baseline established once with `git diff > patch` + `git apply -R` — never
`git stash` (commits land concurrently). `packages/editor` and `app-routes`
carry known pre-existing failing tests (recorded in the phase-1 tracker); they
are reported, not fixed here, and not counted as regressions.

### 8.3 Definition of "no visual change"

`/dev/ui` renders every new component × variant × state in light/dark at all
three `--size-scale` values. A recomposed route is compared against baseline
screenshots; any diff not backed by an approved normalization row is a defect,
not a reason to re-record.

## 9. Sequencing

Each step ships independently with typecheck, lint, and tests green.

1. **Audit.** Confirm the triage against current `main`; produce the
   normalization table; add the Reusable Skeleton Rule to DESIGN.md. —
   **Approval gate.**
2. **New components.** `Skeleton`, `SearchInput`, `ActionCard`, then
   `ListPanel`/`ListRow`, then `SidebarShell` — each with tests and `/dev/ui`
   entries. (Primitive → simple → shell order, so shells compose settled parts.)
3. **HomeRoute** recomposition — highest-value, self-contained, exercises
   `ActionCard`/`ListRow library`/`SearchInput`/`Skeleton`/`Notice` together.
4. **Settings panels** → `SettingsGroup`/`SettingRow` (9 modules).
5. **Modals** → `ModalDialog` (7 modules); **notices** → `Notice` (2).
6. **Editor sidebars** — music + characters fully; structure shell-only with its
   singular residue marked. The risk step; most review.
7. **Close-out.** Delete emptied modules; every remaining `app-routes` module is
   either genuinely singular (§5.5) or an approved exception, each with a
   one-line justification and a `phase-2 Uno` marker. Catalog + DESIGN.md synced.

## 10. Success criteria

- No `app-routes` `.module.css` reimplements a shared pattern. Every remaining
  module is genuinely singular geometry or route layout, listed in close-out
  with a justification and marked for phase-2 UnoCSS conversion.
- The five new components each have a documented variant set + variable
  contract and appear in `/dev/ui`, rendering in light/dark at all size scales.
- The editor structure sidebar keeps its DnD/editing behaviour intact, sitting
  in `SidebarShell` + `ListRow` shells (or, if it fought the shell, kept
  singular — recorded either way).
- `packages/editor` is untouched.
- Typecheck, lint, tests green; no screenshot updated without an approved
  normalization row.

## 11. Phase 2 readiness (not implemented here)

After this work, phase 2 introduces UnoCSS with a theme referencing layer-0
variables (`spacing: {md: 'var(--space-md)'}`, `colors: {surface:
'var(--color-surface)'}`), so `--size-scale` and light/dark keep working and
`tokens.css` stays the single source of truth. Phase 2 then converts the
components inside `packages/ui` and the residual route-*layout* CSS (§5.5) to
utilities. The editor is excluded. Phase 1 succeeds if that migration touches
`packages/ui`, `uno.config.ts`, and route layout — nothing in `packages/editor`
and no route component CSS, because there is none left.

## 12. Notes

Per `AGENTS.md`, this document is written but not committed. Commit is the
maintainer's.
