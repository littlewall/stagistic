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
