# Design System — Patterns (Plan 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the repeated cross-route UI *patterns* (icon buttons, sidebar list rows, chrome eyebrow labels, settings group/row scaffolding, status/empty notices) into shared `@stagistic/ui` components, applying only the value unifications approved in the normalization table.

**Architecture:** Add small prop-driven primitives to `packages/ui` (`IconButton`, `Notice`, `SettingsGroup`/`SettingRow`/`PanelHeader`, a `Text` `eyebrow` variant), then migrate the bespoke route/editor CSS-module sites to consume them. Each primitive follows the existing `atoms/Button` pattern: a react-aria-components wrapper (where interactive) with `clsx(styles.base, styles[variant], styles[size], className)` and a CSS-module driven entirely by design tokens. No route keeps a hand-rolled copy of a consolidated pattern.

**Tech Stack:** React 19, react-aria-components, CSS Modules + OKLCH design tokens (`packages/ui/styles/tokens.css`), vite-plus test runner (`vite-plus/test`), node component tests via `renderToStaticMarkup`, browser tests `*.browser.test.tsx`.

**Spec:** `docs/superpowers/specs/2026-08-25-design-system-consolidation-design.md` (step 5 Patterns). Approved normalization table: `.superpowers/sdd/2026-08-26-design-system-primitives/plan3-normalization-audit.md`.

## Global Constraints

- **Visual neutrality:** the only value shifts permitted are the approved rows — **A1** (icon-button radius unify to `--radius-sm` default + `pill` for full-round sites), **A3** (icon svg tied to size: `xs`/`sm`→14px, `md`→16px), **B1** (sidebar row height 30→28px), **B2** (Structure gains the `--state-selected-edge` inset), **B3** (chrome labels → sans eyebrow), **E1** (warning callout hardcoded rem → tokens). Any *other* paint change is out of scope and must be flagged, not made.
- **Mono reservation:** `--font-family-mono` (Courier Prime) is from now on **only** for script *content* (`EditorCanvas`, `MiniScriptEditor`, editor `HeaderFooterOverlay`, `ElementPreview`, `HeaderFooterSettingsPanel.previewCell`, `EditorToolbar.textIcon` format-glyph). Chrome labels must not use it.
- **Keep separate (do NOT merge):** `ScriptStructureSidebar.actDeleteButton` micro delete-button (stays route-local), `HomeRoute.scriptRow` 58px card row, panel-header vs setting-row hierarchy levels, sidebar inline `.empty` muted-text (stays `Text variant="muted"`), `ExportPreview.error` floating pill (positional, stays route-local).
- **Deferred (C1):** the `SelectTrigger`/`--control-trigger-*` extraction is intentionally NOT in this plan — `SidebarPanelSelect` and `EditorToolbar.selectButton` already share the `--control-trigger-*` tokens; component extraction belongs to Phase 2 (UnoCSS).
- **Toolchain (canonical checks):** `pnpm exec tsc -b` (or `npx tsc -b`), ESLint (`eslint --fix` is the formatter — NOT `vp lint`/`vp fmt`), Stylelint, `vp test run`, browser tests via `test:browser`. `vite.config.js` is a gitignored compiled artifact — never edit or commit it.
- **Never commit.** Prepare changes + a commit message; the maintainer reviews and commits. Do not `git stash` for a baseline.
- **Do not** mutate golden snapshots, loosen assertions, or change a viewport to turn a red green.
- **Catalog + coverage:** every new `@stagistic/ui` export must be registered in the dev catalog (`apps/web/src/dev/registry/*.tsx`) or added to the `NOT_CATALOGUED_YET` quarantine in `packages/ui/src/tokens.test.ts`, or the coverage guard fails.

---

### Task 1: `IconButton` primitive

The square icon-action button, unifying six divergent sites (Family A). Variants capture the resting-surface divergence (A4), `shape` captures the radius divergence (A1), `size` keeps the existing pixel values (A2) with icon size tied per A3, `tone="danger"` captures A5, `isSelected` captures the toolbar active state.

**Files:**
- Create: `packages/ui/src/atoms/IconButton.tsx`
- Create: `packages/ui/src/atoms/IconButton.module.css`
- Create: `packages/ui/src/atoms/IconButton.test.tsx`
- Modify: `packages/ui/src/index.ts` (add export, alphabetical, after the `InlineTooltip` export near the `Input` line)
- Modify: `apps/web/src/dev/registry/controls.tsx` (register in the catalog)

**Interfaces:**
- Produces: `IconButton` React component. Props:
  `variant?: 'ghost' | 'outline' | 'filled'` (default `'ghost'`),
  `size?: 'xs' | 'sm' | 'md'` (default `'sm'`),
  `tone?: 'neutral' | 'danger'` (default `'neutral'`),
  `shape?: 'default' | 'pill'` (default `'default'`),
  `isSelected?: boolean` (default `false`),
  `className?: string`, plus all `react-aria-components` `ButtonProps` except `className`. Children are the icon (an svg) — the CSS sizes descendant `svg`.
- Size→pixel map (kept from existing sites): `xs`=22px, `sm`=`--control-height-sm` (26px), `md`=28px. Icon svg: `xs`/`sm`→14px, `md`→16px.

- [ ] **Step 1: Write the failing test**

Create `packages/ui/src/atoms/IconButton.test.tsx`:

```tsx
import {renderToStaticMarkup} from 'react-dom/server';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {IconButton} from './IconButton';
import styles from './IconButton.module.css';

describe('IconButton', () => {
    it('defaults to the ghost variant at sm size, neutral tone', () => {
        const markup = renderToStaticMarkup(<IconButton aria-label="Delete" />);

        expect(markup).toContain(styles.iconButton);
        expect(markup).toContain(styles.ghost);
        expect(markup).toContain(styles.sm);
        expect(markup).toContain(styles.neutral);
        expect(markup).toContain('aria-label="Delete"');
    });

    it('composes outline variant, md size, and pill shape', () => {
        const markup = renderToStaticMarkup(
            <IconButton
                variant="outline"
                size="md"
                shape="pill"
                aria-label="Zoom in"
            />,
        );

        expect(markup).toContain(styles.outline);
        expect(markup).toContain(styles.md);
        expect(markup).toContain(styles.pill);
    });

    it('marks the selected state with a data attribute', () => {
        const markup = renderToStaticMarkup(<IconButton isSelected aria-label="Bold" />);

        expect(markup).toContain('data-selected="true"');
    });

    it('applies the danger tone', () => {
        const markup = renderToStaticMarkup(<IconButton tone="danger" aria-label="Remove" />);

        expect(markup).toContain(styles.danger);
    });

    it('keeps a caller className alongside its own classes', () => {
        const markup = renderToStaticMarkup(<IconButton className="col-span-2" aria-label="x" />);

        expect(markup).toContain('col-span-2');
        expect(markup).toContain(styles.iconButton);
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @stagistic/ui exec vp test run src/atoms/IconButton.test.tsx`
Expected: FAIL — cannot resolve `./IconButton`.

- [ ] **Step 3: Write the component**

Create `packages/ui/src/atoms/IconButton.tsx`:

```tsx
import clsx from 'clsx';
import {
    Button as RACButton,
    type ButtonProps as RACButtonProps,
} from 'react-aria-components';

import styles from './IconButton.module.css';

type IconButtonVariant = 'ghost' | 'outline' | 'filled';

type IconButtonSize = 'xs' | 'sm' | 'md';

type IconButtonTone = 'neutral' | 'danger';

type IconButtonProps = {
    variant?: IconButtonVariant,
    size?: IconButtonSize,
    tone?: IconButtonTone,
    shape?: 'default' | 'pill',
    isSelected?: boolean,
    className?: string,
} & Omit<RACButtonProps, 'className'>;

export const IconButton = ({
    variant = 'ghost',
    size = 'sm',
    tone = 'neutral',
    shape = 'default',
    isSelected = false,
    className,
    ...props
}: IconButtonProps) => (
    <RACButton
        {...props}
        data-selected={isSelected || undefined}
        className={clsx(
            styles.iconButton,
            styles[variant],
            styles[size],
            styles[tone],
            shape === 'pill' && styles.pill,
            className,
        )}
    />
);
```

- [ ] **Step 4: Write the CSS module**

Create `packages/ui/src/atoms/IconButton.module.css`:

```css
.iconButton {
    cursor: pointer;
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    aspect-ratio: 1;
    padding: 0;
    color: var(--color-text-muted);
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    transition: background var(--duration-normal) var(--ease-standard), color var(--duration-normal) var(--ease-standard), transform var(--duration-fast) var(--ease-out);

    &[data-pressed] {
        transform: scale(.96);
    }

    &[data-focus-visible] {
        outline: var(--focus-ring);
        outline-offset: var(--focus-ring-offset);
    }

    &[data-disabled] {
        cursor: not-allowed;
        opacity: .4;
    }

    & svg {
        display: block;
    }
}

/* sizes (pixel values preserved from the migrated sites) */
.xs {
    width: calc(22px * var(--size-scale));
    height: calc(22px * var(--size-scale));

    & svg {
        width: calc(14px * var(--size-scale));
        height: calc(14px * var(--size-scale));
    }
}

.sm {
    width: var(--control-height-sm);
    height: var(--control-height-sm);

    & svg {
        width: calc(14px * var(--size-scale));
        height: calc(14px * var(--size-scale));
    }
}

.md {
    width: calc(28px * var(--size-scale));
    height: calc(28px * var(--size-scale));

    & svg {
        width: calc(16px * var(--size-scale));
        height: calc(16px * var(--size-scale));
    }
}

/* shape (A1: full-round sites opt in) */
.pill {
    border-radius: var(--radius-full);
}

/* variants (A4: resting surface) */
.ghost {
    background: transparent;
    border-color: transparent;

    &[data-hovered] {
        color: var(--color-text);
        background: var(--state-hover);
    }
}

.outline {
    color: var(--color-text);
    background: transparent;
    border-color: var(--color-border);

    &[data-hovered] {
        background: var(--state-hover);
    }
}

.filled {
    color: var(--color-text);
    background: var(--color-surface);
    border-color: var(--color-border);

    &[data-hovered] {
        background: var(--state-hover);
    }
}

/* tone (A5: destructive) — the parent controls reveal/opacity */
.neutral {
    /* no override; base color applies */
}

.danger {
    color: color-mix(in oklch, var(--color-text-muted) 90%, var(--color-border));

    &[data-hovered] {
        color: color-mix(in oklch, var(--color-status-danger) 75%, var(--color-text-muted));
        background: color-mix(in oklch, var(--color-status-danger) 12%, transparent);
    }
}

/* selected (editor toolbar active state) */
.iconButton[data-selected] {
    color: var(--color-text);
    background: var(--state-selected);
    box-shadow: inset 0 0 0 1px var(--state-selected-edge);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @stagistic/ui exec vp test run src/atoms/IconButton.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 6: Export from the package index**

In `packages/ui/src/index.ts`, add after the `export {InlineTooltip} from './atoms/InlineTooltip';` line:

```ts
export {IconButton} from './atoms/IconButton';
```

- [ ] **Step 7: Register in the dev catalog**

In `apps/web/src/dev/registry/controls.tsx`, add an `IconButton` entry to the exported group's `entries` array (import `IconButton` and a couple of icons already used there, e.g. `TrashIcon`, `PlusIcon`, from `@stagistic/ui`). Follow the existing entry shape `{name, variables, samples}`:

```tsx
{
    name: 'IconButton',
    variables: [],
    samples: [
        {label: 'ghost / sm', node: <IconButton aria-label="Add"><PlusIcon /></IconButton>},
        {label: 'outline / md / pill', node: <IconButton variant="outline" size="md" shape="pill" aria-label="Add"><PlusIcon /></IconButton>},
        {label: 'filled / sm', node: <IconButton variant="filled" aria-label="Add"><PlusIcon /></IconButton>},
        {label: 'danger', node: <IconButton tone="danger" aria-label="Delete"><TrashIcon /></IconButton>},
        {label: 'selected', node: <IconButton isSelected aria-label="Bold"><PlusIcon /></IconButton>},
    ],
},
```

- [ ] **Step 8: Verify catalog coverage guard passes**

Run: `pnpm --filter @stagistic/ui exec vp test run src/tokens.test.ts`
Expected: PASS — `IconButton` is now catalogued so the "catalogues every component" test stays green. (If you instead chose to quarantine it, that test also passes; prefer cataloguing.)

- [ ] **Step 9: Typecheck + lint**

Run: `npx tsc -b` (expect exit 0) and `npx eslint --fix packages/ui/src/atoms/IconButton.tsx apps/web/src/dev/registry/controls.tsx` and `npx stylelint packages/ui/src/atoms/IconButton.module.css`.
Expected: clean.

- [ ] **Step 10: Commit**

```bash
git add packages/ui/src/atoms/IconButton.tsx packages/ui/src/atoms/IconButton.module.css packages/ui/src/atoms/IconButton.test.tsx packages/ui/src/index.ts apps/web/src/dev/registry/controls.tsx
git commit -m "feat(ui): add IconButton primitive with variant/size/tone/shape"
```

---

### Task 2: Migrate icon-button sites to `IconButton`

Replace five bespoke icon-button implementations with `IconButton`, applying the approved A1/A3/A4 shifts. **Leave `ScriptStructureSidebar.actDeleteButton` untouched** (keep-separate). For `HeaderFooterSettingsPanel.formatButton`, keep its bespoke *active* look route-local (its neutral-raised active is not the blue `isSelected`; folding it in is an unapproved shift — see Ruling below).

**Files:**
- Modify: `packages/editor/src/editor/components/EditorToolbar.tsx` + `EditorToolbar.module.css` (the `.iconButton` sites)
- Modify: `packages/app-routes/src/routes/script/export/ExportPreview.tsx` + `ExportPreview.module.css` (`.toolbarButton`, `.zoomControls button`)
- Modify: `packages/app-routes/src/routes/script/editor/sidebar/SidebarContextButton.tsx` + `SidebarContextButton.module.css`
- Modify: `packages/app-routes/src/routes/script/editor/music/ScriptMusicSidebar.tsx` + `ScriptMusicSidebar.module.css` (`.rowAction`)
- Modify: `packages/app-routes/src/routes/script/editor/settings/header-footer/HeaderFooterSettingsPanel.tsx` + `HeaderFooterSettingsPanel.module.css` (`.formatButton`)

**Interfaces:**
- Consumes: `IconButton` from `@stagistic/ui` (Task 1).

**Ruling (record in ledger):** *HeaderFooter `.formatButton` active state stays route-local* — its resting is `IconButton variant="filled" size="sm"`, but `.activeFormat` (`--color-surface-raised` + color-mix edges) is a neutral pressed-format look, not the blue `isSelected`. Migrating it to `isSelected` would be an unapproved paint change (call it A6). Keep `.activeFormat` as a route className layered via `IconButton`'s `className`; open A6 as a follow-up. Cost if wrong: one extra small migration later.

- [ ] **Step 1: Snapshot the current editor toolbar behaviour (baseline test run)**

Run: `pnpm --filter @stagistic/editor exec vp test run` and note the current pass/fail set (the editor package has known pre-existing browser reds — record them so you don't attribute them to this task). Also run `test:browser` for the editor if available and record the baseline.

- [ ] **Step 2: Migrate `EditorToolbar` `.iconButton`**

In `EditorToolbar.tsx`, replace each `<button className={styles.iconButton ...}>` icon button with `<IconButton variant="ghost" size="sm" shape="pill" isSelected={<the existing active condition>}>`. The `.active` class condition becomes the `isSelected` prop. Keep any `aria-label`, `onPress`/`onClick`, and icon children. In `EditorToolbar.module.css`, delete the now-unused `.iconButton` rule and its `.active` companion (leave `.selectButton`, `.textIcon`, and everything else). Verify no other file imports `styles.iconButton` from this module (grep: `iconButton` across the editor package).

- [ ] **Step 3: Migrate `ExportPreview` zoom/toolbar buttons**

In `ExportPreview.tsx`, replace the `.toolbarButton` and `.zoomControls button` elements with `<IconButton variant="outline" size="md" shape="pill" ...>` (they were 28px, radius-full, bordered). Preserve `disabled`→ pass as `isDisabled` (react-aria) and any `aria-label`. In `ExportPreview.module.css`, delete `.toolbarButton`, `.toolbarButton svg`, and the `.zoomControls button { ... }` block (keep `.zoomControls`/`.pageControls` layout wrappers). Note: this applies A3 (export icons 14→16) — approved.

- [ ] **Step 4: Migrate `SidebarContextButton`**

`SidebarContextButton.button` is 22px, radius-sm, ghost. Replace its markup with `<IconButton variant="ghost" size="xs" ...>` (xs=22, svg 14 — A3 shifts 13→14). Delete the `.button` rule from `SidebarContextButton.module.css`. If the file becomes empty, delete the file and its import; otherwise keep remaining rules.

- [ ] **Step 5: Migrate `ScriptMusicSidebar` `.rowAction`**

`.rowAction` is 22px, radius-sm, ghost, svg 13. Replace with `<IconButton variant="ghost" size="xs" ...>`. Delete `.rowAction` from `ScriptMusicSidebar.module.css` (keep `.actions` wrapper which controls opacity reveal — that stays, the parent owns reveal).

- [ ] **Step 6: Migrate `HeaderFooterSettingsPanel` `.formatButton`**

Replace `.formatButton` with `<IconButton variant="filled" size="sm" className={isActive ? styles.activeFormat : undefined} ...>`. Keep `.activeFormat` and `.variableButton` (the text pill — NOT an icon button, untouched) in the CSS. Delete only the `.formatButton.formatButton` base rule (its size/radius/resting now come from IconButton — this applies A1 radius md→sm). Keep `.activeFormat` as-is (Ruling above).

- [ ] **Step 7: Typecheck, lint, stylelint**

Run: `npx tsc -b` (exit 0). `npx eslint --fix` on every `.tsx` touched. `npx stylelint` on every `.module.css` touched.
Expected: clean; no unused-class or unresolved-import errors.

- [ ] **Step 8: Run the affected package tests**

Run: `pnpm --filter @stagistic/editor exec vp test run` and `pnpm --filter @stagistic/app-routes exec vp test run`, plus `test:browser` for both. Compare against the Step-1 baseline — the only differences must be intended. Do NOT modify snapshots; if a golden snapshot legitimately changed due to an approved shift, STOP and report it to the controller for a human visual check (per constraints).

- [ ] **Step 9: Commit**

```bash
git add packages/editor/src/editor/components/EditorToolbar.tsx packages/editor/src/editor/components/EditorToolbar.module.css packages/app-routes/src/routes/script/export/ExportPreview.tsx packages/app-routes/src/routes/script/export/ExportPreview.module.css packages/app-routes/src/routes/script/editor/sidebar/SidebarContextButton.tsx packages/app-routes/src/routes/script/editor/sidebar/SidebarContextButton.module.css packages/app-routes/src/routes/script/editor/music/ScriptMusicSidebar.tsx packages/app-routes/src/routes/script/editor/music/ScriptMusicSidebar.module.css packages/app-routes/src/routes/script/editor/settings/header-footer/HeaderFooterSettingsPanel.tsx packages/app-routes/src/routes/script/editor/settings/header-footer/HeaderFooterSettingsPanel.module.css
git commit -m "refactor: migrate icon-button sites to IconButton primitive"
```

---

### Task 3: `Text` `eyebrow` variant + de-mono chrome labels

Add an `eyebrow` variant to `Text` (sans, uppercase, tracked, muted) and swap the three chrome-label mono sites to it. Resolves B3 and enforces the mono reservation. Also splits `Text`'s color/family concern enough that a muted label no longer needs mono (partial F10).

**Files:**
- Modify: `packages/ui/src/primitives/Text.tsx` (add `'eyebrow'` to `TextVariant`, map it)
- Modify: `packages/ui/src/primitives/Text.module.css` (add `.eyebrow`)
- Modify: `packages/ui/src/primitives/Text.test.tsx` (add a case)
- Modify: `packages/app-routes/src/routes/script/editor/sidebar/SidebarPanelSelect.module.css` (remove mono from `.button`)
- Modify: `packages/app-routes/src/routes/script/editor/music/ScriptMusicSidebar.module.css` (`.sectionTitle` → eyebrow values, drop mono)
- Modify: `packages/app-routes/src/routes/script/editor/settings/header-footer/HeaderFooterSettingsPanel.module.css` (`.previewLabel` → drop mono)

**Interfaces:**
- Produces: `Text` `variant="eyebrow"` — sets `--font-family-sans`, `text-transform: uppercase`, `letter-spacing: var(--letter-spacing-lg)` (.08em), `color: var(--color-text-muted)`, `font-weight: var(--font-weight-semibold)`. Intended with `size="xs"`.

- [ ] **Step 1: Write the failing test**

Add to `packages/ui/src/primitives/Text.test.tsx`:

```tsx
it('renders the eyebrow variant class', () => {
    const markup = renderToStaticMarkup(<Text variant="eyebrow" size="xs">Section</Text>);

    expect(markup).toContain(styles.eyebrow);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @stagistic/ui exec vp test run src/primitives/Text.test.tsx`
Expected: FAIL — `styles.eyebrow` is `undefined`, so `toContain(undefined)` throws / does not match.

- [ ] **Step 3: Extend the component**

In `packages/ui/src/primitives/Text.tsx`, change the variant type and map:

```tsx
type TextVariant = 'body' | 'muted' | 'label' | 'mono' | 'eyebrow';
```

and add to `VARIANT_CLASS`:

```tsx
    eyebrow: styles.eyebrow,
```

- [ ] **Step 4: Add the CSS**

In `packages/ui/src/primitives/Text.module.css`, add:

```css
.eyebrow {
    --text-color: var(--color-text-muted);

    font-family: var(--font-family-sans);
    font-weight: var(--font-weight-semibold);
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-lg);
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm --filter @stagistic/ui exec vp test run src/primitives/Text.test.tsx`
Expected: PASS.

- [ ] **Step 6: Swap `ScriptMusicSidebar.sectionTitle` to eyebrow values**

The `.sectionTitle` currently: `font-family: var(--font-family-mono); font-size: var(--font-size-xs); font-weight: 400; text-transform: uppercase; letter-spacing: .08em; color: var(--color-text-muted)`. Two options — pick whichever the section-title element allows:
  - (a) If the heading is rendered through a component you can swap to `<Text as="h2" variant="eyebrow" size="xs">`, do that and delete `.sectionTitle`.
  - (b) If it must stay a route class, change `.sectionTitle` to use `font-family: var(--font-family-sans)` (drop mono), `font-weight: var(--font-weight-semibold)`, keeping the rest. Prefer (a).
Keep the `margin`/`padding` layout values on the wrapper either way.

- [ ] **Step 7: De-mono the other two chrome labels**

In `SidebarPanelSelect.module.css` `.button`: remove the `font-family: var(--font-family-mono);` line (it inherits sans). Keep uppercase + letter-spacing.
In `HeaderFooterSettingsPanel.module.css` `.previewLabel`: remove `font-family: var(--font-family-mono);` and add `font-weight: var(--font-weight-semibold);` so the eyebrow reads as a label in sans. Keep uppercase + `.08em`.

- [ ] **Step 8: Verify mono reservation holds**

Run: `grep -rn "font-family-mono" packages/app-routes/src packages/editor/src` and confirm the only remaining hits are the reserved script-content sites (`ElementPreview`, `MiniScriptEditor`, editor `HeaderFooterOverlay`, `EditorCanvas`, `EditorToolbar.textIcon`, `HeaderFooterSettingsPanel.previewCell`). No chrome label remains.

- [ ] **Step 9: Typecheck, lint, stylelint, tests**

Run: `npx tsc -b`; `npx eslint --fix` on touched `.tsx`; `npx stylelint` on touched `.module.css`; `pnpm --filter @stagistic/ui exec vp test run` and the app-routes/editor suites.
Expected: clean; catalog coverage still green (Text already catalogued).

- [ ] **Step 10: Commit**

```bash
git add packages/ui/src/primitives/Text.tsx packages/ui/src/primitives/Text.module.css packages/ui/src/primitives/Text.test.tsx packages/app-routes/src/routes/script/editor/sidebar/SidebarPanelSelect.module.css packages/app-routes/src/routes/script/editor/music/ScriptMusicSidebar.module.css packages/app-routes/src/routes/script/editor/settings/header-footer/HeaderFooterSettingsPanel.module.css
git commit -m "refactor: add Text eyebrow variant and reserve mono for script content"
```

---

### Task 4: Normalize sidebar list rows (B1 + B2)

Unify the two divergent sidebar list-row treatments: row height 30→28px (B1), and give the Structure row the same `--state-selected-edge` inset the Music row already has (B2). Because these two sidebars keep their own layout (different DnD, different columns), the normalization is value-level, not a shared component — align the divergent values and leave the structure.

**Files:**
- Modify: `packages/app-routes/src/routes/script/editor/music/ScriptMusicSidebar.module.css` (`.item` height 30→28)
- Modify: `packages/app-routes/src/routes/script/editor/structure/ScriptStructureSidebar.module.css` (`.itemRow.active` gains the inset edge)

**Interfaces:** none (CSS-only value alignment).

- [ ] **Step 1: Align Music row height (B1)**

In `ScriptMusicSidebar.module.css`, change `.item`'s `min-height: calc(30px * var(--size-scale));` to `min-height: calc(28px * var(--size-scale));` (matches Structure's 28px row, the majority value).

- [ ] **Step 2: Add the selected edge to Structure (B2)**

In `ScriptStructureSidebar.module.css`, in the `.itemRow` `&.active` block, add the inset edge so it reads:

```css
    &.active {
        background: var(--state-selected);
        box-shadow: inset 0 0 0 1px var(--state-selected-edge);

        & .itemButton {
            background: transparent;
        }
    }
```

- [ ] **Step 3: Confirm no other row-height coupling**

Grep `ScriptMusicSidebar.module.css` for other `30px` occurrences tied to the row (`.rowAction` was already removed in Task 2). Confirm the 28px change doesn't clip the row content (the row is `grid` with `align-items: center`; 28px matches Structure which holds the same content). No other change needed.

- [ ] **Step 4: Stylelint + tests**

Run: `npx stylelint` on both files; `pnpm --filter @stagistic/app-routes exec vp test run` + `test:browser`.
Expected: clean; no snapshot changes beyond the approved 2px/edge shift. If a golden snapshot changed, STOP and report for human visual check.

- [ ] **Step 5: Commit**

```bash
git add packages/app-routes/src/routes/script/editor/music/ScriptMusicSidebar.module.css packages/app-routes/src/routes/script/editor/structure/ScriptStructureSidebar.module.css
git commit -m "refactor: normalize sidebar list-row height and selected edge"
```

---

### Task 5: Promote `SettingsGroup` / `SettingRow` + add `PanelHeader` (D1)

Move the `ExportSettingsGroup`/`ExportSettingRow` scaffolding into `@stagistic/ui` unchanged (pure extraction, no paint change), rename to `SettingsGroup`/`SettingRow`, add a `PanelHeader` for the panel-level title/description hierarchy, and re-point the export layout at the shared components.

**Files:**
- Create: `packages/ui/src/molecules/forms/SettingsGroup.tsx`
- Create: `packages/ui/src/molecules/forms/SettingsGroup.module.css`
- Create: `packages/ui/src/molecules/forms/SettingsGroup.test.tsx`
- Modify: `packages/ui/src/index.ts` (export the three)
- Modify: `apps/web/src/dev/registry/controls.tsx` (catalogue them)
- Modify: `packages/app-routes/src/routes/script/export/modules/ExportSettingsLayout.tsx` (re-export from ui)

**Interfaces:**
- Produces:
  `SettingsGroup({children, className?})` → `<div>` with `display: grid; gap: var(--space-md)` (from `modules.module.css .module`).
  `SettingRow({children, className?})` → `<div>` with `display: flex; align-items: center; height: var(--control-trigger-height)` (from `.settingRow`).
  `PanelHeader({title, description?, className?})` → a titled block: title `--font-size-2xl` / semibold, optional description `--color-text-muted` (from the editor panels' `.panelTitle`/`.panelDescription`).

- [ ] **Step 1: Write the failing test**

Create `packages/ui/src/molecules/forms/SettingsGroup.test.tsx`:

```tsx
import {renderToStaticMarkup} from 'react-dom/server';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import styles from './SettingsGroup.module.css';
import {
    PanelHeader,
    SettingRow,
    SettingsGroup,
} from './SettingsGroup';

describe('SettingsGroup', () => {
    it('renders a group wrapper', () => {
        const markup = renderToStaticMarkup(<SettingsGroup><span>x</span></SettingsGroup>);

        expect(markup).toContain(styles.group);
    });

    it('renders a setting row', () => {
        const markup = renderToStaticMarkup(<SettingRow><span>x</span></SettingRow>);

        expect(markup).toContain(styles.row);
    });

    it('renders a panel header with title and description', () => {
        const markup = renderToStaticMarkup(
            <PanelHeader title="Layout" description="Adjust the page." />,
        );

        expect(markup).toContain(styles.panelHeader);
        expect(markup).toContain('Layout');
        expect(markup).toContain('Adjust the page.');
    });

    it('omits the description node when not provided', () => {
        const markup = renderToStaticMarkup(<PanelHeader title="Layout" />);

        expect(markup).not.toContain(styles.panelDescription);
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @stagistic/ui exec vp test run src/molecules/forms/SettingsGroup.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the components**

Create `packages/ui/src/molecules/forms/SettingsGroup.tsx`:

```tsx
import clsx from 'clsx';
import type {ReactNode} from 'react';

import styles from './SettingsGroup.module.css';

export const SettingsGroup = ({children, className}: {children: ReactNode, className?: string}) => (
    <div className={clsx(styles.group, className)}>{children}</div>
);

export const SettingRow = ({children, className}: {children: ReactNode, className?: string}) => (
    <div className={clsx(styles.row, className)}>{children}</div>
);

export const PanelHeader = ({
    title,
    description,
    className,
}: {
    title: ReactNode,
    description?: ReactNode,
    className?: string,
}) => (
    <div className={clsx(styles.panelHeader, className)}>
        <h2 className={styles.panelTitle}>{title}</h2>
        {description ? <p className={styles.panelDescription}>{description}</p> : null}
    </div>
);
```

- [ ] **Step 4: Write the CSS (values lifted verbatim from `modules.module.css` + editor panels)**

Create `packages/ui/src/molecules/forms/SettingsGroup.module.css`:

```css
.group {
    display: grid;
    gap: var(--space-md);
}

.row {
    display: flex;
    align-items: center;
    height: var(--control-trigger-height);
}

.panelHeader {
    display: grid;
    gap: var(--space-md);
}

.panelTitle {
    margin: 0;
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-semibold);
}

.panelDescription {
    margin: 0;
    color: var(--color-text-muted);
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm --filter @stagistic/ui exec vp test run src/molecules/forms/SettingsGroup.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 6: Export + catalogue**

In `packages/ui/src/index.ts` add (near the other `molecules/forms` exports):

```ts
export {
    PanelHeader,
    SettingRow,
    SettingsGroup,
} from './molecules/forms/SettingsGroup';
```

In `apps/web/src/dev/registry/controls.tsx`, add catalogue entries for `SettingsGroup`/`SettingRow`/`PanelHeader` (a small sample each). This keeps the coverage guard green.

- [ ] **Step 7: Re-point the export layout**

Rewrite `packages/app-routes/src/routes/script/export/modules/ExportSettingsLayout.tsx` to re-export the shared components so existing importers keep working:

```tsx
import {SettingRow, SettingsGroup} from '@stagistic/ui';

export const ExportSettingsGroup = SettingsGroup;
export const ExportSettingRow = SettingRow;
```

Leave `modules.module.css` in place for the *other* classes it defines (`.title`, `.description`, `.field`, `.countField`, `.initialPage*`, `.orderField`, etc.) — only `.module` and `.settingRow` are now superseded; delete just those two rules from `modules.module.css`.

- [ ] **Step 8: Typecheck, lint, stylelint, tests**

Run: `npx tsc -b`; `npx eslint --fix` on touched `.tsx`; `npx stylelint` on touched `.module.css`; `pnpm --filter @stagistic/ui exec vp test run` (incl. `tokens.test.ts` coverage) and the export route tests.
Expected: clean; coverage green.

- [ ] **Step 9: Commit**

```bash
git add packages/ui/src/molecules/forms/SettingsGroup.tsx packages/ui/src/molecules/forms/SettingsGroup.module.css packages/ui/src/molecules/forms/SettingsGroup.test.tsx packages/ui/src/index.ts apps/web/src/dev/registry/controls.tsx packages/app-routes/src/routes/script/export/modules/ExportSettingsLayout.tsx packages/app-routes/src/routes/script/export/modules/modules.module.css
git commit -m "feat(ui): promote SettingsGroup/SettingRow and add PanelHeader"
```

---

### Task 6: `Notice` component (warning / error / empty) + tokenize warning

Add a `Notice` component covering the in-scope status/empty blocks, tokenize the `IntegratedScoreWarning` hardcoded rem (E1), and migrate the sites that fit. **Do not** migrate the keep-separate cases (sidebar inline `.empty` text, `ExportPreview.error` floating pill, `HomeRoute` card-list internals) — those stay as they are.

**Files:**
- Create: `packages/ui/src/feedback/Notice.tsx`
- Create: `packages/ui/src/feedback/Notice.module.css`
- Create: `packages/ui/src/feedback/Notice.test.tsx`
- Modify: `packages/ui/src/index.ts` (export)
- Modify: `apps/web/src/dev/registry/controls.tsx` (catalogue)
- Modify: `packages/app-routes/src/routes/script/export/IntegratedScoreWarning.tsx` + `IntegratedScoreWarning.module.css` (use `Notice variant="warning"`, tokenize)

**Interfaces:**
- Produces: `Notice({variant, children, className?, role?})`.
  `variant: 'warning' | 'error' | 'empty'`.
  `warning`: left-border callout — `border-left: 2px solid var(--color-status-warning)`, `padding-left: var(--space-sm)`, `color: var(--color-text-muted)`, `font-size: var(--font-size-sm)`, `display: grid; gap: var(--space-xs)`.
  `error`: `color: var(--color-status-danger)`, `font-size: var(--font-size-sm)`.
  `empty`: centered muted block — `text-align: center; color: var(--color-text-muted); text-wrap: pretty; font-size: var(--font-size-md)`.
  Default `role`: `warning`→`status`, `error`→`alert`, `empty`→ none.

- [ ] **Step 1: Write the failing test**

Create `packages/ui/src/feedback/Notice.test.tsx`:

```tsx
import {renderToStaticMarkup} from 'react-dom/server';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {Notice} from './Notice';
import styles from './Notice.module.css';

describe('Notice', () => {
    it('renders the warning variant with a status role', () => {
        const markup = renderToStaticMarkup(<Notice variant="warning">Missing PDFs</Notice>);

        expect(markup).toContain(styles.notice);
        expect(markup).toContain(styles.warning);
        expect(markup).toContain('role="status"');
    });

    it('renders the error variant with an alert role', () => {
        const markup = renderToStaticMarkup(<Notice variant="error">Failed</Notice>);

        expect(markup).toContain(styles.error);
        expect(markup).toContain('role="alert"');
    });

    it('renders the empty variant without a role', () => {
        const markup = renderToStaticMarkup(<Notice variant="empty">No scripts yet</Notice>);

        expect(markup).toContain(styles.empty);
        expect(markup).not.toContain('role=');
    });

    it('lets the caller override the role', () => {
        const markup = renderToStaticMarkup(<Notice variant="warning" role="alert">x</Notice>);

        expect(markup).toContain('role="alert"');
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @stagistic/ui exec vp test run src/feedback/Notice.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

Create `packages/ui/src/feedback/Notice.tsx`:

```tsx
import clsx from 'clsx';
import type {ReactNode} from 'react';

import styles from './Notice.module.css';

type NoticeVariant = 'warning' | 'error' | 'empty';

const DEFAULT_ROLE: Record<NoticeVariant, string | undefined> = {
    warning: 'status',
    error: 'alert',
    empty: undefined,
};

const VARIANT_CLASS: Record<NoticeVariant, string> = {
    warning: styles.warning,
    error: styles.error,
    empty: styles.empty,
};

export const Notice = ({
    variant,
    children,
    className,
    role,
}: {
    variant: NoticeVariant,
    children: ReactNode,
    className?: string,
    role?: string,
}) => (
    <div
        role={role ?? DEFAULT_ROLE[variant]}
        className={clsx(styles.notice, VARIANT_CLASS[variant], className)}
    >
        {children}
    </div>
);
```

- [ ] **Step 4: Write the CSS**

Create `packages/ui/src/feedback/Notice.module.css`:

```css
.notice {
    font-size: var(--font-size-sm);
}

.warning {
    display: grid;
    gap: var(--space-xs);
    color: var(--color-text-muted);
    border-left: 2px solid var(--color-status-warning);
    padding-left: var(--space-sm);
}

.error {
    color: var(--color-status-danger);
}

.empty {
    color: var(--color-text-muted);
    font-size: var(--font-size-md);
    line-height: var(--line-height-normal);
    text-align: center;
    text-wrap: pretty;
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm --filter @stagistic/ui exec vp test run src/feedback/Notice.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 6: Export + catalogue**

In `packages/ui/src/index.ts` add (near the `feedback/` exports):

```ts
export {Notice} from './feedback/Notice';
```

In `apps/web/src/dev/registry/controls.tsx`, add a `Notice` entry with a sample per variant.

- [ ] **Step 7: Migrate `IntegratedScoreWarning` (E1: tokenize)**

In `IntegratedScoreWarning.tsx`, replace `<div className={styles.warning} role="status">` with `<Notice variant="warning">` (drop the now-redundant `role`; Notice supplies `status`). Keep the inner `<span>`, `<button>`, and `<ul>`. Keep the `.warning button` and `.warning ul` selectors' behaviour by moving them onto the Notice: pass `className={styles.warningExtras}` and in `IntegratedScoreWarning.module.css` replace the whole `.warning` rule (with its hardcoded `.3rem`/`.5rem`/`.55rem`/`2px`) with only the child selectors that Notice does not cover:

```css
.warningExtras button {
    font: inherit;
    color: inherit;
    text-align: left;
}

.warningExtras ul {
    margin: 0;
    padding-left: var(--space-xl);
}
```

The outer margins (`.5rem 0 .75rem`) — if the surrounding layout needs them, keep a wrapper margin via `.warningExtras { margin: var(--space-md) 0 var(--space-lg); }` (E1 maps `.5rem`→`--space-md` (8px·scale≈近), `.75rem`→`--space-lg` (12px·scale)). Confirm the mapping is within visual rounding; if the surrounding grid already spaces it, drop the margin entirely.

- [ ] **Step 8: Typecheck, lint, stylelint, tests**

Run: `npx tsc -b`; `npx eslint --fix` on touched `.tsx`; `npx stylelint` on touched `.module.css`; `pnpm --filter @stagistic/ui exec vp test run` (incl. coverage) and the export route tests.
Expected: clean; coverage green.

- [ ] **Step 9: Commit**

```bash
git add packages/ui/src/feedback/Notice.tsx packages/ui/src/feedback/Notice.module.css packages/ui/src/feedback/Notice.test.tsx packages/ui/src/index.ts apps/web/src/dev/registry/controls.tsx packages/app-routes/src/routes/script/export/IntegratedScoreWarning.tsx packages/app-routes/src/routes/script/export/IntegratedScoreWarning.module.css
git commit -m "feat(ui): add Notice component and tokenize integrated-score warning"
```

---

### Task 7: Deferred nits + DESIGN.md rules + final coverage sweep

Close out the Plan-2 deferrals that belong with patterns, document the named rules, and confirm the catalog/coverage guard reflects every new export.

**Files:**
- Modify: `packages/ui/src/molecules/ScriptActionsMenu.module.css` (R9)
- Modify: `packages/ui/src/primitives/Overlay.tsx` + `Overlay.module.css` (Nit 4: `as` prop + redundant default shadow)
- Modify: `DESIGN.md` (§6 named rules)
- Modify: `packages/ui/src/tokens.test.ts` (only if any new export was quarantined rather than catalogued)

**Interfaces:**
- Consumes: the components from Tasks 1/5/6 (they must be catalogued or quarantined).

- [ ] **Step 1: R9 — ScriptActionsMenu trigger hover**

In `ScriptActionsMenu.module.css`, find the `.trigger` hover that uses `--color-surface-raised` and change it to `--state-hover` (the shared pointer echo), matching every other icon-trigger hover. This is a visual-neutrality alignment (`--state-hover` = `color-mix(--color-surface-raised 70%, transparent)`); confirm the trigger sat on `--color-surface` so the echo reads the same. If it sat on a raised surface where the echo would vanish, STOP and report instead.

- [ ] **Step 2: Overlay `as` prop + redundant shadow (Nit 4)**

Read `packages/ui/src/primitives/Overlay.tsx`. If it hardcodes its element, add an `as?: ElementType` prop following the `Text` pattern (`createElement(as ?? 'div', ...)`). In `Overlay.module.css`, if a default `box-shadow` is always overridden by callers, remove the redundant default (confirm via grep that every caller sets its own shadow; if any relies on the default, keep it and note so).

- [ ] **Step 3: Run Overlay's test**

Run: `pnpm --filter @stagistic/ui exec vp test run src/primitives/Overlay.test.tsx`
Expected: PASS. If adding `as` broke a type, fix the test to cover the new prop (add a case asserting `as="section"` renders a `<section>`).

- [ ] **Step 4: Document the named rules in DESIGN.md §6**

Append to `DESIGN.md` §6 (named-rule style, matching the existing entries) rules capturing this plan's decisions, e.g.:
  - **Icon buttons use `IconButton`** — square icon actions are `IconButton`, never a bespoke `.iconButton` class; `shape="pill"` for full-round, `tone="danger"` for destructive, `isSelected` for the toolbar active state.
  - **Mono is for script content only** — `--font-family-mono` (Courier Prime) never styles chrome labels; chrome labels use `Text variant="eyebrow"` (sans, uppercase, tracked, muted).
  - **Sidebar rows share height + selected edge** — list rows are 28px and carry the `--state-selected-edge` inset when active.
  - **Settings scaffolding is `SettingsGroup`/`SettingRow`/`PanelHeader`** — no route re-implements the group/row block.
  - **Status/empty blocks use `Notice`** — `variant` warning/error/empty; the floating export error pill and sidebar inline empty text are documented exceptions.

Write the actual prose for each rule (no placeholders) in the established §6 format.

- [ ] **Step 5: Final coverage sweep**

Run: `pnpm --filter @stagistic/ui exec vp test run src/tokens.test.ts`
Expected: PASS. Confirm `IconButton`, `Notice`, `SettingsGroup`, `SettingRow`, `PanelHeader` are each either catalogued (in `apps/web/src/dev/registry/controls.tsx`) or in the `NOT_CATALOGUED_YET` quarantine. Prefer catalogued. If the guard is red, add the missing catalogue entry (do not weaken the guard).

- [ ] **Step 6: Full typecheck + workspace tests**

Run: `npx tsc -b` (exit 0); `pnpm -r exec vp test run` (or the repo's aggregate `vp test run`) and the browser suites. Compare browser reds against the recorded editor baseline — no NEW reds.
Expected: green except the pre-existing editor browser reds recorded at the start.

- [ ] **Step 7: Commit**

```bash
git add DESIGN.md packages/ui/src/molecules/ScriptActionsMenu.module.css packages/ui/src/primitives/Overlay.tsx packages/ui/src/primitives/Overlay.module.css packages/ui/src/tokens.test.ts
git commit -m "chore(ui): close pattern deferrals and document design rules"
```

---

## Self-Review

**1. Spec coverage (step 5 Patterns):**
- IconButton family (5.2) → Tasks 1–2. ✅
- Sidebar list rows → Task 4. ✅
- Chrome eyebrow labels + mono reservation → Task 3. ✅
- Settings group/row + panel header → Task 5. ✅
- Notice (warning/error/empty) → Task 6. ✅
- SelectTrigger dedup (C1) → **deliberately deferred** to Phase 2 (Global Constraints note); not a gap, a scoped decision. ✅
- Deferred Plan-2 nits (F10 partial, R9, Overlay) + DESIGN.md rules → Tasks 3/7. ✅
- Keep-separate cases explicitly excluded (A5, B4, D-levels, E2, E3). ✅

**2. Placeholder scan:** every code step carries real code or an exact class/value instruction. The two judgement points (E1 rem→token rounding in Task 6 Step 7; Overlay default-shadow removal in Task 7 Step 2) carry an explicit "confirm, else STOP and report" fallback rather than a vague directive — acceptable because both are visual-neutrality gates the constraints require a human to confirm.

**3. Type consistency:** `IconButton` props (`variant`/`size`/`tone`/`shape`/`isSelected`) are referenced identically in Tasks 1 and 2. `Text` `eyebrow` variant added in Task 3 and used there. `SettingsGroup`/`SettingRow`/`PanelHeader` names match between Tasks 5 and 7. `Notice` `variant` values (`warning`/`error`/`empty`) match between Tasks 6 and 7. Catalogue registration + `tokens.test.ts` coverage referenced consistently across Tasks 1/5/6/7.

**Note on test commands:** the exact `pnpm --filter … exec vp test run` invocation may need the repo's actual script alias (see MEMORY: proto/pnpm PATH quirk — `npx tsc -b` and `eslint` work directly; subagents ran `pnpm` fine). If `pnpm --filter` fails in a given shell, fall back to the package's local `vp test run` / `test:browser` scripts. This does not change what is tested.
