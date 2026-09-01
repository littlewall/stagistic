# Token triage — component-named variables on `:root`

**Date:** 2026-08-25
**Branch:** rewrite
**Spec:** `docs/superpowers/specs/2026-08-25-design-system-consolidation-design.md` §4.3

A variable declared on `:root` but named after one component is a shared token
with a misleading name as soon as a second component reads it. This document
classifies every such variable on evidence, and records the normalization
decisions that follow.

## Method

Each variable's readers were collected with:

```bash
grep -rlE "var\(--NAME[,)]" --include="*.css" packages apps \
  | grep -v node_modules | grep -v dist | grep -v 'styles/tokens.css'
```

A variable read by any component other than the one it is named after is
classified **shared**. A variable read only by its own component is
**single-consumer**. A variable read nowhere is **dead**.

## Classification

| Variable group | Count | Readers | Class | Target |
|---|---:|---|---|---|
| `--select-button-*` | 11 | Select, Input, InputTable, MultiComboBox, formControlStyles, EditorToolbar, SidebarPanelSelect, HeaderFooterSettingsPanel, ScriptAttributeManagerModal, export modules, AttributeManager List/Places/Characters panels (13 files) | shared | `--control-trigger-*` |
| `--select-icon-size` | 1 | Select, EditorToolbar | shared | `--control-icon-size` |
| `--select-chevron-size` | 1 | Select, EditorToolbar, SidebarPanelSelect | shared | `--control-chevron-size` |
| `--select-menu-*` (non-item) | 7 live, 1 dead | Select, MultiComboBox, EditorToolbar, SidebarPanelSelect | shared | `--menu-*` |
| `--select-menu-item-*` | 9 | Select, MultiComboBox, EditorToolbar, SidebarPanelSelect, ScriptSettingsModal, AttributeManager Modal/ListPanel/PlacesPanel/CharactersPanel | shared | `--menu-item-*` |
| `--select-menu-offset` | 1 | none | dead | delete |
| `--segment-*` | 5 | AppHeader only | single-consumer | scope into `AppHeader.module.css` |
| `--bubble-menu-*` | 9 | MusicPill, EmptyEnterBlockChooserOverlay — both are bubble menus | shared, honestly named | leave on `:root`; revisit in the Patterns plan |

`--bubble-menu-*` is deliberately kept. The rule forbids naming a shared token
after a component that is not its consumer; here both consumers *are* bubble
menus, so the name is accurate. It becomes a component contract when the bubble
menu is extracted as a pattern component.

## Already an override API

`--select-button-*` is re-declared outside `tokens.css` in four places, each
retuning a trigger the file owns:

| File | Overrides |
|---|---|
| `packages/app-routes/src/routes/home/HomeRoute.module.css:169-173` | height, padding-inline, font-size, bg, border-color |
| `.../sidebar/SidebarPanelSelect.module.css:2-4` | height, font-weight, radius |
| `.../visual-preferences/VisualPreferencesSettingsPanel.module.css:13` | height |
| `packages/ui/src/molecules/forms/FormSelect.module.css:2-11` | border-color, bg, height (md and lg) |

Three of these four — `HomeRoute`, `VisualPreferencesSettingsPanel` and
`FormSelect` — only declare the properties and never read them with `var()`,
so they are absent from the Readers column above by design. `SidebarPanelSelect`
does both. A rename must still touch all four, which is why Task 3 greps for
name occurrences (17 files) rather than for `var()` reads (13 files).

The group is therefore a published override surface, not Select's private
business. That is the strongest argument for renaming rather than scoping it,
and it is the concrete case behind The Declared Surface Rule.

## Normalization decisions

Seven properties currently read a custom property that is declared nowhere. A
`var()` with no fallback that names an undeclared property makes the whole
declaration **invalid at computed-value time**: the property resolves to
`unset`, not to the cascaded value. Every row below is therefore a live defect,
not a tidy-up.

| # | Site | Reads | Effect today | Proposed | Visible |
|---|---|---|---|---|---|
| N1 | open select trigger `:hover`, 3 files | `--select-menu-hover-bg` | trigger loses its fill on hover while open | delete the `:hover` rule; the open trigger keeps `var(--menu-bg)` | yes |
| N2 | `HomeRoute.module.css:97` | `--color-danger` | destructive text inherits body colour instead of red | `var(--color-status-danger)` | yes |
| N3 | `MusicRangeOverlay.module.css:75` | `--color-warning` | warning text inherits body colour instead of yellow | `var(--color-status-warning)` | yes |
| N4 | `ElementSettingsPanel.module.css:31` | `--color-link` in fallback position | none today — the primary `--color-focus-ring` is declared, so the fallback never evaluates | simplify to `var(--color-focus-ring)` | no |
| N5 | `EditorSidebar.module.css:18` | `--font-weight-regular` | weight inherits instead of 400 | `var(--font-weight-normal)` | yes |
| N6 | `SidebarPanelSelect.module.css:26`, `AttributeManagerListPanel.module.css:101,172` | `--letter-spacing-wide` | uppercase mono labels get no tracking at all | `var(--letter-spacing-sm)` (.02em) | yes |
| N7 | `EditorStatusBar.module.css:15`, inside `@media (max-width: 1199px)` | `--toolbar-toggle-width` | `grid-template-columns` collapses to `none` below 1200px; the status bar loses its three-column layout | declare `--toolbar-toggle-width: var(--control-height-md);` on `.statusBar` | yes, under 1200px |

**N1 detail.** Affected sites:

- `packages/ui/src/molecules/forms/Select.module.css:76`
- `packages/editor/src/editor/components/EditorToolbar.module.css:158`
- `packages/app-routes/src/routes/script/editor/sidebar/SidebarPanelSelect.module.css:44`

The alternative — declaring `--menu-hover-bg` and giving the open trigger a
distinct hover — was rejected under The One Mechanic Per State Rule: the open
state is already carried by the expanded menu, and a second mechanic on the
trigger duplicates it.

**N6 detail.** All three sites are small uppercase mono labels. `--letter-spacing-wide`
has never existed; the scale is `tight / normal / sm / md / lg / xl`. `md` (.05em)
was proposed on the grounds that the author wrote "wide". **Decided: `sm` (.02em)**,
because that is what every comparable uppercase label in the repo already uses and
consistency outranks the guessed intent of a name that never resolved.

**N7 detail.** `--toolbar-toggle-width` is read in exactly two places and set in
none: `EditorStatusBar.module.css:15` (no fallback — the defect) and
`useResponsiveScale.ts:25` (`var(--toolbar-toggle-width, 0px)` — has a fallback,
so it silently measures 0). The comment at `useResponsiveScale.ts:16` calls it "a
calc() expression"; that comment is not treated as evidence of intent, since it
may predate the code around it. **Decided: `var(--control-height-md)`**, giving the
toggle a square footprint matching the other toolbar controls.

This closes the CSS reader only. `useResponsiveScale.ts:25` appends its probe to
the editor *shell root*, which is an ancestor of `.statusBar`, and custom
properties inherit downward only — so that probe still resolves the `0px`
fallback, exactly as it did before this change. That is a pre-existing behaviour,
not a regression introduced here, and repairing it means either declaring the
property on an ancestor or probing inside the status bar. Both are behaviour
changes to the editor's responsive scaling and need visual verification, so they
are deliberately out of scope for a tokenization-only pass over `packages/editor`.

## Runtime-injected properties

Five properties are legitimately declared from TypeScript inline styles rather
than in CSS. They are not defects and are allowlisted in the guard test:

| Property | Set at |
|---|---|
| `--character-color` | `EditorSidebar.tsx:101,126,163`, `CharacterColorControl.tsx:57`, `AttributeManagerCharacterDetail.tsx:193` |
| `--editor-sidebar-width` | `buildRootStyle.ts:37` |
| `--left-sidebar-size` | `buildRootStyle.ts:38` |
| `--right-sidebar-size` | `buildRootStyle.ts:39` |
| `--music-pill-anchor` | `MusicPill.tsx:200` |

`--toolbar-toggle-width` looks like a sixth but is not: nothing sets it. It is
N7.

## Out of scope here

Spacing, radius, and padding divergences across panels are not yet tabled. They
are collected in the Primitives plan, where `Panel` and `Stack` make the
divergence visible and the decision meaningful.
