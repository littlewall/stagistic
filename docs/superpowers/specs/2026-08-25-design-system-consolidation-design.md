# Design System Consolidation — Design

**Date:** 2026-08-25
**Status:** Awaiting review
**Phase:** 1 of 2 (phase 2 = migration to UnoCSS)

## 1. Purpose

Consolidate the application UI into a component system where appearance is
expressed as named variants on props, and anything that cannot be a variant is
overridable through a declared CSS variable contract. The end state of phase 1
is a design system whose migration to UnoCSS in phase 2 touches
`packages/ui` and one `uno.config.ts` — not 32 route files.

This is a consolidation, not a redesign. Visual differences may be unified, but
only against a normalization table approved before implementation begins
(section 7).

## 2. Current state

The token layer is already strong. The component layer is not.

| Package | CSS modules | CSS lines | Assessment |
|---|---:|---:|---|
| `packages/ui` | 56 | 4,865 | Structured (atoms/molecules/organisms), but one-off dialogs carry local CSS instead of composing primitives |
| `packages/app-routes` | 32 | 2,265 | Route-local CSS reimplementing shared patterns |
| `packages/editor` | 23 | 2,021 | ProseMirror-bound; mostly legitimate, but hardcoded pixels throughout |
| `apps/landing` | 3 | 1,480 | Out of scope (brand register) |

What works today and must be preserved:

- `tokens.css` (343 lines) derives product neutrals from `--base-neutral` via
  relative color syntax; raw color values appear in only 5 files.
- `--size-scale` multiplies spacing, radii, font sizes, and control heights at
  runtime.
- Light/dark swap happens by re-declaring theme knobs on `:root[data-theme]`.
- The layer model (`--layer-shell-*`, `--layer-panel-*`) and the one-mechanic
  interaction states (`--state-hover`, `--state-selected`, `--state-current-*`,
  `--state-drop-edge`) are deliberate and documented in `DESIGN.md`.

What does not work:

**Missing primitives.** Measured across `app-routes` and `editor` CSS:

| Repeated declaration | Count | Missing primitive |
|---|---:|---|
| `display: flex` / `align-items: center` / `gap: *` | 68 / 67 / 55 | `Stack` |
| `color: var(--color-text-muted)` | 56 | `Text variant="muted"` |
| `white-space: nowrap` + `text-overflow: ellipsis` + `min-width: 0` | 27 / 9 / 18 | `Text truncate` |
| `background: var(--color-surface)` + border + radius | 18 / 14 / 10 | `Panel` |
| `position: absolute` + `--shadow-popover` | 25 | `Overlay` |
| `background: transparent` + `border: 0` + `cursor: pointer` | 29 / 17 / 27 | unstyled-button hand-rolling |

**Shared tokens wearing a component's name.** `tokens.css` declares roughly 40
`--select-*`, `--segment-*`, and `--bubble-menu-*` variables on `:root`. They
read as misplaced component contracts, but they are not: they are consumed by
components that are not a Select at all.

| Variable | Read by non-Select components |
|---|---:|
| `--select-button-height` | 15 |
| `--select-menu-item-hover-bg` | 10 |
| `--select-menu-item-active-bg` | 10 |
| `--select-menu-radius` / `--select-button-radius` | 8 / 8 |
| `--bubble-menu-icon-size` | 8 |

Consumers include `AppHeader`, `EditorToolbar`, `MusicPill`,
`EmptyEnterBlockChooserOverlay`, `InputTable`, `MultiComboBox`, `Input`, and
five Attribute Manager modules. In practice these are the application's shared
menu and control tokens, named after the first component that needed them.

This matters twice. It blurs the layer-0 boundary the UnoCSS theme must map in
phase 2, and it means the fix is *not* to move the declarations into
`.select { }` — that would silently strip the value from every consumer that is
not a descendant of a Select. Section 4.3 sets out the actual treatment.

**`className` passthrough on every component.** Every component in
`packages/ui` accepts and merges `className`, so any consumer can repaint any
component. Under CSS Modules this is merely undisciplined. Under utility classes
it becomes non-deterministic, because precedence is decided by stylesheet order
rather than attribute order.

**Hardcoded pixels.** 56 in `EditorSidebar`, 38 in `EditorBlockActionsOverlay`,
36 each in `AppHeader` and `MusicRangeOverlay`, 33 in `ScriptStructureSidebar`.
Each one silently opts out of `--size-scale`.

## 3. Scope

In scope:

- `packages/ui` — primitive consolidation, variable contracts, catalog entries.
- `packages/app-routes` — eliminate route-local CSS; promote shared patterns up.
- `packages/editor` — tokenization only. Editor chrome (toolbar, status bar)
  recomposed from primitives. ProseMirror selectors are not touched.
- `apps/web` — dev-only component catalog route.

Out of scope:

- `apps/landing`. It is the brand register and can follow later.
- Any actual UnoCSS introduction. That is phase 2.
- Feature or behaviour changes of any kind.

## 4. Target architecture

### 4.1 Layers

```
Layer 0  tokens.css          --space-md, --color-surface, --state-hover
Layer 1  primitives          Stack, Text, Panel, Overlay
Layer 2  controls            Button, Input, Select, Switch, Tag
Layer 3  patterns            ListPanel, SidebarShell, SettingRow, Modal, Notice
Layer 4  routes              HomeRoute, ScriptEditorRoute, …
```

A layer may depend on tokens and on layers below it, never above. Primitives
carry no domain knowledge: a primitive does not know what a script, a scene, or
a character is.

Layer 0 is the only layer the UnoCSS theme will map in phase 2. That is why
component variables must leave `:root` (section 4.3).

### 4.2 The override contract

Three levels, in order of preference:

| Level | Use when | Written as |
|---|---|---|
| 1. Variant prop | the appearance is a bounded, named set | `<Button variant="danger" size="sm">` |
| 2. CSS variable | the value is genuinely per-instance | `<Panel style={{'--panel-pad': 'var(--space-xl)'}}>` |
| 3. `className` | positioning by the parent only | `<Button className="col-span-2">` |

Each component declares a small set of overridable variables — typically three
to six, fewer for a primitive that does one thing. They are named, defaulted
from layer-0 tokens, listed in the component's type, and shown in the catalog.
Everything else is internal.

Primitives accept `className` freely — placement is their purpose. Controls and
patterns accept it as a documented layout-only escape hatch, enforced by lint
(section 8.3).

`Grid` in `packages/ui/src/organisms/Grid.tsx` already implements this pattern
(`--grid-template-columns` set through `style`). It is the reference.

### 4.3 Triaging the `--select-*` / `--segment-*` / `--bubble-menu-*` set

Each variable in that set is classified into one of two outcomes. The full
classification is produced by the audit (step 1) and approved alongside the
normalization table.

**Shared token — rename, stay in `:root`.** A variable read by components that
are not the one it is named after is a layer-0 token with a misleading name. It
keeps its declaration site and gets an honest one:

```css
/* Today */                      /* Target */
--select-menu-bg                 --menu-bg
--select-menu-item-hover-bg      --menu-item-hover-bg
--select-button-height           --control-trigger-height
--select-button-radius           --control-trigger-radius
```

Two target namespaces: `--menu-*` for popover menu surface and items, and
`--control-*` for trigger geometry shared by controls. These are the honest
names for what the ~19 consuming modules are actually asking for, and they are
what the UnoCSS theme maps in phase 2.

**Single-consumer — move into component scope.** A variable read only by its own
component moves onto that component's root class, name unchanged:

```css
/* Select.module.css */
.select {
    --select-button-bg: transparent;   /* default; overridable from outside */

    background: var(--select-button-bg);
}
```

Existing ancestor overrides keep working in this case — `HomeRoute`,
`SidebarPanelSelect`, `VisualPreferencesSettingsPanel`, and `FormSelect` all set
these variables on a wrapper that *is* an ancestor, so the cascade still reaches
the component and beats its own default.

`--segment-*` is the likely candidate for full scoping (its readers appear to be
the theme control alone) and `--bubble-menu-*` the likely candidate for
renaming, but neither is assumed here. The audit decides each variable on
evidence.

Renaming is mechanical and verifiable: after the rename, no `var(--select-…)`
may resolve to an undeclared name. A stylelint check plus a grep for
`var(--select-`, `var(--segment-`, `var(--bubble-menu-` outside the owning
component closes the step.

## 5. Component inventory

The surface inventory is not being rediscovered: `docs/design/UI_MAP_2026-08-04.md`
already enumerates every route, 20 modals, 15 panels, 4 sidebars, and a state
matrix. The audit re-verifies it against current `main` and extends it with the
CSS-level findings.

### 5.1 New primitives (layer 1)

| Component | Props | Variable contract | Replaces |
|---|---|---|---|
| `Stack` | `direction`, `gap`, `align`, `justify`, `wrap` | `--stack-gap` | hand-rolled flex blocks |
| `Text` | `variant` (body/muted/label/mono), `truncate`, `as` | `--text-color`, `--text-size` | muted colour + ellipsis triad; absorbs existing `SubtleText`, `Kicker`, `SectionTitle`, `PageTitle` |
| `Panel` | `layer` (shell/panel/float), `padding`, `bordered` | `--panel-bg`, `--panel-pad`, `--panel-edge` | surface + border + radius triad |
| `Overlay` | `placement`, `elevation` | `--overlay-bg`, `--overlay-shadow`, `--overlay-offset` | absolute + popover shadow blocks |

### 5.2 Patterns promoted from routes to `packages/ui` (layer 3)

| New component | Currently reimplemented in |
|---|---|
| `ListPanel` + `ListRow` | `ScriptStructureSidebar` (252 lines), `ScriptMusicSidebar` (124), `ScriptCharactersSidebar` |
| `SidebarShell` | `SidebarPanelSelect` (136), `SidebarMiniHeader` (37), `SidebarContextButton` (31) |
| `SettingsGroup` + `SettingRow` | `settings/shared.module.css` (148) and eight settings panels |
| `ToolbarButton` | `toolbarButton`, `formatButton`, `variableButton` — three names, one control |
| `Notice` (`variant`: warning/error/empty) | 3 × `warning`, 3 × `error`, 3 × `empty` across routes |

`ExportPreview.module.css` (203 lines) keeps a local module: the page schematic
is genuinely singular geometry, not a reusable pattern.

### 5.3 `packages/editor`

Hardcoded pixels convert to tokens or to `calc(<n>px * var(--size-scale))`.
Editor chrome — `EditorToolbar`, `EditorStatusBar`, `EditorCanvas` — recomposes
from primitives. Block, decoration, and overlay CSS bound to ProseMirror's DOM
stays as CSS modules.

## 6. Component catalog — `/dev/ui`

A route in `apps/web`, mounted only under `import.meta.env.DEV`, excluded from
the production bundle.

Renders every component × variant × state, with two global switches: theme
(light/dark) and `--size-scale` (sm/md/lg). The size-scale switch is a
deliberate regression trap — it is the property most easily broken by a
hardcoded pixel. Each entry lists its variable contract.

Deliberately dumb: one registry file per component group, no documentation
engine, no new build step.

It serves three purposes: reviewing normalization decisions visually, exposing
variants that no longer appear anywhere in the application, and proving in
phase 2 that the UnoCSS migration changed nothing.

## 7. Normalization decisions

Unifying differing values is allowed, but never silently. The audit produces a
table, and implementation does not begin until it is approved. Illustrative
shape — the rows are produced by the audit, not decided here:

| Property | Current values | Proposed | Sites | Risk |
|---|---|---|---:|---|
| panel padding | 12 / 14 / 16px | `--space-lg` (12) | 5 | low |

The same table carries the `--select-*` triage from section 4.3, one row per
variable, with its classification and target name.

Anything discovered mid-implementation that is not in the table is appended to
the table and waits for approval. It is not unified on the spot.

## 8. Rules to add to `DESIGN.md` §6

Written in the existing named-rule style, added as a `### Component contract`
subsection of §6 so no section renumbering is required.

**The Layer Dependency Rule.** Tokens, then primitives, then controls, then
patterns, then routes. A layer may use tokens and the layers below it, never the
layers above it. A primitive knows nothing about a script, a scene, or a
character.

**The className Is Position Only Rule.** `className` on a control or a pattern
may affect where the element sits in its parent — margin, grid or flex
placement, width. It may never affect how the element looks — background,
border, radius, padding, colour, typography. Those go through a variant or a
declared variable. Utility class precedence is decided by the stylesheet, not by
the attribute, so repainting through `className` is non-deterministic.
Primitives are exempt: placement is what they are for.

**The Declared Surface Rule.** A component's overridable variables are published
API: named, defaulted from tokens, listed in its type and in the catalog.
Typically three to six. Everything else is internal and may change without
notice.

**The Component Variables Are Scoped Rule.** A variable belonging to one
component (`--panel-pad`, `--overlay-offset`) is declared on that component's
own root class, not on `:root`. `:root` carries design tokens only. The
corollary is a naming obligation: a variable on `:root` must not be named after
a component, because the moment a second component reads it the name is a lie.
Shared control and menu values live in `--control-*` and `--menu-*`.

**The Variant Before Override Rule.** If an appearance recurs, it is a variant
with a name. A variable override is for a value that is genuinely per-instance.
Three call sites overriding the same variable to the same value is a missing
variant.

**The Routes Carry No CSS Rule.** A route composes components. If a route needs
a style no component provides, that is a missing component or a missing variant,
not a new `.module.css`. The exception is genuinely singular geometry, such as
the export page schematic.

## 9. Verification

### 9.1 Commands

- `npx tsc -b`
- `pnpm lint` (`eslint . && stylelint`) — `eslint --fix` is the formatter
- `pnpm test` (`vp test run`)
- `pnpm --filter @stagistic/<pkg> test:browser` for `ui`, `app-routes`,
  `editor`, `app-core`

### 9.2 Baseline discipline

Baseline is established once, with `git diff > patch` followed by
`git apply -R` — never `git stash`, because commits land concurrently.
`packages/editor` has known pre-existing browser-test failures (overlay
viewport-fit, cueCaret off-by-one). They are reported, not fixed as part of this
work, and not counted as regressions from it.

### 9.3 Screenshots and lint

Screenshot snapshots are updated only where an approved normalization decision
accounts for the change. Any other visual diff is a defect, not a reason to
re-record the snapshot.

A lint rule enforces The className Is Position Only Rule: on layer-2 and
layer-3 components, `className` values matching paint properties are rejected.
If this proves impractical as an ESLint rule, it degrades to a documented
convention plus review — the rule text stands either way.

## 10. Sequencing

Each step is independently shippable with typecheck, lint, and tests green.

1. **Audit.** Re-verify `UI_MAP` against current `main`, produce the
   normalization table, add the rules to `DESIGN.md`. — **Approval gate.**
2. **Resolve the `--select-*` set** per the approved triage: rename shared
   tokens to `--menu-*` / `--control-*`, scope single-consumer variables into
   their component. No visual change intended, but this step rewrites ~19
   consuming modules, so it is verified by grep for unresolved names plus a
   full browser-test run — not treated as trivially safe.
3. **Primitives** `Stack`, `Text`, `Panel`, `Overlay`, plus the `/dev/ui`
   catalog skeleton.
4. **Controls.** Remove repaint-through-`className`, declare variable
   contracts, add catalog entries.
5. **Patterns.** `ListPanel`, `SidebarShell`, `SettingsGroup`/`SettingRow`,
   `ToolbarButton`, `Notice`. This step produces most of the value.
6. **Route CSS removal**, route by route.
7. **Editor tokenization** and chrome recomposition.
8. **Close-out.** `DESIGN.md` synchronized, catalog complete.

Step 6 is large but low-risk. Steps 2 and 5 carry the risk — step 2 because it
rewrites variable names across packages, step 5 because it is where the design
decisions land — and both get the most review.

## 11. Success criteria

- `packages/app-routes` retains only `ExportPreview.module.css`, down from 32
  modules. Any further retained module carries a recorded justification in the
  close-out notes.
- No `:root` variable is named after a component that is not its only consumer.
  Every remaining `--select-*` / `--segment-*` / `--bubble-menu-*` variable is
  declared on its own component's root class.
- No hardcoded pixel value outside deliberate physical values (1px borders, 2px
  focus outlines) in the three in-scope packages.
- Every exported component has a documented variant set and variable contract,
  and appears in `/dev/ui`.
- `/dev/ui` renders correctly in light and dark at all three size scales.
- Typecheck, lint, and tests green; no screenshot updated without a
  corresponding approved normalization decision.

## 12. Phase 2 readiness (not implemented here)

Phase 2 introduces UnoCSS with a theme that references layer-0 variables rather
than literal values:

```ts
theme: {
    spacing: {md: 'var(--space-md)', lg: 'var(--space-lg)'},
    colors: {surface: 'var(--color-surface)', text: 'var(--color-text)'},
}
```

`p-md` then emits `padding: var(--space-md)`, so `--size-scale` and the
light/dark swap keep working unchanged, and `tokens.css` remains the single
source of truth. Components continue to expose variants as props; utility
classes live inside `packages/ui` and in route-level layout. Phase 1 succeeds if
that migration touches `packages/ui` and `uno.config.ts` and nothing else.

## 13. Notes

Per `AGENTS.md`, this document is written but not committed. Commit is the
maintainer's.
