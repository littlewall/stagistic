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


---

## Step 5 audit (2026-09-03) — modals and notices

Spec §9 step 5 reads "Modals → `ModalDialog` (7 modules); notices → `Notice` (2)". As with step 4, the
framing is stale: **all eight app-routes modals already render inside `ModalDialog`**, and the one notice
that the spec points at already renders inside `Notice`. Shell adoption is done. What is left is the
duplicated chrome *inside* the panel, and it spans `packages/ui/src/dialogs` too — the spec's seven-module
list is a subset of the real surface.

### Measured baseline (chromium, viewport 1280, `--size-scale: 1.08`)

Probe mounted `DeleteSceneHeadingModal` and `AddCharacterModal` and read `getBoundingClientRect` +
`getComputedStyle` off the rendered panel.

| | `DeleteSceneHeadingModal` (confirm) | `AddCharacterModal` (form) |
|---|---|---|
| panel width | **520px** | **520px** |
| panel padding / gap | 30.24px / 12.96px | 30.24px / 12.96px |
| `h2` size / weight | 16.2px / 600 | 23.76px / 700 |
| actions gap | 4.32px | 8.64px |
| actions margin-top | 17.28px | 0px |

### Finding A — every `panelClassName` width override is dead CSS

`ModalDialog.module.css` nests the panel rule: `.dialog { & .panel { … } }`, i.e. specificity **0-2-0**.
`ModalDialog.tsx` renders `<div className={clsx(panelClassName, styles.panel)}>`, so a consumer's
single-class `.panel` is **0-1-0** and loses every declaration it tries to override. Measured: both modals
render at 520px, not at the 360px and 420px×scale their own modules ask for.

Dead rules, confirmed by measurement and by specificity:

```
packages/app-routes  editor/scene/DeleteSceneHeadingModal   .panel width min(360px, …)
                     editor/scene/ConvertSceneHeadingModal  .panel width min(360px, …)
                     editor/music/DeleteMusicModal          .panel width min(360px, …)   (also used by UnassignMusicModal)
                     editor/music/AddMusicModal             .panel width min(420px * --size-scale, 100%)
                     editor/characters/AddCharacterModal    .panel width min(420px * --size-scale, 100%)
packages/ui          dialogs/CreateCharacterModal           .panel width min(420px * --size-scale, 100%)   (also used by CreateGroupModal)
                     dialogs/CreatePlaceModal               .panel width min(420px * --size-scale, 100%)
                     dialogs/ImportScriptModal              .modal — all 9 declarations duplicate .dialog .panel, all inert
```

`ScriptSettingsModal` is the one that works, and it works because it sets `--modal-panel-gap/-padding/-width`
custom properties instead of the properties themselves — custom properties resolve on the element, so
specificity never enters into it. That is the supported override channel.

### Finding B — two divergent confirm dialects

Nine confirm modals, one structure (`h2` question → `p` explanation → danger + ghost buttons), two visual
specs that have drifted apart:

| | Dialect A — `packages/ui` (`dialogForm.module.css`) | Dialect B — `packages/app-routes` |
|---|---|---|
| consumers | `RemoveCharacterModal`, `RemoveGroupModal`, `RemovePlaceModal`, `RemoveAttachmentModal`, `DeleteScriptModal` | `DeleteMusicModal`, `UnassignMusicModal`, `DeleteSceneHeadingModal`, `ConvertSceneHeadingModal` |
| title | `--font-size-3xl` (23.76px), inherited weight 700 | `--font-size-lg` (16.2px), `--font-weight-semibold`, `margin: 0` |
| subtitle | `--color-text-muted` only; spacing from the panel's flex gap | `+ margin-top --space-md`, `--font-size-sm`, `line-height normal` |
| actions | gap `--space-md`; consumers add `margin-top --space-lg` | gap `--space-sm`, `margin-top --space-xl` |

`ConvertSceneHeadingModal.module.css` and `DeleteSceneHeadingModal.module.css` are **byte-identical**;
`DeleteMusicModal.module.css` differs only by a nested `& strong` in `.subtitle`. `UnassignMusicModal.tsx`
already reaches across directories to `import styles from './DeleteMusicModal.module.css'` — the duplication
is being worked around by hand today.

### Finding C — the form dialect is already unified, just not shared

`AddCharacterModal.module.css` (app-routes) and `CreateCharacterModal.module.css` (ui) are the same four
rules: 420px panel (dead), `.title` 3xl, `.form` flex-column gap `--space-xl`, `.actions` flex gap
`--space-md`, plus `.error`. `AddMusicModal` is the same minus `.error`; `CreatePlaceModal` is the same
expressed through `composes:`. The one real divergence is that `dialogForm`'s `.form` carries
`margin-top: var(--space-md)` — used by `NewScriptModal` / `RenameScriptModal` / `ImportScriptModal`, not by
the 420px group.

`dialogForm.module.css` is **not exported** from `@stagistic/ui` (only `formControlStyles` is), which is why
app-routes hand-copies it rather than composing it.

### Finding D — the two spec'd notices

| module | state | note |
|---|---|---|
| `export/IntegratedScoreWarning` | **already `Notice variant="warning"`** | residual `.warningExtras` is local layout only (own margin, button reset, `ul` padding). Nothing to do. |
| `settings/DraftSaveError` | hand-rolled banner, **not** a `Notice` | 8%-danger fill, 28%-danger border, `--radius-md`, padding, `space-between` row. `Notice variant="error"` is *only* `color: --color-status-danger` at `--font-size-sm` — no box at all. Swapping it in deletes the banner. Sole instance of this treatment repo-wide (grepped `color-status-danger) 8%`). |

### Finding E — out of scope

`ScriptAttributeManagerModal` is not a `ModalDialog` consumer at all; it renders `AttributeManagerModal`.
Its module holds no modal chrome — only `.deleteButton` and `.actionIcon`. The spec row is stale.

`MusicAttachmentPreviewModal` matches the user's "shell + header, body fully custom" ruling exactly: the
body is a PDF canvas host. Its header is the only shared-shaped part, and it is written in raw px
(`.title` 16px/600, `.header` `margin-block-end: 12px`) rather than tokens — within a rounding hair of
`--font-size-lg` × 1.08 = 16.2px and `--space-lg` × 1.08 = 12.96px.

### Step 5 rulings (approved 2026-09-03)

| # | Ruling |
|---|---|
| M1 | **Scope: both packages.** `packages/app-routes` *and* `packages/ui/src/dialogs`. Unifying only app-routes would leave the two dialects standing side by side. |
| M2 | **Confirm modals unify onto dialect A** (the `dialogForm` spec, 5 of the 9 consumers, and the one that already matches the form modals). The four app-routes confirms change visually: title `--font-size-lg`/600 → `--font-size-3xl`/700, actions gap `--space-sm` → `--space-md`, actions margin `--space-xl` → `--space-lg`, subtitle loses its own `margin-top`/`font-size-sm`. Approved as a normalization row. |
| M3 | **Dead `.panel` widths are deleted, 520px stays.** Pure recomposition, no visual change. Reviving the authored widths through `--modal-panel-width` is explicitly *not* part of this step. |
| M4 | **`DraftSaveError` stays hand-rolled.** A banner is a different object from an inline notice, and it is the only instance repo-wide. The spec row is not applicable. `IntegratedScoreWarning` already satisfies its row; no change. |
| M5 | **Non-confirm modals keep only the shell plus a header/footer slot**; bodies stay fully custom (user's ruling). Form modals adopt `ModalHeader` + `ModalActions`, their `<form>` bodies are untouched. |

#### M2 rider — the decimal pixels are systemic, not local

The maintainer's condition on M2 was that the unified values be "normal" numbers rather than `16.2px` /
`23.76px` / `4.32px`. Those decimals cannot be fixed inside a modal: `styles/tokens.css` defines **every**
spacing, radius, font-size and control token as `calc(<whole px> * var(--size-scale))` with
`--size-scale: 1.08`. The authored bases are already integers and the spacing ramp is already a clean 4px
series (2, 4, 8, 12, 16, 20, 24, 28, 32, 40, 48); the font ramp is ad hoc (10, 11, 12, 13, 15, 16, 18, 22, 35).
The single global 1.08 multiplier is what produces every fraction in the app.

So step 5 changes nothing here beyond making sure the shared components reference tokens only, which means
all nine confirm modals move together whenever the scale is normalized. **The whole-number pass is recorded
as a separate task to run across the repo before the UnoCSS rewrite**, not as part of this step.

### Step 5 — Tasks 1–3 measured outcomes (2026-09-03)

**Task 1.** `modalChrome.module.css`, `ModalHeader`, `ModalActions`, `ConfirmModal` added to
`packages/ui/src/dialogs` and exported. `ModalHeader` returns a **fragment**: the heading and its
paragraphs are direct flex children of the panel and take its `gap: 12.96px`, so a wrapper element would
silently collapse that spacing. Parity probe against the then-current `RemoveCharacterModal`:
**diffCount 0** across panel geometry, title, all three paragraphs (including `<strong>` innerHTML),
actions row, button labels and the child tag sequence `H2, P, P, P, DIV`.

**Task 2 — five `packages/ui` confirms.** `RemovePlaceModal`, `RemoveAttachmentModal`,
`RemoveCharacterModal`, `RemoveGroupModal` → `ConfirmModal`; `DeleteScriptModal` → `ModalHeader` plus its
own `DeleteScriptConfirm` body. Three modules deleted; `RemoveGroupModal`'s cross-file import of
`RemoveCharacterModal.module.css` is gone. Probe over 9 cases (incl. pending states, missing-title
fallbacks, conditional notes): **0 diffs** before the colour fix below.

**New finding — the UA `dialog` rule breaks token inheritance.** The UA stylesheet sets
`color: CanvasText` on `<dialog>`, and a *specified* value outranks inheritance from `body`. So text
inside any modal that does not set its own colour renders pure black in light mode and pure white in
dark (`color-scheme` follows the theme), never `--color-text`. Dialect B set `color: var(--color-text)`
on its titles and was therefore correct; dialect A did not. `modalChrome .title` now sets it explicitly.

**Task 3 — four `packages/app-routes` confirms.** `DeleteMusicModal`, `UnassignMusicModal`,
`DeleteSceneHeadingModal`, `ConvertSceneHeadingModal` → `ConfirmModal`; three modules deleted.
Measured over 9 cases, the delta set is **uniform across every case** — no per-modal surprise — and is
exactly the approved M2 list:

```
H2.fontSize      16.2px  -> 23.76px      (--font-size-lg -> --font-size-3xl)
H2.fontWeight    600     -> 700
P.fontSize       12.96px -> 14.04px      (--font-size-sm -> inherited --font-size-md)
P.lineHeight     19.44px -> normal       (follows from dropping the sm/normal pairing)
P.marginTop      8.64px  -> 0px          (spacing now comes from the panel's own gap)
DIV.marginTop    17.28px -> 12.96px      (--space-xl -> --space-lg)
DIV.gap          4.32px  -> 8.64px       (--space-sm -> --space-md)
```

HTML, `childTags` and button state are byte-identical in every case. Panel height drops 4.36px
(`DeleteMusicModal`) to 5.78px (the rest).

**Colour delta, reported because Task 2 was billed as zero-change.** With `.title` now setting
`color: var(--color-text)`, the four app-routes titles keep the colour they already had, and the five
`packages/ui` titles move `rgb(0, 0, 0)` → `oklch(0.155 0.014135 51)`. Re-measured: that is their
**only** delta against HEAD. It is a correction — those headings were never meant to be pure black.

**Follow-up, not acted on:** the same UA rule still applies to every *other* uncoloured string inside
every modal (bodies, labels, hints). Fixing it at the root would be one declaration —
`color: var(--color-text)` on `ModalDialog`'s `.panel` — but it moves text in all 14+ dialogs at once,
so it needs its own normalization row.

**`tokens.test.ts`.** Its dev-catalog assertion is designed to fail on a newly exported component until
someone catalogues it or consciously lists it. `ConfirmModal`, `ModalActions` and `ModalHeader` were added
to `NOT_CATALOGUED_YET` alongside `ModalDialog` and every other dialog, which is the documented mechanism —
the catalog covers primitives and controls, and no modal is in it.

### Step 5 — Tasks 4–6 measured outcomes (2026-09-03)

**Task 4 — nine form modals adopt the header/footer slots (M5).** `AddCharacterModal`, `AddMusicModal`
(app-routes); `CreateCharacterModal`, `CreateGroupModal`, `CreatePlaceModal`, `NewScriptModal`,
`RenameScriptModal`, `DuplicateScriptModal`, `ImportScriptModal` (ui). Each `<h2 className={styles.title}>`
(plus its `<p className={styles.subtitle}>` where present) became `<ModalHeader title description />`, and
each `<div className={styles.actions}>` became `<ModalActions>`. Every `<form>` body is untouched.

`.title`, `.subtitle` and `.actions` were then deleted from all nine modules and from
`dialogForm.module.css`, which is left with `.form`, `.label` and `.input`. No `composes:` reference to the
three removed rules survives anywhere in either package.

Measured on three representatives covering both dialects and both packages — `CreatePlaceModal`
(420px group, composes `dialogForm`), `RenameScriptModal` (title + subtitle) and `AddCharacterModal`
(app-routes local dialect). The **only** delta in the whole dump is the already-reported colour
correction:

```
H2.color   rgb(0, 0, 0) -> oklch(0.155 0.014135 51)     (UA CanvasText -> --color-text)
```

Panel `520px` / `30.24px` padding / `12.96px` gap, `H2` `23.76px` / `700`, form `gap: 17.28px`, actions
`gap: 8.64px` / `flex-start`, and every rect position and size are byte-identical before and after.

The one real divergence noted in the plan stays as it is: `dialogForm .form` carries
`margin-top: var(--space-md)` and the 420px group's local `.form` does not. `.form` is body, not chrome.

**Task 5 — the dead panel CSS is gone (M3).** Deleted `.panel` from `CreateCharacterModal.module.css`,
`CreatePlaceModal.module.css`, `AddMusicModal.module.css` and `AddCharacterModal.module.css`, `.modal`
from `ImportScriptModal.module.css`, and the six matching `panelClassName` props (`CreateGroupModal`
passed `styles.panel` from `CreateCharacterModal.module.css`). `ScriptSettingsModal` keeps its
`panelClassName` — it overrides through `--modal-panel-*` custom properties, which is the channel that
actually works.

Confirmed inert by property, not just by measurement: `ModalDialog`'s `.dialog & .panel` (0-2-0) declares
exactly `display`, `flex-direction`, `gap`, `width`, `padding`, `background`, `border`, `border-radius`
and `box-shadow`, which is a superset of every property the deleted 0-1-0 rules declared. Post-delete
probe of `ImportScriptModal` and `CreatePlaceModal`: both still `520px` / `30.24px` / `12.96px`, with all
nine properties matching `ModalDialog`'s panel exactly.

**Task 6.1 — `IntegratedScoreWarning`: no change.** It already renders `Notice variant="warning"`;
`.warningExtras` is local layout only (block margin, plus `font`/`color`/`text-align` resets on its
descendant buttons and padding on its list). Nothing in it duplicates what `Notice` provides.

**Task 6.2 — `DraftSaveError` stays hand-rolled (M4).** `Notice` renders a single `<div>` with a variant
class and no slots. `DraftSaveError` is a `justify-content: space-between` banner with a trailing
`Button`, its own padded/bordered `color-mix` surface and a `--radius-md` corner; `Notice variant="error"`
supplies only `font-size: var(--font-size-sm)` and `color: var(--color-status-danger)`. Converting it
would mean either adding a wrapper element inside the notice or extending `Notice` with an action slot —
an API change, not a recomposition. Its `role="alert"` already matches what `Notice` would default to.

**Task 6.3 — `MusicAttachmentPreviewModal` header tokenized.** Body stays custom (M5). Changed:

```
.header  margin-block-end  12px -> var(--space-lg)              12px    -> 12.96px
.title   font-size         16px -> var(--font-size-lg)          16px    -> 16.2px
.title   font-weight       600  -> var(--font-weight-semibold)  no change
.pages   gap               12px -> var(--space-lg)              12px    -> 12.96px
```

Every delta is sub-pixel, as predicted. `--font-size-lg` (15px base) is chosen over `--font-size-xl`
(16px base) deliberately: with `--size-scale: 1.08` it renders 16.2px, the nearest computed value to the
current 16px, where `--font-size-xl` would jump to 17.28px. The title's line box grows 20px → 21px and the
panel 173.42px → 175.38px, which is that 0.2px of type plus the 0.96px of margin.

`.message { padding: 24px }` was **left raw**: `--space-3xl` would move it 24px → 25.92px, which is above
the sub-pixel threshold this task was allowed to spend. `.page`'s `box-shadow: 0 1px 4px` has no matching
token. Both are listed as residue below.

**Task 6.4 — `ScriptAttributeManagerModal`: out of scope (Finding E).** It is a full attribute-manager
workspace with its own panel system, not a modal that the shared chrome describes. The spec row that
lists it as a modal to unify is stale and should be rewritten before it is picked up again.

### Step 5 close-out

| Area | Outcome |
| --- | --- |
| Shared chrome | `modalChrome.module.css`, `ModalHeader`, `ModalActions`, `ConfirmModal` in `packages/ui/src/dialogs`, all exported |
| Confirm modals | 9 unified onto `ConfirmModal` (5 ui, 4 app-routes); 7 modules deleted |
| Form modals | 9 adopt `ModalHeader` + `ModalActions`; bodies untouched; `.title`/`.subtitle`/`.actions` deleted from 9 modules and from `dialogForm.module.css` |
| Dead panel CSS | 5 rules + 6 `panelClassName` props deleted; measured inert before and after |
| Notices | `IntegratedScoreWarning` unchanged; `DraftSaveError` stays hand-rolled (M4) |
| Preview modal | header tokenized, sub-pixel only; body custom |
| Visual delta, whole step | one row: modal `h2` colour `rgb(0, 0, 0)` → `--color-text`, plus the approved M2 confirm-dialect list and the sub-pixel preview-header moves |

**Residue — not addressed in step 5:**

- **The UA `dialog { color: CanvasText }` rule still applies to every uncoloured string inside every
  modal** (bodies, labels, hints). One declaration would fix it — `color: var(--color-text)` on
  `ModalDialog`'s `.panel` — but it moves text in all 14+ dialogs at once and needs its own
  normalization row.
- **`MusicAttachmentPreviewModal.module.css`**: `.message { padding: 24px }` and
  `.page { box-shadow: 0 1px 4px … }` are still raw px, deliberately (see Task 6.3).
- **`ImportScriptModal.module.css`**: `.optionRow`, `.checkbox` and `.optionText` are unreferenced — and
  were already unreferenced at HEAD, so this is pre-existing dead CSS rather than step-5 fallout. Left
  in place because it is a different finding from M3.
- **`ScriptAttributeManagerModal`**: stale spec row, see Task 6.4.
- **The whole-number pixel pass** across the repo before the UnoCSS rewrite — every decimal in this
  document comes from the single `--size-scale: 1.08` in `styles/tokens.css`.

## Step 6 audit (2026-09-03) — editor sidebars

Baseline: `15f75a74`, working tree otherwise clean. All numbers below are measured in Chromium via a
temporary browser probe that mounted replicas of the real class combinations and read
`getComputedStyle` (probe deleted afterwards; no source changed).

### Inventory

| Sidebar | tsx | css | classes | State |
| --- | --- | --- | --- | --- |
| `ScriptCharactersSidebar` | 172 | 11 | 2 | Already delegates to `EditorSidebar`; CSS is `.content` + `.sidebar`, both pure layout |
| `ScriptMusicSidebar` | 255 | 95 | 12 | Hand-rolled list + rows; the real convergence candidate |
| `ScriptStructureSidebar` | 322 | 253 | 20 (16 live, 4 dead) | DnD act/scene tree; spec says shell-only |

### Measured baseline

| Element | height | min-height | padding | gap | radius |
| --- | --- | --- | --- | --- | --- |
| music `.item` (active) | 30.23 | 30.24 | `0 0 0 8.64` | 8.64 | 8.64 |
| `ListRow size="compact"` (selected) | 30.23 | 30.24 | `0 8.64 0 8.64` | 4.32 | 8.64 |
| structure `.itemRow.sceneRow` (active) | 28 | auto | `0` | — | 8.64 |
| structure `.itemButton` | 28 | **28** | `0 8.64 0 0` | — | 8.64 |
| structure `.actRow` / `.actTitle` | 28 | **28** | `0 0 0 15.12` | 4.32 | 8.64 / 0 |
| `SidebarMiniHeader .header` | **34.55** | — | `0 4.32 0 12.96` | 4.32 | 0 |
| `SidebarShell .header` | **47.52** | — | `0 4.32 0 12.96` | 4.32 | 0 |
| music `.itemList` | — | — | `0` | 2px | — |
| structure `.itemList` | — | — | `0 12.96 12.96` | 2px | — |

Selected/active backgrounds are byte-identical across music `.item.active`, structure `.itemRow.active`
and `ListRow.selected`: `oklch(0.934614 0.0131013 32.3072)` plus `inset 0 0 0 1px
oklch(0.762545 0.0392292 350.916)`.

### Finding S-A — `SidebarShell` has no product consumer

`SidebarShell` is referenced only by its own test and by `apps/web/src/dev/registry/primitives.tsx`.
Nothing in `app-routes` uses it. The header that actually ships is `SidebarMiniHeader`, in `app-routes`.
The step-6 premise "sidebars adopt the shell primitive" is therefore inverted: the primitive is the
unproven copy, the route-local component is the real one.

The heights differ because `SidebarShell.module.css:9` locally overrides `--sidebar-head-height` to
`calc(44px * var(--size-scale))`, while `SidebarMiniHeader` inherits the global token
(`tokens.css:172` → `--control-height-md` → `calc(32px * var(--size-scale))`). 47.52px vs 34.56px.
Adopting `SidebarShell` as-is would grow every editor sidebar header by ~13px.

### Finding S-B — the two headers are otherwise the same rule

`SidebarMiniHeader .header` declares exactly the same properties as `SidebarShell .header`
(sticky, `z-index: 1`, `top: 0`, flex, `flex: none`, `gap: var(--space-sm)`, centred,
space-between, `height: var(--sidebar-head-height)`, `padding: 0 var(--space-sm) 0 var(--space-lg)`,
`background: var(--layer-panel-bg)`, `border-bottom: 1px solid var(--color-border-subtle)`), and adds
`margin-bottom: var(--space-lg)`. `.actions` is identical in both files. This is the strongest
de-duplication candidate in step 6 — but it needs a ruling on which height survives, and
`SidebarMiniHeader` carries three slots (navigation/actions/controls) against `SidebarShell`'s two.

### Finding S-C — music `.item` vs `ListRow size="compact"`

Same min-height, same radius, same selected background and inset ring. Four deltas, all of which
would need approval:

1. **Right padding** — `.item` has `padding-left: var(--space-md)` only; `ListRow` pads both sides.
   The action cluster would move 8.64px left.
2. **Gap** — `--space-md` (8.64px) → `--list-row-gap: var(--space-sm)` (4.32px).
3. **Layout mode** — `grid-template-columns: minmax(0, 1fr) auto` → flex with `.main { flex: 1 1 auto }`.
   Equivalent for this content, but the ellipsis on `.label` depends on `min-width: 0`, which both provide.
4. **Behaviour, not cosmetics** — `ListRow`'s `.interactive:hover` is 0-2-0 and outranks `.selected`
   (0-1-0), so hovering the *active* row would repaint it with `--state-hover`. Music deliberately
   writes `&:hover:not(.active)` to keep the selected background. Either music loses that, or
   `ListRow.module.css` is fixed in `packages/ui` (which also changes the home script list).
5. **Accessibility** — `ListRow` puts `aria-selected` on the row. Music puts `aria-current` on the inner
   button. Passing `selected` would add an ARIA attribute that is not there today, which the
   "same `aria-*`" constraint forbids; the class would have to be applied via `className` instead.

### Finding S-D — `ListPanel` does not fit either list

Both `.itemList`s are bare `<ul>`s: `display: grid; gap: 2px`, no surface, no border, no radius.
`ListPanel` sets `background: var(--color-surface)`, `overflow: hidden`,
`border-radius: var(--radius-lg)` and `--list-gap: var(--space-none)`. Adopting it would add a visible
panel where there is none and collapse the 2px row separation. Not a candidate.

### Finding S-E — structure rows never got `--size-scale`

Structure writes `min-height: 28px` raw in `.actTitle`, `.actRow`, `.itemButton` and
`.scenePlaceholder`; music and `ListRow` write `calc(28px * var(--size-scale))`. The two sidebars'
rows are 2.24px apart today. Pre-existing, not step-6 fallout, but it is the reason structure cannot
share a row primitive without a visual row.

Same class of residue in the same file: `padding-left: calc(14px * var(--size-scale))` on `.actTitle`
(15.12px, no token), `border-radius: calc(5px * var(--size-scale))` on `.actDeleteButton` (5.4px),
`min-height: calc(15px * var(--size-scale))` on `.dragHandle`, `outline-offset: -1.5px`, and the
opacity ramp `.3 / .52 / .55 / .72 / .96` (music adds `.38`). None of these are tokens.

### Finding S-F — 4 dead class blocks in the structure module

Verified per-directory (not repo-wide, to avoid the name-collision false negative from step 5): the
module is imported by exactly three files, and their combined usage is 16 classes. Unreferenced:

| Class | Lines | Note |
| --- | --- | --- |
| `.menu` (+ nested `.right`, `.item`) | 9–43 | A hand-rolled popover surface — dead |
| `.actPrefixButton` | 65–73 | Dead |
| `.itemButton.dragging` | 188–190 | Dead |
| `.dragHandleSpacer` | 223–227 | Dead |
| `.scenePlaceholder` | 242–246 | Dead |
| `.dragOverlayRow` | 248–253 | Dead |

63 declaration lines, about a quarter of the file.

### Finding S-G — `EditorSidebar` rows are a third dialect, deliberately

`EditorSidebar.module.css` `.characterRow` is `min-height: calc(30px * var(--size-scale))`,
`padding: var(--space-sm) var(--space-md)`, inside a `.characterItem` with a 1px border and
`radius-md`, and its `.active` state swaps the border out rather than adding an inset ring. It is a
bordered card row, not a compact list row. Converging it onto `ListRow` would be a redesign, not a
recomposition — out of scope.

### Finding S-H — the characters sidebar is already done

`ScriptCharactersSidebar` renders `SidebarMiniHeader` + `<EditorSidebar>` and owns 11 lines of pure
layout CSS. There is nothing to recompose.

### Step 6 rulings (approved 2026-09-03)

| # | Ruling |
| --- | --- |
| S1 | Music rows adopt `ListRow`. `selected` is **not** allowed to emit `aria-selected` — the row keeps `aria-current` on the inner button. Approved visual rows: right padding +8.64px, row gap 8.64 → 4.32px. |
| S2 | `SidebarMiniHeader` (+ `SidebarActionsGroup`) is promoted into `packages/ui/src/layout`; `SidebarShell`, its test and its dev-registry entry are deleted. Header height stays 34.56px. |
| S3 | Structure sidebar: delete the dead CSS from Finding S-F only. `min-height: 28px` stays; unifying it with music belongs to the whole-number pixel pass. |
| S4 | `ListRow.module.css` `.interactive:hover` is scoped to `:not(.selected)` in `packages/ui`. This also changes the home script list, where hovering the selected row currently repaints it. |

### Step 6 close-out

| Area | Outcome |
| --- | --- |
| `ListRow` (S4) | `.interactive:hover` scoped to `:not(.selected)`; new `announceSelected` prop lets a consumer take the selected surface without emitting `aria-selected` |
| Music rows (S1) | `MusicRow` renders `<ListRow as="li" interactive selected announceSelected={false}>`; the action cluster moved into `trailing`; `.item` and `.active` deleted from the module |
| Sidebar header (S2) | `SidebarMiniHeader` + `SidebarActionsGroup` moved to `packages/ui/src/layout`; `SidebarShell`, its module, its test and its `index.ts` export deleted; dev registry entry replaced by two entries |
| Structure (S3) | 69 lines of dead CSS removed (253 → 184); every remaining class is referenced |
| Visual delta, whole step | two rows, both approved under S1: music row gains 8.64px of right padding, row gap 8.64 → 4.32px. Header height, row height, radius, selected surface and inset ring measured byte-identical before and after |

**Regression caught by measurement.** `.label` truncated because it was a direct grid item of
`.item` in a `minmax(0, 1fr)` column. Nested inside `ListRow`'s `.main`, a long title widened the row
to 410px inside a 280px sidebar instead of truncating. Two declarations restore it:
`display: block; inline-size: 100%` on `.label`, and `grid-template-columns: minmax(0, 1fr)` on
`.itemList`. Re-measured: row 280px, `scrollWidth` 382 > `clientWidth` 251, truncation confirmed.

**Behaviour preserved deliberately:**

- The row is `<li>` with no `aria-selected`; `aria-current` stays on the inner button (S1).
- Non-navigable rows keep `cursor: default` via `.row.staticRow` — doubled so it outranks
  `ListRow`'s `.interactive`, which is what now supplies the hover surface.
- The actions reveal (`opacity: .38` → `1` on hover/focus-within) moved to `.row`, unchanged.

**Residue after step 6:**

- Structure's unscaled `min-height: 28px` (four rules), `padding-left: calc(14px * …)` (15.12px),
  `border-radius: calc(5px * …)` (5.4px) and the opacity ramp `.3 / .52 / .55 / .72 / .96` —
  deferred to the whole-number pixel pass (S3).
- `SidebarMiniHeader` keeps its name in `packages/ui` although "Mini" no longer has a counterpart;
  renaming a public export is a separate decision.
- `EditorSidebar`'s bordered 30px character rows remain a third row dialect (Finding S-G) —
  converging them would be a redesign.
- `packages/ui` node + browser suites fully green (70 / 112). `packages/app-routes` shows only the
  two known pre-existing reds: `prepareExampleScriptDocument.test.ts` (node) and
  `ScriptExportRoute.browser.test.tsx > renders exact-kind character catalog rows only` (browser).
  Every sidebar test passed unmodified.

---

## Step 7 close-out (2026-09-07)

Spec §9.7: *delete emptied modules; every remaining `app-routes` module is either genuinely
singular (§5.5) or an approved exception, each with a one-line justification and a `phase-2 Uno`
marker; catalog + DESIGN.md synced.*

### Findings

**S7-A — `SidebarPanelSelect.module.css` (131 lines) was still a copy of `Select.module.css`.**
Spec §5.3 lists it as "becomes a documented `Select` usage, module deleted", but step 6 covered only
the three list sidebars. Rule-by-rule the two files agreed: `.button` (surface, border, radius, the
`[aria-expanded='true']` joined-edge treatment and the `[data-menu-placement='above']` inversion),
`.menu`, `.item`/`.active` versus `.item`/`.itemActive`, `.chevron` and `.label` were the same
declarations against the same `--control-trigger-*` / `--menu-*` tokens. Success criterion §10.1 was
failing.

Four things genuinely differed, and only these needed new API:

| Difference | Why it is not a copy-paste artefact |
| --- | --- |
| uppercase, `--letter-spacing-sm`, `--control-height-xs`, semibold | The panel switcher's voice. Not reachable through the declared `--control-trigger-*` surface (`text-transform` is not a variable), so it is a variant, per The Variant Before Override Rule. |
| trigger shrinks to its own label | `Select`'s `full` stretches; its `content` mode pins the trigger to the *widest* option through a hidden sizer. The switcher is neither. Folded into the `panel` variant rather than a fourth `width` value. |
| menu pinned to one edge and grown from it | `Select`'s menu pins both edges, so it is exactly the trigger's width. The right sidebar's menu must open leftward. Became `align="start" \| "end"`. |
| open and choose on `mousedown` with the default prevented | Focus must not leave the ProseMirror canvas. Became `preserveFocus`, documented as editor-chrome-only. |

Plus `menuAriaLabel`, so the listbox keeps the name "Left sidebar panel" instead of inheriting the
trigger's uppercase text. Every addition is optional and defaults to today's behaviour, so no
existing `Select` call site changes.

**Parity by measurement.** A temporary probe measured the trigger and the open menu before and
after, after `document.fonts.ready` and after the open transition settled. Identical: trigger
`119.03 × 25.91`, padding `0 8.64`, gap `8.64`, `12.96px/600` uppercase, tracking `0.2592px`,
transparent surface with a 1px transparent border, radius `8.64` closing to `8.64 8.64 0 0` when
open over the `--menu-bg` fill; menu `119.03 × 113.27` at `left: 8, top: 24.91`, padding `4.32`,
radius `0 0 8.64 8.64`; all three options `108.41 × 34.55`, padding `8.64`, radius `8.64`, the
selected one at weight 600 on `oklch(0.934614 0.0131013 32.3072)`; `role="listbox"` with
`aria-label="Left sidebar panel"` and no `aria-labelledby`; and `document.activeElement` still
`BODY` after opening, confirming focus was not stolen.

Four computed values changed, none of them rendered: the trigger is now `display: grid` rather than
`inline-flex` (same box, same child positions), the label sits in `Select`'s `.value` wrapper (same
box), and the option rows report `gap: normal` rather than `8.64px` (they have one child).

The route module is now 10 lines of positioning: `flex: 0 1 auto; min-width: 0;
margin-inline-end: auto`.

**S7-B — `settings/shared.module.css` (148 lines) was the indent dual-range slider, written twice.**
All fifteen classes were `indentSlider*`, and `PageLayoutSettingsPanel` and `ElementPreview` each
hand-rendered the same eight-node tree — the track, five positioned spans, two overlaid range
inputs, then a sibling three-span labels row. The CSS was shared; the skeleton was not. That is the
case The Reusable Skeleton Rule exists to catch.

Ruled route-local rather than promoted: it is one control in one settings area, its whole contract
is seven `--preview-*` percentages the two panels compute differently, and §10 fixes the phase-1
component budget at five. `shared.module.css` was `git mv`-ed to `IndentRangeSlider.module.css`
(the classes losing their now-redundant `indentSlider` prefix) and `IndentRangeSlider.tsx` renders
the tree once, taking a `start` and an `end` handle (`value`/`min`/`max`/`step`/`ariaLabel`/
`onChange`/`onCommit`) plus a `labels` slot. It returns a fragment, so both call sites keep the
exact DOM they had. The clamp maths, the aria-labels and the label text stay in the panels.

**S7-C — dead rules.** One in `app-routes`: `export/modules/modules.module.css` `.field` and
`.field input` (four importers, none referencing `styles.field`). Five in `packages/ui`, deleted
under the same ruling although §9.7's stated scope is `app-routes`: `ImportScriptModal.module.css`
`.optionRow` / `.checkbox` / `.optionText` (step-5 residue), `AttributeManagerPlacesPanel.module.css`
`.detailType` (the live one is `AttributeManagerListPanel.module.css:206`) and
`EditorSidebar.module.css` `.characterColorButton`. Each verified against dynamic `styles[…]`
lookups and CSS `composes:` before deletion.

### The 27 remaining `app-routes` modules

Every file now opens with its own justification comment and a `phase-2 Uno` marker; this table is
the index.

| Module | Lines | Kind | Justification |
| --- | ---: | --- | --- |
| `home/HomeRoute` | 191 | route layout | Start-card grid, library column, script-row content and the media query. Cards, rows, search, skeletons and notices are all `@stagistic/ui`. |
| `script/ScriptExportRoute` | 17 | route layout | The export page's two-pane shell and its pre-load placeholder. |
| `script/attributes/MusicAttachmentPreviewModal` | 49 | singular | Paged score/PDF canvas viewer inside `ModalDialog`. |
| `script/editor/characters/AddCharacterModal` | 15 | route layout | Field stack inside `ModalDialog`, plus one error line. |
| `script/editor/characters/ScriptCharactersSidebar` | 16 | route layout | The sidebar's flow column and its width. |
| `script/editor/music/AddMusicModal` | 9 | route layout | Field stack inside `ModalDialog`. |
| `script/editor/music/ScriptMusicSidebar` | 96 | singular | Hover-revealed action cluster, truncating navigable label, cue-number column — on top of `ListRow`. |
| `script/editor/settings/IndentRangeSlider` | 153 | singular | The dual-range indent rail (S7-B). |
| `script/editor/settings/ScriptEditorSettingsPanel` | 28 | route layout | The settings shell's token block. |
| `.../danger-zone/DangerZoneSettingsPanel` | 23 | singular | The destructive-action card's warning tint; no shared surface carries a danger wash. |
| `.../document-info/TitlePageSettingsPanel` | 56 | route layout | Draft-date row, sub-field labels and the inline preview line. |
| `.../element/ElementFormattingToolbar` | 55 | singular | The alignment glyph (three rules whose widths draw the alignment) and the italic/underline letterforms. |
| `.../element/ElementNumericControls` | 16 | singular | The keyboard-shortcut field's inline prefix. |
| `.../element/ElementPreview` | 65 | singular | Script-content preview line and spacing bands, mono register. Exempt by §5.5. |
| `.../element/ElementSettingsPanel` | 48 | route layout | Panel header row and the reset affordance beside it. |
| `.../header-footer/HeaderFooterSettingsPanel` | 149 | singular | Three-cell printed-page preview grid plus the variable-token composer. |
| `.../initial-pages/InitialPagesSettingsPanel` | 19 | route layout | Section stack and one flush grid. |
| `.../page-layout/PageLayoutSettingsPanel` | 78 | singular | The page schematic — margins, header/footer zones and content band. |
| `.../visual-preferences/VisualPreferencesSettingsPanel` | 39 | singular | The inline dot preview of the chosen page-break mark. |
| `script/editor/sidebar/SidebarPanelSelect` | 10 | route layout | Positioning only, after S7-A. |
| `script/editor/structure/ScriptStructureSidebar` | 190 | singular | Kept fully singular under step-6 ruling S3: drag handles, act-title editing, DnD drop states. |
| `script/export/ExportControlPanel` | 27 | route layout | The export sidebar's panel column and sticky title row. |
| `script/export/ExportPreview` | 182 | singular | Paged page-preview canvas, custom scrollbar, busy/error overlays. Exempt by §5.5. |
| `script/export/IntegratedScoreWarning` | 18 | route layout | The extra list and inline action inside a `Notice variant="warning"`. |
| `script/export/modules/modules.module.css` | 80 | singular | Count and order fields, whose three-track grids are specific to the export module list. |
| `script/settings/DraftSaveError` | 18 | route layout | The floating save-error pill — positioned chrome, already documented as outside `Notice`. |
| `script/settings/ScriptAttributeManagerModal` | 26 | route layout | The delete affordance's placement in the attribute manager. |

None of the 27 reimplements a shared pattern. Total route CSS is 1,673 lines including those headers, down from 2,588 at
the start of this work.

### Catalog and DESIGN.md

`/dev/ui` already carries all five new components with their variable contracts (`Skeleton`,
`ActionCard`, `ListPanel`, `ListRow` in `primitives.tsx`, `SearchInput` in `controls.tsx`) plus the
two promoted in step 6 (`SidebarMiniHeader`, `SidebarActionsGroup`); the `tokens.test.ts` coverage
test that enforces this is green. `Select` gains no catalog entry of its own — it was already
listed — but DESIGN.md's form-controls section now documents its three variants and the `align`
option.

DESIGN.md changes:

- **The Sidebar Row Rule** now records the structure sidebar's deviation explicitly. The rule says
  editor sidebar rows are 28px times the size scale; Music and Characters get there through
  `ListRow size="compact"` (30.24px at `--size-scale: 1.08`) but Structure is hardcoded to a raw
  28px and sits 2.24px short. Ruling S3 left it there for the whole-number pixel pass, so the rule
  now says so rather than reading as satisfied.
- **The Modal Chrome Rule** added — step 5 shipped `ModalDialog` / `ModalHeader` / `ModalActions` /
  `ConfirmModal` and no named rule covered them.
- **The Sidebar Frame Rule** added — names `SidebarMiniHeader`, `SidebarActionsGroup` and
  `Select variant="panel"` now that `SidebarShell` is gone.
- **The Routes Carry No CSS Rule** extended with the close-out convention: a surviving route module
  opens with a one-line justification and a `phase-2 Uno` marker, and one without that header has
  not been justified.

### Open, not fixed here

- `IndentRangeSlider.module.css:131` sets a hardcoded mono stack
  (`ui-monospace, SFMono-Regular, Menlo, …`) on the measurement labels — chrome in a monospace
  voice, which The Mono Is Script Content Only Rule forbids, and bypassing `--font-family-mono`
  besides. Changing it moves visible type, so it needs its own normalization row.
- The whole-number pixel pass (every decimal in this document comes from `--size-scale: 1.08`).
- The UA `dialog { color: CanvasText }` root-cause fix.
- `SidebarMiniHeader`'s name, now that "Mini" has no counterpart.

### Verification

`tsc -b` clean. `eslint --fix` and `stylelint --fix` clean over every changed file.
`packages/ui`: 70/70 node, 112/112 browser. `packages/app-routes`: 39/40 node and 111/112 browser,
the two failures being the known pre-existing reds — `prepareExampleScriptDocument.test.ts` and
`ScriptExportRoute.browser.test.tsx > renders exact-kind character catalog rows only`. No snapshot
was updated and no assertion was loosened.

---

## Whole-number pixel pass close-out (2026-09-07)

Spec: `docs/superpowers/specs/2026-09-07-whole-number-pixel-pass-design.md`.
Plan: `docs/superpowers/plans/2026-09-07-whole-number-pixel-pass.md`.
This is the pass the "Open, not fixed here" list above was waiting for.

### What it did

`--size-scale: 1.08` multiplied 36 tokens and 493 hand-written `calc()` expressions, and every
decimal recorded anywhere in this document came from it. It began as the editor's text zoom —
keeping the canvas faithful to A4/Letter while the type grew — and leaked into the whole design
system; the zoom feature stopped shipping, the leak did not. The pass split it in two: an
editor-owned `--editor-zoom` for page geometry, and nothing at all for the UI. The surviving
whole-number ladder then moved to `rem`, so the interface finally answers to the reader's browser
font size.

| Task | Outcome | Visual change |
| --- | --- | --- |
| 1 | Measurement probe (`sizeProbe.browser.test.tsx`, temporary) | none |
| 2 | Editor takes `editorZoom` as a prop; emits `--editor-zoom` | none (value still 1.08) |
| 3 | 8 hand-written calcs adopt the token that already carried the number | none |
| 4 | **The flip** — tokens become literal whole pixels; `--size-scale` deleted | **UI 8% smaller; canvas at nominal size** |
| 5 | Ladder → `rem`; 40 breakpoint declarations → `em` | none at a 16px root |
| 6 | `--icon-size-sm/md/lg`; two off-grid tokens moved | `--font-size-4xl` 35→36, `--bubble-menu-icon-size` 15→16, icon boxes now scale |
| 7 | Probe retired; this close-out | none |

### Measured, not eyeballed

There were no image baselines to fall back on — see the screenshot finding below — so the probe was
the pass's only verification. It resolved all 36 scale-derived tokens (measured 64× and divided
back down, because layout quantises to 1/64px and would otherwise read 8.64px as 8.625) plus five
surfaces, and every task compared a payload before and after its edit.

| Check | Expected | Result |
| --- | --- | --- |
| Tasks 2, 3 | identical | 0 outliers each |
| Task 4 | `after == before / 1.08` | all 36 tokens exact; 7 box outliers, all explained |
| Task 5 at a 16px root | identical | 0 outliers — the `rem` conversion is provably the identity |
| Task 5 at a 20px root | `× 1.25` | every token exact; hairline stayed 1px |
| Task 6 | only the two intended moves | exactly 2 outliers |

Task 4's seven outliers: three are block-level divs whose width comes from the 1000px host rather
than a token; `Button`'s 9999px pill radius and 1px hairline are deliberately not token-derived and
must not shrink; and `Button`'s height and width miss by 0.51px and 0.17px because text line boxes
and glyph advances round to integers and do not scale linearly with font-size — its own padding and
font-size scaled exactly.

The 20px-root run is the accessibility claim in evidence rather than in prose: `--space-md` 8→10,
`--font-size-md` 13→16.25, `--sidebar-width` 256→320, `--shell-height` 48→60, hairline 1→1.

### The screenshot finding

The 63 PNGs under `__screenshots__/` were **never baselines**. Nothing in the repo calls
`toMatchScreenshot`, `toMatchImageSnapshot`, `toMatchFileSnapshot` or `.screenshot(`, and
`vitest.browser.config.ts` configures no image comparison. They are vitest `screenshotOnFailure`
artifacts — filenames are test names with a `-1` suffix, and one belonged to a test on the known-red
list — committed by accident. They were deleted and `**/__screenshots__/` added to `.gitignore`.

This corrects the earlier close-outs in this document. Where they say no screenshot was updated
without an approved normalization row, the guarantee was real but the mechanism was not: those files
asserted nothing, so nothing was being protected. Phase 1's visual safety net was the measurements
taken per step, not the images.

### Corrections to the plan, found by execution

- **Task 3 was over-estimated.** The plan expected ~194 conversions. Grouping the inventory by CSS
  property instead of by number showed 130 of the 230 occurrences are `width`/`height` on icon and
  control boxes. Substituting `--space-4xl` for a 28px control height because the numbers match is
  false tidiness; 8 declarations converted, the rest went to Tasks 4 and 6.
- **`--control-height-sm` 26→28 was dropped.** The spec proposed it without seeing `IconButton`'s
  variants: `.sm` is a `var(--control-height-sm)` box with a 14px glyph and `.md` a hardcoded 28px
  box with a 16px glyph, so moving the token would give both variants the same box. Its other
  justification had already been spent (see below). What the 28px cluster really shows is that
  `IconButton.md` has no token and that most hand-written 28s are row and bar heights — a different
  family from control height.
- **Two carriers the plan missed.** `useDragSourceHighlight.ts` injected `calc(4px *
  var(--size-scale))` into an inline stylesheet from TypeScript, where deleting the variable would
  have made `border-radius` invalid; and `/dev/ui` had a live scale switcher built on the
  coefficient, now repointed at the root font size (14/16/20px), which is the axis the `rem` ladder
  answers to.
- **Task 2.6 was wrong.** The `--size-scale: 1` pin in `editorShellLayout.browser.test.tsx` exists
  for `--sidebar-width`, a UI token, not for canvas zoom, so it belonged to Task 4.

### Deviations retired

**The Sidebar Row Rule deviation (step 6, ruling S3) is closed — by the flip, not by a patch.**
Structure's act/scene rows sat 2.24px short of `ListRow` only because `ListRow` multiplied its 28px
by the coefficient while Structure's raw 28px was not multiplied. Retiring the coefficient closed
the gap; both now measure 28px exactly. `DESIGN.md`'s rule was rewritten accordingly.

`DESIGN.md`'s **Size-Scale Rule** described a coefficient that no longer exists and was replaced by
**The Sizes Scale With The Reader Rule**, which states the unit contract per domain: `rem` for
sizes, `px` for hairlines and the focus ring, `em` for breakpoints, `px × --editor-zoom` for the
canvas. Two further stale claims in §1 and the quick reference went with it.

### Success criteria

| Criterion | Result |
| --- | --- |
| No `size-scale` / `sizeScale` anywhere | 0 matches across `packages` and `apps`, comments included |
| Every size token a whole number, no size `calc()` in `tokens.css` | Holds. 13 `calc()` remain and are **OKLCH chroma math on colour tokens**, not sizes — the spec's wording ("no `calc()` remains in the file") was too broad |
| `--editor-zoom` read only by page geometry | Holds — canvas width, `renderScale`, pagination, overlay placement |
| No hand-written `calc(Npx * <scale>)` in component CSS | 0 matches |
| Probe relations per task | All held; every outlier explained above |
| No tracked `__screenshots__` | 0 |
| Suites green | `ui` 70 node / 112 browser; `editor` 239 node; `app-routes` 39/40 node, 111/112 browser — only the known reds |

One criterion is **not** fully met: "no component writes a bare `rem` literal". 21 of them were
`1rem` icon boxes and their centring math in the attribute-manager panels and `SearchInput`, missed
by Task 6 because its classifier looked for `14/16/18px`; those now use `--icon-size-md`. Nine
genuine one-offs remain — a `.625rem` colour dot, `1.15rem` and `3rem` in `ExportPreview`, and the
standalone unsupported-screen gate's own type scale. Each is a singular value with no token behind
it, and each already scales with the reader, so none of them undermines the contract.

### Residue

- **`IconButton.md`'s 28px box has no token**, and the wider question it raises: most hand-written
  28s are row and bar heights (`ListRow`, structure rows, footer, status bar) with no shared token
  either. A row-height family is a design decision that deserves its own review, and phase 2 may
  answer it differently.
- Two newly recorded **pre-existing** reds in the `editor` browser suite, verified against a clean
  tree by patch round-trip: `paginationGolden.browser.test.tsx > produces stable multi-page
  boundaries…` and `BlockActionMenu.browser.test.tsx > supports keyboard submenu navigation…`. The
  editor browser suite was never run during phase 1, which is why they were not on the list.
- **stylelint's csstree grammar for `max-height`** has not learned the math functions and rejects
  `min(320px, 50vh)` now that the argument is no longer a `calc()`. The CSS is valid; the
  declaration carries a disable comment and an explanation.
- The touched browser-test files hold **39 eslint errors, against 40 at HEAD** for the same files —
  pre-existing debt, reported rather than fixed, and one fewer than before.
- Still open from the phase-1 list: the hardcoded mono stack on `IndentRangeSlider.module.css`'s
  measurement labels, the UA `dialog { color: CanvasText }` root-cause fix, and
  `SidebarMiniHeader`'s name.

---

## Normalization row: off-ladder values snapped (2026-09-08)

Spec: `docs/superpowers/specs/2026-09-08-style-reuse-enforcement-design.md`, part one.

Turning on the value guards left eighteen declarations failing because they used a length the
ladder has no step for — `5px` seven times, `6px` six, `3px` four, `7px` and `14px` once each.
These are the accumulated re-invention the guards exist to stop, and this is the one moment they
were all visible together. Ruled per *value* rather than per site, so the same number could not
resolve two ways in one repo.

| Value | Ruling | Sites |
| --- | --- | --- |
| `7px` | → `--space-md` (8px) | `TitlePageSettingsPanel` `padding-bottom` |
| `14px` | → `--space-lg` (12px) | `ScriptStructureSidebar` `padding-left` |
| `5px` (spacing) | → `--space-sm` (4px) | `ActionCard`, `EditorSidebar`, `ToastProvider`, `HeaderFooterSettingsPanel`, `TitlePageSettingsPanel`, `InputTable` |
| `5px` (radius) | → `--radius-sm` (6px) | `ScriptStructureSidebar` |
| `3px` (spacing) | → `--space-sm` (4px), or `--space-xs` (2px) paired | `ToggleButtonGroup`, `InputTable` ×2 |
| `3px` (radius) | → `--radius-xs` (4px) | `ScriptStructureSidebar` |
| `6px` (gap) | → `--space-md` (8px) | `formControlStyles`, `TitlePageSettingsPanel` |
| `6px` (padding) | → `--space-sm` (4px) | `DeleteScriptConfirm` (→ 8px, paired with `--space-px`), `InputTable` ×2 |

Sixteen declarations moved, each by one or two pixels. `InputTable`'s three compact ghost buttons
(`.removeRowButton`, `.addEntryButton`, `.addRowButton`) had been written `2px 5px`, `3px 6px` and
`3px 6px`; all three now read `var(--space-xs) var(--space-sm)`, so a set of siblings that had
drifted into three paddings converges on one.

**One test expectation changed, and only one.** `StructureRowAct.browser.test.tsx` asserts the act
title aligns with the scene numbers at a 14px offset; the structure sidebar's `padding-left` is the
thing that produces it, so the assertion now reads 12. That is the snap doing exactly what it was
approved to do, not a test bent to fit.

### Two exemptions, documented rather than snapped

Both carry a `stylelint-disable-next-line` and a one-line reason in the stylesheet.

- **`IndentRangeSlider.module.css` `margin-top: 6px`** on the range thumb. The input is 28px and
  the thumb 16px, so this is `(28 - 16) / 2` — the offset that centres it. Derived geometry, not a
  rhythm step; snapping it to 8px would have pushed the thumb 2px off-axis. It was within one edit
  of being snapped, and reading the surrounding rule is what stopped it.
- **`ElementPreview.module.css` `font-size: var(--preview-font-size, 16px)`.** `--preview-font-size`
  is never set by anything, so the fallback is always the real value, and it sits under
  `font-family: var(--font-family-mono)` — script content sized against the page, the same domain
  the whole-number pixel pass exempted for `--editor-font-size`. A UI font token here would be the
  false tidiness this work exists to avoid.

After the ruling, stylelint reports **129 files, 0 problems**.

---

## Style reuse enforcement close-out (2026-09-08)

Spec: `docs/superpowers/specs/2026-09-08-style-reuse-enforcement-design.md`.
Plan: `docs/superpowers/plans/2026-09-08-style-reuse-enforcement.md`.

Phase 1 removed duplicated CSS; the pixel pass made the ladder whole-numbered and `rem`-based.
Neither stopped the thing that produced the duplication: nothing in the toolchain objected when a
value was invented. This pass makes an invented value fail the build.

### What each part did

| Part | Outcome |
| --- | --- |
| 1 — own the config | `@dvdevcz/stylelint` dropped; its 128-rule config copied into `stylelint/base.js` and its four plugins named directly. Proved identical by `--print-config`. |
| 2 — value guards | `stylelint/guards.js` forbids absolute lengths (`px`/`rem`/`em`) on padding, margin, gap, font-size, border-radius and the inset family, scoped to `packages/ui` + `packages/app-routes`; plus `color-no-hex`. 19 declarations brought onto the ladder. |
| 3 — off-ladder ruling | 16 values snapped under one normalization row, 2 exempted (see the row above). |
| 4 — header check | `scripts/check-route-css-headers.mjs` wired into `pnpm lint`; 26 dead `phase-2 Uno` markers removed; the rule in `DESIGN.md` updated to match. |

### UnoCSS is retired

§11 of the phase-1 spec promised UnoCSS as "phase 2". That plan is dropped. UnoCSS makes writing
styles cheaper but does not make inventing values harder — `p-[13px]` is one keystroke — so it does
not address the stated goal, it contradicts four rules the design system already stands on (the
className-is-position-only family), and it would leave the editor on a second styling idiom
indefinitely. Enforcement addresses re-invention directly, with no new dependency. Anyone reading
the phase-1 spec alone should follow its "Replaces" header here.

### The guards, proved biting

A four-line probe (`padding: 13px; gap: 6px; font-size: 1.2rem; color: #3a3a3a;`) draws exactly
four errors — three `declaration-property-unit-allowed-list`, one `color-no-hex` — and is removed
after. `var()`, `calc()` with tokens, `clamp()`/`min()`/`max()` with relative units, percentages,
and every colour function in use all pass.

### Deferred modernisation work list

Owning the config is the moment to ask which of the 128 inherited rules still earn their place;
doing it inside the move would have destroyed the `--print-config` proof, so it is deliberately a
next step. The evidence, gathered now:

- **The csstree plugin runs on `css-tree@2.3.1`, unpatched**, while stylelint 16.26.1 itself ships
  `css-tree@^3.1.0` plus `@csstools/css-syntax-patches-for-csstree`. The hand-written
  `| <min()> | <max()> | <clamp()>` extensions on `width`/`padding`/`font-size`/`max-height` are
  scar tissue from that gap. Candidate: drop the plugin for stylelint's own
  `declaration-property-value-no-unknown`, which runs on the modern patched grammar — needs its own
  before/after over all 129 files, since coverage is not identical (the plugin also validates
  at-rules).
- **`@stylistic/stylelint-plugin@2.1.3`** emits a `context.fix is being deprecated` warning for
  ~30 rules on every run. Deciding its replacement is separate; note oxfmt does not cover CSS, so
  "let the formatter own stylistics" has no answer here yet.
- Rules the config inherited but a CSS-Modules repo may not need: `selector-max-id`,
  `selector-max-type`, the Sass/Less at-rule allowances, `no-unknown-animations` pinned to warning.

### The eslint stage of `pnpm lint`

`lint` is `eslint . && stylelint … && node scripts/check-route-css-headers.mjs`. The stylelint and
header stages are green (129 files/0 problems; 27/27 justified). The **eslint stage has pre-existing
failures** on ~53 test and source files (`@stylistic` debt) plus git-ignored `tmp/ux-walk/*.mjs`
scratch — none touched by this pass. Because the chain is `&&`, that failure short-circuits before
the later stages, so `pnpm lint` as a whole cannot show green until the eslint debt is cleared,
which is the territory of the planned eslint → oxlint/oxfmt move.

### The two DESIGN.md reuse rules (spec part four)

Applied before the plan ran, recorded here for completeness:

- **The Variant Before Override Rule** amended — shared API is earned by the *second* call site, and
  a variant whose only consumer is one route is a route-specific modification wearing a shared
  component's clothes. The threshold is two, in both directions.
- **The Nameable Is A Component Rule** added — if it has a name in the design language (card, row,
  panel, toolbar, field, header, dialog) it *is* the component of that name; a route assembling one
  inline from primitives has written a component and declined to name it.

Both are documented rather than enforced: the judgement is the point, and a linter that tried to
make it would be wrong more often than right.
