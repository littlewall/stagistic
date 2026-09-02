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
