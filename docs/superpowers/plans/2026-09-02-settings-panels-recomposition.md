# Settings Panels Recomposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recompose the nine editor settings panels onto the shared settings primitives (`SettingsGroup`, `PanelHeader`, `formControlStyles`), deleting every route rule that reimplements one of them and leaving each module with genuinely-singular preview chrome marked for phase-2 UnoCSS.

**Architecture:** Pure recomposition — no behaviour, copy, or accessibility change. All eight panels currently open with the identical shell `<div className={panelStyles.panelStack}><h3 className={panelStyles.panelTitle}>…</h3>`; that shell becomes `SettingsGroup` + `PanelHeader`. `TitlePageSettingsPanel` hand-rolls `.field`/`.label` that duplicate `formControlStyles` byte-for-byte; those are deleted. What survives in each module is preview/schematic chrome that exists exactly once in the product (the header/footer composer, the page schematic, the indent slider, the character-colour dots) plus the OKLCH preview tokens those widgets consume.

**Tech Stack:** React 19, TypeScript, CSS Modules + OKLCH tokens, `vite-plus/test` browser tests, pnpm monorepo.

**Spec:** `docs/superpowers/specs/2026-09-01-route-composition-and-css-elimination-design.md` — this is **step 4 of §9**. §5 row "11 settings modules" is the source table; §6 is the normalization discipline; §8.3 defines "no visual change". Prior art: `docs/superpowers/plans/2026-09-01-homeroute-recomposition.md` (step 3, complete) and the audit `docs/design/route-composition-audit-2026-09-01.md`.

## Global Constraints

Copied verbatim from the spec and the standing project rules. Every task's requirements implicitly include this section.

- **Pure recomposition** — no feature or behaviour change of any kind (spec §4). Same DOM semantics, same copy, same `aria-*`, **same heading levels**.
- **No visual change without an approved normalization row** (spec §6, §8.3). Anything found mid-implementation is *appended to the delta table and waits* — it is not unified on the spot.
- **Never commit or push.** Every "Prepare commit" step is prepare-only; the maintainer commits (`AGENTS.md`).
- **Never `git stash`** for a clean-tree baseline — use `git diff > patch` + `git apply -R` (commits land concurrently).
- **Canonical checks:** `pnpm -w exec tsc -b`; `eslint --fix` (IS the formatter — not `vp lint`/`vp fmt`); `stylelint --fix`; `vp test run` (node) and `vp test run -c vitest.browser.config.ts <path>` (browser — **not** `--browser`). `vite.config.js` is a gitignored artifact — never edit/commit it.
- **`packages/editor` is untouched.**
- **Mono font (`--font-family-mono`) is reserved exclusively for script content.**
- **Do NOT mutate golden snapshots, loosen assertions, or change viewport to make a red go green.**
- `app-routes` carries known pre-existing failing tests — reported, not fixed here, not counted as regressions. As of 2026-09-02 these are `ScriptExportRoute.browser.test.tsx > renders exact-kind character catalog rows only` and node `prepareExampleScriptDocument.test.ts`.

## Why this plan departs from the spec's wording

Spec §9 step 4 says "Settings panels → `SettingsGroup`/`SettingRow` (9 modules)". Reading all nine modules first (as step 3 taught us to do — its audit numbers were fiction) shows three corrections, each of which needs a ruling in Task 1:

1. **`SettingRow` fits none of these panels.** As shipped it is `display: flex; align-items: center; height: var(--control-trigger-height)` — a horizontal fixed-height row. The editor panels are vertical label-over-control fields, which is `formControlStyles.field`. `SettingRow` is used only by the export modules (via the `ExportSettingsLayout` alias) and correctly so. Forcing it here would be a visual change, not a recomposition.
2. **`shared.module.css` is not shared settings chrome.** All 148 lines are `.indentSlider*` — one dual-range slider used by `ElementPreview` alone. It is a widget, not a settings pattern.
3. **The real duplication is elsewhere and larger than the spec claims:** the 8× repeated panel shell, and `TitlePageSettingsPanel`'s local re-declaration of `formControlStyles.field`/`.label`.

## File map

- **Modify:** `packages/ui/src/molecules/forms/SettingsGroup.tsx` — add `gap` prop to `SettingsGroup`, `level` prop to `PanelHeader`.
- **Modify:** `packages/ui/src/molecules/forms/SettingsGroup.module.css` — gap variants; heading size decoupled from tag.
- **Create:** `packages/ui/src/molecules/forms/SettingsGroup.browser.test.tsx` — measured proof the shell renders identically.
- **Modify (all 8 shells):** `.../settings/{structure-markers,header-footer,page-layout,danger-zone,document-info,visual-preferences,element,initial-pages}/*SettingsPanel.tsx`.
- **Modify:** `.../settings/ScriptEditorSettingsPanel.module.css` — keep the preview tokens, delete `.panelTitle`, `.panelDescription` (dead), `.placeholderCard` (dead), `.panelStack` layout.
- **Modify:** `.../settings/document-info/TitlePageSettingsPanel.{tsx,module.css}` — drop the duplicated field/label.
- **Modify:** `.../settings/initial-pages/InitialPagesSettingsPanel.{tsx,module.css}` — `.fields` → `formControlStyles.flatGrid`.
- **Modify:** `.../settings/page-layout/PageLayoutSettingsPanel.module.css` — `.pageSettingsGrid` → `flatGrid` + column override.
- **Modify:** `.../settings/element/ElementSettingsPanel.{tsx,module.css}` — `.resetButton` → `Button`.
- **Modify:** `.../settings/danger-zone/DangerZoneSettingsPanel.{tsx,module.css}` — header → `PanelHeader`.
- **Append:** `docs/design/route-composition-audit-2026-09-01.md` — the settings delta table (Task 1 deliverable).
- **Untouched, deferred to step 7:** `settings/shared.module.css`, `element/ElementPreview.module.css`, `element/ElementFormattingToolbar.module.css`.

---

## Task 1: Settings pre-flight + delta table — APPROVAL GATE

**Files:**
- Append: `docs/design/route-composition-audit-2026-09-01.md`

**Interfaces:**
- Consumes: nothing.
- Produces: approved rulings S1–S6, which Tasks 2–6 implement literally.

- [x] **Step 1: Append the delta table** under a new heading `## Settings panels recomposition — delta table (2026-09-02)`. Every row below is already researched — copy it in, do not re-derive it.

| # | Site | Today | After | Kind | Ruling needed |
|---|---|---|---|---|---|
| S1 | Panel heading tag | 8 panels render `<h3>`; `PanelHeader` renders `<h2>` | `PanelHeader level={3}` | a11y | **Yes** — recommend adding `level`; changing the panels to `h2` would alter the document outline, which the constraints forbid |
| S2 | Panel shell | `.panelStack` = `flex column; gap: --space-2xl` | `SettingsGroup gap="2xl"` = `grid; gap: --space-2xl` | none if measured equal | **Yes** — grid-vs-flex must be proven equal by measurement before adoption |
| S3 | Preview colour tokens | 7 `--color-preview-*` custom properties declared on `.panelStack`, plus a `[data-theme='dark']` override | stay in the route module on a new `.panelTokens` class applied via `SettingsGroup className` | none | No — mechanical |
| S4 | `SettingRow` | unused by editor panels | stays unused here | none | **Yes** — confirms the spec's wording is superseded |
| S5 | `shared.module.css` (indent slider, 148 lines) | route module | unchanged, marked `phase-2 Uno`, revisited at step 7 | none | **Yes** — supersedes the 2026-09-02 scope call, which assumed "shared" meant shared settings chrome |
| S6 | Hardcoded mono stacks | `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace` literal in `shared.module.css` `.indentSliderLabels`, `page-layout` `.pageSchematicZone/.pageSchematicContent`, `element/ElementNumericControls` `.shortcutPrefix` | unchanged in this step; tabled | token debt | **Yes** — these bypass the token system *and* put mono on UI chrome rather than script content. Recommend tabling: it is a token decision, not a composition one |
| S7 | Dead classes | `.placeholderCard`, `.panelDescription` in `ScriptEditorSettingsPanel.module.css` — 0 references | deleted | none | No — mechanical |
| S8 | `TitlePage` `.field`/`.label` | local re-declaration, byte-identical to `formControlStyles.field`/`.label` | `formControlStyles` | none | No — mechanical, proven identical below |
| S9 | `initial-pages` `.fields` | `grid; repeat(2, minmax(0,1fr)); gap --space-xl; margin-top --space-xl; @900px 1fr` | `formControlStyles.flatGrid` — byte-identical | none | No — mechanical |
| S10 | `page-layout` `.pageSettingsGrid` | same as S9 but `repeat(3, …)` | `formControlStyles.flatGrid` + `--flat-grid-columns: 3` | none | **Yes** — needs a new custom property on `flatGrid` |
| S11 | `element` `.resetButton` | hand-rolled 40-line pill button | `Button size="xs" variant="outline"` + `UndoIcon` | visual, likely | **Yes** — must be measured; if the metrics differ, keep the route class and table the difference |
| S12 | `danger-zone` `.dangerTitle` | `--color-status-danger` | unchanged | none | **Yes** — confirm the HomeRoute "no danger red" ruling does *not* generalise here; this section is genuinely destructive |

- [x] **Step 2: Record the proven-identical pairs** in the doc so Tasks 3–4 are auditable. These were diffed rule-by-rule during planning:

```
TitlePage .field   { display:flex; flex-direction:column; gap:6px }
formControl .field { display:flex; flex-direction:column; gap:6px }                  → identical

TitlePage .label   { font-size:--font-size-sm; font-weight:--font-weight-semibold; color:--color-text-muted }
formControl .label { font-size:--font-size-sm; font-weight:--font-weight-semibold; color:--color-text-muted }  → identical

initial-pages .fields  { display:grid; grid-template-columns:repeat(2,minmax(0,1fr));
                         gap:--space-xl; margin-top:--space-xl; @900px → 1fr }
formControl .flatGrid   { display:grid; grid-template-columns:repeat(2,minmax(0,1fr));
                         gap:--space-xl; margin-top:--space-xl; @900px → 1fr }        → identical
```

- [x] **Step 3: Record the residue** each module keeps and why, so step 7 has a starting list:

```
ScriptEditorSettingsPanel.module.css → .panelTokens (7 OKLCH preview tokens + dark override). Singular: the
                                       preview widgets are the only consumers.
header-footer/…            → the whole composer: .previewRow/.previewCell/.activeCell/.previewText/.editor/
                             .editorToolbar/.fixedNote*/.formattingGroup/.activeFormat/.variables/.variableButton.
                             One header/footer composer exists in the product.
page-layout/…              → .pageSchematic* (the page diagram). Singular.
document-info/…            → .draftDateRow/.draftDateField/.subFieldLabel/.checkboxLabel/.draftDatePreview/
                             .section/.title/.hint. The draft-date row is singular.
visual-preferences/…       → .inlineRow/.selectCompact/.previewPrefix/.previewDots/.previewDot. Singular.
initial-pages/…            → .section/.sectionTitle.
element/ElementSettingsPanel → .panelHeader (title + reset, space-between).
element/ElementNumericControls → .shortcutField/.shortcutPrefix.
danger-zone/…              → .dangerCard/.dangerHeader/.dangerTitle/.dangerDescription (pending S12).
shared.module.css          → all 148 lines (indent slider), per S5.
```

- [x] **Step 4: APPROVAL GATE.** Present S1, S2, S4, S5, S6, S10, S11, S12 to the maintainer **as plain text, not an interactive card** (the card flow deadlocked in the step-3 session), each with the recommendation already stated. **Do not start Task 2 until answered.**

- [x] **Step 5: Prepare commit (maintainer runs).** Message: `docs(design): add settings panels recomposition delta table`.

---

## Task 2: Panel shell → `SettingsGroup` + `PanelHeader`

This is the task that deletes the 8× duplication. Do it first; everything else is downstream.

**Files:**
- Modify: `packages/ui/src/molecules/forms/SettingsGroup.tsx`
- Modify: `packages/ui/src/molecules/forms/SettingsGroup.module.css`
- Create: `packages/app-routes/src/routes/script/editor/settings/__shell-parity.browser.test.tsx` (temporary — deleted in Step 8)
- Modify: `.../settings/ScriptEditorSettingsPanel.module.css`
- Modify: all 8 panel `.tsx` files listed in the File map

**Interfaces:**
- Consumes: nothing.
- Produces: `SettingsGroup({children, className, gap})` where `gap?: 'md' | 'lg' | '2xl'` (default `'md'`); `PanelHeader({title, description, className, level})` where `level?: 2 | 3 | 4` (default `2`). Tasks 3–6 use both.

- [x] **Step 1: Measure the baseline before touching anything.** Step 3 proved that reading CSS is not enough. Write this probe and record its output:

```tsx
// packages/app-routes/src/routes/script/editor/settings/__shell-parity.browser.test.tsx
import {render} from 'vitest-browser-react';
import {expect, test} from 'vitest';

import {InitialPagesSettingsPanel} from './initial-pages/InitialPagesSettingsPanel';

const SETTINGS = {
    castAndPlace: {castOrderBy: 'name', showOutline: true},
    songs: {showCharactersInSongs: false},
} as const;

test('shell parity probe', async () => {
    render(<InitialPagesSettingsPanel settings={SETTINGS} onUpdate={() => {}} />);

    const stack = document.querySelector('h3')?.parentElement as HTMLElement;
    const heading = document.querySelector('h3') as HTMLElement;
    const sections = [...stack.children].map(child => {
        const rect = child.getBoundingClientRect();
        return {tag: child.tagName, x: rect.x, y: rect.y, w: rect.width, h: rect.height};
    });
    const stackStyle = getComputedStyle(stack);
    const headingStyle = getComputedStyle(heading);

    // Thrown, not logged: browser-test stdout is not forwarded, but failure messages are.
    throw new Error(JSON.stringify({
        stack: {
            display: stackStyle.display,
            gap: stackStyle.rowGap,
            rect: stack.getBoundingClientRect(),
        },
        heading: {
            tag: heading.tagName,
            fontSize: headingStyle.fontSize,
            fontWeight: headingStyle.fontWeight,
            rect: heading.getBoundingClientRect(),
        },
        sections,
    }, null, 2));
});
```

- [x] **Step 2: Run the probe and save the output.**

Run: `cd packages/app-routes && pnpm exec vp test run -c vitest.browser.config.ts src/routes/script/editor/settings/__shell-parity.browser.test.tsx`
Expected: FAIL, with the JSON in the failure message. Copy it into `/tmp/settings-shell-before.json`.

- [x] **Step 3: Add the `gap` and `level` props.** Replace the two components in `SettingsGroup.tsx`:

```tsx
import clsx from 'clsx';
import type {ReactNode} from 'react';

import styles from './SettingsGroup.module.css';

const GAP_CLASS = {
    md: styles.gapMd,
    lg: styles.gapLg,
    '2xl': styles.gap2xl,
} as const;

export const SettingsGroup = ({
    children,
    className,
    gap = 'md',
}: {
    children: ReactNode,
    className?: string,
    gap?: keyof typeof GAP_CLASS,
}) => (
    <div className={clsx(styles.group, GAP_CLASS[gap], className)}>{children}</div>
);

export const SettingRow = ({children, className}: {children: ReactNode, className?: string}) => (
    <div className={clsx(styles.row, className)}>{children}</div>
);

export const PanelHeader = ({
    title,
    description,
    className,
    level = 2,
}: {
    title: ReactNode,
    description?: ReactNode,
    className?: string,
    level?: 2 | 3 | 4,
}) => {
    // The visual size is the panel-title size regardless of tag: settings panels sit under the
    // route's own h2, so they need h3 semantics without an h3's smaller default type.
    const Heading = `h${level}` as const;

    return (
        <div className={clsx(styles.panelHeader, className)}>
            <Heading className={styles.panelTitle}>{title}</Heading>
            {description ? <p className={styles.panelDescription}>{description}</p> : null}
        </div>
    );
};
```

- [x] **Step 4: Add the gap variants** to `SettingsGroup.module.css`. Replace the `.group` rule (leave `.row`, `.panelHeader`, `.panelTitle`, `.panelDescription` untouched):

```css
.group {
    display: grid;
    gap: var(--settings-group-gap, var(--space-md));
}

.gapMd {
    --settings-group-gap: var(--space-md);
}

.gapLg {
    --settings-group-gap: var(--space-lg);
}

.gap2xl {
    --settings-group-gap: var(--space-2xl);
}
```

- [x] **Step 5: Write the component test.** Create `packages/ui/src/molecules/forms/SettingsGroup.browser.test.tsx`:

```tsx
import {render} from 'vitest-browser-react';
import {describe, expect, test} from 'vitest';

import {PanelHeader, SettingsGroup} from './SettingsGroup';

describe('SettingsGroup gap', () => {
    test('defaults to md and honours 2xl', () => {
        render(
            <>
                <SettingsGroup data-testid="a"><span>x</span></SettingsGroup>
                <SettingsGroup gap="2xl"><span>y</span></SettingsGroup>
            </>,
        );

        const [md, xl] = [...document.querySelectorAll('div')].filter(el => el.firstElementChild?.tagName === 'SPAN');

        expect(getComputedStyle(md).rowGap).not.toBe(getComputedStyle(xl).rowGap);
        expect(Number.parseFloat(getComputedStyle(xl).rowGap)).toBeGreaterThan(
            Number.parseFloat(getComputedStyle(md).rowGap),
        );
    });
});

describe('PanelHeader level', () => {
    test('renders h2 by default and h3 on request, at the same type size', () => {
        render(
            <>
                <PanelHeader title="Default" />
                <PanelHeader level={3} title="Third" />
            </>,
        );

        const h2 = document.querySelector('h2') as HTMLElement;
        const h3 = document.querySelector('h3') as HTMLElement;

        expect(h2.textContent).toBe('Default');
        expect(h3.textContent).toBe('Third');
        expect(getComputedStyle(h3).fontSize).toBe(getComputedStyle(h2).fontSize);
    });
});
```

- [x] **Step 6: Run the ui browser tests.**

Run: `cd packages/ui && pnpm exec vp test run -c vitest.browser.config.ts src/molecules/forms/SettingsGroup.browser.test.tsx`
Expected: PASS, 2 tests.

- [x] **Step 7: Rewrite the 8 panel shells.** In each file, replace the wrapper and heading. The pattern is identical everywhere — here is `InitialPagesSettingsPanel.tsx`; apply the same two-line change to `StructureMarkersSettingsPanel`, `HeaderFooterSettingsPanel`, `PageLayoutSettingsPanel`, `DangerZoneSettingsPanel`, `TitlePageSettingsPanel`, `VisualPreferencesSettingsPanel` and `ElementSettingsPanel`:

```tsx
// before
import panelStyles from '../ScriptEditorSettingsPanel.module.css';
…
    <div className={panelStyles.panelStack}>
        <h3 className={panelStyles.panelTitle}>Initial pages</h3>

// after
import {PanelHeader, SettingsGroup} from '@stagistic/ui';

import panelStyles from '../ScriptEditorSettingsPanel.module.css';
…
    <SettingsGroup gap="2xl" className={panelStyles.panelTokens}>
        <PanelHeader level={3} title="Initial pages" />
```

  `ElementSettingsPanel` is the one exception — its heading sits in a flex row beside the reset button, so it keeps its own `<h3>` for now and only the wrapper changes:

```tsx
    <SettingsGroup gap="2xl" className={panelStyles.panelTokens}>
        <div className={elementStyles.panelHeader}>
            <h3 className={panelStyles.panelTitle}>{blockLabel}</h3>
            {/* reset button — becomes a Button in Task 5 */}
```

  This means `.panelTitle` survives Task 2 and is deleted in Task 5. Note that in the plan's audit row so it is not flagged as an oversight.

- [x] **Step 8: Rewrite `ScriptEditorSettingsPanel.module.css`.** The tokens stay, the layout and the dead classes go:

```css
/*
 * Residual: the OKLCH preview tokens consumed by ElementPreview, the page schematic and the
 * indent slider. Panel layout now comes from SettingsGroup; the heading from PanelHeader.
 * phase-2 Uno target.
 */
.panelTokens {
    --L-preview-amber: .64;
    --A-preview-amber: .72;
    --A-preview-amber-soft: .2;
    --A-preview-amber-strong: .42;
    --L-preview-blue: .58;
    --A-preview-blue: .95;
    --color-preview-indent-rail: oklch(from var(--base-amber) var(--L-preview-amber) calc(c * .95) h / var(--A-preview-amber));
    --color-preview-spacing-soft: oklch(from var(--base-amber) var(--L-preview-amber) calc(c * .9) h / var(--A-preview-amber-soft));
    --color-preview-spacing-strong: oklch(from var(--base-amber) var(--L-preview-amber) calc(c * .95) h / var(--A-preview-amber-strong));
    --color-preview-slider-selected: oklch(from var(--base-blue) var(--L-preview-blue) c h / .32);
    --color-preview-slider-handle: oklch(from var(--base-blue) var(--L-preview-blue) c h / var(--A-preview-blue));
    --color-preview-slider-boundary: oklch(from var(--base-neutral) .52 calc(c * .45) h / .55);
}

:global(:root[data-theme = 'dark']) .panelTokens {
    --L-preview-amber: .6;
    --A-preview-amber: .62;
    --A-preview-amber-soft: .24;
    --A-preview-amber-strong: .46;
    --L-preview-blue: .64;
    --A-preview-blue: .96;
}

/* Deleted in Task 5, once ElementSettingsPanel's header moves to PanelHeader. */
.panelTitle {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-semibold);
}
```

  `.panelStack`, `.panelDescription` and `.placeholderCard` are deleted (S2, S7).

- [x] **Step 9: Re-run the probe and diff the numbers.**

Run: `cd packages/app-routes && pnpm exec vp test run -c vitest.browser.config.ts src/routes/script/editor/settings/__shell-parity.browser.test.tsx`
Expected: FAIL again, with a new JSON payload. Compare it against `/tmp/settings-shell-before.json`. Every `x`, `y`, `w`, `h`, `fontSize`, `fontWeight` and `rowGap` must match. `display` legitimately changes `flex` → `grid` (S2); nothing else may move. **If any geometry differs, stop and report — do not adjust the expectation.**

- [x] **Step 10: Delete the probe.**

```bash
rm packages/app-routes/src/routes/script/editor/settings/__shell-parity.browser.test.tsx
```

- [x] **Step 11: Typecheck + lint + tests.**

```bash
pnpm -w exec tsc -b
pnpm -w exec eslint --fix packages/ui/src/molecules/forms packages/app-routes/src/routes/script/editor/settings
pnpm -w exec stylelint --fix "packages/{ui,app-routes}/src/**/*.css"
cd packages/ui && pnpm exec vp test run && pnpm exec vp test run -c vitest.browser.config.ts
cd ../app-routes && pnpm exec vp test run -c vitest.browser.config.ts src/routes/script/editor/settings
```
Expected: all green except the two known pre-existing reds.

- [x] **Step 12: Prepare commit (maintainer runs).** Message: `refactor(settings): compose panel shells from SettingsGroup + PanelHeader`.

---

## Task 3: `TitlePageSettingsPanel` → `formControlStyles`

**Files:**
- Modify: `.../settings/document-info/TitlePageSettingsPanel.tsx:97-231`
- Modify: `.../settings/document-info/TitlePageSettingsPanel.module.css`

**Interfaces:**
- Consumes: `SettingsGroup`, `PanelHeader` from Task 2; `formControlStyles` (already exported from `@stagistic/ui`).
- Produces: nothing new.

- [x] **Step 1: Swap the field/label classes.** Six sites use `styles.field` + `styles.label` (lines 99/100, 110/111, 134/135, 202/203, 217/218 and the `styles.hint` at 228). Change each `styles.field` → `formControlStyles.field` and `styles.label` → `formControlStyles.label`. Leave `styles.section`, `styles.title`, `styles.hint`, `styles.draftDateRow`, `styles.draftDateField`, `styles.subFieldLabel`, `styles.checkboxLabel` and `styles.draftDatePreview` alone — they are residue.

- [x] **Step 2: Delete the duplicated rules** from `TitlePageSettingsPanel.module.css`. `.section` keeps its nested `& .title`, but the nested `& .label`/`& .hint` under `.field` must be lifted before `.field` is removed, because `.hint` is still used:

```css
.section {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);

    & .title {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-bold);
        color: var(--color-text-muted);
    }
}

.hint {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    opacity: .7;
}
```

  `.field` and its nested `& .label` are deleted (S8).

- [x] **Step 3: Verify the hint still renders.** `.hint` was nested inside `.field`, so it matched only as a descendant; standalone it now matches directly. Confirm with a quick render check:

Run: `cd packages/app-routes && pnpm exec vp test run -c vitest.browser.config.ts src/routes/script/editor/settings`
Expected: green (except known reds).

- [x] **Step 4: Typecheck + lint.**

```bash
pnpm -w exec tsc -b
pnpm -w exec eslint --fix packages/app-routes/src/routes/script/editor/settings/document-info
pnpm -w exec stylelint --fix "packages/app-routes/src/routes/script/editor/settings/**/*.css"
```

- [x] **Step 5: Prepare commit (maintainer runs).** Message: `refactor(settings): use shared form field styles in the title page panel`.

---

## Task 4: Field grids → `formControlStyles.flatGrid`

**Files:**
- Modify: `packages/ui/src/molecules/forms/formControlStyles.module.css`
- Modify: `.../settings/initial-pages/InitialPagesSettingsPanel.{tsx,module.css}`
- Modify: `.../settings/page-layout/PageLayoutSettingsPanel.{tsx,module.css}`

**Interfaces:**
- Consumes: `formControlStyles.flatGrid`.
- Produces: `--flat-grid-columns` (integer, default `2`) — a custom property a route may set to change the column count without redeclaring the grid.

- [x] **Step 1: Parameterise the column count.** In `formControlStyles.module.css`:

```css
.flatGrid {
    display: grid;
    grid-template-columns: repeat(var(--flat-grid-columns, 2), minmax(0, 1fr));
    gap: var(--space-xl);
    margin-top: var(--space-xl);

    @media (max-width: 900px) {
        grid-template-columns: 1fr;
    }
}
```

- [x] **Step 2: Point `initial-pages` at it.** In `InitialPagesSettingsPanel.tsx`, `<div className={styles.fields}>` → `<div className={formControlStyles.flatGrid}>` (the import is already present). Delete `.fields` from `InitialPagesSettingsPanel.module.css`, leaving only:

```css
.section {
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
}

.sectionTitle {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
}
```

- [x] **Step 3: Point `page-layout` at it.** In `PageLayoutSettingsPanel.tsx`, replace `styles.pageSettingsGrid` with `clsx(formControlStyles.flatGrid, styles.threeColumn)`. In `PageLayoutSettingsPanel.module.css` replace the whole `.pageSettingsGrid` rule with:

```css
/* Three field columns instead of the shared default of two. */
.threeColumn {
    --flat-grid-columns: 3;
}
```

  Leave every `.pageSchematic*` rule untouched — that is the residual page diagram.

- [x] **Step 4: Confirm the responsive collapse still fires.** Both grids must still become single-column at 900px; `--flat-grid-columns` is overridden by the media query's `grid-template-columns`, not by the property, so the collapse is preserved. Verify by running the settings browser tests at the default viewport and confirming no layout assertion moves:

Run: `cd packages/app-routes && pnpm exec vp test run -c vitest.browser.config.ts src/routes/script/editor/settings`
Expected: green (except known reds).

- [x] **Step 5: Typecheck + lint + ui tests.**

```bash
pnpm -w exec tsc -b
pnpm -w exec eslint --fix packages/app-routes/src/routes/script/editor/settings packages/ui/src/molecules/forms
pnpm -w exec stylelint --fix "packages/{ui,app-routes}/src/**/*.css"
cd packages/ui && pnpm exec vp test run -c vitest.browser.config.ts
```

**Divergence from the plan (Step 2).** The plan, following audit row S9, assumed `initial-pages`'
`.fields` was byte-identical to `.flatGrid`. It is not: `.fields` has **no `margin-top`**, while
`.flatGrid` has `margin-top: var(--space-xl)`. Adopting `.flatGrid` unmodified pushed the grid down
17.28px, because the enclosing `.section` already supplies that gap via its flex `gap`. Measured:
sections moved from y 44.59 / 162.69 to 44.59 / 179.95.

The first fix — dropping `margin-top` from `.flatGrid` and moving it to `page-layout`'s `.threeColumn`
— was wrong too: `.flatGrid` already had two consumers predating this step (`structure-markers`
and `element/ElementNumericControls`) that rely on that margin. The shared rule keeps it, and
`initial-pages` cancels it locally:

```css
/*
 * The enclosing .section already supplies the leading gap, so the shared flat grid's
 * margin would double it. Doubled class to win the cross-module ordering tie.
 */
.flushGrid.flushGrid {
    margin-top: 0;
}
```

  Verified by round-tripping each measurement against HEAD (`git diff` / `git apply -R`, from the repo
  root): `initial-pages` back to cells y 80.86 and sections 44.59 / 162.69; `page-layout` unchanged at
  `415.156px` ×3 with `margin-top: 17.28px`; and the unparameterised `.flatGrid` identical at
  `631.359px 631.375px` / gap 17.28 / margin-top 17.28, which is what proves
  `repeat(var(--flat-grid-columns, 2), …)` is invisible to the two pre-existing consumers.
  Audit row S9 has been corrected.

- [x] **Step 6: Prepare commit (maintainer runs).** Message: `refactor(settings): share the flat field grid across settings panels`.

---

## Task 5: `.resetButton` → `Button`, and the last `.panelTitle`

**Files:**
- Modify: `.../settings/element/ElementSettingsPanel.tsx:100-110`
- Modify: `.../settings/element/ElementSettingsPanel.module.css`
- Modify: `.../settings/ScriptEditorSettingsPanel.module.css`
- Create: `.../settings/element/__reset-parity.browser.test.tsx` (temporary — deleted in Step 5)

**Interfaces:**
- Consumes: `Button` and `UndoIcon` from `@stagistic/ui`; `PanelHeader` from Task 2.
- Produces: nothing new.

- [x] **Step 1: Measure the current reset button** before replacing it. `.resetButton` is 40 lines of hand-rolled chrome (`--control-height-xs`, `--radius-full`, transparent background, `--font-size-xs`, 13px icon); `Button` may or may not reproduce it.

```tsx
// packages/app-routes/src/routes/script/editor/settings/element/__reset-parity.browser.test.tsx
import {render} from 'vitest-browser-react';
import {test} from 'vitest';

test('reset button parity probe', async () => {
    const button = document.querySelector('[aria-label^="Reset"]') as HTMLElement;
    const style = getComputedStyle(button);
    const icon = button.querySelector('svg') as SVGElement;

    throw new Error(JSON.stringify({
        rect: button.getBoundingClientRect(),
        height: style.height,
        padding: style.padding,
        radius: style.borderRadius,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        color: style.color,
        background: style.backgroundColor,
        border: style.border,
        gap: style.gap,
        icon: icon.getBoundingClientRect(),
    }, null, 2));
});
```

  Render `ElementSettingsPanel` above the assertion with whatever fixture the existing `ScriptEditorSettingsPanel.test.tsx` uses; copy its props verbatim rather than inventing one.

**Divergence from the plan (Steps 2–4): the `Button` swap is NOT adopted.** S11 approved it only on
condition that measurement proves parity. It does not. `Button`'s `size` union is `'icon' | 'sm' | 'md'`
— there is no `xs`, so the plan's `size="xs"` would not even typecheck — and its smallest real size is a
40px control against a 26px pill:

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

Reaching parity would require overriding min-height, padding, gap, font-size, colour, icon size, the
hover colour and border-colour, and the focus ring — nearly all of `.resetButton`, at
`.resetButton.resetButton` specificity to beat `.button.sm` (0-2-0). That is not a recomposition, so
the hand-rolled control stays and the difference is recorded in the audit as the S11 outcome.
Steps 3 and 4 are therefore N/A; Step 6 proceeded on its own. The original Step 2 text is kept below
for the record.

- [x] **Step 2: Replace the button.**

```tsx
<Button
    variant="outline"
    size="xs"
    className={elementStyles.resetButton}
    aria-label={`Reset ${blockLabel} settings to defaults`}
    onPress={() => onResetBlockSettings(blockType)}
>
    <UndoIcon aria-hidden="true" />
    <span>Reset</span>
</Button>
```

  **Check `Button`'s real API before writing this** — if it takes `onClick` rather than `onPress`, use `onClick`. Read `packages/ui/src/atoms/Button.tsx`; do not assume.

- [x] **Step 3: Reduce `.resetButton` to the difference only.** Delete every declaration `Button variant="outline" size="xs"` already provides; keep only what the probe proves is still needed (likely the pill radius and the 13px icon):

```css
/* Residual: the pill radius and icon size this one control needs on top of Button xs/outline. */
.resetButton {
    --button-radius: var(--radius-full);

    & svg {
        width: calc(13px * var(--size-scale));
        height: calc(13px * var(--size-scale));
    }
}
```

  If `Button` has no `--button-radius` hook, add one to `Button.module.css` rather than overriding `border-radius` from the route — a route must not out-specify a component by accident (the step-3 cascade lesson).

- [x] **Step 4: Re-run the probe and diff.** Every measured value must match Step 1's output, or the difference goes in the delta table as a new row and waits for a ruling. Do not accept a silent change.

- [x] **Step 5: Delete the probe.**

```bash
rm packages/app-routes/src/routes/script/editor/settings/element/__reset-parity.browser.test.tsx
```

**Step 6 verified by measurement.** The local `<h3 class="panelTitle">` and `PanelHeader level={3}`
render identically inside the flex header row: heading x 0 / w 58.03 / h 25 / 19.44px / weight 600 /
margin 0, reset button at x 1211.42 / w 68.58 / h 25.91, row height 25.91 — and `PanelHeader`'s grid
wrapper collapses exactly onto the heading, adding no box of its own.

- [x] **Step 6: Move the element panel heading to `PanelHeader`** now that the button beside it is a `Button`:

```tsx
<div className={elementStyles.panelHeader}>
    <PanelHeader level={3} title={blockLabel} />
    <Button …>…</Button>
</div>
```

  Then delete `.panelTitle` from `ScriptEditorSettingsPanel.module.css` — it now has zero references. Confirm:

```bash
grep -rn "panelStyles.panelTitle\|styles.panelTitle" packages/app-routes/src
```
Expected: no output.

- [x] **Step 7: Typecheck + lint + tests.**

```bash
pnpm -w exec tsc -b
pnpm -w exec eslint --fix packages/app-routes/src/routes/script/editor/settings
pnpm -w exec stylelint --fix "packages/app-routes/src/routes/script/editor/settings/**/*.css"
cd packages/app-routes && pnpm exec vp test run -c vitest.browser.config.ts src/routes/script/editor/settings
```

- [x] **Step 8: Prepare commit (maintainer runs).** Message retitled, since the reset control was not adopted: `refactor(settings): compose the element panel heading from PanelHeader`.

---

## Task 6: Danger zone + residue close-out

**Files:**
- Modify: `.../settings/danger-zone/DangerZoneSettingsPanel.{tsx,module.css}`
- Modify: `docs/design/route-composition-audit-2026-09-01.md`
- Modify: this plan file (tick the boxes)

**Interfaces:**
- Consumes: `PanelHeader` from Task 2.
- Produces: nothing.

- [x] **Step 1: Compose the danger header.** Per the S12 ruling, the danger red stays. `.dangerHeader`/`.dangerTitle`/`.dangerDescription` are structurally `PanelHeader` with a colour override, so:

```tsx
<SettingsGroup gap="2xl" className={panelStyles.panelTokens}>
    <PanelHeader level={3} title="Danger zone" />
    <section className={styles.dangerCard}>
        <PanelHeader
            level={4}
            className={styles.dangerHeader}
            title="Delete script"
            description={(
                <>
                    Permanently deletes
                    {scriptTitle ? <strong>{` “${scriptTitle}” `}</strong> : ' this script '}
                    and all of its content. This action cannot be undone.
                </>
            )}
        />
        <DeleteScriptConfirm … />
    </section>
</SettingsGroup>
```

  **Copy is unchanged** — the same three text nodes in the same order, including the `<strong>` and its surrounding spaces. Verify character-for-character against the current file before committing.

- [x] **Step 2: Reduce the danger CSS to the deltas.** `PanelHeader` supplies the layout and the description colour; only the size, weight and danger colour of the sub-heading remain:

```css
.dangerCard {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
}

/* PanelHeader's default gap is --space-md; this header sits tighter. */
.dangerHeader {
    gap: var(--space-xs);

    & h4 {
        font-size: var(--font-size-lg);
        color: var(--color-status-danger);
    }
}
```

  Note `PanelHeader` styles its title at `--font-size-2xl`, so the `h4` override is required, not optional. Measure it: the visible size must stay `--font-size-lg`.

**Steps 1–2 verified by measurement.** Before and after are identical: section y 46.59 / h 158.02 /
gap 12.96px; header y 46.59 / h 41.16 / gap 2.16px (`display` flex → grid, geometrically identical);
`h4` y 46.59 / h 21 / 16.2px / weight 600 / `oklch(.54 .1273 14.8)`; `p` y 69.75 / h 18 / 14.04px /
muted. The rendered inner HTML is byte-identical, `<strong>` and surrounding spaces included:
`<h4>Delete script</h4><p>Permanently deletes<strong> “My Script” </strong>and all of its content. This action cannot be undone.</p>`

The override is written `.dangerHeader.dangerHeader` rather than `.dangerHeader`, because the
single-class form ties with `PanelHeader`'s `.panelHeader` and would be decided by bundle order.

- [x] **Step 3: Full settings sweep.**

```bash
cd packages/app-routes
pnpm exec vp test run -c vitest.browser.config.ts
pnpm exec vp test run
```
Expected: only the two known pre-existing reds.

- [x] **Step 4: Grep for orphaned references** across every class this plan deleted:

```bash
grep -rnE "styles\.(panelStack|panelDescription|placeholderCard|fields|pageSettingsGrid|panelTitle)\b" packages/app-routes/src
```
Expected: no output. (`styles.field`/`styles.label` will still appear for modules that legitimately keep their own — check each hit against the Task 1 residue list rather than deleting blindly.)

- [x] **Step 5: Update the audit doc** — mark S1–S12 as implemented, correct any row the measurements contradicted, and move each module's surviving classes into the residue list with its one-line justification. Record explicitly that `shared.module.css`, `ElementPreview.module.css` and `ElementFormattingToolbar.module.css` were deferred to step 7 and why.

- [x] **Step 6: Tick this plan's checkboxes and report** to the maintainer: which classes stayed and why, any delta row the measurements added, the two pre-existing reds, and the five prepared commit messages. **Do not commit.**

---

## Self-review

- **Spec §9 step 4 coverage:** all nine named modules are touched — `header-footer` (Task 2 shell), `page-layout` (Tasks 2, 4), `document-info` (Tasks 2, 3), `ElementSettingsPanel` (Tasks 2, 5), `ScriptEditorSettingsPanel` (Tasks 2, 5), `visual-preferences` (Task 2), `danger-zone` (Tasks 2, 6), `initial-pages` (Tasks 2, 4), `ElementNumericControls` (already on `formControlStyles`; residue recorded in Task 1 Step 3). The spec's `SettingsGroup`/`SettingRow` framing is corrected under S4/S5 with an explicit gate.
- **No visual change without a row:** S1, S2, S10, S11, S12 are the only rulings that can move a pixel, and each is gated in Task 1 and measured in its implementing task.
- **Type consistency:** `SettingsGroup({children, className, gap})` and `PanelHeader({title, description, className, level})` are defined in Task 2 Step 3 and used with exactly those names in Tasks 2, 5 and 6. `--flat-grid-columns` is defined in Task 4 Step 1 and consumed in Step 3.
- **Known unknown, flagged rather than guessed:** `Button`'s handler prop (`onPress` vs `onClick`) and whether it exposes a radius hook — Task 5 Step 2 and Step 3 tell the implementer to read the source instead of assuming.
- **Test coverage is thin here** — only `ScriptEditorSettingsPanel.test.tsx` and `InitialPagesSettingsPanel.browser.test.tsx` exist for nine panels. That is why Tasks 2 and 5 carry measurement probes: they are the safety net the test suite does not provide.

## Remaining sequence (separate plans, per spec §9)

After this: **step 5** modals → `ModalDialog` (7) + notices → `Notice` (2); **step 6** editor sidebars — music + characters fully, structure shell-only, the risk step; **step 7** close-out, which inherits `shared.module.css`, `ElementPreview.module.css` and `ElementFormattingToolbar.module.css` from this plan's deferral.
