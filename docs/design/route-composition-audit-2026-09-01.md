# Route-Composition Audit & Normalization Table (2026-09-01)

Deliverable of Task 1 in `docs/superpowers/plans/2026-09-01-route-composition-components.md`.
Establishes the canonical default for every override variable in spec §5.1, grounded in
**tokens that actually exist** in `packages/ui/styles/tokens.css`, and records which source
values each new component absorbs. **Plan 2** (route recomposition) replaces the source CSS
below with these components; any source value that does not fold cleanly is flagged for
spec §5.5 ("kept singular → UnoCSS in phase 2").

## Token reality check (why some spec-draft names changed)

The spec §5.1 contracts named a few tokens that **do not exist**. Corrected here:

| Spec-draft token | Status | Canonical replacement |
|---|---|---|
| `--color-accent-soft` | ❌ not declared | primary variant uses the existing **ink-invert** treatment (`--color-text` fill / `--color-surface` glyph), matching HomeRoute `.startActionPrimary` — no accent wash |
| `--color-on-accent` | ❌ not declared | same — glyph is `--color-surface` on `--color-text` chip |
| `--space-2xs` | ❌ not declared (scale floor is `--space-xs`) | `--space-xs` (or `--space-px`/`--space-none` where a hairline gap is wanted) |
| `--control-height-md` = 32px assumed to fit HomeRoute search | ⚠️ mismatch — search is **44px** | `SearchInput` owns its own `--search-height` scale (md = 44px·scale) rather than borrowing `--control-height-*` |

Confirmed-present tokens used below: `--state-hover`, `--state-selected`, `--state-selected-edge`, `--shadow-hairline`, `--color-surface`, `--color-surface-raised`, `--color-border`, `--color-border-subtle`, `--color-border-strong`, `--color-text`, `--color-text-muted`, `--color-accent`, `--color-status-danger`, `--radius-xs/-md/-lg/-full`, `--space-none/-px/-xs/-sm/-md/-lg/-xl`, `--control-height-sm/-md`, `--font-size-sm/-md`, `--font-weight-semibold`, `--line-height-snug/-normal`, `--letter-spacing-sm`, `--layer-panel-bg`, `--ease-standard`, `--duration-normal`, `--size-scale`.

## §5.1 Normalization table

### `Skeleton` (L1) — replaces HomeRoute `.skeleton*`
| Variable | Canonical default | Source it replaces |
|---|---|---|
| `--skeleton-w` | `100%` | implicit full-width |
| `--skeleton-h` | `calc(16px * var(--size-scale))` (line `12px`, **block `58px`**, circle = width) | `.skeletonRow` 58px, `.skeletonSearch` 44px (composed via override) |
| `--skeleton-radius` | `--radius-md` (line/circle `--radius-full`) | `.skeletonRow` radius-md, `.skeletonSearch` radius-full |
Shimmer: `linear-gradient(90deg, surface, surface-raised, surface)` @ 200% bg, `1.5s ease-in-out infinite`, keyframe `0%: -200%` → `100%: 200%` (matches source direction). Reduced-motion → static `--color-surface-raised`, no animation. **Folds cleanly.**

### `SearchInput` (L2) — replaces HomeRoute `.searchField`/`.searchIcon`/`.searchInput`
| Variable | Canonical default | Source it replaces |
|---|---|---|
| `--search-height` | md `calc(44px * var(--size-scale))`, sm `calc(36px * var(--size-scale))` | `.searchField --input-height` 44px |
| `--search-radius` | `--radius-full` | `.searchField --input-radius` radius-full |
| `--search-icon-inset` | `--space-lg` | `.searchIcon left: --space-xl` (normalized down one step) |
Input bg `--color-surface-raised`, border `1px transparent` (surface tint carries it, per DESIGN §"thick colored side borders" avoidance), focus-visible → `--color-border-strong`. Icon 18px·scale, `--color-text-muted`. **Folds cleanly.**

### `ActionCard` (L3) — replaces HomeRoute `.startAction*`
| Variable | Canonical default | Source it replaces |
|---|---|---|
| `--action-card-pad` | `--space-xl` | `.startAction padding: --space-xl` |
| `--action-card-radius` | `--radius-lg` | `.startAction radius-lg` |
Card: grid `auto minmax(0,1fr)`, gap `--space-lg`, align `start`, bg `--color-surface`, border `1px --color-border-subtle`. Hover (`:not(:disabled)`): `translateY(-1px)` + `--color-border-strong` + `--shadow-hairline` (reduced-motion drops the lift). Disabled: `not-allowed`, muted text, `color-mix(in oklch, surface 70%, transparent)`. Focus-visible: `--focus-ring`.
Slots: `icon`, `title` (md/semibold/snug), `description` (sm/muted/normal, `text-wrap: pretty`), **`error`** (sm/`--color-status-danger`) — *added to the spec-draft props* because `.startActionError` must survive the migration.
- **default** variant: bare icon 20px·scale, `--color-text-muted` → `--color-text` on hover.
- **primary** variant: border `--color-border`; icon becomes a **28px·scale ink chip** — `padding 5px·scale`, glyph `--color-surface`, bg `--color-text`, `--radius-xs`. (This is the ink-invert; no accent token.)
**Folds cleanly.**

### `ListPanel` (L3) — replaces HomeRoute `.scriptList` (and structure `.itemList` container)
| Variable | Canonical default | Source it replaces |
|---|---|---|
| `--list-bg` | `--color-surface` (HomeRoute overrides to `color-mix(in oklch, surface 70%, transparent)`) | `.scriptList` translucent bg |
| `--list-edge` | `--color-border-subtle` | `.scriptList` border |
| `--list-radius` | `--radius-lg` | `.scriptList` radius-lg |
| `--list-gap` | `--space-none` (rows self-separate via border/hover; gapped lists override) | `.itemList gap: 2px` (override), `.scriptList` gap 0 |
`overflow: hidden` (clips row corners to the radius). Props: `bordered` (default true), `inset` (padding `--space-xs`). **Folds cleanly.**

### `ListRow` (L3) — replaces HomeRoute `.scriptRow`/`.scriptOpenButton` + structure `.itemRow`/`.itemButton`
| Variable | Canonical default | Source it replaces |
|---|---|---|
| `--list-row-min-height` | **compact `28px`·scale**, **library `58px`·scale** | `.itemButton` 28px, `.scriptRow` 58px |
| `--list-row-padding` | compact `0 var(--space-md)`, library `var(--space-lg) var(--space-xl)` | `.itemButton` `0 --space-md 0 0`, `.scriptOpenButton` `--space-lg --space-xl` |
| `--list-row-gap` | `--space-sm` (library `--space-lg`) | `.scriptOpenButton gap --space-lg` |
Grid `auto 1fr auto` (`leading`/`main`/`trailing`). `interactive` → pointer + hover `--state-hover`. `selected` → `--state-selected` fill **plus `box-shadow: inset 0 0 0 1px var(--state-selected-edge)`**. Radius `--radius-md`.
⚠️ **Intentional visual change:** structure `.itemRow.active` today paints `--state-selected` **only** (no edge). The spec §5.1 asks `ListRow` to own a selected *edge* too; the token `--state-selected-edge` exists and is used elsewhere. Adding the inset ring is a deliberate consistency upgrade — **flagged for approval**.

### `SidebarShell` (L3) — replaces `SidebarMiniHeader.module.css` header + editor sidebar shells
| Variable | Canonical default | Source it replaces |
|---|---|---|
| `--sidebar-head-height` | `calc(44px * var(--size-scale))` (scoped to `.header`) | `SidebarMiniHeader .header` height |
| `--sidebar-pad` | `--space-lg` (scoped to `.body`) | sidebar body padding |
Header: sticky, `--layer-panel-bg`, `border-bottom 1px --color-border-subtle`, title uppercase/`--color-text-muted`/sm/semibold/`--letter-spacing-sm`, actions flex. Body: `overflow: auto; flex: 1; min-height: 0`. **Shell only** — no panel-switch/DnD/handlers. **Folds cleanly.**

## Values that do NOT fold (→ stay singular, spec §5.5, become UnoCSS in phase 2)

- **Structure `.dragHandle`** (radial-gradient dot texture), `.actTitle`/`.actTitleInput` (editable act heading), `.actDeleteButton` (hover-reveal danger mix), `[data-dnd-*]` states, `.scenePlaceholder`/`.dragOverlayRow` — all DnD/act-editing behaviour. Stays in the editor route; `ListRow` provides only the row skeleton it sits in.
- **HomeRoute `.startActions` grid** (3-up → 2-up populated → 1-up ≤720px) and `.libraryTools`/`.listSection` layout — route-owned layout, not a component.
- **`.sortSelect`** — a `Select` usage with per-instance `--control-trigger-*` overrides; migrates to `Select`, no new component.

## Sign-off checklist (approval gate)

1. Canonical defaults above use only real tokens — ✅ verified against `tokens.css`.
2. `ActionCard` gains an `error` slot beyond the spec-draft props — **needs OK.**
3. `ListRow` selected state gains an inset `--state-selected-edge` ring the structure sidebar lacks today — **needs OK.**
4. `SearchInput` keeps its own 44px/36px height scale rather than borrowing `--control-height-*` — **needs OK.**

## HomeRoute recomposition — delta table (2026-09-01, rulings 2026-09-02)

Every value the HomeRoute recomposition (plan `docs/superpowers/plans/2026-09-01-homeroute-recomposition.md`)
changes versus today's `HomeRoute.module.css`. Nothing outside this table is unified.
Risk column: **structural** = DOM moved, pixels identical; **visual** = pixels move; **drop** = a detail is removed.

| # | Delta | Today (route) | Component | Risk | Ruling |
|---|---|---|---|---|---|
| H1 | Primary-card icon chip host | chip bg on the `<svg>` itself (`.startActionIcon`) | `ActionCard` puts the chip bg on the `.icon` `<span>`, `<svg>` inside | structural | `ActionCard .icon > svg {width:100%;height:100%;display:block}` — the 28px chip with 5px padding yields an 18px glyph either way, so pixels are identical. Browser-test icon-bg selector moves `svg` → its wrapper. |
| H2 | Row hover host | `.scriptRow` (flex wrapper; `button.parentElement`) | `ListRow .row` (grid; button lands in `.main`, so `parentElement` = `.main`) | structural | Hover test selects the row itself via `button.closest('[class*="scriptRow"]')`. `--state-hover` value unchanged. |
| H3 | Error-state text colour | `<Text variant="muted">` + `Button` | `Notice variant="error"` = `--color-status-danger` | visual | **APPROVED 2026-09-02: keep muted.** The error state is route layout over existing primitives, not a reimplemented pattern — it does not move to `Notice`. `.errorState` stays as residual layout. |
| H4 | Empty / no-result vertical padding | `.emptyLibrary` `3xl 0`, `.noResults` `5xl 0` | `Notice variant="empty"` carries no padding | structural | Padding is route layout — stays as a thin wrapper class on `Notice`. Text treatment (centered, muted, md, pretty) is what `Notice empty` already renders. |
| H5 | Search field metrics | icon `left: --space-xl`, text starts 42px, **32px tall** | phase-1 `SearchInput`: icon `left: --space-lg`, text starts 34px, right padding 12px, 44px tall | visual | **APPROVED 2026-09-02: solve with component variants, not a route override.** `SearchInput` is rebuilt as a thin wrapper over `Input`, so height, focus, hover and placeholder stay `Input`'s and only the icon-inset arithmetic is the component's. `md` = the library search (pill: `surface-raised`, transparent border, `radius-full`, `--font-size-md`, 18px glyph at `--space-xl`, text at 42px, right padding 42px); `sm` = the dialog search (plain: default bg/border/radius, `--control-trigger-font-size`, 1rem glyph at `--space-md`, text at 32px, right padding `--control-trigger-padding-inline`). Shared: `--search-icon-gap: --space-md` and `--search-text-inset = inset + size + gap`. **Supersedes sign-off item 4 — the phase-1 "44/36 height scale" was measured wrong.** Both real search sites stand at `--control-trigger-height` (32px·scale, browser-measured 34.55px at `--size-scale` 1.08); HomeRoute's `.searchField --input-height: 44px` never applied, because `Input`'s own `[data-size='sm']` declaration outranks an inherited custom property. The size names now carry the chrome, not a second height scale. |
| H6 | Skeleton stagger | `.skeletonRow:nth-child(2/3)` `animation-delay .1s/.2s` | `Skeleton` has no per-instance delay | drop | **APPROVED 2026-09-02: drop.** Three synchronized shimmer blocks. |
| H7 | Script-row internals | `.scriptOpenButton` owns the row padding (`--space-lg --space-xl`) and `flex: 1` | `ListRow size="library"` owns min-height 58px + `--space-lg --space-xl` padding + `--space-lg` gap; open button is row content, menu is `trailing` | structural | Button drops its padding and `flex: 1` (`width: 100%` inside `.main`); keeps its inner `auto 1fr auto` grid and inset focus ring. Row height and left inset unchanged. See H11 for what does move. |
| H8 | List panel background | `.scriptList` `color-mix(in oklch, var(--color-surface) 70%, transparent)` | `ListPanel` `--list-bg: var(--color-surface)` (opaque) | visual → neutralized | Preserved with a one-line `--list-bg` override on the route's panel class. The translucent library surface is deliberate; it is not normalized away here. |
| H9 | Row divider | `.scriptRow` `border-bottom 1px --color-border-subtle`, none on `:last-child` | neither `ListPanel` nor `ListRow` draws dividers | visual → neutralized | The divider stays as route residue on the row class. (The plan's claim that `ListPanel` supplies it was wrong — verified against `ListPanel.module.css`.) |
| H10 | Row corner radius | `.scriptRow` square; hover wash is full-bleed | `ListRow .row` `border-radius: --radius-md` → rounded hover fill | visual → neutralized | `ListRow` gains `--list-row-radius`; `library` sets it to `--radius-none` (a full-bleed row inside a bordered panel has no corners of its own). `compact` keeps `--radius-md`. |
| H11 | Row inset owner + open-button hit area | the open button owns the row's `--space-lg --space-xl` inset and stretches, so the whole row is one click target | `ListRow library` would own the inset, confining the button to `.main` | hit area | **Preserved, not normalized.** Letting the row own its padding measured out as a click target collapsing from 61.6px to **19.4px** inside a 62.6px row (the button shrink-wraps to its tallest child once it has no padding) — a behaviour change, which the plan forbids. The route therefore sets `--list-row-padding: 0; --list-row-gap: 0; align-items: stretch` on the row and keeps `padding` + `height: 100%` on the button, and the ⋯ menu keeps its `margin-right: --space-md`. `ListRow library` still owns min-height, hover, radius and the slot geometry. Row, button, menu and meta boxes are byte-identical to the pre-change baseline. |
| H12 | Search input states | react-aria `Input`: `[data-focused]` → `--state-selected-edge`, `[data-focus-visible]` → `--focus-ring`, hover → `--control-trigger-hover-bg`, placeholder `--color-text-placeholder` | phase-1 `SearchInput` raw `<input>`: `:focus-visible` → `--color-border-strong`, `outline: none`, no hover, placeholder `--color-text-muted` | visual + a11y | Fixed by H5's rebuild — wrapping `Input` restores the focus ring (phase-1 `SearchInput` dropped it), the focus edge, the hover tone and the placeholder colour. No route-side compensation needed. |

| H13 | Start-card error announcement | `<span role="alert">` inside the card copy | `ActionCard`'s `error` slot had no role | a11y | `ActionCard` now renders its error slot as `role="alert"` — the announcement is a property of the slot, not of one route's markup. |
| H14 | Empty-library alignment | `.emptyLibrary` on `<Text variant="muted">` — **left-aligned**, line-height from `Text` | `Notice variant="empty"` centers and uses `--line-height-normal` | visual | **The one accepted visual change in this recomposition.** "No scripts yet." moves left → center and its line box grows 3px (69.8px → 72.9px block). Spec §5.4 maps `.emptyLibrary` to `Notice empty`, and the neighbouring "No scripts match …" is already centered, so the two empty states now read alike. Revert if unwanted: keep `<Text variant="muted">` for the empty library and use `Notice` only for the no-result copy. |
| H15 | `ListRow` slot layout (component bug found by measurement) | — | `.row` was `grid-template-columns: auto 1fr auto`; with `leading` omitted, `.main` landed in the `auto` track and `.trailing` took the `1fr`, so the row shrink-wrapped and the ⋯ menu sat right after the title instead of at the right edge | correctness | `.row` is now `display: flex` with `.main { flex: 1 1 auto; min-width: 0 }` and `.leading`/`.trailing { flex: 0 0 auto }`. Optional slots cost no track and no gap. HomeRoute was `ListRow`'s first consumer, so nothing else was affected. |

### Residual `HomeRoute.module.css` after Tasks 2–5 (route layout + row content — phase-2 UnoCSS targets)

Stays: `.content`, `.startActions`/`.startActionsPopulated`, `.library`, `.libraryTools`, `.listSection`,
`.sortSelect`, `.scriptPanel` (H8 `--list-bg`), `.scriptRow` (H9 divider, H11 inset owner, icon-hover echo),
`.scriptOpenButton` (inner grid, inset, focus ring), `.actionsMenu` (H11 right inset), `.scriptIcon`,
`.scriptInfo`, `.scriptTitle`, `.scriptSubtitle`, `.scriptMeta`, `.skeleton`, `.skeletonSearch` (the search
bar's slot height/radius), `.skeletonList`, `.emptyLibrary`, `.noResults`, `.errorState`, and the
`@media (max-width: 720px)` block. 174 lines, down from 353.

Deleted: `.startAction`, `.startActionIcon`, `.startActionCopy`, `.startActionTitle`, `.startActionDescription`,
`.startActionError`, `.startActionPrimary`, `.scriptList`, `.searchField`, `.searchIcon`, `.searchInput`,
`.skeletonRow`, `@keyframes shimmer`, and `.noResults`' own `text-align` (now `Notice empty`'s).

**Cascade note.** Three residual rules override a component's own class-level declaration, so each is written
two classes deep (`.listSection .scriptPanel`, `.skeleton .skeletonSearch`, and the `--list-row-*` custom
properties on `.scriptRow`). A single-class override would tie on specificity and be decided by CSS-module
bundle order, which is not something a route should depend on.

**Verification.** Both states were browser-measured before and after (geometry, colours, radii, padding,
font sizes) for: search input + icon, list panel, row, open button, ⋯ menu, meta text, all three start cards,
their icon chips, and the empty state. Everything matches the baseline to the hundredth of a pixel except
H14, which is the one approved-in-report visual change.

## Settings panels recomposition — delta table (2026-09-02)

Step 4 of spec §9. Prepared by reading all nine modules and their `.tsx` consumers before writing
anything — step 3 established that the phase-1 audit's numbers cannot be trusted as measurements.

Three of the spec's premises for this step do not survive that reading, so they appear below as
rulings rather than as instructions: `SettingRow` fits none of these panels (S4), `shared.module.css`
is a widget rather than shared settings chrome (S5), and the real duplication is the 8× panel shell
plus `TitlePageSettingsPanel`'s local copy of `formControlStyles` (S2, S8).

| # | Site | Today | After | Kind | Ruling |
|---|---|---|---|---|---|
| S1 | Panel heading tag | 8 panels render `<h3>`; `PanelHeader` renders `<h2>` | `PanelHeader level={3}` | a11y | **Needed.** Recommend adding a `level` prop. Changing the panels to `h2` would alter the document outline, which the "no accessibility change" constraint forbids. |
| S2 | Panel shell | `.panelStack` = `flex column; gap: --space-2xl`, repeated identically in all 8 panels | `SettingsGroup gap="2xl"` = `grid; gap: --space-2xl` | none if measured equal | **Needed.** Grid and flex column are equivalent for block children, but that must be proven by measurement before adoption, not assumed. |
| S3 | Preview colour tokens | 7 `--color-preview-*` custom properties declared on `.panelStack`, plus a `[data-theme='dark']` override | stay in the route module on a new `.panelTokens` class, passed via `SettingsGroup className` | none | Mechanical. The tokens are consumed by `ElementPreview`, the page schematic and the indent slider, so they cannot move into the component. |
| S4 | `SettingRow` | unused by every editor settings panel | stays unused here | none | **Needed.** As shipped it is `flex; align-items: center; height: --control-trigger-height` — a horizontal fixed-height row. The editor panels are vertical label-over-control fields, i.e. `formControlStyles.field`. Its only correct consumers are the export modules, via the `ExportSettingsLayout` alias. Forcing it here would be a visual change, not a recomposition. **Supersedes the spec §9 step-4 wording.** |
| S5 | `settings/shared.module.css` (148 lines) | route module | unchanged, marked `phase-2 Uno`, revisited at step 7 | none | **Needed.** Despite the name, all 148 lines are `.indentSlider*` — one dual-range slider with a single consumer (`ElementPreview`). It is a widget, not a settings pattern. Deferred alongside `ElementPreview.module.css` and `ElementFormattingToolbar.module.css`. |
| S6 | Hardcoded mono stacks | the literal `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace` in `shared.module.css` `.indentSliderLabels`, `page-layout` `.pageSchematicZone`/`.pageSchematicContent`, and `element/ElementNumericControls` `.shortcutPrefix` | unchanged in this step | token debt | **Needed.** These bypass the token system *and* put mono on UI chrome rather than script content, which cuts against the standing "mono is reserved for script content" rule. Recommend tabling: it is a token decision, not a composition one. (`header-footer` `.previewCell` uses `var(--font-family-mono)` legitimately — that cell renders script header/footer text.) |
| S7 | Dead classes | `.placeholderCard` and `.panelDescription` in `ScriptEditorSettingsPanel.module.css` — zero references anywhere in `app-routes` | deleted | none | Mechanical. |
| S8 | `TitlePage` `.field` / `.label` | local re-declaration | `formControlStyles.field` / `.label` | none | Mechanical — proven byte-identical below. |
| S9 | `initial-pages` `.fields` | `grid; repeat(2, minmax(0,1fr)); gap --space-xl; @900px → 1fr` — **no `margin-top`** | `formControlStyles.flatGrid` + local `.flushGrid { margin-top: 0 }` | none | **Corrected 2026-09-02.** This row originally claimed `.fields` carried `margin-top: --space-xl` and was therefore byte-identical to `.flatGrid`. It does not, and it is not. `.flatGrid` does carry the margin (for its pre-existing consumers `structure-markers` and `element/ElementNumericControls`), so adopting it unmodified added 17.28px, doubling the gap `.section` already supplies. Caught by measurement, not by reading. |
| S10 | `page-layout` `.pageSettingsGrid` | as S9 but `repeat(3, …)` | `formControlStyles.flatGrid` + `--flat-grid-columns: 3` | none | **Needed.** Requires adding a `--flat-grid-columns` custom property to the shared `.flatGrid`, defaulting to 2. |
| S11 | `element` `.resetButton` | hand-rolled 40-line pill: `--control-height-xs`, `--radius-full`, transparent bg, `--font-size-xs`, 13px icon, own hover/focus | `Button size="xs" variant="outline"` + residual radius/icon override | visual, likely | **Needed.** Must be measured before and after. If `Button` cannot reproduce the metrics, the route class stays and the difference becomes a new delta row. |
| S12 | `danger-zone` `.dangerTitle` | `--color-status-danger` | unchanged | none | **Needed.** Confirm the HomeRoute ruling of 2026-09-02 ("keep muted, no danger red") does *not* generalise here — that ruling was about an error notice, whereas this section is genuinely destructive. |

**APPROVED 2026-09-02.** The maintainer approved every recommendation above as written: `PanelHeader`
gains a `level` prop (S1); `SettingsGroup` gains a `gap` variant and the grid/flex equivalence is proven
by measurement (S2); `SettingRow` is not used by the editor panels and the spec §9 wording is superseded
(S4); `shared.module.css` defers to step 7 (S5); the hardcoded mono stacks are tabled as token debt rather
than fixed here (S6); `.flatGrid` gains `--flat-grid-columns` (S10); `.resetButton` becomes a `Button` only
if measurement proves parity, otherwise the difference returns as a new row (S11); the danger-zone red stays,
because the HomeRoute "no danger red" ruling was about an error notice, not a destructive section (S12).

### S11 outcome — `.resetButton` stays hand-rolled (measured 2026-09-02)

S11 was approved conditionally: adopt `Button` *only* if measurement proves parity, otherwise the
difference returns as a new row. Measurement says no, so the route class stays. `Button` has no `xs`
size (`'icon' | 'sm' | 'md'` only), and its smallest real size is a 40px control against a 26px pill:

```
                     .resetButton          Button variant=outline size=sm
box                  68.58 × 25.91         102.83 × 40.3
min-height           25.92px               0px
padding              0 8.64px              8.64px 17.28px
gap                  4.32px                8.64px
font-size            11.88px               14.04px
colour               oklch(.465 …) muted   oklch(.155 …) text
icon                 14.03 × 14.03         21.05 × 21.05
radius / background / border / font-family / font-weight   → identical
```

Reaching parity would mean overriding min-height, padding, gap, font-size, colour, icon size, the
hover colour and border-colour, and the focus ring — i.e. re-declaring almost all of `.resetButton`,
at `.resetButton.resetButton` specificity to beat `.button.sm` (0-2-0). That is not a recomposition,
so the control is left as it is and recorded here as the residual difference.

The rest of Task 5 did land: `ElementSettingsPanel`'s heading is now `PanelHeader level={3}`, measured
identical to the local `<h3>` — heading x 0 / w 58.03 / h 25 / 19.44px / weight 600 / margin 0, reset
button at x 1211.42 / w 68.58, row height 25.91, with `PanelHeader`'s wrapper collapsing exactly onto
the heading. `.panelTitle` is deleted from `ScriptEditorSettingsPanel.module.css`.

### Proven-identical pairs (diffed rule-by-rule, 2026-09-02)

```
TitlePage   .field { display:flex; flex-direction:column; gap:6px }
formControl .field { display:flex; flex-direction:column; gap:6px }                  → identical

TitlePage   .label { font-size:--font-size-sm; font-weight:--font-weight-semibold; color:--color-text-muted }
formControl .label { font-size:--font-size-sm; font-weight:--font-weight-semibold; color:--color-text-muted }
                                                                                     → identical

initial-pages .fields   { display:grid; grid-template-columns:repeat(2,minmax(0,1fr));
                          gap:--space-xl; @900px → 1fr }
formControl   .flatGrid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr));
                          gap:--space-xl; margin-top:--space-xl; @900px → 1fr }
                                                              → NOT identical: margin-top only.
                                                                Cancelled locally by .flushGrid.
```

### Measured parity for the flat grid (2026-09-02)

Every consumer measured at the default 1280px viewport, before and after, via a temporary probe
(`getBoundingClientRect` + `getComputedStyle`) round-tripped against HEAD with `git diff` / `git apply -R`.

```
initial-pages    columns 631.359px 631.375px  gap 17.28  margin-top 0      cells y=80.86
                 sections y=44.59 / 162.69                                 → identical to HEAD
page-layout      columns 415.156px ×3         gap 17.28  margin-top 17.28  cells y=72.48
                                                                           → identical to HEAD
.flatGrid alone  columns 631.359px 631.375px  gap 17.28  margin-top 17.28
(unparameterised, as used by structure-markers and ElementNumericControls) → identical to HEAD
```

The unparameterised measurement is what proves `repeat(var(--flat-grid-columns, 2), …)` is invisible
to the two consumers that pre-date this step and never set the variable.

### Residue each module keeps

```
ScriptEditorSettingsPanel.module.css → .panelTokens (7 OKLCH preview tokens + dark override).
                                       Singular: the preview widgets are the only consumers.
header-footer/                       → the whole composer — .previewSection/.previewLabel/.previewRow/
                                       .previewCell/.activeCell/.left/.center/.right/.previewText/
                                       .editor/.editorToolbar/.fixedNote*/.formattingGroup/
                                       .activeFormat/.variables/.variableButton. One header/footer
                                       composer exists in the product.
page-layout/                         → .pageSchematic* (the page diagram). Singular.
document-info/                       → .section/.title/.hint/.draftDateRow/.draftDateField/
                                       .subFieldLabel/.checkboxLabel/.draftDatePreview.
                                       The draft-date row is singular.
visual-preferences/                  → .inlineRow/.selectCompact/.previewPrefix/.previewDots/
                                       .previewDot. Singular.
initial-pages/                       → .section/.sectionTitle.
element/ElementSettingsPanel         → .panelHeader (title + reset, space-between) and whatever
                                       .resetButton residue S11 leaves.
element/ElementNumericControls       → .shortcutField/.shortcutPrefix. Already on formControlStyles
                                       for its fields.
danger-zone/                         → .dangerCard/.dangerHeader (pending S12).
shared.module.css                    → all 148 lines (indent slider), per S5.
```

### Note on `.panelTitle`

`.panelTitle` survives the shell recomposition and is deleted only once `ElementSettingsPanel`'s
header moves to `PanelHeader` — that panel puts its heading in a flex row beside the reset button,
so it cannot adopt `PanelHeader` until the button beside it is a `Button`. This is sequencing, not
an oversight.

### Step 4 close-out (2026-09-02)

All twelve rulings are implemented or explicitly closed:

| # | Outcome |
|---|---|
| S1 | Implemented. `PanelHeader` gained `level?: 2 \| 3 \| 4`; the tag and the type size are independent, so an `h3`/`h4` keeps `--font-size-2xl` unless a caller overrides it. |
| S2 | Implemented. All 8 panel shells are `SettingsGroup gap="2xl"`. Measured identical: rowGap 21.6px, heading 19.44px/600, children y 0 / 44.59 / 162.69. |
| S3 | Implemented. Tokens live on `.panelTokens` in the route module, passed via `SettingsGroup className`. |
| S4 | Closed unused, as ruled. `SettingRow` is untouched by the editor panels. |
| S5 | Deferred to step 7, as ruled. |
| S6 | Tabled as token debt, as ruled. The three hardcoded mono stacks are unchanged. |
| S7 | Implemented. `.placeholderCard` and `.panelDescription` deleted. |
| S8 | Implemented. `TitlePage` uses `formControlStyles.field`/`.label`; `.hint` lifted to top level, measured unchanged (12.96px, muted, opacity .7). |
| S9 | **Corrected** — see the row above. `.flatGrid` adopted plus a local `.flushGrid { margin-top: 0 }`. |
| S10 | Implemented. `--flat-grid-columns: 3` on `.threeColumn`; measured `415.156px` ×3, identical to HEAD. |
| S11 | **Not adopted** — see the S11 outcome above. `.resetButton` stays hand-rolled. |
| S12 | Confirmed as ruled. The danger red stays; `.dangerTitle`/`.dangerDescription` folded into `PanelHeader level={4}` with a size/colour override, measured identical (h4 21px tall at 16.2px/600 in `oklch(.54 .1273 14.8)`, description 14.04px muted, header gap 2.16px, section gap 12.96px), and the copy including `<strong>` and its surrounding spaces is byte-identical. |

**Deferred to step 7, unchanged by this step:** `settings/shared.module.css` (148 lines, all `.indentSlider*`),
`ElementPreview.module.css` and `ElementFormattingToolbar.module.css`. All three are one widget each with a
single consumer, so they are widget extractions rather than settings-chrome deduplication — the same reason
recorded under S5.

**Residue after step 4** — every surviving class in the settings tree, with why it survives:

```
ScriptEditorSettingsPanel  .panelTokens          7 OKLCH preview tokens + dark override. Consumed by the
                                                 preview widgets, so it cannot move into the component.
danger-zone/               .dangerCard           the card. Singular.
                           .dangerHeader         tighter gap + the h4 size/danger colour over PanelHeader.
document-info/             .section .title       the draft-date grouping. Singular.
                           .hint .draftDateRow .draftDateField .subFieldLabel
                           .checkboxLabel .draftDatePreview
initial-pages/             .section .sectionTitle
                           .flushGrid            cancels .flatGrid's margin (see S9).
page-layout/               .threeColumn          --flat-grid-columns: 3 + the shared leading margin.
                           .pageSchematic*       the page diagram. Singular.
element/                   .panelHeader          the title-plus-reset flex row.
                           .resetButton          see S11 — Button cannot reach 26px.
header-footer/             the whole composer    .previewSection/.previewLabel/.previewRow/.previewCell/
                                                 .activeCell/.left/.center/.right/.previewText/.editor/
                                                 .editorToolbar/.fixedNote*/.formattingGroup/
                                                 .activeFormat/.variables/.variableButton.
                                                 One header/footer composer exists in the product.
structure-markers/         (none beyond the shared grid)
visual-preferences/        (none beyond the shell)
```

`.center` in `header-footer` and the `.indentSlider*` set in `shared.module.css` read as unreferenced to a
naive grep; they are reached via `styles[alignment]` and via the `sharedStyles` import alias respectively.
Neither is dead.

