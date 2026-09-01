# Route-Composition Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the reusable-skeleton layer (`Skeleton`, `SearchInput`, `ActionCard`, `ListPanel`/`ListRow`, `SidebarShell`) to `@stagistic/ui` so routes can later be recomposed into pure layout + composition, ahead of the phase-2 UnoCSS migration.

**Architecture:** Each component follows the existing `@stagistic/ui` pattern — a `.tsx` using `clsx` + (where polymorphic) `createElement(as ?? default, …)` with `Record<Variant, string>` class maps, paired with a `.module.css` that **declares its own override variables with defaults** at the component root (so the `tokens.test.ts` undeclared-read guard passes), and a dev catalog entry in `apps/web/src/dev/registry/{primitives,controls}.tsx`. These are visual shells only: no route/app behaviour (DnD, act-editing, handlers) lives in them — that stays in the routes and is grafted in later (Plan 2).

**Tech Stack:** React 19 + TypeScript, CSS Modules, OKLCH design tokens (`packages/ui/styles/tokens.css`), `vite-plus/test` (`vp test`), `renderToStaticMarkup` for markup assertions, pnpm workspace (`@stagistic/ui`, `@stagistic/web`).

**Spec:** `docs/superpowers/specs/2026-09-01-route-composition-and-css-elimination-design.md` (§5.1 defines every component's props + variable contract; §7 DESIGN.md adds the Reusable Skeleton Rule).

## Global Constraints

- **Never commit or push.** Every "Prepare commit" step below produces a staged change + message for the **user** to review and commit. Do not run `git commit`. (AGENTS.md L5.)
- **Never `git stash` for a clean-tree baseline** (user commits concurrently). If a baseline diff is needed, use `git diff > patch` + `git apply -R`.
- **Canonical checks:** `eslint` + `stylelint` (NOT `vp lint` / `vp fmt`); `eslint --fix` IS the formatter. Plus `tsc -b` and `vp test`. `packages/*/vite.config.js` is a gitignored artifact — never edit or commit it.
- **pnpm needs the proto prefix:** every pnpm command is prefixed `export PROTO_AUTO_INSTALL=true &&`.
- **macOS:** no `timeout`; `wc` fails inside bash `while`/subshells (PATH) — use `/usr/bin/wc`.
- **Mono font** (`--font-family-mono`) is reserved EXCLUSIVELY for script content — never use it in these general-purpose components.
- **Override contract order** (spec DESIGN.md): variant prop → CSS variable → `className` (position-only). Each component's public override surface is exactly the variables listed in its `variables:` catalog array; declare each with a default at the component root.
- **Do not** mutate golden snapshots, loosen assertions, or change a viewport to make a red go green.
- **Editor stays out of scope.** These components will be *consumed* by editor routes in Plan 2, but nothing here imports from `packages/editor` or `packages/app-routes`.
- **Layer Dependency Rule:** primitives (L1) → controls (L2) → patterns (L3). A component may import only from lower layers. `Skeleton` (L1) imports nothing from ui. `SearchInput` (L2) may use icons. `ActionCard`/`ListPanel`/`ListRow`/`SidebarShell` (L3) may use L1/L2.

---

## File-structure map

| Component | Layer | `.tsx` + `.module.css` | Catalog file | `index.ts` export |
|-----------|-------|------------------------|--------------|-------------------|
| `Skeleton` | L1 primitive | `packages/ui/src/primitives/Skeleton.{tsx,module.css}` | `primitives.tsx` | `./primitives/Skeleton` |
| `SearchInput` | L2 control | `packages/ui/src/atoms/SearchInput.{tsx,module.css}` | `controls.tsx` | `./atoms/SearchInput` |
| `ActionCard` | L3 pattern | `packages/ui/src/molecules/ActionCard.{tsx,module.css}` | `primitives.tsx` | `./molecules/ActionCard` |
| `ListPanel` + `ListRow` | L3 pattern | `packages/ui/src/molecules/ListPanel.{tsx,module.css}` + `packages/ui/src/molecules/ListRow.{tsx,module.css}` | `primitives.tsx` | `./molecules/ListPanel`, `./molecules/ListRow` |
| `SidebarShell` | L3 pattern | `packages/ui/src/layout/SidebarShell.{tsx,module.css}` | `primitives.tsx` | `./layout/SidebarShell` |

**Coverage guard (`packages/ui/src/tokens.test.ts`):** every new PascalCase value export must appear as `name: '<Name>'` in `apps/web/src/dev/registry/primitives.tsx` or `controls.tsx` — that test joins only those two files. Each component task catalogs its component there, so the guard stays green without touching `NOT_CATALOGUED_YET`.

**Reference commands (substitute the file paths per task):**

```bash
# unit test (node / renderToStaticMarkup)
export PROTO_AUTO_INSTALL=true && pnpm --filter @stagistic/ui exec vp test run src/primitives/Skeleton.test.tsx
# coverage + css-var guard
export PROTO_AUTO_INSTALL=true && pnpm --filter @stagistic/ui exec vp test run src/tokens.test.ts
# typecheck (repo root)
export PROTO_AUTO_INSTALL=true && pnpm -w exec tsc -b
# lint (autofix = formatter)
pnpm exec eslint --fix <changed .tsx files>
pnpm exec stylelint --fix <changed .module.css files>
```

---

### Task 1: Audit + Reusable Skeleton Rule (APPROVAL GATE)

This task produces no component code. It produces the **normalization table** that Plan 2 (route recomposition) depends on, and adds the **Reusable Skeleton Rule** to DESIGN.md. It ends at an approval gate — **stop and get the user's approval before starting Task 2.**

**Files:**
- Create: `docs/design/route-composition-audit-2026-09-01.md` (the normalization table)
- Modify: `DESIGN.md` (repo root — append the Reusable Skeleton Rule under §6 Named rules)

- [ ] **Step 1: Inventory the source CSS the new components must absorb**

Read and record the current values (heights, paddings, radii, gaps, hover/selected treatments) from each source the spec §5.1/§5.3/§5.5 names:
- `packages/app-routes/src/routes/home/HomeRoute.module.css` — `.startAction*` (→ `ActionCard`), `.scriptRow`/`.scriptOpenButton`/`.scriptInfo`/`.scriptMeta` (→ `ListRow` library size, `.scriptList` → `ListPanel`), `.searchField` (→ `SearchInput`), `.skeleton*` (→ `Skeleton`).
- `packages/app-routes/src/routes/script/editor/structure/ScriptStructureSidebar.module.css` — `.itemRow`/`.itemButton` (→ `ListRow` compact size + selected edge), sidebar header (→ `SidebarShell`).
- `packages/app-routes/src/routes/script/editor/sidebar/SidebarMiniHeader.module.css` — `.header`/`.actions` (→ `SidebarShell` header).

- [ ] **Step 2: Write the normalization table**

For every variable in the §5.1 contracts (`--skeleton-*`, `--search-*`, `--action-card-*`, `--list-*`, `--list-row-*`, `--sidebar-*`) record: the chosen canonical default, which existing token it maps to, and every source value it replaces (noting any value that must change and why). Two `ListRow` sizes are fixed by the spec: **compact = 28px** min-height, **library = 58px** min-height. Flag any source value that does NOT fold cleanly (candidate for §5.5 "kept singular").

- [ ] **Step 3: Append the Reusable Skeleton Rule to DESIGN.md**

Add a section stating: components extracted for cross-app reuse expose a *visual shell only* — structure, spacing, and state affordances (hover echo, selected edge) via declared variables — and never embed app behaviour (event handlers, DnD, data fetching, route state). Behaviour is composed by the consuming route through slots/children. Single-use is not an exemption; app-bound heavy-handler content stays in the route.

- [ ] **Step 4: APPROVAL GATE — stop**

Present the normalization table to the user. **Do not proceed to Task 2 until the user approves the canonical values.** The component defaults in Tasks 2–6 below use the spec's contract names; if the approved table changes a specific default, apply that value when implementing the corresponding `.module.css`.

- [ ] **Step 5: Prepare commit (user runs)**

Staged: the audit doc + DESIGN.md. Proposed message:
```
docs(design): route-composition audit + Reusable Skeleton Rule
```

---

### Task 2: Skeleton (L1 primitive)

**Files:**
- Create: `packages/ui/src/primitives/Skeleton.tsx`
- Create: `packages/ui/src/primitives/Skeleton.module.css`
- Test: `packages/ui/src/primitives/Skeleton.test.tsx`
- Modify: `packages/ui/src/index.ts` (add export near the other `./primitives/*` exports)
- Modify: `apps/web/src/dev/registry/primitives.tsx` (add catalog entry)

**Interfaces:**
- Produces: `Skeleton` — polymorphic (`as?: T`), `shape?: 'line' | 'block' | 'circle'` (default `'block'`), `className?`; renders `aria-hidden="true"`. Override variables: `--skeleton-w`, `--skeleton-h`, `--skeleton-radius`.

- [ ] **Step 1: Write the failing test**

`packages/ui/src/primitives/Skeleton.test.tsx`:
```tsx
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vite-plus/test';

import {Skeleton} from './Skeleton';
import styles from './Skeleton.module.css';

describe('Skeleton', () => {
    it('defaults to the block shape and is decorative', () => {
        const markup = renderToStaticMarkup(<Skeleton />);
        expect(markup).toContain(styles.skeleton);
        expect(markup).toContain(styles.block);
        expect(markup).toContain('aria-hidden="true"');
    });

    it('applies the requested shape', () => {
        const markup = renderToStaticMarkup(<Skeleton shape="circle" />);
        expect(markup).toContain(styles.circle);
    });

    it('honours the polymorphic as prop', () => {
        const markup = renderToStaticMarkup(<Skeleton as="span" />);
        expect(markup).toContain('<span');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PROTO_AUTO_INSTALL=true && pnpm --filter @stagistic/ui exec vp test run src/primitives/Skeleton.test.tsx`
Expected: FAIL — cannot resolve `./Skeleton`.

- [ ] **Step 3: Create the component**

`packages/ui/src/primitives/Skeleton.tsx`:
```tsx
import clsx from 'clsx';
import {
    type ComponentPropsWithoutRef,
    createElement,
    type ElementType,
    type ReactElement,
} from 'react';

import styles from './Skeleton.module.css';

type SkeletonShape = 'line' | 'block' | 'circle';

export type SkeletonProps<T extends ElementType = 'div'> = {
    as?: T,
    shape?: SkeletonShape,
    className?: string,
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className'>;

const SHAPE_CLASS: Record<SkeletonShape, string> = {
    line: styles.line,
    block: styles.block,
    circle: styles.circle,
};

export const Skeleton = <T extends ElementType = 'div'>({
    as,
    shape = 'block',
    className,
    ...props
}: SkeletonProps<T>): ReactElement => createElement(as ?? 'div', {
    'aria-hidden': true,
    ...props,
    className: clsx(styles.skeleton, SHAPE_CLASS[shape], className),
});
```

- [ ] **Step 4: Create the stylesheet**

`packages/ui/src/primitives/Skeleton.module.css` — declare each override variable with a default at the root (satisfies the undeclared-read guard); shimmer with reduced-motion fallback:
```css
.skeleton {
    --skeleton-w: 100%;
    --skeleton-h: calc(16px * var(--size-scale));
    --skeleton-radius: var(--radius-md);

    width: var(--skeleton-w);
    height: var(--skeleton-h);
    background: linear-gradient(
        90deg,
        var(--color-surface) 0%,
        var(--color-surface-raised) 50%,
        var(--color-surface) 100%
    );
    background-size: 200% 100%;
    border-radius: var(--skeleton-radius);
    animation: skeleton-shimmer 1.5s var(--ease-standard) infinite;
}

.line {
    --skeleton-h: calc(12px * var(--size-scale));
    --skeleton-radius: var(--radius-full);
}

.block {
    --skeleton-h: calc(58px * var(--size-scale));
}

.circle {
    --skeleton-h: var(--skeleton-w);
    --skeleton-radius: var(--radius-full);
}

@keyframes skeleton-shimmer {
    0% {
        background-position: 200% 0;
    }

    100% {
        background-position: -200% 0;
    }
}

@media (prefers-reduced-motion: reduce) {
    .skeleton {
        background: var(--color-surface-raised);
        animation: none;
    }
}
```
> Before writing, confirm `--color-surface`, `--color-surface-raised`, `--ease-standard`, `--radius-md`, `--radius-full`, `--size-scale` exist in `packages/ui/styles/tokens.css`. If a name differs, use the actual token (the guard fails on any `var(--x)` with no declaration and no fallback). If the audit (Task 1) chose different defaults, use those.

- [ ] **Step 5: Export from `index.ts`**

Add alongside the other `./primitives/*` exports (keep the block alphabetical by path):
```ts
export {Skeleton, type SkeletonProps} from './primitives/Skeleton';
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `export PROTO_AUTO_INSTALL=true && pnpm --filter @stagistic/ui exec vp test run src/primitives/Skeleton.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 7: Add the dev catalog entry**

In `apps/web/src/dev/registry/primitives.tsx`: add `Skeleton` to the import from `@stagistic/ui`, and add an entry to `entries`:
```tsx
{
    name: 'Skeleton',
    variables: ['--skeleton-w', '--skeleton-h', '--skeleton-radius'],
    samples: [
        {label: 'block', node: <Skeleton style={{width: '12rem'}} />},
        {label: 'line', node: <Skeleton shape="line" style={{width: '12rem'}} />},
        {label: 'circle', node: <Skeleton shape="circle" style={{width: '3rem'}} />},
    ],
},
```

- [ ] **Step 8: Run the coverage + css-var guard**

Run: `export PROTO_AUTO_INSTALL=true && pnpm --filter @stagistic/ui exec vp test run src/tokens.test.ts`
Expected: PASS — `Skeleton` is now catalogued and every `--skeleton-*` read is declared.

- [ ] **Step 9: Typecheck + lint**

Run:
```bash
export PROTO_AUTO_INSTALL=true && pnpm -w exec tsc -b
pnpm exec eslint --fix packages/ui/src/primitives/Skeleton.tsx packages/ui/src/primitives/Skeleton.test.tsx apps/web/src/dev/registry/primitives.tsx packages/ui/src/index.ts
pnpm exec stylelint --fix packages/ui/src/primitives/Skeleton.module.css
```
Expected: no errors.

- [ ] **Step 10: Prepare commit (user runs)**

Staged: the 3 new files + `index.ts` + `primitives.tsx`. Proposed message:
```
feat(ui): add Skeleton primitive
```

---

### Task 3: SearchInput (L2 control)

**Files:**
- Create: `packages/ui/src/atoms/SearchInput.tsx`
- Create: `packages/ui/src/atoms/SearchInput.module.css`
- Test: `packages/ui/src/atoms/SearchInput.test.tsx`
- Modify: `packages/ui/src/index.ts`
- Modify: `apps/web/src/dev/registry/controls.tsx`

**Interfaces:**
- Consumes: `SearchIcon` from `packages/ui/src/icons/ui/SearchIcon` (accepts `SVGProps<SVGSVGElement>`, incl. `className`).
- Produces: `SearchInput` — `size?: 'sm' | 'md'` (default `'md'`), plus native `<input type="search">` props (minus `type`/`size`/`className`), `className?` (targets the wrapper). Override variables: `--search-height`, `--search-radius`, `--search-icon-inset`.

- [ ] **Step 1: Write the failing test**

`packages/ui/src/atoms/SearchInput.test.tsx`:
```tsx
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vite-plus/test';

import {SearchInput} from './SearchInput';
import styles from './SearchInput.module.css';

describe('SearchInput', () => {
    it('renders a search input with the default md size', () => {
        const markup = renderToStaticMarkup(<SearchInput placeholder="Search scripts" />);
        expect(markup).toContain(styles.field);
        expect(markup).toContain(styles.sizeMd);
        expect(markup).toContain('type="search"');
        expect(markup).toContain('placeholder="Search scripts"');
    });

    it('applies the sm size', () => {
        const markup = renderToStaticMarkup(<SearchInput size="sm" />);
        expect(markup).toContain(styles.sizeSm);
    });

    it('forwards the value', () => {
        const markup = renderToStaticMarkup(<SearchInput value="hamlet" readOnly />);
        expect(markup).toContain('value="hamlet"');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PROTO_AUTO_INSTALL=true && pnpm --filter @stagistic/ui exec vp test run src/atoms/SearchInput.test.tsx`
Expected: FAIL — cannot resolve `./SearchInput`.

- [ ] **Step 3: Create the component**

`packages/ui/src/atoms/SearchInput.tsx`:
```tsx
import clsx from 'clsx';
import {type ComponentPropsWithoutRef, type ReactElement} from 'react';

import {SearchIcon} from '../icons/ui/SearchIcon';
import styles from './SearchInput.module.css';

type SearchInputSize = 'sm' | 'md';

export type SearchInputProps = {
    size?: SearchInputSize,
    className?: string,
} & Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'type' | 'size'>;

const SIZE_CLASS: Record<SearchInputSize, string> = {
    sm: styles.sizeSm,
    md: styles.sizeMd,
};

export const SearchInput = ({
    size = 'md',
    className,
    ...props
}: SearchInputProps): ReactElement => (
    <div className={clsx(styles.field, SIZE_CLASS[size], className)}>
        <SearchIcon className={styles.icon} aria-hidden="true" />
        <input {...props} type="search" className={styles.input} />
    </div>
);
```
> Verify the relative import depth: `atoms/` → `icons/ui/SearchIcon` is `../icons/ui/SearchIcon`.

- [ ] **Step 4: Create the stylesheet**

`packages/ui/src/atoms/SearchInput.module.css`:
```css
.field {
    --search-height: var(--control-height-md);
    --search-radius: var(--radius-full);
    --search-icon-inset: var(--space-md);

    position: relative;
    display: inline-flex;
    align-items: center;
    width: 100%;
}

.sizeSm {
    --search-height: var(--control-height-sm);
}

.sizeMd {
    --search-height: var(--control-height-md);
}

.icon {
    pointer-events: none;
    position: absolute;
    left: var(--search-icon-inset);
    width: calc(16px * var(--size-scale));
    height: calc(16px * var(--size-scale));
    color: var(--color-text-muted);
}

.input {
    width: 100%;
    height: var(--search-height);
    padding: 0 var(--space-md) 0 calc(var(--search-icon-inset) + 16px * var(--size-scale) + var(--space-sm));
    font-size: var(--font-size-md);
    color: var(--color-text);
    background: var(--color-surface-raised);
    border: 1px solid var(--color-border);
    border-radius: var(--search-radius);
    transition: border-color var(--duration-normal) var(--ease-standard);

    &::placeholder {
        color: var(--color-text-muted);
    }

    &:focus-visible {
        outline: none;
        border-color: var(--color-border-strong);
    }
}
```
> Confirm each token name against `tokens.css` before writing (`--control-height-md/-sm`, `--font-size-md`, `--color-border-strong`, etc.). If the audit chose different defaults for `--search-*`, use those. Do NOT declare `--search-*` in `:root` — they live on `.field`.

- [ ] **Step 5: Export from `index.ts`**

Add alongside the other `./atoms/*` exports (alphabetical):
```ts
export {SearchInput, type SearchInputProps} from './atoms/SearchInput';
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `export PROTO_AUTO_INSTALL=true && pnpm --filter @stagistic/ui exec vp test run src/atoms/SearchInput.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 7: Add the dev catalog entry**

In `apps/web/src/dev/registry/controls.tsx`: add `SearchInput` to the `@stagistic/ui` import and add:
```tsx
{
    name: 'SearchInput',
    variables: ['--search-height', '--search-radius', '--search-icon-inset'],
    samples: [
        {label: 'md', node: <SearchInput placeholder="Search scripts" />},
        {label: 'sm', node: <SearchInput size="sm" placeholder="Filter" />},
    ],
},
```

- [ ] **Step 8: Run the coverage + css-var guard**

Run: `export PROTO_AUTO_INSTALL=true && pnpm --filter @stagistic/ui exec vp test run src/tokens.test.ts`
Expected: PASS.

- [ ] **Step 9: Typecheck + lint**

Run:
```bash
export PROTO_AUTO_INSTALL=true && pnpm -w exec tsc -b
pnpm exec eslint --fix packages/ui/src/atoms/SearchInput.tsx packages/ui/src/atoms/SearchInput.test.tsx apps/web/src/dev/registry/controls.tsx packages/ui/src/index.ts
pnpm exec stylelint --fix packages/ui/src/atoms/SearchInput.module.css
```
Expected: no errors.

- [ ] **Step 10: Prepare commit (user runs)**

Message:
```
feat(ui): add SearchInput control
```

---

### Task 4: ActionCard (L3 pattern)

**Files:**
- Create: `packages/ui/src/molecules/ActionCard.tsx`
- Create: `packages/ui/src/molecules/ActionCard.module.css`
- Test: `packages/ui/src/molecules/ActionCard.test.tsx`
- Modify: `packages/ui/src/index.ts`
- Modify: `apps/web/src/dev/registry/primitives.tsx`

**Interfaces:**
- Produces: `ActionCard` — polymorphic (`as?: T`, default `'button'`), `variant?: 'default' | 'primary'` (default `'default'`), `disabled?: boolean`, slots `icon: ReactNode`, `title: ReactNode`, `description?: ReactNode`, `className?`, plus the element's native props. Override variables: `--action-card-pad`, `--action-card-radius`. Distinct from the existing `Card` (which is a generic surface with `CardHeader`/`Content`/`Footer`); `ActionCard` is the icon+title+description call-to-action tile from HomeRoute `.startAction`.

- [ ] **Step 1: Write the failing test**

`packages/ui/src/molecules/ActionCard.test.tsx`:
```tsx
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vite-plus/test';

import {ActionCard} from './ActionCard';
import styles from './ActionCard.module.css';

describe('ActionCard', () => {
    it('renders a button with icon, title and description by default', () => {
        const markup = renderToStaticMarkup(
            <ActionCard icon={<svg />} title="New script" description="Start from scratch" />,
        );
        expect(markup).toContain(styles.card);
        expect(markup).toContain(styles.default);
        expect(markup).toContain('New script');
        expect(markup).toContain('Start from scratch');
        expect(markup).toContain('<button');
    });

    it('applies the primary variant', () => {
        const markup = renderToStaticMarkup(
            <ActionCard variant="primary" icon={<svg />} title="Import" />,
        );
        expect(markup).toContain(styles.primary);
    });

    it('honours the polymorphic as prop', () => {
        const markup = renderToStaticMarkup(
            <ActionCard as="a" href="/x" icon={<svg />} title="Open" />,
        );
        expect(markup).toContain('<a');
        expect(markup).toContain('href="/x"');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PROTO_AUTO_INSTALL=true && pnpm --filter @stagistic/ui exec vp test run src/molecules/ActionCard.test.tsx`
Expected: FAIL — cannot resolve `./ActionCard`.

- [ ] **Step 3: Create the component**

`packages/ui/src/molecules/ActionCard.tsx`:
```tsx
import clsx from 'clsx';
import {
    type ComponentPropsWithoutRef,
    createElement,
    type ElementType,
    type ReactElement,
    type ReactNode,
} from 'react';

import styles from './ActionCard.module.css';

type ActionCardVariant = 'default' | 'primary';

export type ActionCardProps<T extends ElementType = 'button'> = {
    as?: T,
    variant?: ActionCardVariant,
    icon: ReactNode,
    title: ReactNode,
    description?: ReactNode,
    className?: string,
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | 'title'>;

const VARIANT_CLASS: Record<ActionCardVariant, string> = {
    default: styles.default,
    primary: styles.primary,
};

export const ActionCard = <T extends ElementType = 'button'>({
    as,
    variant = 'default',
    icon,
    title,
    description,
    className,
    ...props
}: ActionCardProps<T>): ReactElement => createElement(
    as ?? 'button',
    {
        ...props,
        className: clsx(styles.card, VARIANT_CLASS[variant], className),
    },
    <span key="icon" className={styles.icon}>{icon}</span>,
    <span key="copy" className={styles.copy}>
        <span className={styles.title}>{title}</span>
        {description != null && <span className={styles.description}>{description}</span>}
    </span>,
);
```

- [ ] **Step 4: Create the stylesheet**

`packages/ui/src/molecules/ActionCard.module.css` — grid `[icon] [copy]`, hover lift (`translateY(-1px)` + `--shadow-hairline`), primary variant recolors the icon chip. Mirror HomeRoute `.startAction*` values (or the audit's normalized values):
```css
.card {
    --action-card-pad: var(--space-lg);
    --action-card-radius: var(--radius-lg);

    cursor: pointer;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-md);
    align-items: center;
    width: 100%;
    padding: var(--action-card-pad);
    text-align: left;
    background: var(--color-surface-raised);
    border: 1px solid var(--color-border);
    border-radius: var(--action-card-radius);
    transition:
        transform var(--duration-normal) var(--ease-standard),
        box-shadow var(--duration-normal) var(--ease-standard);

    &:hover {
        transform: translateY(-1px);
        box-shadow: var(--shadow-hairline);
    }

    &:disabled {
        cursor: not-allowed;
        opacity: 0.5;
    }
}

.icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: calc(40px * var(--size-scale));
    height: calc(40px * var(--size-scale));
    color: var(--color-text);
    background: var(--color-surface);
    border-radius: var(--radius-md);
}

.copy {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    min-width: 0;
}

.title {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
}

.description {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
}

.primary {
    background: var(--color-accent-soft);
    border-color: var(--color-accent);

    & .icon {
        color: var(--color-on-accent);
        background: var(--color-accent);
    }
}
```
> Confirm every token (`--shadow-hairline`, `--color-accent-soft`, `--color-accent`, `--color-on-accent`, `--font-weight-semibold`, `--space-2xs`) exists in `tokens.css`; substitute the real name if any differs. Apply the audit's defaults for `--action-card-*` if changed.

- [ ] **Step 5: Export from `index.ts`**

Add near the other `./molecules/*` exports (alphabetical — before `./molecules/ButtonGroup`):
```ts
export {ActionCard, type ActionCardProps} from './molecules/ActionCard';
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `export PROTO_AUTO_INSTALL=true && pnpm --filter @stagistic/ui exec vp test run src/molecules/ActionCard.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 7: Add the dev catalog entry**

In `apps/web/src/dev/registry/primitives.tsx` add `ActionCard` to the import and:
```tsx
{
    name: 'ActionCard',
    variables: ['--action-card-pad', '--action-card-radius'],
    samples: [
        {
            label: 'default',
            node: <ActionCard icon={<span>+</span>} title="New script" description="Start from scratch" />,
        },
        {
            label: 'primary',
            node: <ActionCard variant="primary" icon={<span>↥</span>} title="Import" description="From .fdx or .fountain" />,
        },
    ],
},
```

- [ ] **Step 8: Run the coverage + css-var guard**

Run: `export PROTO_AUTO_INSTALL=true && pnpm --filter @stagistic/ui exec vp test run src/tokens.test.ts`
Expected: PASS.

- [ ] **Step 9: Typecheck + lint**

Run:
```bash
export PROTO_AUTO_INSTALL=true && pnpm -w exec tsc -b
pnpm exec eslint --fix packages/ui/src/molecules/ActionCard.tsx packages/ui/src/molecules/ActionCard.test.tsx apps/web/src/dev/registry/primitives.tsx packages/ui/src/index.ts
pnpm exec stylelint --fix packages/ui/src/molecules/ActionCard.module.css
```
Expected: no errors.

- [ ] **Step 10: Prepare commit (user runs)**

Message:
```
feat(ui): add ActionCard pattern
```

---

### Task 5: ListPanel + ListRow (L3 patterns)

These two ship together — a `ListPanel` is only meaningful as a container of `ListRow`s, and the coverage guard requires both catalogued in the same change.

**Files:**
- Create: `packages/ui/src/molecules/ListPanel.tsx`, `packages/ui/src/molecules/ListPanel.module.css`
- Create: `packages/ui/src/molecules/ListRow.tsx`, `packages/ui/src/molecules/ListRow.module.css`
- Test: `packages/ui/src/molecules/ListPanel.test.tsx`, `packages/ui/src/molecules/ListRow.test.tsx`
- Modify: `packages/ui/src/index.ts`
- Modify: `apps/web/src/dev/registry/primitives.tsx`

**Interfaces:**
- Produces `ListPanel` — polymorphic (`as?: T`, default `'div'`), `bordered?: boolean` (default `true`), `inset?: boolean` (default `false`), `className?`, children. Override variables: `--list-bg`, `--list-edge`, `--list-radius`, `--list-gap`.
- Produces `ListRow` — polymorphic (`as?: T`, default `'div'`), `size?: 'compact' | 'library'` (default `'compact'`), `selected?: boolean`, `interactive?: boolean`, slots `leading?: ReactNode`, `trailing?: ReactNode`, children, `className?`. Override variables: `--list-row-min-height`, `--list-row-padding`, `--list-row-gap`. Owns the hover echo (`--state-hover`) when `interactive`, and the selected edge (`--state-selected` fill + `--state-selected-edge` inset ring) when `selected`. Sizes: **compact = 28px**, **library = 58px** min-height.

- [ ] **Step 1: Write the failing tests**

`packages/ui/src/molecules/ListPanel.test.tsx`:
```tsx
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vite-plus/test';

import {ListPanel} from './ListPanel';
import styles from './ListPanel.module.css';

describe('ListPanel', () => {
    it('renders a bordered panel by default with its children', () => {
        const markup = renderToStaticMarkup(<ListPanel><div>row</div></ListPanel>);
        expect(markup).toContain(styles.panel);
        expect(markup).toContain(styles.bordered);
        expect(markup).toContain('row');
    });

    it('drops the border when bordered is false and adds inset', () => {
        const markup = renderToStaticMarkup(<ListPanel bordered={false} inset><div /></ListPanel>);
        expect(markup).not.toContain(styles.bordered);
        expect(markup).toContain(styles.inset);
    });
});
```

`packages/ui/src/molecules/ListRow.test.tsx`:
```tsx
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vite-plus/test';

import {ListRow} from './ListRow';
import styles from './ListRow.module.css';

describe('ListRow', () => {
    it('renders a compact row with its children by default', () => {
        const markup = renderToStaticMarkup(<ListRow>Scene 1</ListRow>);
        expect(markup).toContain(styles.row);
        expect(markup).toContain(styles.compact);
        expect(markup).toContain('Scene 1');
    });

    it('renders the library size', () => {
        const markup = renderToStaticMarkup(<ListRow size="library">Hamlet</ListRow>);
        expect(markup).toContain(styles.library);
    });

    it('marks the selected and interactive states', () => {
        const markup = renderToStaticMarkup(<ListRow selected interactive>x</ListRow>);
        expect(markup).toContain(styles.selected);
        expect(markup).toContain(styles.interactive);
    });

    it('renders leading and trailing slots', () => {
        const markup = renderToStaticMarkup(
            <ListRow leading={<span>L</span>} trailing={<span>T</span>}>mid</ListRow>,
        );
        expect(markup).toContain(styles.leading);
        expect(markup).toContain(styles.trailing);
        expect(markup).toContain('L');
        expect(markup).toContain('T');
    });
});
```

- [ ] **Step 2: Run both tests to verify they fail**

Run:
```bash
export PROTO_AUTO_INSTALL=true && pnpm --filter @stagistic/ui exec vp test run src/molecules/ListPanel.test.tsx src/molecules/ListRow.test.tsx
```
Expected: FAIL — modules unresolved.

- [ ] **Step 3: Create `ListPanel`**

`packages/ui/src/molecules/ListPanel.tsx`:
```tsx
import clsx from 'clsx';
import {
    type ComponentPropsWithoutRef,
    createElement,
    type ElementType,
    type ReactElement,
    type ReactNode,
} from 'react';

import styles from './ListPanel.module.css';

export type ListPanelProps<T extends ElementType = 'div'> = {
    as?: T,
    bordered?: boolean,
    inset?: boolean,
    className?: string,
    children?: ReactNode,
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>;

export const ListPanel = <T extends ElementType = 'div'>({
    as,
    bordered = true,
    inset = false,
    className,
    children,
    ...props
}: ListPanelProps<T>): ReactElement => createElement(
    as ?? 'div',
    {
        ...props,
        className: clsx(
            styles.panel,
            {
                [styles.bordered]: bordered,
                [styles.inset]: inset,
            },
            className,
        ),
    },
    children,
);
```

- [ ] **Step 4: Create `ListPanel.module.css`**

```css
.panel {
    --list-bg: var(--color-surface);
    --list-edge: var(--color-border);
    --list-radius: var(--radius-lg);
    --list-gap: var(--space-2xs);

    display: flex;
    flex-direction: column;
    gap: var(--list-gap);
    background: var(--list-bg);
    border-radius: var(--list-radius);
}

.bordered {
    border: 1px solid var(--list-edge);
}

.inset {
    padding: var(--space-xs);
}
```

- [ ] **Step 5: Create `ListRow`**

`packages/ui/src/molecules/ListRow.tsx`:
```tsx
import clsx from 'clsx';
import {
    type ComponentPropsWithoutRef,
    createElement,
    type ElementType,
    type ReactElement,
    type ReactNode,
} from 'react';

import styles from './ListRow.module.css';

type ListRowSize = 'compact' | 'library';

export type ListRowProps<T extends ElementType = 'div'> = {
    as?: T,
    size?: ListRowSize,
    selected?: boolean,
    interactive?: boolean,
    leading?: ReactNode,
    trailing?: ReactNode,
    className?: string,
    children?: ReactNode,
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>;

const SIZE_CLASS: Record<ListRowSize, string> = {
    compact: styles.compact,
    library: styles.library,
};

export const ListRow = <T extends ElementType = 'div'>({
    as,
    size = 'compact',
    selected = false,
    interactive = false,
    leading,
    trailing,
    className,
    children,
    ...props
}: ListRowProps<T>): ReactElement => createElement(
    as ?? 'div',
    {
        ...props,
        'aria-selected': selected || undefined,
        className: clsx(
            styles.row,
            SIZE_CLASS[size],
            {
                [styles.selected]: selected,
                [styles.interactive]: interactive,
            },
            className,
        ),
    },
    leading != null && <span key="leading" className={styles.leading}>{leading}</span>,
    <span key="main" className={styles.main}>{children}</span>,
    trailing != null && <span key="trailing" className={styles.trailing}>{trailing}</span>,
);
```

- [ ] **Step 6: Create `ListRow.module.css`**

Grid `[leading?] [main] [trailing?]`; compact 28px / library 58px; hover echo when interactive; selected fill + inset edge (mirrors ScriptStructureSidebar `.itemRow.active` `box-shadow: inset 0 0 0 1px var(--state-selected-edge)`):
```css
.row {
    --list-row-min-height: calc(28px * var(--size-scale));
    --list-row-padding: 0 var(--space-sm);
    --list-row-gap: var(--space-sm);

    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: var(--list-row-gap);
    align-items: center;
    min-height: var(--list-row-min-height);
    padding: var(--list-row-padding);
    border-radius: var(--radius-md);
}

.compact {
    --list-row-min-height: calc(28px * var(--size-scale));
}

.library {
    --list-row-min-height: calc(58px * var(--size-scale));

    --list-row-padding: var(--space-sm) var(--space-md);
}

.interactive {
    cursor: pointer;
    transition: background var(--duration-normal) var(--ease-standard);

    &:hover {
        background: var(--state-hover);
    }
}

.selected {
    background: var(--state-selected);
    box-shadow: inset 0 0 0 1px var(--state-selected-edge);
}

.leading,
.trailing {
    display: inline-flex;
    align-items: center;
}

.main {
    min-width: 0;
}
```
> Confirm `--state-hover`, `--state-selected`, `--state-selected-edge` exist in `tokens.css` (they're used by ScriptStructureSidebar today). If a `ListRow` has no `leading`/`trailing`, the empty grid tracks collapse (`auto` → 0) — acceptable. Apply the audit's normalized values if they differ.

- [ ] **Step 7: Export both from `index.ts`**

Alphabetical within `./molecules/*`:
```ts
export {ListPanel, type ListPanelProps} from './molecules/ListPanel';
export {ListRow, type ListRowProps} from './molecules/ListRow';
```

- [ ] **Step 8: Run both tests to verify they pass**

Run:
```bash
export PROTO_AUTO_INSTALL=true && pnpm --filter @stagistic/ui exec vp test run src/molecules/ListPanel.test.tsx src/molecules/ListRow.test.tsx
```
Expected: PASS.

- [ ] **Step 9: Add both dev catalog entries**

In `apps/web/src/dev/registry/primitives.tsx` add `ListPanel`, `ListRow` to the import and:
```tsx
{
    name: 'ListPanel',
    variables: ['--list-bg', '--list-edge', '--list-radius', '--list-gap'],
    samples: [
        {
            label: 'bordered + compact rows',
            node: (
                <ListPanel inset>
                    <ListRow interactive>Act I</ListRow>
                    <ListRow interactive selected>Act II</ListRow>
                    <ListRow interactive>Act III</ListRow>
                </ListPanel>
            ),
        },
    ],
},
{
    name: 'ListRow',
    variables: ['--list-row-min-height', '--list-row-padding', '--list-row-gap'],
    samples: [
        {label: 'compact', node: <ListRow interactive>Scene 1</ListRow>},
        {label: 'library', node: <ListRow size="library" interactive>Hamlet</ListRow>},
        {label: 'selected', node: <ListRow interactive selected>Selected</ListRow>},
        {
            label: 'slots',
            node: <ListRow leading={<span>≡</span>} trailing={<span>⋯</span>}>With slots</ListRow>,
        },
    ],
},
```

- [ ] **Step 10: Run the coverage + css-var guard**

Run: `export PROTO_AUTO_INSTALL=true && pnpm --filter @stagistic/ui exec vp test run src/tokens.test.ts`
Expected: PASS (both `ListPanel` and `ListRow` catalogued).

- [ ] **Step 11: Typecheck + lint**

Run:
```bash
export PROTO_AUTO_INSTALL=true && pnpm -w exec tsc -b
pnpm exec eslint --fix packages/ui/src/molecules/ListPanel.tsx packages/ui/src/molecules/ListPanel.test.tsx packages/ui/src/molecules/ListRow.tsx packages/ui/src/molecules/ListRow.test.tsx apps/web/src/dev/registry/primitives.tsx packages/ui/src/index.ts
pnpm exec stylelint --fix packages/ui/src/molecules/ListPanel.module.css packages/ui/src/molecules/ListRow.module.css
```
Expected: no errors.

- [ ] **Step 12: Prepare commit (user runs)**

Message:
```
feat(ui): add ListPanel + ListRow patterns
```

---

### Task 6: SidebarShell (L3 pattern)

**Files:**
- Create: `packages/ui/src/layout/SidebarShell.tsx`, `packages/ui/src/layout/SidebarShell.module.css`
- Test: `packages/ui/src/layout/SidebarShell.test.tsx`
- Modify: `packages/ui/src/index.ts`
- Modify: `apps/web/src/dev/registry/primitives.tsx`

**Interfaces:**
- Produces: `SidebarShell` — slots `title?: ReactNode`, `actions?: ReactNode`, children (scrollable body), `className?`. A sticky header (`--sidebar-head-height`) + padded scrollable body (`--sidebar-pad`). Visual shell only — no panel-switching, DnD, or handlers. Override variables: `--sidebar-head-height`, `--sidebar-pad`.

- [ ] **Step 1: Write the failing test**

`packages/ui/src/layout/SidebarShell.test.tsx`:
```tsx
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vite-plus/test';

import {SidebarShell} from './SidebarShell';
import styles from './SidebarShell.module.css';

describe('SidebarShell', () => {
    it('renders header title, actions and body', () => {
        const markup = renderToStaticMarkup(
            <SidebarShell title="Structure" actions={<button>+</button>}>
                <div>body</div>
            </SidebarShell>,
        );
        expect(markup).toContain(styles.shell);
        expect(markup).toContain(styles.header);
        expect(markup).toContain(styles.body);
        expect(markup).toContain('Structure');
        expect(markup).toContain('body');
    });

    it('omits the actions container when no actions given', () => {
        const markup = renderToStaticMarkup(<SidebarShell title="X"><div /></SidebarShell>);
        expect(markup).not.toContain(styles.actions);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PROTO_AUTO_INSTALL=true && pnpm --filter @stagistic/ui exec vp test run src/layout/SidebarShell.test.tsx`
Expected: FAIL — module unresolved.

- [ ] **Step 3: Create the component**

`packages/ui/src/layout/SidebarShell.tsx`:
```tsx
import clsx from 'clsx';
import {type ReactElement, type ReactNode} from 'react';

import styles from './SidebarShell.module.css';

export type SidebarShellProps = {
    title?: ReactNode,
    actions?: ReactNode,
    className?: string,
    children?: ReactNode,
};

export const SidebarShell = ({
    title,
    actions,
    className,
    children,
}: SidebarShellProps): ReactElement => (
    <div className={clsx(styles.shell, className)}>
        <div className={styles.header}>
            {title != null && <div className={styles.title}>{title}</div>}
            {actions != null && <div className={styles.actions}>{actions}</div>}
        </div>
        <div className={styles.body}>{children}</div>
    </div>
);
```

- [ ] **Step 4: Create the stylesheet**

`packages/ui/src/layout/SidebarShell.module.css` (mirrors SidebarMiniHeader `.header` sticky treatment):
```css
.shell {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
}

.header {
    --sidebar-head-height: calc(44px * var(--size-scale));

    position: sticky;
    z-index: 1;
    top: 0;
    display: flex;
    flex: none;
    gap: var(--space-sm);
    align-items: center;
    justify-content: space-between;
    height: var(--sidebar-head-height);
    padding: 0 var(--space-sm) 0 var(--space-lg);
    background: var(--layer-panel-bg);
    border-bottom: 1px solid var(--color-border-subtle);
}

.title {
    overflow: hidden;
    min-width: 0;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-muted);
    text-overflow: ellipsis;
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-sm);
}

.actions {
    display: flex;
    flex-shrink: 0;
    gap: var(--space-sm);
    align-items: center;
}

.body {
    --sidebar-pad: var(--space-lg);

    overflow: auto;
    flex: 1;
    min-height: 0;
    padding: var(--sidebar-pad);
}
```
> Confirm `--layer-panel-bg`, `--color-border-subtle`, `--letter-spacing-sm` exist (used by SidebarMiniHeader today). Note `--sidebar-head-height` is declared on `.header` and `--sidebar-pad` on `.body` — both readers are inside this stylesheet, so the guard is satisfied. Use the audit's values if changed.

- [ ] **Step 5: Export from `index.ts`**

Alongside `./layout/AppLayout`:
```ts
export {SidebarShell, type SidebarShellProps} from './layout/SidebarShell';
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `export PROTO_AUTO_INSTALL=true && pnpm --filter @stagistic/ui exec vp test run src/layout/SidebarShell.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 7: Add the dev catalog entry**

In `apps/web/src/dev/registry/primitives.tsx` add `SidebarShell` to the import and:
```tsx
{
    name: 'SidebarShell',
    variables: ['--sidebar-head-height', '--sidebar-pad'],
    samples: [
        {
            label: 'title + actions',
            node: (
                <div style={{height: '12rem', width: '16rem', border: '1px solid var(--color-border)'}}>
                    <SidebarShell title="Structure" actions={<button type="button">+</button>}>
                        <div>Body content</div>
                    </SidebarShell>
                </div>
            ),
        },
    ],
},
```

- [ ] **Step 8: Run the coverage + css-var guard**

Run: `export PROTO_AUTO_INSTALL=true && pnpm --filter @stagistic/ui exec vp test run src/tokens.test.ts`
Expected: PASS.

- [ ] **Step 9: Typecheck + lint**

Run:
```bash
export PROTO_AUTO_INSTALL=true && pnpm -w exec tsc -b
pnpm exec eslint --fix packages/ui/src/layout/SidebarShell.tsx packages/ui/src/layout/SidebarShell.test.tsx apps/web/src/dev/registry/primitives.tsx packages/ui/src/index.ts
pnpm exec stylelint --fix packages/ui/src/layout/SidebarShell.module.css
```
Expected: no errors.

- [ ] **Step 10: Prepare commit (user runs)**

Message:
```
feat(ui): add SidebarShell layout pattern
```

---

## Close-out

- [ ] **Full test sweep:** `export PROTO_AUTO_INSTALL=true && pnpm --filter @stagistic/ui exec vp test run` — all green, including `tokens.test.ts` (coverage + css-var guards).
- [ ] **Browser tests** (memory `reference_test_db_conventions`): if any `.browser.test.tsx` exist for touched areas, run `test:browser`; note pre-existing editor reds are not regressions.
- [ ] **Confirm `NOT_CATALOGUED_YET` untouched** — all six components are catalogued, so the set did not need edits.
- [ ] **Hand off to Plan 2** (route recomposition: HomeRoute → ActionCard/ListPanel/ListRow/SearchInput/Skeleton; settings → SettingsGroup; modals → ModalDialog; notices → Notice; editor sidebars → SidebarShell + ListRow shells). Plan 2 is written only after Task 1's normalization table is approved, because its exact replaced values depend on that table.

## Self-review notes

- **Spec coverage:** §5.1's six components (Skeleton, SearchInput, ActionCard, ListPanel, ListRow, SidebarShell) each have a task. §7's Reusable Skeleton Rule is Task 1 Step 3. §6's audit-approval-gate discipline is Task 1's gate. §5.2/§5.3/§5.5 (migrations, sidebar shell-only, singular-kept) are Plan 2 scope, noted in Close-out.
- **Type consistency:** every export uses the verified `<T extends ElementType>` + `Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | …>` + `Record<Variant, string>` pattern; catalog `variables:` arrays exactly match each stylesheet's declared override variables; `index.ts` export names match the `.tsx` export names.
- **Token risk:** every task carries a "confirm token exists in `tokens.css`" note because the `tokens.test.ts` undeclared-read guard fails on any `var(--x)` without a declaration or fallback. Verify names before writing CSS.
