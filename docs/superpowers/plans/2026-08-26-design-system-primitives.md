# Design System Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the four layer-1 primitives (`Stack`, `Text`, `Panel`, `Overlay`), give the existing controls declared variable contracts and real variants instead of repaint-through-`className`, and stand up the `/dev/ui` catalog that proves both.

**Architecture:** Primitives are thin, prop-driven React components over CSS modules, following the `Button` idiom already in the repo: `clsx(styles.base, styles[variant], styles[size], className)`. Each primitive declares its overridable variables on its own root class — never on `:root` — per The Component Variables Are Scoped Rule added to `DESIGN.md` by the foundation plan. The catalog is a dev-only route in `apps/web` that renders every component × variant × state under two global switches (theme, `--size-scale`), so a hardcoded pixel or a broken dark pairing shows up as a visible defect rather than a silent one.

**Tech Stack:** React 19, TypeScript, CSS Modules, `clsx`, react-aria-components, react-router, vite-plus test runner (`vp test run`), Playwright browser tests.

**Spec:** `docs/superpowers/specs/2026-08-25-design-system-consolidation-design.md` — this plan implements **sequencing steps 3 and 4**.

**Predecessor:** `docs/superpowers/plans/2026-08-25-design-system-foundation.md` (steps 1-2, complete). Its ledger, including every ruling made during execution, is at `.superpowers/sdd/2026-08-25-design-system-foundation/progress.md`.

---

## Global Constraints

- **Never commit.** Per `AGENTS.md`: stage the change, print the proposed commit message, and stop. The maintainer commits. This applies to every "Commit" step below.
- **Canonical checks:** `npx tsc -b`; the lint commands below; `pnpm test` (= `vp test run`); `pnpm --filter @stagistic/<pkg> test:browser`.
- **Do not run `pnpm lint` — it is broken in this workspace.** The script is `eslint . && stylelint "**/*.{css,scss}"`, but no `package.json` declares `eslint`, so `eslint .` dies with `sh: eslint: command not found` and the `&&` means **stylelint never runs either**. Run the two halves directly:
  ```bash
  # CSS
  npx --no-install stylelint "packages/**/*.css"
  # JS/TS — invoke the vendored binary by path
  ESLINT_USE_FLAT_CONFIG=true node node_modules/.pnpm/eslint@8.57.1_supports-color@7.2.0/node_modules/eslint/bin/eslint.js <paths>
  ```
  Expected noise: stylelint prints `DeprecationWarning: context.fix is being deprecated`. Not findings.
- **ESLint has a large pre-existing baseline** — 285 errors + 1 warning across `packages/` alone, overwhelmingly `@stylistic/*`. Lint **only the files your task touches**. Your own new or modified files must be clean. Never run `--fix` across the repo; it would rewrite 258 unrelated files. `eslint --fix` **is** the formatter — do not run `vp lint` or `vp fmt`.
- **Never mutate golden snapshots**, loosen assertions, or change a viewport to make a red go green.
- **The browser runner rewrites committed golden PNGs on disk by itself.** Observed twice during the foundation plan. After any `test:browser` run, always:
  ```bash
  git status --porcelain | grep -iE '\.png|__screenshots__'   # expect no output
  git checkout -- <any modified golden>                        # restore it
  rm -rf <any new untracked __screenshots__ dir>               # remove the artifact
  ```
  Never stage a PNG. Report every occurrence. Do not run browser suites unless your task's steps call for them.
- **`pnpm test` is flaky — never gate on a failure *count*.** Six runs of one identical tree produced 13, 13, 10, 14, 13 and 14 failures. The failing set splits in two:
  - **Deterministic (8):** `packages/editor/.../enter.test.ts > handleEnter > …`. Pre-existing, tied to the `rewrite` WIP.
  - **Flaky tail:** `packages/db/**` PGlite tests, `prepareExampleScriptDocument`, `apps/landing`. These take 5-8s each and time out under load. **Membership churns, not just size** — an unfamiliar name from those areas is not a regression on sight. Confirm by running that package alone: `pnpm --filter @stagistic/db test` passes 122/122 every time.

  Compare failing test **names**, not counts: `pnpm test 2>&1 | grep -E '^\s*FAIL' | sort -u`
- **`Select.tsx:57` builds a CSS anchor name `--select-${id}` at runtime.** Do not rename or "clean up" that string, and do not perform any blanket `--select-` rename.
- Never edit or commit `vite.config.js` — it is a gitignored compiled artifact.
- **Baseline discipline:** establish a baseline with `git diff > /tmp/baseline.patch` then `git apply -R`, never `git stash` (the maintainer commits concurrently).
- Indentation is 4 spaces, in both CSS and TypeScript. Test imports come from `vite-plus/test`, not `vitest`.
- **Node-side component tests use `renderToStaticMarkup` from `react-dom/server`** (see `packages/ui/src/molecules/ToggleButtonGroup.test.tsx`). Browser tests import `../../styles/tokens.css` first and mount with `createRoot` (see `packages/ui/src/atoms/Tooltip.browser.test.tsx`).
- **Every primitive declares its variables on its own root class, never on `:root`.** `packages/ui/src/tokens.test.ts` guards the `:root` boundary; do not weaken it.

---

## Interfaces produced by this plan

Later tasks and later plans consume these exact signatures. They are defined once here so no implementer has to guess.

The prop shapes below are written flat for readability. `Stack`, `Text` and `Panel` are actually generic in their `as` element — `StackProps<T extends ElementType = 'div'>` and so on — and each intersects `Omit<ComponentPropsWithoutRef<T>, …>`. The task bodies carry the exact declarations; where the two differ, **the task body wins**. `Overlay` is not generic: it is always a `div`.

```ts
type StackProps = {
    direction?: 'row' | 'column',        // default 'column'
    gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl',   // default 'md'
    align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline',
    justify?: 'start' | 'center' | 'end' | 'between',
    wrap?: boolean,
    as?: ElementType,                    // default 'div'
    className?: string,                  // position only
};

type TextProps = {
    variant?: 'body' | 'muted' | 'label' | 'mono',              // role: colour, weight, family
    size?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl',  // default 'md'
    truncate?: boolean,
    as?: ElementType,                    // default 'p'
    className?: string,
};

type PanelProps = {
    layer?: 'shell' | 'panel' | 'float', // default 'panel'
    padding?: 'none' | 'sm' | 'md' | 'lg',
    bordered?: boolean,                  // default true
    as?: ElementType,
    className?: string,
};

type OverlayProps = {
    placement?: 'top' | 'bottom' | 'left' | 'right',
    elevation?: 'popover' | 'panel' | 'canvas',
    className?: string,
};
```

Variable contracts (each declared on the component's own root class):

| Component | Variables |
|---|---|
| `Stack` | `--stack-gap` |
| `Text` | `--text-color`, `--text-size` |
| `Panel` | `--panel-bg`, `--panel-pad`, `--panel-edge` |
| `Overlay` | `--overlay-bg`, `--overlay-shadow`, `--overlay-offset` |

**`Text` API note.** The spec lists only `variant` (body/muted/label/mono), but that set cannot absorb `PageTitle` and `SectionTitle`, which differ by *size*, not role. Decided with the maintainer: **two independent axes**, `variant` for role and `size` for the type step, matching how `Button` already separates `variant` from `size`. `PageTitle` becomes `<Text as="h1" size="4xl">`, `SectionTitle` becomes `<Text as="h2" size="3xl">`.

---

### Task 1: Free the `--panel-*` namespace before `Panel` exists

`:root` already declares `--panel-width` and `--panel-head-height`. They are **sidebar geometry**, unrelated to a `Panel` component. If `Panel` ships first, `--panel-width` and `--panel-pad` read as siblings from one namespace while belonging to two different things — the exact failure The Component Variables Are Scoped Rule warns about. Rename the incumbents first; this task must land before Task 4.

**Files:**
- Modify: `packages/ui/styles/tokens.css` (lines 171-172)
- Modify: `packages/app-routes/src/routes/script/editor/sidebar/SidebarMiniHeader.module.css:10`
- Modify: `packages/editor/src/editor/components/EditorToolbar.module.css:5`
- Modify: `packages/editor/src/editor/buildRootStyle.ts:37`
- Modify: `packages/editor/src/editor/buildRootStyle.test.ts:29`

**Interfaces:**
- Produces: `--sidebar-width`, `--sidebar-head-height` on `:root`. No `--panel-*` name survives on `:root`.

- [ ] **Step 1: Find every reader — do not trust the line numbers above**

```bash
cd /Users/milanzitka/git/stagistic
grep -rn -- '--panel-width\|--panel-head-height' packages/ apps/ 2>/dev/null | grep -v node_modules | grep -v dist
```

Expected: exactly five sites — the two declarations plus four reads (one of which is a test asserting the literal string `'var(--panel-width)'`). If you find more, rename them all; if you find fewer, stop and report.

- [ ] **Step 2: Update the failing test first**

`packages/editor/src/editor/buildRootStyle.test.ts:29` asserts the exact string. Change it:

```ts
        expect(style['--editor-sidebar-width']).toBe('var(--sidebar-width)');
```

- [ ] **Step 3: Run it and watch it fail**

```bash
pnpm --filter @stagistic/editor test 2>&1 | grep -E 'buildRootStyle|Tests '
```

Expected: FAIL — received `'var(--panel-width)'`, expected `'var(--sidebar-width)'`. This proves the test actually covers the rename.

- [ ] **Step 4: Rename the declarations and all reads**

In `packages/ui/styles/tokens.css`:

```css
    --sidebar-width: calc(256px * var(--size-scale));
    --sidebar-head-height: var(--control-height-md);
```

In `packages/editor/src/editor/buildRootStyle.ts:37`:

```ts
        '--editor-sidebar-width': sidebarWidth ?? 'var(--sidebar-width)',
```

In the two CSS readers, replace `var(--panel-head-height)` with `var(--sidebar-head-height)`.

- [ ] **Step 5: Verify nothing is left behind**

```bash
grep -rn -- '--panel-width\|--panel-head-height' packages/ apps/ 2>/dev/null | grep -v node_modules | grep -v dist
```

Expected: **no output**.

```bash
pnpm --filter @stagistic/editor test 2>&1 | grep -E 'Tests '
pnpm --filter @stagistic/ui test 2>&1 | grep -E 'Tests '
npx tsc -b
npx --no-install stylelint "packages/ui/styles/tokens.css" "packages/editor/src/editor/components/EditorToolbar.module.css" "packages/app-routes/src/routes/script/editor/sidebar/SidebarMiniHeader.module.css"
```

Expected: editor tests pass, ui 22/22, `tsc` exit 0, stylelint 0 errors.

- [ ] **Step 6: Stage and propose the commit**

```bash
git add packages/ui/styles/tokens.css packages/editor/src packages/app-routes/src
```

Proposed message:

```
refactor(tokens): rename --panel-width/--panel-head-height to --sidebar-*

They are sidebar geometry, not properties of the forthcoming Panel primitive.
Renaming now keeps the --panel-* namespace free for Panel's own variable
contract.
```

Do not commit.

---

### Task 2: `Stack` primitive

**Files:**
- Create: `packages/ui/src/primitives/Stack.tsx`
- Create: `packages/ui/src/primitives/Stack.module.css`
- Create: `packages/ui/src/primitives/Stack.test.tsx`
- Modify: `packages/ui/src/index.ts` (add export)

**Interfaces:**
- Produces: `Stack`, `type StackProps` — signature in the Interfaces section above.

- [ ] **Step 1: Write the failing test**

Create `packages/ui/src/primitives/Stack.test.tsx`:

```tsx
import {renderToStaticMarkup} from 'react-dom/server';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {Stack} from './Stack';
import styles from './Stack.module.css';

describe('Stack', () => {
    it('defaults to a column with medium gap', () => {
        const markup = renderToStaticMarkup(<Stack>content</Stack>);

        expect(markup).toContain(styles.stack);
        expect(markup).toContain(styles.column);
        expect(markup).toContain(styles.gapMd);
        expect(markup).toContain('content');
    });

    it('applies direction, gap, align and justify as classes', () => {
        const markup = renderToStaticMarkup(
            <Stack direction="row" gap="xl" align="center" justify="between">
                content
            </Stack>,
        );

        expect(markup).toContain(styles.row);
        expect(markup).toContain(styles.gapXl);
        expect(markup).toContain(styles.alignCenter);
        expect(markup).toContain(styles.justifyBetween);
    });

    it('renders the element named by `as` and keeps a caller className', () => {
        const markup = renderToStaticMarkup(
            <Stack as="ul" className="col-span-2">content</Stack>,
        );

        expect(markup).toContain('<ul');
        expect(markup).toContain('col-span-2');
    });
});
```

- [ ] **Step 2: Run it and verify it fails**

```bash
pnpm --filter @stagistic/ui test 2>&1 | grep -E 'Stack|Tests '
```

Expected: FAIL — cannot resolve `./Stack`.

- [ ] **Step 3: Write the CSS**

Create `packages/ui/src/primitives/Stack.module.css`:

```css
.stack {
    /* The one overridable value. Every gap class sets it; callers with a
       genuinely per-instance spacing set it directly instead of adding a class. */
    --stack-gap: var(--space-md);

    display: flex;
    gap: var(--stack-gap);
    min-width: 0;
}

.column {
    flex-direction: column;
}

.row {
    flex-direction: row;
}

.wrap {
    flex-wrap: wrap;
}

.gapNone {
    --stack-gap: var(--space-none);
}

.gapXs {
    --stack-gap: var(--space-xs);
}

.gapSm {
    --stack-gap: var(--space-sm);
}

.gapMd {
    --stack-gap: var(--space-md);
}

.gapLg {
    --stack-gap: var(--space-lg);
}

.gapXl {
    --stack-gap: var(--space-xl);
}

.gap2xl {
    --stack-gap: var(--space-2xl);
}

.alignStart {
    align-items: flex-start;
}

.alignCenter {
    align-items: center;
}

.alignEnd {
    align-items: flex-end;
}

.alignStretch {
    align-items: stretch;
}

.alignBaseline {
    align-items: baseline;
}

.justifyStart {
    justify-content: flex-start;
}

.justifyCenter {
    justify-content: center;
}

.justifyEnd {
    justify-content: flex-end;
}

.justifyBetween {
    justify-content: space-between;
}
```

- [ ] **Step 4: Write the component**

Create `packages/ui/src/primitives/Stack.tsx`:

```tsx
import clsx from 'clsx';
import {
    type ComponentPropsWithoutRef,
    createElement,
    type ElementType,
    type ReactElement,
} from 'react';

import styles from './Stack.module.css';

type StackGap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

type StackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';

type StackJustify = 'start' | 'center' | 'end' | 'between';

export type StackProps<T extends ElementType = 'div'> = {
    as?: T,
    direction?: 'row' | 'column',
    gap?: StackGap,
    align?: StackAlign,
    justify?: StackJustify,
    wrap?: boolean,
    className?: string,
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | 'wrap'>;

const GAP_CLASS: Record<StackGap, string> = {
    'none': styles.gapNone,
    'xs': styles.gapXs,
    'sm': styles.gapSm,
    'md': styles.gapMd,
    'lg': styles.gapLg,
    'xl': styles.gapXl,
    '2xl': styles.gap2xl,
};

const ALIGN_CLASS: Record<StackAlign, string> = {
    start: styles.alignStart,
    center: styles.alignCenter,
    end: styles.alignEnd,
    stretch: styles.alignStretch,
    baseline: styles.alignBaseline,
};

const JUSTIFY_CLASS: Record<StackJustify, string> = {
    start: styles.justifyStart,
    center: styles.justifyCenter,
    end: styles.justifyEnd,
    between: styles.justifyBetween,
};

export const Stack = <T extends ElementType = 'div'>({
    as,
    direction = 'column',
    gap = 'md',
    align,
    justify,
    wrap = false,
    className,
    ...props
}: StackProps<T>): ReactElement => {
    const Element = (as ?? 'div') as ElementType;

    return createElement(Element, {
        ...props,
        className: clsx(
            styles.stack,
            direction === 'row' ? styles.row : styles.column,
            GAP_CLASS[gap],
            align && ALIGN_CLASS[align],
            justify && JUSTIFY_CLASS[justify],
            wrap && styles.wrap,
            className,
        ),
    });
};
```

- [ ] **Step 5: Export it**

In `packages/ui/src/index.ts`, add in alphabetical position among the primitives:

```ts
export {Stack, type StackProps} from './primitives/Stack';
```

- [ ] **Step 6: Run tests and lint**

```bash
pnpm --filter @stagistic/ui test 2>&1 | grep -E 'Tests '
npx tsc -b
npx --no-install stylelint "packages/ui/src/primitives/Stack.module.css"
ESLINT_USE_FLAT_CONFIG=true node node_modules/.pnpm/eslint@8.57.1_supports-color@7.2.0/node_modules/eslint/bin/eslint.js packages/ui/src/primitives/Stack.tsx packages/ui/src/primitives/Stack.test.tsx
```

Expected: all pass, `tsc` exit 0, stylelint 0 errors, eslint no output.

- [ ] **Step 7: Stage and propose the commit**

```bash
git add packages/ui/src/primitives packages/ui/src/index.ts
```

Proposed message:

```
feat(ui): add the Stack primitive

Prop-driven flex container with a single overridable variable, --stack-gap.
```

Do not commit.

---

### Task 3: `Text` primitive, absorbing the four legacy typography components

**Files:**
- Create: `packages/ui/src/primitives/Text.tsx`
- Create: `packages/ui/src/primitives/Text.module.css`
- Create: `packages/ui/src/primitives/Text.test.tsx`
- Delete: `packages/ui/src/atoms/typography/Typography.tsx`
- Delete: `packages/ui/src/atoms/typography/Typography.module.css`
- Modify: `packages/ui/src/index.ts` (drop the four exports, add `Text`)
- Modify: every call site found in Step 1

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `Text`, `type TextProps`. `Kicker`, `PageTitle`, `SectionTitle` and `SubtleText` **cease to exist** — no deprecated re-export shims.

- [ ] **Step 1: Find every call site**

```bash
cd /Users/milanzitka/git/stagistic
grep -rn 'Kicker\|PageTitle\|SectionTitle\|SubtleText' packages/ apps/ 2>/dev/null | grep -v node_modules | grep -v dist
```

Known at plan time (re-verify — do not trust this list blindly):

| File | Component |
|---|---|
| `packages/ui/src/index.ts` | all four exports |
| `packages/ui/src/atoms/typography/Typography.tsx` | the definitions |
| `packages/app-routes/src/routes/home/HomeRoute.tsx` | `SubtleText` ×2, plus titles |
| `packages/app-routes/src/routes/home/ScriptListSection.tsx` | `SubtleText` |
| `packages/app-routes/src/routes/script/export/modules/InitialPagesModule.tsx` | title component |

The mapping to apply at each site:

| Old | New |
|---|---|
| `<Kicker>` | `<Text variant="label" size="sm">` |
| `<PageTitle>` | `<Text as="h1" size="4xl">` |
| `<SectionTitle>` | `<Text as="h2" size="3xl">` |
| `<SubtleText>` | `<Text variant="muted">` |

- [ ] **Step 2: Write the failing test**

Create `packages/ui/src/primitives/Text.test.tsx`:

```tsx
import {renderToStaticMarkup} from 'react-dom/server';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {Text} from './Text';
import styles from './Text.module.css';

describe('Text', () => {
    it('defaults to a body paragraph at the medium step', () => {
        const markup = renderToStaticMarkup(<Text>content</Text>);

        expect(markup).toContain('<p');
        expect(markup).toContain(styles.text);
        expect(markup).toContain(styles.body);
        expect(markup).toContain(styles.sizeMd);
    });

    it('treats variant and size as independent axes', () => {
        const markup = renderToStaticMarkup(
            <Text variant="muted" size="3xl">content</Text>,
        );

        expect(markup).toContain(styles.muted);
        expect(markup).toContain(styles.size3xl);
    });

    it('renders the heading named by `as` without changing its size class', () => {
        const markup = renderToStaticMarkup(
            <Text as="h1" size="4xl">Title</Text>,
        );

        expect(markup).toContain('<h1');
        expect(markup).toContain(styles.size4xl);
    });

    it('adds the truncate class only when asked', () => {
        expect(renderToStaticMarkup(<Text>x</Text>)).not.toContain(styles.truncate);
        expect(renderToStaticMarkup(<Text truncate>x</Text>)).toContain(styles.truncate);
    });
});
```

- [ ] **Step 3: Run it and verify it fails**

```bash
pnpm --filter @stagistic/ui test 2>&1 | grep -E 'Text|Tests '
```

Expected: FAIL — cannot resolve `./Text`.

- [ ] **Step 4: Write the CSS**

Create `packages/ui/src/primitives/Text.module.css`. The two variables carry the whole contract; variant classes set colour, size classes set the step.

```css
.text {
    --text-color: var(--color-text);
    --text-size: var(--font-size-md);

    margin: 0;
    color: var(--text-color);
    font-size: var(--text-size);
    min-width: 0;
}

.body {
    --text-color: var(--color-text);
}

.muted {
    --text-color: var(--color-text-muted);
}

.label {
    --text-color: var(--color-text-muted);

    font-weight: var(--font-weight-medium);
}

.mono {
    font-family: var(--font-family-mono);
}

.sizeXxs {
    --text-size: var(--font-size-xxs);
}

.sizeXs {
    --text-size: var(--font-size-xs);
}

.sizeSm {
    --text-size: var(--font-size-sm);
}

.sizeMd {
    --text-size: var(--font-size-md);
}

.sizeLg {
    --text-size: var(--font-size-lg);
}

.sizeXl {
    --text-size: var(--font-size-xl);
}

.size2xl {
    --text-size: var(--font-size-2xl);
}

.size3xl {
    --text-size: var(--font-size-3xl);
}

.size4xl {
    --text-size: var(--font-size-4xl);

    line-height: var(--line-height-tight);
}

.truncate {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}
```

**Verify before writing:** `--font-family-mono` and `--font-weight-medium` must exist in `packages/ui/styles/tokens.css`. Check with:

```bash
grep -nE -- '--font-family-mono\s*:|--font-weight-medium\s*:' packages/ui/styles/tokens.css
```

If `--font-family-mono` does not exist, stop and report — do not invent a font stack, and do not hardcode one.

- [ ] **Step 5: Write the component**

Create `packages/ui/src/primitives/Text.tsx`:

```tsx
import clsx from 'clsx';
import {
    type ComponentPropsWithoutRef,
    createElement,
    type ElementType,
    type ReactElement,
} from 'react';

import styles from './Text.module.css';

type TextVariant = 'body' | 'muted' | 'label' | 'mono';

type TextSize = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

export type TextProps<T extends ElementType = 'p'> = {
    as?: T,
    variant?: TextVariant,
    size?: TextSize,
    truncate?: boolean,
    className?: string,
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className'>;

const VARIANT_CLASS: Record<TextVariant, string> = {
    body: styles.body,
    muted: styles.muted,
    label: styles.label,
    mono: styles.mono,
};

const SIZE_CLASS: Record<TextSize, string> = {
    'xxs': styles.sizeXxs,
    'xs': styles.sizeXs,
    'sm': styles.sizeSm,
    'md': styles.sizeMd,
    'lg': styles.sizeLg,
    'xl': styles.sizeXl,
    '2xl': styles.size2xl,
    '3xl': styles.size3xl,
    '4xl': styles.size4xl,
};

export const Text = <T extends ElementType = 'p'>({
    as,
    variant = 'body',
    size = 'md',
    truncate = false,
    className,
    ...props
}: TextProps<T>): ReactElement => {
    const Element = (as ?? 'p') as ElementType;

    return createElement(Element, {
        ...props,
        className: clsx(
            styles.text,
            VARIANT_CLASS[variant],
            SIZE_CLASS[size],
            truncate && styles.truncate,
            className,
        ),
    });
};
```

- [ ] **Step 6: Migrate every call site, then delete the old components**

Apply the mapping table from Step 1 at each site. Then:

```bash
rm packages/ui/src/atoms/typography/Typography.tsx
rm packages/ui/src/atoms/typography/Typography.module.css
rmdir packages/ui/src/atoms/typography
```

In `packages/ui/src/index.ts`, remove the four-name export block and add:

```ts
export {Text, type TextProps} from './primitives/Text';
```

- [ ] **Step 7: Verify nothing references the deleted components**

```bash
grep -rn 'Kicker\|PageTitle\|SectionTitle\|SubtleText\|atoms/typography' packages/ apps/ 2>/dev/null | grep -v node_modules | grep -v dist
```

Expected: **no output**.

```bash
pnpm --filter @stagistic/ui test 2>&1 | grep -E 'Tests '
npx tsc -b
npx --no-install stylelint "packages/ui/src/primitives/Text.module.css"
ESLINT_USE_FLAT_CONFIG=true node node_modules/.pnpm/eslint@8.57.1_supports-color@7.2.0/node_modules/eslint/bin/eslint.js packages/ui/src/primitives/Text.tsx packages/ui/src/primitives/Text.test.tsx
```

Expected: ui tests pass, `tsc` exit 0 (this is the real gate — it catches every missed call site), stylelint and eslint clean.

- [ ] **Step 8: Check the three route call sites visually did not shift**

The route modules had classes applied to `SubtleText` (`.scriptMeta`, `.emptyLibrary`, `.noResults`) that set `font-size` or `padding`. Those classes still apply — do not remove them in this task; they are removed in the route-CSS plan. Confirm they are still attached after the migration:

```bash
grep -n 'scriptMeta\|emptyLibrary\|noResults' packages/app-routes/src/routes/home/HomeRoute.tsx packages/app-routes/src/routes/home/ScriptListSection.tsx
```

Expected: each still present on the corresponding `<Text>`.

- [ ] **Step 9: Stage and propose the commit**

```bash
git add packages/ui/src packages/app-routes/src
```

Proposed message:

```
feat(ui): add the Text primitive and retire the four typography components

Kicker, PageTitle, SectionTitle and SubtleText collapse into one component with
two independent axes: variant for role, size for the type step. Call sites are
migrated; no compatibility shims are left behind.
```

Do not commit.

---

### Task 4: `Panel` primitive

Depends on Task 1 — `--panel-*` must be free on `:root` before this lands. `layer="float"` is the first reader of `--layer-float-bg`, a token that is currently declared and read nowhere.

**Files:**
- Create: `packages/ui/src/primitives/Panel.tsx`
- Create: `packages/ui/src/primitives/Panel.module.css`
- Create: `packages/ui/src/primitives/Panel.test.tsx`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**
- Consumes: `--sidebar-width` / `--sidebar-head-height` exist instead of `--panel-*` (Task 1).
- Produces: `Panel`, `type PanelProps`.

- [ ] **Step 1: Confirm Task 1 landed**

```bash
grep -rn -- '--panel-' packages/ui/styles/tokens.css
```

Expected: **no output**. If `--panel-width` is still there, stop — Task 1 has not landed and this task will create the exact namespace collision it exists to avoid.

- [ ] **Step 2: Write the failing test**

Create `packages/ui/src/primitives/Panel.test.tsx`:

```tsx
import {renderToStaticMarkup} from 'react-dom/server';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {Panel} from './Panel';
import styles from './Panel.module.css';

describe('Panel', () => {
    it('defaults to the panel layer, bordered', () => {
        const markup = renderToStaticMarkup(<Panel>content</Panel>);

        expect(markup).toContain(styles.panel);
        expect(markup).toContain(styles.layerPanel);
        expect(markup).toContain(styles.bordered);
    });

    it('drops the border when asked', () => {
        const markup = renderToStaticMarkup(<Panel bordered={false}>x</Panel>);

        expect(markup).not.toContain(styles.bordered);
    });

    it('carries the float layer and a padding step', () => {
        const markup = renderToStaticMarkup(
            <Panel layer="float" padding="lg">x</Panel>,
        );

        expect(markup).toContain(styles.layerFloat);
        expect(markup).toContain(styles.padLg);
    });
});
```

- [ ] **Step 3: Run it and verify it fails**

```bash
pnpm --filter @stagistic/ui test 2>&1 | grep -E 'Panel|Tests '
```

Expected: FAIL — cannot resolve `./Panel`.

- [ ] **Step 4: Write the CSS**

Create `packages/ui/src/primitives/Panel.module.css`. Layer classes set background and edge together, because `DESIGN.md` §4 makes them one decision, not two.

```css
.panel {
    --panel-bg: var(--layer-panel-bg);
    --panel-edge: var(--layer-panel-edge);
    --panel-pad: var(--space-md);

    background: var(--panel-bg);
    padding: var(--panel-pad);
    border-radius: var(--radius-md);
    min-width: 0;
}

.layerShell {
    --panel-bg: var(--layer-shell-bg);
    --panel-edge: var(--layer-shell-edge);
}

.layerPanel {
    --panel-bg: var(--layer-panel-bg);
    --panel-edge: var(--layer-panel-edge);
}

/* Float is the only layer that carries a shadow: per DESIGN.md §4 a floating
   surface is separated by elevation, not by a tonal step alone. */
.layerFloat {
    --panel-bg: var(--layer-float-bg);
    --panel-edge: var(--layer-panel-edge);

    box-shadow: var(--shadow-popover);
}

.bordered {
    border: 1px solid var(--panel-edge);
}

.padNone {
    --panel-pad: var(--space-none);
}

.padSm {
    --panel-pad: var(--space-sm);
}

.padMd {
    --panel-pad: var(--space-md);
}

.padLg {
    --panel-pad: var(--space-lg);
}
```

- [ ] **Step 5: Write the component**

Create `packages/ui/src/primitives/Panel.tsx`:

```tsx
import clsx from 'clsx';
import {
    type ComponentPropsWithoutRef,
    createElement,
    type ElementType,
    type ReactElement,
} from 'react';

import styles from './Panel.module.css';

type PanelLayer = 'shell' | 'panel' | 'float';

type PanelPadding = 'none' | 'sm' | 'md' | 'lg';

export type PanelProps<T extends ElementType = 'div'> = {
    as?: T,
    layer?: PanelLayer,
    padding?: PanelPadding,
    bordered?: boolean,
    className?: string,
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className'>;

const LAYER_CLASS: Record<PanelLayer, string> = {
    shell: styles.layerShell,
    panel: styles.layerPanel,
    float: styles.layerFloat,
};

const PADDING_CLASS: Record<PanelPadding, string> = {
    none: styles.padNone,
    sm: styles.padSm,
    md: styles.padMd,
    lg: styles.padLg,
};

export const Panel = <T extends ElementType = 'div'>({
    as,
    layer = 'panel',
    padding = 'md',
    bordered = true,
    className,
    ...props
}: PanelProps<T>): ReactElement => {
    const Element = (as ?? 'div') as ElementType;

    return createElement(Element, {
        ...props,
        className: clsx(
            styles.panel,
            LAYER_CLASS[layer],
            PADDING_CLASS[padding],
            bordered && styles.bordered,
            className,
        ),
    });
};
```

- [ ] **Step 6: Export, test, lint**

In `packages/ui/src/index.ts`:

```ts
export {Panel, type PanelProps} from './primitives/Panel';
```

```bash
pnpm --filter @stagistic/ui test 2>&1 | grep -E 'Tests '
npx tsc -b
npx --no-install stylelint "packages/ui/src/primitives/Panel.module.css"
ESLINT_USE_FLAT_CONFIG=true node node_modules/.pnpm/eslint@8.57.1_supports-color@7.2.0/node_modules/eslint/bin/eslint.js packages/ui/src/primitives/Panel.tsx packages/ui/src/primitives/Panel.test.tsx
```

- [ ] **Step 7: Stage and propose the commit**

```bash
git add packages/ui/src
```

Proposed message:

```
feat(ui): add the Panel primitive

Layer, padding and border as props; background and edge are chosen together,
since DESIGN.md treats them as one decision. layer="float" is the first
consumer of --layer-float-bg.
```

Do not commit.

---

### Task 5: `Overlay` primitive

**Files:**
- Create: `packages/ui/src/primitives/Overlay.tsx`
- Create: `packages/ui/src/primitives/Overlay.module.css`
- Create: `packages/ui/src/primitives/Overlay.test.tsx`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**
- Produces: `Overlay`, `type OverlayProps`.

- [ ] **Step 1: Write the failing test**

Create `packages/ui/src/primitives/Overlay.test.tsx`:

```tsx
import {renderToStaticMarkup} from 'react-dom/server';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {Overlay} from './Overlay';
import styles from './Overlay.module.css';

describe('Overlay', () => {
    it('defaults to bottom placement at popover elevation', () => {
        const markup = renderToStaticMarkup(<Overlay>content</Overlay>);

        expect(markup).toContain(styles.overlay);
        expect(markup).toContain(styles.bottom);
        expect(markup).toContain(styles.popover);
    });

    it('applies placement and elevation independently', () => {
        const markup = renderToStaticMarkup(
            <Overlay placement="right" elevation="canvas">x</Overlay>,
        );

        expect(markup).toContain(styles.right);
        expect(markup).toContain(styles.canvas);
    });
});
```

- [ ] **Step 2: Run it and verify it fails**

```bash
pnpm --filter @stagistic/ui test 2>&1 | grep -E 'Overlay|Tests '
```

Expected: FAIL — cannot resolve `./Overlay`.

- [ ] **Step 3: Write the CSS**

Create `packages/ui/src/primitives/Overlay.module.css`:

```css
.overlay {
    --overlay-bg: var(--layer-float-bg);
    --overlay-shadow: var(--shadow-popover);
    --overlay-offset: var(--space-xs);

    position: absolute;
    background: var(--overlay-bg);
    box-shadow: var(--overlay-shadow);
    border: 1px solid var(--layer-panel-edge);
    border-radius: var(--radius-md);
    z-index: 1;
}

.top {
    bottom: 100%;
    margin-bottom: var(--overlay-offset);
}

.bottom {
    top: 100%;
    margin-top: var(--overlay-offset);
}

.left {
    right: 100%;
    margin-right: var(--overlay-offset);
}

.right {
    left: 100%;
    margin-left: var(--overlay-offset);
}

.popover {
    --overlay-shadow: var(--shadow-popover);
}

.panel {
    --overlay-shadow: var(--shadow-panel);
}

.canvas {
    --overlay-shadow: var(--shadow-canvas);
}
```

- [ ] **Step 4: Write the component**

Create `packages/ui/src/primitives/Overlay.tsx`:

```tsx
import clsx from 'clsx';
import type {ComponentPropsWithoutRef, ReactElement} from 'react';

import styles from './Overlay.module.css';

type OverlayPlacement = 'top' | 'bottom' | 'left' | 'right';

type OverlayElevation = 'popover' | 'panel' | 'canvas';

export type OverlayProps = {
    placement?: OverlayPlacement,
    elevation?: OverlayElevation,
    className?: string,
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>;

const PLACEMENT_CLASS: Record<OverlayPlacement, string> = {
    top: styles.top,
    bottom: styles.bottom,
    left: styles.left,
    right: styles.right,
};

const ELEVATION_CLASS: Record<OverlayElevation, string> = {
    popover: styles.popover,
    panel: styles.panel,
    canvas: styles.canvas,
};

export const Overlay = ({
    placement = 'bottom',
    elevation = 'popover',
    className,
    ...props
}: OverlayProps): ReactElement => (
    <div
        {...props}
        className={clsx(
            styles.overlay,
            PLACEMENT_CLASS[placement],
            ELEVATION_CLASS[elevation],
            className,
        )}
    />
);
```

- [ ] **Step 5: Export, test, lint, stage**

```ts
export {Overlay, type OverlayProps} from './primitives/Overlay';
```

```bash
pnpm --filter @stagistic/ui test 2>&1 | grep -E 'Tests '
npx tsc -b
npx --no-install stylelint "packages/ui/src/primitives/Overlay.module.css"
ESLINT_USE_FLAT_CONFIG=true node node_modules/.pnpm/eslint@8.57.1_supports-color@7.2.0/node_modules/eslint/bin/eslint.js packages/ui/src/primitives/Overlay.tsx packages/ui/src/primitives/Overlay.test.tsx
git add packages/ui/src
```

Proposed message:

```
feat(ui): add the Overlay primitive

Placement and elevation as independent props over three declared variables.
```

Do not commit.

---

### Task 6: `/dev/ui` catalog skeleton

A dev-only route in `apps/web`, excluded from the production bundle. Two global switches: theme and `--size-scale`. The size-scale switch is a deliberate regression trap — it is the property a hardcoded pixel breaks first.

**Files:**
- Create: `apps/web/src/dev/DevUiRoute.tsx`
- Create: `apps/web/src/dev/DevUiRoute.module.css`
- Create: `apps/web/src/dev/registry/primitives.tsx`
- Create: `apps/web/src/dev/registry/types.ts`
- Modify: `apps/web/src/App.tsx` (mount the route under `import.meta.env.DEV`)

**Interfaces:**
- Consumes: `Stack`, `Text`, `Panel`, `Overlay` from `@stagistic/ui` (Tasks 2-5).
- Produces: `type CatalogEntry`, `type CatalogGroup`, and the `primitives` group. Task 7 and Task 8 add further groups to the same registry shape.

**Note:** this repo currently has **no** `import.meta.env` usage anywhere, so this is a new pattern. `apps/web/src/vite-env.d.ts` already exists and provides the types.

- [ ] **Step 1: Define the registry shape**

Create `apps/web/src/dev/registry/types.ts`:

```ts
import type {ReactNode} from 'react';

export type CatalogEntry = {
    /** Component name as exported from @stagistic/ui. */
    name: string,
    /** The variables a caller may override, per the Declared Surface Rule. */
    variables: string[],
    /** One rendering per variant/state worth seeing side by side. */
    samples: {label: string, node: ReactNode}[],
};

export type CatalogGroup = {
    title: string,
    entries: CatalogEntry[],
};
```

- [ ] **Step 2: Write the primitives registry**

Create `apps/web/src/dev/registry/primitives.tsx`:

```tsx
import {
    Overlay,
    Panel,
    Stack,
    Text,
} from '@stagistic/ui';

import type {CatalogGroup} from './types';

export const primitives: CatalogGroup = {
    title: 'Primitives',
    entries: [
        {
            name: 'Stack',
            variables: ['--stack-gap'],
            samples: [
                {
                    label: 'column, gap md',
                    node: (
                        <Stack>
                            <Text>First</Text>
                            <Text>Second</Text>
                        </Stack>
                    ),
                },
                {
                    label: 'row, gap xl, align center',
                    node: (
                        <Stack direction="row" gap="xl" align="center">
                            <Text>First</Text>
                            <Text size="2xl">Second</Text>
                        </Stack>
                    ),
                },
            ],
        },
        {
            name: 'Text',
            variables: ['--text-color', '--text-size'],
            samples: [
                {label: 'body', node: <Text>Body copy</Text>},
                {label: 'muted', node: <Text variant="muted">Muted copy</Text>},
                {label: 'label', node: <Text variant="label" size="sm">Label</Text>},
                {label: 'mono', node: <Text variant="mono">mono-123</Text>},
                {label: 'size 3xl', node: <Text as="h2" size="3xl">Section title</Text>},
                {label: 'size 4xl', node: <Text as="h1" size="4xl">Page title</Text>},
                {
                    label: 'truncate',
                    node: (
                        <div style={{width: '8rem'}}>
                            <Text truncate>A line long enough to be cut off</Text>
                        </div>
                    ),
                },
            ],
        },
        {
            name: 'Panel',
            variables: ['--panel-bg', '--panel-pad', '--panel-edge'],
            samples: [
                {label: 'shell', node: <Panel layer="shell"><Text>Shell</Text></Panel>},
                {label: 'panel', node: <Panel><Text>Panel</Text></Panel>},
                {label: 'float', node: <Panel layer="float"><Text>Float</Text></Panel>},
                {
                    label: 'borderless, pad lg',
                    node: <Panel bordered={false} padding="lg"><Text>No edge</Text></Panel>,
                },
            ],
        },
        {
            name: 'Overlay',
            variables: ['--overlay-bg', '--overlay-shadow', '--overlay-offset'],
            samples: [
                {
                    label: 'bottom, popover',
                    node: (
                        <div style={{position: 'relative', height: '6rem'}}>
                            <Overlay>
                                <Text>Popover body</Text>
                            </Overlay>
                        </div>
                    ),
                },
                {
                    label: 'right, canvas',
                    node: (
                        <div style={{position: 'relative', height: '6rem'}}>
                            <Overlay placement="right" elevation="canvas">
                                <Text>Canvas body</Text>
                            </Overlay>
                        </div>
                    ),
                },
            ],
        },
    ],
};
```

- [ ] **Step 3: Write the route CSS**

Create `apps/web/src/dev/DevUiRoute.module.css`:

```css
.route {
    padding: var(--space-xl);
    background: var(--color-bg);
    min-height: 100vh;
}

.controls {
    display: flex;
    gap: var(--space-md);
    align-items: center;
    margin-bottom: var(--space-xl);
}

.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    gap: var(--space-lg);
    align-items: start;
}

.sample {
    padding: var(--space-md);
    border: 1px dashed var(--color-border-subtle);
    border-radius: var(--radius-sm);
}

.contract {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
}
```

- [ ] **Step 4: Write the route**

Create `apps/web/src/dev/DevUiRoute.tsx`. The theme switch writes `data-theme` on `document.documentElement`, matching how the app already themes itself; the scale switch writes `--size-scale` on the same element.

```tsx
import {Panel, Stack, Text} from '@stagistic/ui';
import {useEffect, useState} from 'react';

import styles from './DevUiRoute.module.css';
import {primitives} from './registry/primitives';
import type {CatalogGroup} from './registry/types';

const GROUPS: CatalogGroup[] = [primitives];

const SCALES = {sm: '0.9', md: '1.08', lg: '1.25'} as const;

type ScaleName = keyof typeof SCALES;

export const DevUiRoute = () => {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [scale, setScale] = useState<ScaleName>('md');

    useEffect(() => {
        const root = document.documentElement;
        const previousTheme = root.getAttribute('data-theme');
        const previousScale = root.style.getPropertyValue('--size-scale');

        root.setAttribute('data-theme', theme);
        root.style.setProperty('--size-scale', SCALES[scale]);

        return () => {
            if (previousTheme === null) {
                root.removeAttribute('data-theme');
            } else {
                root.setAttribute('data-theme', previousTheme);
            }

            root.style.setProperty('--size-scale', previousScale);
        };
    }, [theme, scale]);

    return (
        <div className={styles.route}>
            <div className={styles.controls}>
                <Text variant="label" size="sm">Theme</Text>
                <button type="button" onClick={() => setTheme('light')}>light</button>
                <button type="button" onClick={() => setTheme('dark')}>dark</button>
                <Text variant="label" size="sm">Scale</Text>
                {(Object.keys(SCALES) as ScaleName[]).map(name => (
                    <button key={name} type="button" onClick={() => setScale(name)}>
                        {name}
                    </button>
                ))}
            </div>

            <Stack gap="2xl">
                {GROUPS.map(group => (
                    <Stack key={group.title} gap="lg">
                        <Text as="h2" size="3xl">{group.title}</Text>

                        {group.entries.map(entry => (
                            <Stack key={entry.name} gap="sm">
                                <Text as="h3" size="xl">{entry.name}</Text>
                                <Text className={styles.contract}>
                                    {entry.variables.join(' · ')}
                                </Text>

                                <div className={styles.grid}>
                                    {entry.samples.map(sample => (
                                        <Panel key={sample.label} padding="sm">
                                            <Stack gap="sm">
                                                <Text variant="muted" size="xs">
                                                    {sample.label}
                                                </Text>
                                                <div className={styles.sample}>
                                                    {sample.node}
                                                </div>
                                            </Stack>
                                        </Panel>
                                    ))}
                                </div>
                            </Stack>
                        ))}
                    </Stack>
                ))}
            </Stack>
        </div>
    );
};
```

- [ ] **Step 5: Mount it, dev-only**

A plain `import {DevUiRoute} from './dev/DevUiRoute'` will **not** work here. Vite replaces `import.meta.env.DEV` with the literal `false` in a production build, so the route JSX becomes dead code — but a static import statement survives regardless, and `DevUiRoute.module.css` is a side-effecting import, so the styles would ship even if the component itself were tree-shaken.

Put the `import()` *inside* the dead branch instead, so Rollup eliminates the whole thing and emits no chunk:

```tsx
import {lazy, Suspense} from 'react';

const DevUiRoute = import.meta.env.DEV
    ? lazy(() => import('./dev/DevUiRoute').then(module => ({default: module.DevUiRoute})))
    : null;
```

The `.then(...)` re-wrap is needed because `lazy` expects a module with a `default` export and `DevUiRoute` is a named export. Do not change the component to a default export — the rest of `packages/ui` and `apps/web` use named exports throughout.

Then add the guarded route inside `<Routes>`, **above** the catch-all `<Route path="*" …>` (react-router matches in order, and the catch-all would otherwise swallow it):

```tsx
                        {DevUiRoute ? (
                            <Route
                                path="/dev/ui"
                                element={(
                                    <Suspense fallback={null}>
                                        <DevUiRoute />
                                    </Suspense>
                                )}
                            />
                        ) : null}
```

- [ ] **Step 6: Verify the route works and is excluded from production**

```bash
npx tsc -b
npx --no-install stylelint "apps/web/src/dev/DevUiRoute.module.css"
ESLINT_USE_FLAT_CONFIG=true node node_modules/.pnpm/eslint@8.57.1_supports-color@7.2.0/node_modules/eslint/bin/eslint.js apps/web/src/dev apps/web/src/App.tsx
pnpm --filter @stagistic/web build 2>&1 | tail -5
grep -rl 'borderless, pad lg' apps/web/dist/ 2>/dev/null
grep -rl 'row, gap xl, align center' apps/web/dist/ 2>/dev/null
```

Expected: `tsc` exit 0, lint clean, the build succeeds, and **both greps print no output**.

Grep for those two sample labels rather than for `DevUiRoute` or a variable name. The identifier `DevUiRoute` is renamed by minification, so grepping it would produce a false pass. A variable name like `--stack-gap` is the opposite problem — it lives in `Stack.module.css` inside `@stagistic/ui` and could legitimately ship for other reasons, producing a false alarm. The two sample labels are string literals that exist **only** in the catalog registry, so they are the honest marker.

If either grep hits, the dead-branch elimination did not work — report it with the matching file name. Do not paper over it, and do not delete `dist/` to make the check pass.

- [ ] **Step 7: Stage and propose the commit**

```bash
git add apps/web/src
```

Proposed message:

```
feat(web): add the dev-only /dev/ui component catalog

Renders every registered component with its declared variable contract, under
theme and --size-scale switches. Mounted only when import.meta.env.DEV.
```

Do not commit.

---

### Task 7: Route the icon buttons through the axes `Button` already has

Six call sites in `AppHeader.tsx` apply `.iconButton`, and two in `ScriptAttributeManagerModal.tsx` apply `.deleteButton` — repaints through `className`, which The className Is Position Only Rule forbids.

**This task does NOT add an `icon` variant.** `Button.module.css:33` already declares `&.icon { padding: 0 }` as the **size** class for `size="icon"`, and `Button.tsx` composes `clsx(styles.button, styles[variant], styles[size], className)` — so a variant named `icon` would resolve to the same CSS-module class as the size and the two would be indistinguishable.

Resolving the two `.iconButton` blocks against `.ghost` property by property shows they are one paint decision plus one geometry decision, and the paint is already `.ghost`: resting colour, hover colour, resting background, border and border-radius are **identical**. Only the state machinery differs. So the destination is `variant="ghost" size="icon"`, with two approved normalizations.

**Approved normalizations — implement exactly these, do not re-litigate them:**

| # | Change | Effect |
|---|---|---|
| N8 | `.ghost` hover background becomes `var(--state-hover)` instead of `var(--color-surface-raised)` | The six header controls stay pixel-identical. Other ghost buttons get a slightly softer hover. `--state-hover` is the named state token; reaching for the raw surface colour was the divergence. |
| N9 | `.ghost` gains `[data-pressed]` and `[data-focus-visible]`, copied from `.iconButton` | Resting and hover appearance unchanged. These are states `.ghost` never had; without them the six header controls would lose their pressed feedback and focus ring. |

`[data-focus-visible]` is a react-aria-components attribute set on the `:focus-visible` heuristic, so it already fires for keyboard focus and not mouse. That is the intended behaviour — do not add extra logic for it.

**Files:**
- Modify: `packages/ui/src/atoms/Button.module.css` (`.ghost` and `.icon`)
- Create: `packages/ui/src/atoms/Button.test.tsx`
- Modify: `packages/ui/src/layout/AppHeader.tsx` (6 sites), `packages/ui/src/layout/AppHeader.module.css` (delete both `.iconButton` blocks, promote one nested rule)
- Modify: `packages/app-routes/src/routes/script/settings/ScriptAttributeManagerModal.tsx` and its module CSS

**Interfaces:**
- Produces: no new prop values. `ButtonVariant` and `ButtonSize` are unchanged. `size="icon"` gains a real square footprint.

- [ ] **Step 1: Read the two `.iconButton` blocks and confirm the six call sites**

```bash
cd /Users/milanzitka/git/stagistic
grep -n 'iconButton' packages/ui/src/layout/AppHeader.tsx
sed -n '/^\.iconButton/,/^}/p' packages/ui/src/layout/AppHeader.module.css
```

Expected: six `className={styles.iconButton}` sites in the `.tsx`, and **two separate `.iconButton` blocks** in the CSS that merge in the cascade — the second sets the square geometry and `border-radius: var(--radius-full)`, which wins over the first block's `--radius-sm`.

Note the nested `& .icon` rule inside the second block: it sizes the `<svg>` child at `calc(16px * var(--size-scale))`. That svg class is applied directly in the JSX (`<HomeIcon className={styles.icon} />`) and must survive. There is a second, unrelated `& .icon` rule further down the file at 14px belonging to the theme segment controls — **do not touch that one.**

- [ ] **Step 2: Write the failing test**

Create `packages/ui/src/atoms/Button.test.tsx`:

```tsx
import {renderToStaticMarkup} from 'react-dom/server';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {Button} from './Button';
import styles from './Button.module.css';

describe('Button', () => {
    it('defaults to the primary variant at medium size', () => {
        const markup = renderToStaticMarkup(<Button>Save</Button>);

        expect(markup).toContain(styles.button);
        expect(markup).toContain(styles.primary);
        expect(markup).toContain(styles.md);
    });

    it('composes the ghost variant with the icon size', () => {
        const markup = renderToStaticMarkup(
            <Button variant="ghost" size="icon" aria-label="Menu" />,
        );

        expect(markup).toContain(styles.ghost);
        expect(markup).toContain(styles.icon);
        expect(markup).toContain('aria-label="Menu"');
    });

    it('keeps variant and size as distinct classes', () => {
        expect(styles.ghost).not.toBe(styles.icon);
    });

    it('keeps a caller className alongside its own classes', () => {
        const markup = renderToStaticMarkup(<Button className="col-span-2">x</Button>);

        expect(markup).toContain('col-span-2');
        expect(markup).toContain(styles.button);
    });
});
```

- [ ] **Step 3: Run it**

```bash
pnpm --filter @stagistic/ui test 2>&1 | grep -E 'Button|Tests '
```

Expected: all four PASS. These are characterization tests — they pin the axes you are about to rely on, so that if a later change collapses variant and size into one class the third test catches it. If any fails now, stop and report; something about `Button` differs from what this task assumes.

- [ ] **Step 4: Apply N8 and N9 to `.ghost`**

In `packages/ui/src/atoms/Button.module.css`, replace the `&.ghost` block with:

```css
    &.ghost {
        color: var(--color-text-muted);
        background: transparent;
        border-color: transparent;

        &[data-hovered] {
            color: var(--color-text);
            background: var(--state-hover);
        }

        &[data-pressed] {
            color: var(--color-text);
            background: var(--state-hover);
        }

        &[data-focus-visible] {
            color: var(--color-text);
            background: var(--state-hover);
            border-color: transparent;
            outline: var(--focus-ring);
            outline-offset: var(--focus-ring-offset);
        }
    }
```

The `:hover` selector becomes `[data-hovered]` so the variant keys off react-aria's state attributes consistently, the way `.iconButton` did.

- [ ] **Step 5: Give `size="icon"` its square footprint**

Replace `&.icon { padding: 0 }` with the geometry the second `.iconButton` block carried:

```css
    &.icon {
        flex: 0 0 var(--control-height-md);
        box-sizing: border-box;
        aspect-ratio: 1;
        width: var(--control-height-md);
        height: var(--control-height-md);
        padding: 0;
    }
```

`border-radius: var(--radius-full)` is **not** repeated here — `.button` already sets it on the base.

- [ ] **Step 6: Migrate the six header sites**

At each of the six sites, replace `className={styles.iconButton}` with `variant="ghost" size="icon"`. Then delete **both** `.iconButton` blocks from `AppHeader.module.css`, and promote the svg-sizing rule that was nested in the second one to a standalone class in the same file:

```css
.icon {
    display: block;
    width: calc(16px * var(--size-scale));
    height: calc(16px * var(--size-scale));
    color: currentcolor;
}
```

Place it near the other `AppHeader` element classes. This stays in `AppHeader` deliberately: sizing its own icon artwork is the caller's concern, not the Button's.

- [ ] **Step 7: Handle `.deleteButton`**

```bash
sed -n '/^\.deleteButton/,/^}/p' packages/app-routes/src/routes/script/settings/ScriptAttributeManagerModal.module.css
```

Read what it declares. If its colour resolves to `--color-status-danger` — the same token `.danger` uses — migrate the two sites to `variant="danger"` and delete the class. **If the colour is any other value, do not migrate it.** Leave the two sites untouched, and report the exact declared value as a normalization candidate needing maintainer approval. A silent colour change is the one outcome this plan does not permit.

- [ ] **Step 8: Verify**

```bash
grep -rn 'iconButton' packages/ apps/ 2>/dev/null | grep -v node_modules | grep -v dist
```

Expected: **no output**. (`deleteButton` may legitimately remain if Step 7 deferred it — say so in your report.)

```bash
pnpm --filter @stagistic/ui test 2>&1 | grep -E 'Tests '
npx tsc -b
npx --no-install stylelint "packages/ui/src/atoms/Button.module.css" "packages/ui/src/layout/AppHeader.module.css"
```

Expected: ui tests pass, `tsc` exit 0, stylelint 0 errors.

- [ ] **Step 9: Run the AppHeader browser suite and check the goldens**

`AppHeader` has committed golden screenshots and this task changes its markup, so the goldens are the point of the check.

```bash
pnpm --filter @stagistic/ui test:browser 2>&1 | tail -20
git status --porcelain | grep -iE '\.png|__screenshots__'
```

The second command should print nothing. **If a golden changed, do not stage it** — restore with `git checkout -- <path>`, remove any new untracked `__screenshots__` directory, and report. A changed golden means the migration is not visually identical, which is a finding, not a snapshot to re-record. N8 was chosen precisely so these six controls stay pixel-identical.

- [ ] **Step 10: Stage and propose the commit**

```bash
git add packages/ui/src packages/app-routes/src
```

Proposed message:

```
refactor(ui): route icon buttons through Button's existing variant and size axes

Six AppHeader controls and two modal controls repainted Button through
className. They become variant="ghost" size="icon". The ghost variant adopts
--state-hover and gains the pressed and focus-visible states it was missing;
size="icon" gains the square footprint it always implied.
```

Do not commit.

---

### Task 8: Declare the control contracts and add them to the catalog

The remaining in-`packages/ui` repaint sites are components styling a primitive they wrap: `TextInput` (`.input`), `FormSelect` (`.root`), `ScriptActionsMenu` (`.trigger`), `SettingSwitch` (`.control`). Each is a missing variant on the wrapped control.

**Files:**
- Modify: the four components above and their module CSS
- Create: `apps/web/src/dev/registry/controls.tsx`
- Modify: `apps/web/src/dev/DevUiRoute.tsx` (register the new group)
- Modify: `packages/ui/src/tokens.test.ts` (add the catalog-coverage guard)

**Interfaces:**
- Consumes: `CatalogGroup` from Task 6.
- Produces: `controls` catalog group.

- [ ] **Step 1: Re-derive the exact list**

The classification below was produced at plan time by matching each `className={styles.x}` on a UI component against the properties `.x` declares. Re-run it rather than trusting it:

```bash
cd /Users/milanzitka/git/stagistic
grep -rn 'className={clsx(styles' packages/ui/src/molecules packages/ui/src/dialogs 2>/dev/null | grep -v node_modules
```

For each hit, read the class. A class declaring only {margin, width, grid-*, flex, align-self, position} is **position** and stays. A class declaring {background, border*, color, font-*, padding, box-shadow} is **repaint** and becomes a variant.

- [ ] **Step 2: Convert each repaint to a variant**

For each of the four components, add a variant to the wrapped control rather than a class on the wrapper. Follow the shape used in Task 7: a variant class that sets the component's declared variables, never raw properties on the caller's class.

Keep the rendered result **byte-identical**. If a conversion would change a rendered value, stop and report it as a normalization candidate — it needs an approved row before it ships, exactly as N1-N7 did in the foundation plan.

- [ ] **Step 3: Write the controls registry**

Create `apps/web/src/dev/registry/controls.tsx`. One `CatalogEntry` per renderable control export, each listing its declared variables and one sample per variant. `Button` is written out below; write the remaining seven the same way, taking each `variables` list from the variables that component actually declares on its root class — read the CSS, do not guess.

```tsx
import {
    Button,
    Input,
    ProgressCircle,
    RadioChoiceGroup,
    Select,
    Switch,
    Tag,
    Tooltip,
} from '@stagistic/ui';

import type {CatalogGroup} from './types';

export const controls: CatalogGroup = {
    title: 'Controls',
    entries: [
        {
            name: 'Button',
            // Button declares no custom properties of its own: its variant
            // classes set colour and background from tokens directly. An empty
            // contract is a legitimate answer here — the override path is the
            // variant prop, not a variable — and the catalog should show that
            // honestly rather than advertise variables that do not exist.
            variables: [],
            samples: [
                {label: 'primary', node: <Button>Primary</Button>},
                {label: 'secondary', node: <Button variant="secondary">Secondary</Button>},
                {label: 'ghost', node: <Button variant="ghost">Ghost</Button>},
                {label: 'danger', node: <Button variant="danger">Danger</Button>},
                {label: 'outline', node: <Button variant="outline">Outline</Button>},
                {label: 'icon', node: <Button variant="icon" size="icon" aria-label="Menu">☰</Button>},
                {label: 'size sm', node: <Button size="sm">Small</Button>},
                {label: 'disabled', node: <Button isDisabled>Disabled</Button>},
            ],
        },
        // Input, Switch, Tag, Select, RadioChoiceGroup, ProgressCircle, Tooltip
    ],
};
```

Controls that need props to render at all (`Select`, `RadioChoiceGroup`) get inline literal options in their samples — the catalog is a fixture, so hardcoded sample data belongs here. `Tooltip` and `Select` render overlays; wrap each in a `<div style={{position: 'relative'}}>` so the popover has a containing block, as the `Overlay` samples do.

- [ ] **Step 4: Register the group**

In `apps/web/src/dev/DevUiRoute.tsx`:

```tsx
import {controls} from './registry/controls';

const GROUPS: CatalogGroup[] = [primitives, controls];
```

- [ ] **Step 5: Add the catalog-coverage guard**

Append to `packages/ui/src/tokens.test.ts` a test asserting that every component exported from `packages/ui/src/index.ts` appears by name in some registry file. This is the mechanism that keeps the catalog honest as components are added.

```ts
    it('lists every exported component in the dev catalog', () => {
        const index = readFileSync(
            join(repoRoot, 'packages/ui/src/index.ts'),
            'utf8',
        );
        const registry = ['primitives', 'controls']
            .map(name => readFileSync(
                join(repoRoot, `apps/web/src/dev/registry/${name}.tsx`),
                'utf8',
            ))
            .join('\n');

        /*
         * Only renderable components are catalogued. `type` exports describe
         * props, `default as clsx` re-exports a dependency, and the hooks and
         * the shared formControlStyles object have no visual form.
         */
        const NOT_RENDERABLE = [
            'default as clsx',
            'formControlStyles',
            'useAnchoredMenuPlacement',
            'useDropdownDismiss',
            'useKeyedFieldDrafts',
        ];
        const exported = [...index.matchAll(/export \{([^}]*)\}/g)]
            .flatMap(match => match[1].split(','))
            .map(name => name.trim())
            .filter(name => name.length > 0
                && !name.startsWith('type ')
                && !NOT_RENDERABLE.includes(name));

        const missing = exported.filter(name => !registry.includes(`name: '${name}'`));

        expect(missing).toEqual([]);
    });
```

**Expect this to fail on first run** — `packages/ui` exports far more than the primitives and controls catalogued here (dialogs, panels, layout). That is the point of running it: it tells you the true remaining surface. Record the failing list in your report, then **scope the assertion to the two catalogued groups** by filtering `exported` to the names the two registry files are meant to cover, and leave a comment naming the plan that widens it (the Patterns plan). Do not delete the test, and do not weaken it to `expect(true)`.

- [ ] **Step 6: Verify**

```bash
pnpm --filter @stagistic/ui test 2>&1 | grep -E 'Tests '
npx tsc -b
npx --no-install stylelint "packages/**/*.css" 2>&1 | grep -E '✖|error' | head
pnpm --filter @stagistic/ui test:browser 2>&1 | tail -20
git status --porcelain | grep -iE '\.png|__screenshots__'
```

Expected: ui tests pass, `tsc` exit 0, stylelint no new errors, browser suite green, **no PNG touched**.

- [ ] **Step 7: Stage and propose the commit**

```bash
git add packages/ui/src apps/web/src
```

Proposed message:

```
refactor(ui): declare control variable contracts and catalog them

The four in-package repaint-through-className sites become variants on the
control they wrap. Every catalogued component now lists its overridable
variables, and a test fails if a catalogued export is missing an entry.
```

Do not commit.

---

## Definition of done

- `Stack`, `Text`, `Panel` and `Overlay` exist in `packages/ui/src/primitives/`, are exported, and each declares its variables on its own root class — never on `:root`.
- `Kicker`, `PageTitle`, `SectionTitle` and `SubtleText` no longer exist anywhere, with no compatibility shims.
- No `--panel-*` name is declared on `:root`; the sidebar geometry tokens are `--sidebar-width` and `--sidebar-head-height`.
- `--layer-float-bg` has at least one reader.
- `/dev/ui` renders every catalogued component in light and dark at all three size scales, and does **not** appear in the production bundle.
- No `className` on a `packages/ui` control or pattern sets a painting property. The 36 route-level repaint sites are **not** in scope here — they are removed by the route-CSS plan, once the variants exist for them to move to.
- `npx tsc -b` exit 0; stylelint 0 errors on touched files; ESLint clean on touched files.
- `pnpm test` introduces no new failing test **names** against the baseline; browser suites green apart from the known `packages/editor` failures.
- No golden PNG staged or modified.

## What this plan deliberately does not do

- No `ListPanel`, `SidebarShell`, `SettingsGroup`/`SettingRow`, `ToolbarButton` or `Notice` — Patterns plan (spec step 5).
- No route CSS removal, and no touching of the 36 route-level repaint sites — Route CSS plan (spec step 6).
- No editor tokenization or chrome recomposition — Editor plan (spec step 7).
- No UnoCSS — phase 2.

## Carried forward from the foundation plan's final review

These were found by the whole-branch review of steps 1-2 and deliberately deferred. They are inputs here, not new work:

- **Scope-aware guard.** `tokens.test.ts` keeps one flat set of declared names across all selectors, so it cannot distinguish a `:root` token from a component-scoped one. Every primitive in this plan adds component-scoped variables, which is exactly the surface that makes the current guard less precise. Worth revisiting once these four primitives exist.
- **14 dead `:root` tokens**, notably `--layer-float-bg` — addressed here by `Panel layer="float"` and `Overlay`. The other 13 remain.
- **`--menu-max-height` vs the TS-written `--anchored-menu-max-height`** read as siblings in `min(...)` across three files despite being unrelated mechanisms.
- **Naming shape is inconsistent** across `--control-trigger-*` (family-first), `--menu-*` (part-first) and `--bubble-menu-*` (modifier-first). A convention should be written down before more namespaces are added.
