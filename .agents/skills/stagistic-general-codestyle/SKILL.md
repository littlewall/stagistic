---
name: stagistic-general-codestyle
description: Personal code style preferences used when writing or reviewing TypeScript/React code.
---

## Code Style Rules

- **Fat-arrow functions** always: `const fn = () => {}`
- **Max 300 lines per file** — split if longer
- **Early return / guard clauses** — no nested else blocks
- **Object lookup instead of switch**:
  ```ts
  // ❌ switch
  // ✅
  const handlers = { a: handleA, b: handleB }
  handlers[key]?.()
  ```
- **If destructuring has more than 3 properties, split into multiple lines**:
  ```ts
  // ❌ const { a, b, c, d } = obj;
  // ✅
  const {
    a,
    b,
    c,
    d,
  } = obj;
  ```
- **Use clsx for class names composition**:
  ```tsx
  // ❌ <div className={`${styles.base} ${condition ? styles.active : ''}`}> --- IGNORE ---
  // ✅ <div className={clsx(styles.base, condition && styles.active)}>
  ```
- **Use React Aria components for accessibility** (e.g. `Button`, `Tooltip`, `TooltipTrigger`), and avoid custom implementations of common UI patterns when possible. Never use React Aria directly - create a wrapper component in the `ui` package that re-exports the React Aria component with your preferred styling and behavior.
- **Use `pnpm` workspace protocol for internal package imports**:
  ```ts
  // ❌ import { Button } from '../../ui/Button';
  // ✅ import { Button } from '@stagistic/ui';
  ```
- **Use `pnpm` instead of `npm` or `yarn`** for package management, and follow the workspace conventions for adding dependencies (e.g. `pnpm add -w` for root dependencies, `pnpm add -F <package>` for package-specific dependencies).
- **Use `pnpm` scripts for dev, build, lint, and test commands**, and avoid using custom scripts or aliases that deviate from the standard `pnpm` commands.

## Composition & UI Rules

### Visual Identity & Tokens
- **The Two Semantic Accents Rule**: Copper means action, progress, or music. Lavender means selection, focus, or utility. Never use either as general decoration, and never swap them.
- **The Hue Cohesion Rule**: Product neutrals derive from `--base-neutral` through relative color syntax (`color-mix()`, `oklch()`). No arbitrary cool gray injections.
- **The Register Rule**: The editor uses product neutrals. The landing page may use Brand Paper, Umber, and Aubergine. Shared brand colors retain the same semantic meaning in both registers.
- **The Two-Voice Rule**: Courier Prime is the script's voice; IBM Plex Sans is the tool's voice. Never mix both within one text element.
- **The Mono Is Script Content Only Rule**: `--font-family-mono` is reserved for rendered script content. Chrome never borrows it. Uppercase muted labels use the "eyebrow" variant of Plex Sans.
- **The Sizes Scale With The Reader Rule**: All spacing, radii, font sizes, control heights, and chrome dimensions use `rem`, drawn from the whole-pixel ladder tokens. Hairlines, focus rings, `--radius-full`, and editor canvas dimensions remain `px`. Breakpoints use `em`.

### Layering & Layout
- **The Recessive Shell Rule**: The application header is not a raised surface. It sits at background lightness and separates from the content below with a single hairline border.
- **The Layer Boundary Rule**: A boundary between two different layers uses a tonal change *and* a border line. Subdividing a panel internally (e.g., toolbar groups) uses a border hairline and nothing else.
- **The Section Is Not a Panel Rule**: Subdividing a panel does not create a new layer. If a region needs its own background, it should be a panel on the outside, not nested inside.
- **The Flat-by-Default Rule**: Elements in normal document flow use tonal layering. Shadows are reserved for floating elements (popovers, modals) and the script canvas.
- **The CSS Viewport Rule**: Responsive decisions use CSS viewport dimensions (`@media`). Do not infer input mode or device class from a breakpoint.
- **The Canvas Preservation Rule**: Compact behavior protects the script canvas width before compressing editor controls or allowing panels to compete with it.

### State & Interaction
- **The Theme Swaps As One Rule**: Light and dark cross-fade via View Transitions as a single image. No component should manually time the swap.
- **The One Mechanic Per State Rule**: Every state has one mechanic (hover = neutral tone; selected = lavender tint + edge; current = ink edge; focus = offset ring).
- **The Navigation Is Not Selection Rule**: The current route/view is marked with an ink edge. Data selection uses lavender. They must never share a treatment.
- **The Visible Target Rule**: When a toggle opens a visible panel, its on-state is drawn by filling the icon, never with `--state-selected`.
- **The Affordance Reveal Rule**: Text that acts as a control (like panel type pickers) shows no chrome at rest, reveals a neutral chip on hover, and takes full surface treatment on focus/edit.
- **The Stable Toggle Name Rule**: A toggle button keeping `aria-pressed` uses one stable name for both states. Don't change labels to "Show/Hide" based on state.

### Components & Composition
- **The Layer Dependency Rule**: Dependency order is strictly: Tokens → Primitives → Controls → Patterns → Routes. A layer may use layers below it, never above.
- **The className Is Position Only Rule**: `className` on a component may affect positioning (margin, grid, flex, width). It may never affect background, border, radius, or typography (use variants or CSS variables for that).
- **The Component Variables Are Scoped Rule**: A variable belonging to a component is declared on its root class, not `:root`. `:root` is for design tokens only.
- **The Declared Surface Rule**: A component's overridable variables are published API (named, defaulted from tokens).
- **The Variant Before Override Rule**: If an appearance recurs twice, it becomes a variant. A CSS variable override is only for genuinely per-instance values.
- **The Routes Carry No CSS Rule**: Routes compose components. If a route needs custom styling, it's a missing component/variant. (Exception: singular geometry, requiring a one-line comment justification).
- **The Nameable Is A Component Rule**: If it has a structural name (card, row, field, dialog), it *is* a component. Do not assemble it ad-hoc from primitives in a route.
- **The Reusable Skeleton Rule**: Cross-application components expose a visual shell only. Route state, data fetching, or drag-and-drop live in the route and are passed as children/slots.
- **Specific Structural Components**:
  - **The Modal Chrome Rule**: Modals compose `ModalDialog`, `ModalHeader`, and `ModalActions`.
  - **The Sidebar Frame Rule**: Sidebars compose `SidebarMiniHeader` and `SidebarActionsGroup`.
  - **The Icon Button Rule**: Square icon actions use the `IconButton` component via props (`variant`, `size`, `shape="pill"`), never a bespoke `.iconButton` class.
  - **The Sidebar Row Rule**: Sidebars use the exact same 28px row height across all panels, via `ListRow size="compact"`.
  - **The Settings Scaffolding Rule**: Settings compose `SettingsGroup`, `SettingRow`, and `PanelHeader`.
  - **The Status Block Rule**: Inline warnings/errors use `Notice` (`variant="warning" | "error" | "empty"`).

### Content & Localization
- **The One-Locale Rule**: Every released product surface uses one complete locale (English only for now). No one-off translations.
- **The Next-Action Rule**: Empty states must describe the absence *and* provide the next useful action.
