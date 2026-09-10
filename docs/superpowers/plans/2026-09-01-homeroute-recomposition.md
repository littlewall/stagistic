# HomeRoute Recomposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recompose `HomeRoute` onto the phase-1 skeleton components (`ActionCard`, `ListPanel`/`ListRow`, `SearchInput`, `Skeleton`, `Notice`), deleting every part of `HomeRoute.module.css` that reimplements a shared pattern and leaving the route with layout + composition only.

**Architecture:** Pure recomposition — no behaviour, copy, or accessibility change. The start cards, script rows, search field, loading skeleton and empty/error/no-result notices each move from hand-rolled route CSS to a `@stagistic/ui` component. What remains in `HomeRoute.module.css` is genuinely-singular route *layout* (`.content`, `.library`, `.libraryTools`, `.listSection`, `.sortSelect`, responsive rules), marked for phase-2 UnoCSS.

**Tech Stack:** React 18, TypeScript, CSS Modules + OKLCH tokens, `vite-plus/test` browser tests (`test:browser`), pnpm monorepo.

**Spec:** `docs/superpowers/specs/2026-09-01-route-composition-and-css-elimination-design.md` (§5.4 is the HomeRoute decomposition table; §6 is the normalization discipline; §8.3 is the "no visual change" definition). The plan argues from this spec — read it too. The phase-1 audit it builds on: `docs/design/route-composition-audit-2026-09-01.md`.

## Global Constraints

Copied verbatim from the spec and the standing project rules. Every task's requirements implicitly include this section.

- **Pure recomposition** — no feature or behaviour change of any kind (spec §4). Same DOM semantics, same copy, same `aria-*`.
- **No visual change without an approved normalization row** (spec §6, §8.3). Anything found mid-implementation is *appended to the delta table and waits* — it is not unified on the spot. Screenshot/golden snapshots update only where an approved row accounts for the change.
- **Never commit or push.** Every "Prepare commit" step is prepare-only; the maintainer commits (`AGENTS.md`).
- **Never `git stash`** for a clean-tree baseline — use `git diff > patch` + `git apply -R` (commits land concurrently).
- **Canonical checks:** `pnpm -w exec tsc -b`; `eslint --fix` (IS the formatter — not `vp lint`/`vp fmt`); `stylelint --fix`; `vp test run` (node) and `test:browser` for `app-routes`. `vite.config.js` is a gitignored artifact — never edit/commit it.
- **`packages/editor` is untouched.** Not in scope here.
- **Mono font (`--font-family-mono`) is reserved exclusively for script content** — never introduce it here.
- **Do NOT mutate golden snapshots, loosen assertions, or change viewport to make a red go green.** A structural test-selector update is allowed *only* when the DOM structure genuinely changed under an approved recomposition, and must be called out explicitly with its justification.
- `app-routes` carries known pre-existing failing tests (phase-1 tracker) — reported, not fixed here, not counted as regressions.

---

## File map

- **Modify:** `packages/app-routes/src/routes/home/HomeRoute.tsx` — swap start-card markup for `ActionCard`; swap search field for `SearchInput`; swap loading block for `Skeleton`; swap empty/error/no-result text for `Notice`.
- **Modify:** `packages/app-routes/src/routes/home/ScriptListSection.tsx` — swap the hand-rolled `.scriptList`/`.scriptRow` for `ListPanel` + `ListRow size="library"`.
- **Modify:** `packages/app-routes/src/routes/home/HomeRoute.module.css` — delete every extracted rule; keep only residual layout, mark it `phase-2 Uno`.
- **Modify:** `packages/app-routes/src/routes/home/HomeRoute.browser.test.tsx` — update *only* the selectors whose target DOM node genuinely moved under an approved recomposition (icon-chip wrapper; row element). No assertion is weakened.
- **Possibly modify (Task 2, only if pre-flight rules it):** `packages/ui/src/molecules/ActionCard.module.css` — make `.icon` size its inner `<svg>` so real icons render at chip size (the catalog only exercised a text glyph).
- **Append:** `docs/design/route-composition-audit-2026-09-01.md` — the HomeRoute delta table (Task 1 deliverable).
- **Update:** `TODO.md` — progress checkboxes (this plan's section).

---

## Task 1: HomeRoute compatibility pre-flight + delta table — APPROVAL GATE

**Files:**
- Modify (append): `docs/design/route-composition-audit-2026-09-01.md`

**Interfaces:**
- Consumes: the shipped component APIs (`ActionCard`, `ListPanel`, `ListRow`, `SearchInput`, `Skeleton`, `Notice`) exactly as built in phase 1.
- Produces: an approved delta table that every later task obeys. No later task unifies a value not listed here.

This task writes nothing executable. It records every value the recomposition would change vs. today's `HomeRoute.module.css`, each with site + risk + proposed resolution, and stops for approval (spec §6). The concrete deltas the grounding already found — reproduce them in the table, do not re-derive:

| # | Delta | Today (route) | Component | Proposed resolution |
|---|---|---|---|---|
| H1 | Primary-card icon chip host | chip bg on the `<svg>` itself (`.startActionIcon`) | `ActionCard` chip bg on the `.icon` `<span>` wrapper, `<svg>` inside | Make `ActionCard .icon svg { width:100%; height:100%; display:block }` so the glyph fills the 20/28px slot; chip host moves span-ward. **Visual result identical.** Browser-test selector for icon bg updates from `svg` → icon wrapper (Task 2). |
| H2 | Row hover host | `.scriptRow` (flex wrapper, `button.parentElement`) | `ListRow` `.row` (grid; button lands in `.main`, so `button.parentElement` = `.main`) | Update the hover test to select the row element itself (`button.closest('[class*="row"]')` or the `[aria-label="Scripts"]` list's row child), not `button.parentElement`. Hover value (`--state-hover`) unchanged. |
| H3 | Error-state text colour | `<Text variant="muted">` | `Notice variant="error"` is `--color-status-danger` | **Ruling required.** Keep the muted body text as `<Text variant="muted">` and reserve `Notice variant="error"` only if we *intend* danger red. Default proposal: keep `Text variant="muted"` + `Button` inside a route error-layout wrapper; do **not** switch the copy to danger red (that would be an un-asked visual change). |
| H4 | Empty / no-result vertical padding | `.emptyLibrary` = `padding: 3xl 0`; `.noResults` = `padding: 5xl 0` | `Notice variant="empty"` has no padding (centered muted md text only) | Padding is route layout → keep a thin route wrapper (or `className` on `Notice`) carrying `3xl 0` / `5xl 0`, marked phase-2 Uno. Text treatment (centered, muted, md, pretty) matches `Notice empty` exactly. |
| H5 | Search icon inset + input left padding | icon `left: --space-xl`; input `padding-inline-start: 42px` | `SearchInput` icon `left: --space-lg`; input left `calc(--space-lg + 18px + --space-sm)` | Normalization row: home search adopts `SearchInput`'s own metric (already approved in the phase-1 audit as "SearchInput keeps its own 44/36 scale"). Confirm the icon-inset shift `xl→lg` is acceptable; if not, override `--search-icon-inset: var(--space-xl)` per-instance. |
| H6 | Skeleton stagger | `.skeletonRow:nth-child(2/3)` `animation-delay .1s/.2s` | `Skeleton` has no per-instance delay | Drop the stagger (three synchronized shimmer blocks) — it is a sub-perceptual detail with no approved row. If retained, it stays as a 2-line route residue on the skeleton wrapper, marked phase-2 Uno. **Proposed: drop.** |
| H7 | Script-row internals | `.scriptOpenButton` (grid `auto 1fr auto`, icon+info+meta) + `.actionsMenu` sibling | `ListRow size="library"` slots: open-button as row children (in `.main`), `ScriptActionsMenu` in `trailing` | Row shell geometry from `ListRow library` (58px, `--space-lg/--space-xl` padding); the open button keeps its own inner grid for icon/info/meta as row content. No metric change vs. today's `.scriptRow` height (58px) — confirm padding parity in the table. |

- [x] **Step 1: Append the delta table above to the audit doc** under a new `## HomeRoute recomposition — delta table (2026-09-01)` heading, filling the "risk" note for each row (H1/H2/H7 structural-only; H3/H4/H5 visual; H6 drop).

- [x] **Step 2: Confirm every remaining `HomeRoute.module.css` rule is either extracted or residual-layout.** List in the doc the classes that STAY (residual layout, phase-2 Uno): `.content`, `.startActions`/`.startActionsPopulated` (grid track counts), `.library`, `.libraryTools`, `.listSection`, `.sortSelect`, and the `@media (max-width: 720px)` block. Everything else is deleted by Tasks 2–5.

- [x] **Step 3: APPROVAL GATE.** Present the delta table (H1–H7) and the residual-layout list to the maintainer. Get explicit rulings on H3 (error colour), H5 (search icon inset), H6 (stagger). **Do not start Task 2 until approved.**

- [x] **Step 4: Prepare commit (maintainer runs).** Message: `docs(design): add HomeRoute recomposition delta table`.

---

## Task 2: Start cards → `ActionCard`

**Files:**
- Modify: `packages/app-routes/src/routes/home/HomeRoute.tsx:130-188` (the `.startActions` group)
- Modify: `packages/app-routes/src/routes/home/HomeRoute.browser.test.tsx` (H1 icon-bg selector, per approved delta)
- Modify (only if H1 ruled so): `packages/ui/src/molecules/ActionCard.module.css`
- Modify: `packages/app-routes/src/routes/home/HomeRoute.module.css` (delete `.startAction*` rules)

**Interfaces:**
- Consumes: `ActionCard` — `{ as?, variant?: 'default'|'primary', icon, title, description?, error?, className?, ...buttonProps }`. Default element is `<button>`; `variant="primary"` gives the ink-invert chip + `--color-border` edge. Its `.card` reproduces `.startAction` byte-for-byte (grid, gap, `--space-xl` pad, hover `translateY(-1px)` + `--color-border-strong` + `--shadow-hairline`, disabled wash, focus ring).
- Produces: three `ActionCard`s inside the existing `role="group" aria-label="Start a script"` container, preserving the `hasScripts`/`!hasScripts` variant logic and the 3-col→2-col grid.

- [x] **Step 1: Run the failing baseline.** Establish the current-green browser test set first so any regression is visible.

Run: `pnpm --filter @stagistic/app-routes exec vp test run --browser src/routes/home/HomeRoute.browser.test.tsx`
Expected: PASS (baseline before edits).

- [x] **Step 2: If H1 ruled "fix ActionCard icon sizing", make `.icon` size its svg.**

In `packages/ui/src/molecules/ActionCard.module.css`, add to the `.icon` rule:

```css
.icon > svg {
    width: 100%;
    height: 100%;
    display: block;
}
```

Then re-run the ActionCard unit test to confirm still green:
Run: `pnpm --filter @stagistic/ui exec vp test run src/molecules/ActionCard.test.tsx`
Expected: PASS.

- [x] **Step 3: Replace the start-card markup in `HomeRoute.tsx`.** Swap the three hand-rolled `<button className={styles.startAction}>` blocks for `ActionCard`. Keep icons, copy, handlers, disabled state and the primary/default logic identical:

```tsx
<div
    className={clsx(styles.startActions, hasScripts && styles.startActionsPopulated)}
    role="group"
    aria-label="Start a script"
>
    <ActionCard
        variant={hasScripts ? 'primary' : 'default'}
        icon={<PlusIcon aria-hidden="true" />}
        title="New script"
        description="Start with an empty theatre or musical script."
        onClick={openNewScript}
    />
    <ActionCard
        icon={<UploadIcon aria-hidden="true" />}
        title="Import script"
        description="Bring in an existing script file."
        onClick={openImportScript}
    />
    {!hasScripts ? (
        <ActionCard
            variant="primary"
            icon={<ScriptIcon aria-hidden="true" />}
            title="Create example script"
            description="Explore the editor with a pre-filled script."
            error={exampleError}
            disabled={isCreatingExample}
            onClick={() => void createExample()}
        />
    ) : null}
</div>
```

Remove the now-unused `clsx` start-card usage only if `clsx` is no longer referenced elsewhere in the file (it is still used on `styles.startActions`, so it stays). Drop the `Input`/`SearchIcon` etc. imports only in their own tasks.

- [x] **Step 4: Update the H1 icon-background assertion** in `expectSubtlePrimaryAction` (`HomeRoute.browser.test.tsx:127-145`). The chip background now lives on the icon wrapper `<span>`, not the `<svg>`. Read the wrapper instead — the parent of the svg:

```tsx
const primaryIcon = primary.querySelector('svg')?.parentElement;
const secondaryIcon = secondary.querySelector('svg')?.parentElement;
```

Leave every other assertion (bg equal, colour equal, border differs) untouched. This is the only structural update H1 permits; it does not weaken the check (still asserts the primary chip bg differs from the secondary's).

- [x] **Step 5: Delete the extracted rules** from `HomeRoute.module.css`: `.startAction`, `.startActionIcon`, `.startActionCopy`, `.startActionTitle`, `.startActionDescription`, `.startActionError`, `.startActionPrimary`. Keep `.startActions`/`.startActionsPopulated` (grid layout, residual).

- [x] **Step 6: Run the browser test.**

Run: `pnpm --filter @stagistic/app-routes exec vp test run --browser src/routes/home/HomeRoute.browser.test.tsx`
Expected: PASS — including `answers a start-card hover through its edge`, `prioritizes the example action`, and `prioritizes a new script and removes the example action`.

- [x] **Step 7: Typecheck + lint.**

Run: `pnpm -w exec tsc -b && pnpm exec eslint --fix packages/app-routes/src/routes/home/HomeRoute.tsx packages/app-routes/src/routes/home/HomeRoute.browser.test.tsx && pnpm exec stylelint --fix packages/app-routes/src/routes/home/HomeRoute.module.css packages/ui/src/molecules/ActionCard.module.css`
Expected: exit 0 (stylelint deprecation warnings are noise).

- [x] **Step 8: Prepare commit (maintainer runs).** Message: `refactor(home): compose start cards from ActionCard`.

---

## Task 3: Script list → `ListPanel` + `ListRow`

**Files:**
- Modify: `packages/app-routes/src/routes/home/ScriptListSection.tsx` (whole body)
- Modify: `packages/app-routes/src/routes/home/HomeRoute.browser.test.tsx` (H2 row selector)
- Modify: `packages/app-routes/src/routes/home/HomeRoute.module.css` (delete `.scriptList`/`.scriptRow`/`.scriptOpenButton`/`.scriptIcon`/`.scriptInfo`/`.scriptTitle`/`.scriptSubtitle`/`.scriptMeta`/`.actionsMenu`)

**Interfaces:**
- Consumes: `ListPanel` — `{ bordered?, inset?, ... }` (borders + overflow container). `ListRow` — `{ size?: 'compact'|'library', selected?, interactive?, leading?, trailing?, children }`; `library` gives 58px min-height + `--space-lg --space-xl` padding + `--space-lg` gap; `interactive` gives the `--state-hover` echo. Renders `.row > [.leading] .main .trailing`.
- Produces: `<section aria-label="Scripts">` containing a `ListPanel` of one `ListRow size="library" interactive` per script. Open button as row children (icon + info + meta), `ScriptActionsMenu` in `trailing`.

- [x] **Step 1: Rewrite `ScriptListSection.tsx`** onto `ListPanel`/`ListRow`. Preserve the `aria-label="Scripts"` section, the open-button semantics, the meta text and the actions menu:

```tsx
import type {ScriptSummary} from '@stagistic/app-core';
import {
    ListPanel,
    ListRow,
    ScriptActionsMenu,
    ScriptIcon,
    Text,
} from '@stagistic/ui';

import {formatLastEdited} from '../../utils/formatLastEdited';
import styles from './HomeRoute.module.css';

interface ScriptListSectionProps {
    scripts: ScriptSummary[],
    onOpenScript: (scriptId: string) => void,
    onDeleteScript: (script: ScriptSummary) => void,
    onRenameScript: (script: ScriptSummary) => void,
    onDuplicateScript: (script: ScriptSummary) => void,
}

export const ScriptListSection = ({
    scripts,
    onOpenScript,
    onDeleteScript,
    onRenameScript,
    onDuplicateScript,
}: ScriptListSectionProps) => {
    if (scripts.length === 0) {
        return null;
    }

    return (
        <section className={styles.listSection} aria-label="Scripts">
            <ListPanel>
                {scripts.map(script => (
                    <ListRow
                        key={script.id}
                        size="library"
                        interactive
                        className={styles.scriptRow}
                        trailing={(
                            <ScriptActionsMenu
                                scriptTitle={script.title}
                                onRename={() => onRenameScript(script)}
                                onDuplicate={() => onDuplicateScript(script)}
                                onDelete={() => onDeleteScript(script)}
                            />
                        )}
                    >
                        <button
                            type="button"
                            className={styles.scriptOpenButton}
                            onClick={() => onOpenScript(script.id)}
                        >
                            <ScriptIcon className={styles.scriptIcon} aria-hidden="true" />
                            <span className={styles.scriptInfo}>
                                <span className={styles.scriptTitle}>{script.title}</span>
                                {script.subtitle ? (
                                    <span className={styles.scriptSubtitle}>{script.subtitle}</span>
                                ) : null}
                            </span>
                            <Text variant="muted" size="sm" className={styles.scriptMeta}>
                                {formatLastEdited(script.updatedAt)}
                            </Text>
                        </button>
                    </ListRow>
                ))}
            </ListPanel>
        </section>
    );
};
```

Note: the row divider/border comes from `ListPanel`. Because `ListRow library` already carries `--space-lg --space-xl` padding, the open button must NOT restate it — reduce `.scriptOpenButton` to its inner grid (icon+info+meta, `auto 1fr auto`, gap `--space-lg`, focus ring) and drop its own padding. Keep `.scriptIcon`/`.scriptInfo`/`.scriptTitle`/`.scriptSubtitle`/`.scriptMeta` as row-content styling (they style route content, not a shared pattern — they stay, marked phase-2 Uno) OR fold into the row; per spec §5.4 the row *content* stays in the route, so keep these content classes and delete only `.scriptList`, `.scriptRow` (now `ListPanel`/`ListRow`) and `.actionsMenu` (now `trailing`).

- [x] **Step 2: Reduce `.scriptOpenButton`** in `HomeRoute.module.css` to remove the padding now owned by `ListRow` (keep the grid, gap, focus-visible inset ring). Delete `.scriptList`, `.scriptRow`, `.actionsMenu`.

  > **Done differently — measured.** Handing the inset to `ListRow` collapsed the open button from 61.6px to 19.4px tall (it shrink-wraps once it has no padding), i.e. a hit-area regression, which this plan forbids. `.scriptRow` and `.actionsMenu` therefore stay: the row zeroes `--list-row-padding`/`--list-row-gap` and stretches, the button keeps its own padding and `height: 100%`, the menu keeps its `margin-right`. `.scriptList` is deleted as planned. Measurement also surfaced a `ListRow` bug — its `auto 1fr auto` grid misplaced `.main`/`.trailing` when `leading` was omitted — fixed by switching the row to flex (audit row H15).

- [x] **Step 3: Update the H2 row-hover test** (`HomeRoute.browser.test.tsx:360-389`, `keeps a row hover well under a full surface-raised wash`). Replace `?.parentElement` row lookup with the actual row element:

```tsx
const row = (document.querySelector('[aria-label="Scripts"] button')
    ?.closest('[class*="row"]')) as HTMLElement;
```

Keep every assertion (hover bg ≠ resting, ≠ full wash, transform none). The `--state-hover` value is unchanged; only the element the state sits on moved (flex wrapper → grid row).

- [x] **Step 4: Run the browser test.**

Run: `pnpm --filter @stagistic/app-routes exec vp test run --browser src/routes/home/HomeRoute.browser.test.tsx`
Expected: PASS — including the row-hover test and `ignores hidden library tools…` (which reads `[aria-label="Scripts"] button` ordering — unchanged).

- [x] **Step 5: Typecheck + lint.**

Run: `pnpm -w exec tsc -b && pnpm exec eslint --fix packages/app-routes/src/routes/home/ScriptListSection.tsx packages/app-routes/src/routes/home/HomeRoute.browser.test.tsx && pnpm exec stylelint --fix packages/app-routes/src/routes/home/HomeRoute.module.css`
Expected: exit 0.

- [x] **Step 6: Prepare commit (maintainer runs).** Message: `refactor(home): compose script list from ListPanel + ListRow`.

---

## Task 4: Search + skeleton + notices → `SearchInput` / `Skeleton` / `Notice`

**Files:**
- Modify: `packages/app-routes/src/routes/home/HomeRoute.tsx` (search field 211-221; skeleton 190-197; error 198-204; empty 205-206; no-results 238-242)
- Modify: `packages/app-routes/src/routes/home/HomeRoute.module.css` (delete `.searchField`/`.searchIcon`/`.searchInput`, `.skeleton*`+`@keyframes shimmer`, and per H3/H4 reduce `.errorState`/`.emptyLibrary`/`.noResults` to residual layout only)

**Interfaces:**
- Consumes: `SearchInput` — `{ size?: 'sm'|'md', ...inputProps }` (renders `<div.field><SearchIcon/><input type="search"/></div>`, md = 44px). `Skeleton` — `{ shape?: 'line'|'block'|'circle', style?, ... }` (shimmer honouring reduced-motion; block = 58px, override height/radius via `--skeleton-h`/`--skeleton-radius`). `Notice` — `{ variant: 'warning'|'error'|'empty', children, className?, role? }` (`empty` = centered muted md; `error` = danger).
- Produces: the library search on `SearchInput` (`aria-label="Search scripts"`, keeps `input[type="search"]` for the tests); the loading block on `Skeleton`; the empty/no-result copy on `Notice variant="empty"`; the error state per the H3 ruling.

- [x] **Step 1: Replace the search field** (keep `aria-label="Search scripts"`, `input[type="search"]`, placeholder, value/onChange — the tests query `input[type="search"]`):

```tsx
<SearchInput
    value={query}
    aria-label="Search scripts"
    placeholder="Search by title or subtitle"
    onChange={event => setQuery(event.target.value)}
/>
```

Per H5, apply `className={styles.searchField}` only if the delta table kept a per-instance override (e.g. `--search-icon-inset: var(--space-xl)`); otherwise no className. Remove the `Input`, `SearchIcon` imports from `HomeRoute.tsx` if now unused (they are — verify).

- [x] **Step 2: Replace the loading skeleton** (44px search bar + three 58px rows; stagger dropped per H6):

```tsx
<div className={styles.skeleton} aria-label="Loading scripts">
    <Skeleton style={{'--skeleton-h': 'calc(44px * var(--size-scale))', '--skeleton-radius': 'var(--radius-full)'}} />
    <div className={styles.skeletonList}>
        <Skeleton shape="block" />
        <Skeleton shape="block" />
        <Skeleton shape="block" />
    </div>
</div>
```

Keep `.skeleton` (flex column gap) and `.skeletonList` (flex column gap) as residual layout; delete `.skeletonSearch`, `.skeletonRow`, and `@keyframes shimmer` (the shimmer now lives in `Skeleton`).

- [x] **Step 3: Replace empty + no-results** with `Notice variant="empty"`, keeping the vertical padding as a route wrapper class per H4:

```tsx
// empty library
<Notice variant="empty" className={styles.emptyLibrary}>No scripts yet.</Notice>

// no results
<Notice variant="empty" className={styles.noResults}>
    No scripts match “{query.trim()}”.
</Notice>
```

Reduce `.emptyLibrary` to `padding: var(--space-3xl) 0` and `.noResults` to `padding: var(--space-5xl) 0; text-align: center` (residual layout; `Notice empty` already centers, but `.noResults` centering is harmless and explicit) — mark both `phase-2 Uno`.

- [x] **Step 4: Recompose the error state** per the H3 ruling. Default (muted text kept, not danger):

```tsx
<div className={styles.errorState}>
    <Text variant="muted">Couldn&apos;t load your scripts.</Text>
    <Button variant="outline" onPress={() => void refreshScripts()}>Try again</Button>
</div>
```

i.e. leave the error state as-is (it is route layout + existing primitives, not a reimplemented pattern) unless H3 explicitly ruled to adopt `Notice variant="error"`. Keep `.errorState` as residual layout, marked `phase-2 Uno`.

- [x] **Step 5: Run the browser test.**

Run: `pnpm --filter @stagistic/app-routes exec vp test run --browser src/routes/home/HomeRoute.browser.test.tsx`
Expected: PASS — `shows library tools for five scripts` (`input[type="search"]` present), `ignores hidden library tools…` (types into `input[type="search"]`, sees `No scripts match`), `shows one script once without unnecessary library tools` (no `input[type="search"]`).

- [x] **Step 6: Typecheck + lint.**

Run: `pnpm -w exec tsc -b && pnpm exec eslint --fix packages/app-routes/src/routes/home/HomeRoute.tsx && pnpm exec stylelint --fix packages/app-routes/src/routes/home/HomeRoute.module.css`
Expected: exit 0.

- [x] **Step 7: Prepare commit (maintainer runs).** Message: `refactor(home): compose search, skeleton and notices from ui`.

---

## Task 5: Trim residual CSS + close-out

**Files:**
- Modify: `packages/app-routes/src/routes/home/HomeRoute.module.css` (final residual-only pass)
- Modify: `TODO.md`

**Interfaces:**
- Consumes: the emptied module from Tasks 2–4.
- Produces: a `HomeRoute.module.css` that contains only genuinely-singular route layout, each block headed by a `/* phase-2 Uno */` marker where it is route layout awaiting conversion.

- [x] **Step 1: Audit the residual module.** Confirm only these remain: `.content`, `.startActions`/`.startActionsPopulated`, `.library`, `.libraryTools`, `.searchField` (only if H5 kept it) — **not kept**; H5 was solved with `SearchInput` size variants instead, `.listSection`, `.sortSelect`, `.scriptOpenButton`+`.scriptIcon`+`.scriptInfo`+`.scriptTitle`+`.scriptSubtitle`+`.scriptMeta` (row content), `.skeleton`/`.skeletonList`, `.emptyLibrary`/`.noResults`/`.errorState`, and the `@media (max-width: 720px)` block. Every one is route layout or route content — none reimplements a shared pattern. Add a top-of-file comment: `/* Residual route layout + content — phase-2 UnoCSS target. No shared pattern remains. */`.

  > **Also kept:** `.scriptRow` + `.actionsMenu` (hit area, see Task 3 Step 2) and `.skeletonSearch` (the search bar's slot height/radius). Each is a route-specific override of a component custom property, not a reimplemented pattern.

- [x] **Step 2: Grep for orphaned `styles.*` references.**

Run: `grep -nE "styles\.(startAction|scriptList|scriptRow|actionsMenu|searchIcon|searchInput|skeletonSearch|skeletonRow)" packages/app-routes/src/routes/home/`
Expected: no matches (all extracted). Any hit is an incomplete deletion — fix it.

- [x] **Step 3: Full `app-routes` browser sweep.**

Run: `pnpm --filter @stagistic/app-routes exec vp test run --browser`
Expected: PASS except the known pre-existing reds recorded in the phase-1 tracker (report them, do not fix here; confirm none are HomeRoute).

- [x] **Step 4: Full node test + typecheck + lint sweep.**

Run: `pnpm -w exec tsc -b && pnpm --filter @stagistic/app-routes exec vp test run && pnpm --filter @stagistic/ui exec vp test run`
Expected: PASS.

- [x] **Step 5: Tick this plan's `TODO.md` section and report** the residual-module state (which classes stayed and why) to the maintainer for review + commit.

- [x] **Step 6: Prepare commit (maintainer runs).** Message: `refactor(home): reduce HomeRoute.module.css to residual layout`.

---

## Self-review

- **Spec §5.4 coverage:** `.startAction*`→ActionCard (Task 2) ✓; `.scriptList`+`.scriptRow`+`.scriptOpenButton`+`.scriptInfo`+`.scriptMeta`→ListPanel+ListRow (Task 3) ✓; `.searchField`/`.searchIcon`/`.searchInput`→SearchInput (Task 4) ✓; `.skeleton*`→Skeleton (Task 4) ✓; `.noResults`/`.emptyLibrary`→Notice empty (Task 4) ✓; `.errorState`→Notice error + Button (Task 4, per H3 ruling) ✓; `.sortSelect`→existing Select usage (unchanged, residual) ✓.
- **No visual change without a row:** every metric shift (H1–H7) is tabled and gated in Task 1.
- **Type consistency:** component prop names match the shipped phase-1 exports (verified against source, not assumed).
- **Behaviour preserved:** all existing `HomeRoute.browser.test.tsx` assertions kept; only H1/H2 selectors updated for genuinely-moved DOM nodes, with justification.

## Remaining Plan 2 sequence (separate plans, per spec §9)

This plan is step 3. After it: **step 4** settings panels → `SettingsGroup`/`SettingRow` (9 modules); **step 5** modals → `ModalDialog` (7) + notices → `Notice` (2); **step 6** editor sidebars — music + characters fully, structure shell-only (`SidebarShell` + `ListRow`), the risk step; **step 7** close-out (delete emptied modules, justify residuals, sync catalog + DESIGN.md). Each is authored as its own plan when reached.
