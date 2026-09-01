# Design System Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the layer-0 token boundary — classify and resolve every `--select-*` / `--segment-*` / `--bubble-menu-*` variable, fix the undeclared-variable bug they hide, and record the component contract rules — so later plans can build primitives on a clean foundation.

**Architecture:** Variables named after a component but read by other components are shared layer-0 tokens with a misleading name; they are renamed into `--control-*` and `--menu-*` and stay on `:root`. Variables read only by their own component move onto that component's root class. A node test enforces both outcomes and catches reads of undeclared variables.

**Tech Stack:** CSS Modules, CSS custom properties (OKLCH, relative color syntax), TypeScript, `vite-plus/test` (Vitest), stylelint, ESLint with `@stylistic/*`.

**Spec:** `docs/superpowers/specs/2026-08-25-design-system-consolidation-design.md`

This plan implements **spec steps 1–2 only**. Steps 3–8 are covered by three later plans (Primitives, Patterns, Editor), written after this plan's Task 1 gate is approved.

## Global Constraints

- **Never commit.** Per `AGENTS.md`: stage the change, print the proposed commit message, and stop. The maintainer commits. This applies to every "Commit" step below.
- **Canonical checks:** `npx tsc -b`; the lint check below; `pnpm test` (= `vp test run`); `pnpm --filter @stagistic/<pkg> test:browser`.
- **Do not run `pnpm lint` — it is broken in this workspace.** The script is `eslint . && stylelint "**/*.{css,scss}"`, but no `package.json` declares `eslint`, so `eslint .` dies with `sh: eslint: command not found` and the `&&` means **stylelint never runs either**. `eslint.config.js` exists and is valid; the only ESLint present is 8.57.1, vendored inside `@dvdevcz/eslint`'s own dependencies and therefore never linked into the root `.bin`. Run the two halves directly instead:
  ```bash
  # CSS
  npx --no-install stylelint "packages/**/*.css"
  # JS/TS — invoke the vendored binary by path
  ESLINT_USE_FLAT_CONFIG=true node node_modules/.pnpm/eslint@8.57.1_supports-color@7.2.0/node_modules/eslint/bin/eslint.js <paths>
  ```
  Both work. Expected noise: stylelint prints `DeprecationWarning: context.fix is being deprecated`; these are not findings.
- **ESLint has a large pre-existing baseline** — 285 errors + 1 warning across `packages/` alone (258 of them `--fix`-able), overwhelmingly `@stylistic/*`. Lint **only the files your task touches**, and compare against that baseline; a repo-wide count is meaningless as a pass/fail gate. Your task's own new or modified files must be clean.
- Do not install ESLint or edit `package.json` to repair `pnpm lint` — a dependency change belongs to the maintainer. Report the gap instead.
- `eslint --fix` **is** the formatter (its `@stylistic/*` rules). Do not run `vp lint` or `vp fmt` — oxlint/oxfmt are not used here. Never run `--fix` across the repo; it would rewrite 258 unrelated files.
- **Never mutate golden snapshots**, loosen assertions, or change a viewport to make a red go green.
- **The browser runner rewrites committed golden PNGs on disk by itself.** Observed twice during this plan: an app-routes run left a new untracked PNG under `__screenshots__/`, and an editor run overwrote a *committed* pagination golden. Neither was an agent editing a file deliberately — the runner did it. So after any `test:browser` run, always:
  ```bash
  git status --porcelain | grep -iE '\.png|__screenshots__'   # expect no output
  git checkout -- <any modified golden>                        # restore it
  rm -rf <any new untracked __screenshots__ dir>               # remove the artifact
  ```
  Never stage a PNG, and report every occurrence. Given this, do not run browser suites unless the task's own steps call for them.
- Never edit or commit `vite.config.js` — it is a gitignored compiled artifact.
- **Baseline discipline:** establish a baseline once with `git diff > /tmp/baseline.patch` then `git apply -R`, never `git stash` (the maintainer commits concurrently).
- `packages/editor` has known pre-existing browser-test failures (overlay viewport-fit, cueCaret off-by-one). Report them; do not fix, mask, or count them as regressions from this work.
- **`pnpm test` is flaky — never gate on a failure *count*.** Five runs of the identical tree produced 13, 13, 10, 14 and 13 failures. The failing set splits in two:
  - **Deterministic (8):** `packages/editor/src/editor/tiptap/scriptBlock/handlers/enter.test.ts > handleEnter > …` — all sub-millisecond, always failing. Genuinely pre-existing, tied to the `rewrite` WIP.
  - **Flaky tail (~5):** `packages/db/src/**` PGlite tests (`locations`, `sceneLocations`, `characterGroupReactiveSource`, `exampleBootstrapFlow`), `packages/app-routes/.../prepareExampleScriptDocument.test.ts`, and `apps/landing/test/index.test.ts`. These take 5-8 seconds each and time out under load; they come and go between runs.
    **Its membership churns too, not just its size** — a sixth run added
    `packages/db/src/repo/persist/persistDocumentDelta.music.test.ts > persist music > creates
    catalog entries for music restored from the document` and a different `sceneLocations` test,
    while `exampleBootstrapFlow` passed. Do not treat an unfamiliar name from `packages/db/**`,
    `prepareExampleScriptDocument`, or `apps/landing` as a regression on sight. Confirm it by
    running that package alone: `pnpm --filter @stagistic/db test` passes 122/122 every time.

  Compare failing test **names**, not counts:
  ```bash
  pnpm test 2>&1 | grep -E '^\s*FAIL' | sort -u
  ```
  None of these tests render CSS or read custom properties, so no task in this plan can affect them. A CSS-only task that reports a changed count has observed flake, not a regression. The real gate for these tasks is `pnpm --filter @stagistic/ui test` (deterministic, and it carries the undeclared-property guard), plus `tsc -b`, stylelint, and the browser suites.
- **Do not perform a blanket `--select-` rename.** `packages/ui/src/molecules/forms/Select.tsx:57` generates a CSS anchor name `--select-${id}` at runtime. Only the exact prefixes `--select-button-`, `--select-menu-`, `--select-icon-size`, `--select-chevron-size` are renamed, and only inside `.css` files.
- Test imports come from `vite-plus/test`, not `vitest`.
- Indentation in this repo is 4 spaces, in both CSS and TypeScript.

---

## Evidence this plan is built on

Collected 2026-08-25 against branch `rewrite`. Reproduce with:

```bash
for v in $(grep -oE '^\s*--(select|segment|bubble-menu)-[a-z-]+' packages/ui/styles/tokens.css | tr -d ' ' | sort -u); do
  readers=$(grep -rlE "var\(${v}[,)]" --include="*.css" packages apps 2>/dev/null \
    | grep -v node_modules | grep -v dist | grep -v 'styles/tokens.css' | tr '\n' ' ')
  echo "${v} :: ${readers:-NONE}"
done
```

| Group | Readers | Classification | Action |
|---|---|---|---|
| `--select-button-*` (11 vars) | Select, Input, InputTable, MultiComboBox, formControlStyles, EditorToolbar, SidebarPanelSelect, HeaderFooterSettingsPanel, ScriptAttributeManagerModal, export modules, AttributeManager List/Places/Characters panels (13 files) | shared trigger geometry, plus 3 override-only files | rename → `--control-trigger-*` |
| `--select-icon-size`, `--select-chevron-size` | Select, EditorToolbar, SidebarPanelSelect | shared | rename → `--control-icon-size`, `--control-chevron-size` |
| `--select-menu-*` (7 live vars + 1 dead) | Select, MultiComboBox, EditorToolbar, SidebarPanelSelect | shared menu surface | rename → `--menu-*` |
| `--select-menu-item-*` (9 vars) | Select, MultiComboBox, EditorToolbar, SidebarPanelSelect, ScriptSettingsModal, AttributeManagerModal / ListPanel / PlacesPanel / CharactersPanel | shared menu item | rename → `--menu-item-*` |
| `--select-menu-offset` | none | dead | delete |
| `--segment-*` (5 vars) | `packages/ui/src/layout/AppHeader.module.css` only | single consumer | scope into AppHeader's segmented-control class |
| `--bubble-menu-*` (9 vars) | MusicPill, EmptyEnterBlockChooserOverlay — both are bubble menus | honest shared pattern token | leave on `:root`; revisit in the Patterns plan |

**These are already an override API.** `--select-button-*` is not merely read by other
components — four of them re-declare it to retune a trigger they own:

- `packages/app-routes/src/routes/home/HomeRoute.module.css:169-173`
- `packages/app-routes/src/routes/script/editor/sidebar/SidebarPanelSelect.module.css:2-4`
- `packages/app-routes/src/routes/script/editor/settings/visual-preferences/VisualPreferencesSettingsPanel.module.css:13`
- `packages/ui/src/molecules/forms/FormSelect.module.css:2-11`

This settles the classification: the group is a published override surface with a
name that says "Select". The rename must therefore rewrite declarations and reads
alike, which a prefix `sed` does naturally.

**Seven reads of undeclared custom properties.** A `var()` with no fallback that
names an undeclared property makes the whole declaration *invalid at
computed-value time*: the property resolves to `unset`, not to the cascaded
value. Scanning all 116 stylesheets found seven such names, six of them
outside the `--select-*` set this plan was scoped around:

| Property | Read at | Effect today |
|---|---|---|
| `--select-menu-hover-bg` | `Select.module.css:76`, `EditorToolbar.module.css:158`, `SidebarPanelSelect.module.css:44` | open trigger loses its fill on hover |
| `--color-danger` | `HomeRoute.module.css:97` | destructive text inherits body colour |
| `--color-warning` | `MusicRangeOverlay.module.css:75` | warning text inherits body colour |
| `--color-link` | `ElementSettingsPanel.module.css:31` | none — sits in an unused fallback |
| `--font-weight-regular` | `EditorSidebar.module.css:18` | weight inherits instead of 400 |
| `--letter-spacing-wide` | `SidebarPanelSelect.module.css:26`, `AttributeManagerListPanel.module.css:101,172` | uppercase mono labels get no tracking |
| `--toolbar-toggle-width` | `EditorStatusBar.module.css:15` | status bar loses its three-column grid below 1200px |

Task 2 adds the test that finds these and fixes all seven. Five further
properties are read but never declared in CSS *by design* — they are set from
TypeScript inline styles (`--character-color`, `--editor-sidebar-width`,
`--left-sidebar-size`, `--right-sidebar-size`, `--music-pill-anchor`) and are
allowlisted rather than fixed.

---

### Task 1: Record the triage and normalization table

**Files:**
- Create: `docs/design/token-triage-2026-08-25.md`

**Interfaces:**
- Consumes: nothing.
- Produces: the approved variable classification and normalization decisions that Tasks 2–5 execute against. No code symbols.

This task ends at an approval gate. Tasks 2–6 do not start until the maintainer approves this document.

- [ ] **Step 1: Regenerate the reader map**

Run the reproduce command from "Evidence this plan is built on" above and save the output:

```bash
cd /Users/milanzitka/git/stagistic
for v in $(grep -oE '^\s*--(select|segment|bubble-menu)-[a-z-]+' packages/ui/styles/tokens.css | tr -d ' ' | sort -u); do
  readers=$(grep -rlE "var\(${v}[,)]" --include="*.css" packages apps 2>/dev/null \
    | grep -v node_modules | grep -v dist | grep -v 'styles/tokens.css' | tr '\n' ' ')
  echo "${v} :: ${readers:-NONE}"
done > /tmp/reader-map.txt
wc -l /tmp/reader-map.txt
```

Expected: 44 lines. If the count differs, the branch has moved — reconcile the table below against the new output before continuing, and note every difference in the document.

- [ ] **Step 2: Write the triage document**

Create `docs/design/token-triage-2026-08-25.md` with exactly this content:

````markdown
# Token triage — component-named variables on `:root`

**Date:** 2026-08-25
**Branch:** rewrite
**Spec:** `docs/superpowers/specs/2026-08-25-design-system-consolidation-design.md` §4.3

A variable declared on `:root` but named after one component is a shared token
with a misleading name as soon as a second component reads it. This document
classifies every such variable on evidence, and records the normalization
decisions that follow.

## Method

Each variable's readers were collected with:

```bash
grep -rlE "var\(--NAME[,)]" --include="*.css" packages apps \
  | grep -v node_modules | grep -v dist | grep -v 'styles/tokens.css'
```

A variable read by any component other than the one it is named after is
classified **shared**. A variable read only by its own component is
**single-consumer**. A variable read nowhere is **dead**.

## Classification

| Variable group | Count | Readers | Class | Target |
|---|---:|---|---|---|
| `--select-button-*` | 11 | Select, Input, InputTable, MultiComboBox, formControlStyles, EditorToolbar, SidebarPanelSelect, HeaderFooterSettingsPanel, ScriptAttributeManagerModal, export modules, AttributeManager List/Places/Characters panels (13 files) | shared | `--control-trigger-*` |
| `--select-icon-size` | 1 | Select, EditorToolbar | shared | `--control-icon-size` |
| `--select-chevron-size` | 1 | Select, EditorToolbar, SidebarPanelSelect | shared | `--control-chevron-size` |
| `--select-menu-*` (non-item) | 7 live, 1 dead | Select, MultiComboBox, EditorToolbar, SidebarPanelSelect | shared | `--menu-*` |
| `--select-menu-item-*` | 9 | Select, MultiComboBox, EditorToolbar, SidebarPanelSelect, ScriptSettingsModal, AttributeManager Modal/ListPanel/PlacesPanel/CharactersPanel | shared | `--menu-item-*` |
| `--select-menu-offset` | 1 | none | dead | delete |
| `--segment-*` | 5 | AppHeader only | single-consumer | scope into `AppHeader.module.css` |
| `--bubble-menu-*` | 9 | MusicPill, EmptyEnterBlockChooserOverlay — both are bubble menus | shared, honestly named | leave on `:root`; revisit in the Patterns plan |

`--bubble-menu-*` is deliberately kept. The rule forbids naming a shared token
after a component that is not its consumer; here both consumers *are* bubble
menus, so the name is accurate. It becomes a component contract when the bubble
menu is extracted as a pattern component.

## Already an override API

`--select-button-*` is re-declared outside `tokens.css` in four places, each
retuning a trigger the file owns:

| File | Overrides |
|---|---|
| `packages/app-routes/src/routes/home/HomeRoute.module.css:169-173` | height, padding-inline, font-size, bg, border-color |
| `.../sidebar/SidebarPanelSelect.module.css:2-4` | height, font-weight, radius |
| `.../visual-preferences/VisualPreferencesSettingsPanel.module.css:13` | height |
| `packages/ui/src/molecules/forms/FormSelect.module.css:2-11` | border-color, bg, height (md and lg) |

Three of these four — `HomeRoute`, `VisualPreferencesSettingsPanel` and
`FormSelect` — only declare the properties and never read them with `var()`,
so they are absent from the Readers column above by design. `SidebarPanelSelect`
does both. A rename must still touch all four, which is why Task 3 greps for
name occurrences (17 files) rather than for `var()` reads (13 files).

The group is therefore a published override surface, not Select's private
business. That is the strongest argument for renaming rather than scoping it,
and it is the concrete case behind The Declared Surface Rule.

## Normalization decisions

Seven properties currently read a custom property that is declared nowhere. A
`var()` with no fallback that names an undeclared property makes the whole
declaration **invalid at computed-value time**: the property resolves to
`unset`, not to the cascaded value. Every row below is therefore a live defect,
not a tidy-up.

| # | Site | Reads | Effect today | Proposed | Visible |
|---|---|---|---|---|---|
| N1 | open select trigger `:hover`, 3 files | `--select-menu-hover-bg` | trigger loses its fill on hover while open | delete the `:hover` rule; the open trigger keeps `var(--menu-bg)` | yes |
| N2 | `HomeRoute.module.css:97` | `--color-danger` | destructive text inherits body colour instead of red | `var(--color-status-danger)` | yes |
| N3 | `MusicRangeOverlay.module.css:75` | `--color-warning` | warning text inherits body colour instead of yellow | `var(--color-status-warning)` | yes |
| N4 | `ElementSettingsPanel.module.css:31` | `--color-link` in fallback position | none today — the primary `--color-focus-ring` is declared, so the fallback never evaluates | simplify to `var(--color-focus-ring)` | no |
| N5 | `EditorSidebar.module.css:18` | `--font-weight-regular` | weight inherits instead of 400 | `var(--font-weight-normal)` | yes |
| N6 | `SidebarPanelSelect.module.css:26`, `AttributeManagerListPanel.module.css:101,172` | `--letter-spacing-wide` | uppercase mono labels get no tracking at all | `var(--letter-spacing-sm)` (.02em) | yes |
| N7 | `EditorStatusBar.module.css:15`, inside `@media (max-width: 1199px)` | `--toolbar-toggle-width` | `grid-template-columns` collapses to `none` below 1200px; the status bar loses its three-column layout | declare `--toolbar-toggle-width: var(--control-height-md);` on `.statusBar` | yes, under 1200px |

**N1 detail.** Affected sites:

- `packages/ui/src/molecules/forms/Select.module.css:76`
- `packages/editor/src/editor/components/EditorToolbar.module.css:158`
- `packages/app-routes/src/routes/script/editor/sidebar/SidebarPanelSelect.module.css:44`

The alternative — declaring `--menu-hover-bg` and giving the open trigger a
distinct hover — was rejected under The One Mechanic Per State Rule: the open
state is already carried by the expanded menu, and a second mechanic on the
trigger duplicates it.

**N6 detail.** All three sites are small uppercase mono labels. `--letter-spacing-wide`
has never existed; the scale is `tight / normal / sm / md / lg / xl`. `md` (.05em)
was proposed on the grounds that the author wrote "wide". **Decided: `sm` (.02em)**,
because that is what every comparable uppercase label in the repo already uses and
consistency outranks the guessed intent of a name that never resolved.

**N7 detail.** `--toolbar-toggle-width` is read in exactly two places and set in
none: `EditorStatusBar.module.css:15` (no fallback — the defect) and
`useResponsiveScale.ts:25` (`var(--toolbar-toggle-width, 0px)` — has a fallback,
so it silently measures 0). The comment at `useResponsiveScale.ts:16` calls it "a
calc() expression"; that comment is not treated as evidence of intent, since it
may predate the code around it. **Decided: `var(--control-height-md)`**, giving the
toggle a square footprint matching the other toolbar controls.

## Runtime-injected properties

Five properties are legitimately declared from TypeScript inline styles rather
than in CSS. They are not defects and are allowlisted in the guard test:

| Property | Set at |
|---|---|
| `--character-color` | `EditorSidebar.tsx:101,126,163`, `CharacterColorControl.tsx:57`, `AttributeManagerCharacterDetail.tsx:193` |
| `--editor-sidebar-width` | `buildRootStyle.ts:37` |
| `--left-sidebar-size` | `buildRootStyle.ts:38` |
| `--right-sidebar-size` | `buildRootStyle.ts:39` |
| `--music-pill-anchor` | `MusicPill.tsx:200` |

`--toolbar-toggle-width` looks like a sixth but is not: nothing sets it. It is
N7.

## Out of scope here

Spacing, radius, and padding divergences across panels are not yet tabled. They
are collected in the Primitives plan, where `Panel` and `Stack` make the
divergence visible and the decision meaningful.
````

- [ ] **Step 3: Verify the document against the evidence**

```bash
cd /Users/milanzitka/git/stagistic
grep -c '^| ' docs/design/token-triage-2026-08-25.md
grep -rn --include="*.css" -- '--select-menu-hover-bg\s*:' packages apps | grep -v node_modules | grep -v dist
```

Expected: the second command prints nothing, confirming N1's premise that the variable is declared nowhere.

- [ ] **Step 4: Stage and propose the commit**

```bash
git add docs/design/token-triage-2026-08-25.md
```

Proposed message:

```
docs: classify component-named tokens and record normalization decisions N1-N7
```

Do not commit. Report to the maintainer and stop for approval.

**APPROVAL GATE — Tasks 2–6 do not begin until the maintainer approves this document.**

---

### Task 2: Guard test for undeclared custom properties, and fix N1–N7

**Files:**
- Create: `packages/ui/src/tokens.test.ts`
- Modify: `packages/ui/src/molecules/forms/Select.module.css:74-78` (N1)
- Modify: `packages/editor/src/editor/components/EditorToolbar.module.css:156-160` (N1)
- Modify: `packages/app-routes/src/routes/script/editor/sidebar/SidebarPanelSelect.module.css:42-46` (N1), `:26` (N6)
- Modify: `packages/app-routes/src/routes/home/HomeRoute.module.css:97` (N2)
- Modify: `packages/editor/src/editor/components/musicRange/MusicRangeOverlay.module.css:75` (N3)
- Modify: `packages/app-routes/src/routes/script/editor/settings/element/ElementSettingsPanel.module.css:31` (N4)
- Modify: `packages/ui/src/editor-panels/EditorSidebar.module.css:18` (N5)
- Modify: `packages/ui/src/dialogs/AttributeManagerListPanel.module.css:101,172` (N6)
- Modify: `packages/editor/src/editor/components/editorShell/EditorStatusBar.module.css:1-17` (N7)

**Interfaces:**
- Consumes: normalization decisions N1–N7 and the runtime-injected allowlist from Task 1.
- Produces: `packages/ui/src/tokens.test.ts`, exporting nothing but defining at module scope the helper `collectCssFiles(dir: string): string[]`, the constants `DECLARATION: RegExp`, `USAGE: RegExp`, `RUNTIME_INJECTED: ReadonlySet<string>`, `repoRoot: string`, and `sources: {path: string, text: string}[]`. Task 5 adds a fourth test to this same file and reuses `DECLARATION`, `repoRoot` and `readFileSync`.

The test is written first and must fail with **exactly** the seven names below. Any extra name is a defect this plan has not triaged: stop, report it, and get a normalization row for it before continuing.

- [ ] **Step 1: Write the failing test**

Create `packages/ui/src/tokens.test.ts`:

```ts
import {readdirSync, readFileSync} from 'node:fs';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {describe, expect, it} from 'vite-plus/test';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const CSS_ROOTS = [
    'packages/ui',
    'packages/app-routes',
    'packages/editor',
    'apps/web',
];

/*
 * Declared from a TypeScript inline style rather than in CSS, so no stylesheet
 * declares them and the undeclared-read check would flag them. Each entry has a verified
 * setter in a non-test .ts/.tsx file; see docs/design/token-triage-2026-08-25.md.
 */
const RUNTIME_INJECTED: ReadonlySet<string> = new Set([
    '--character-color',
    '--editor-sidebar-width',
    '--left-sidebar-size',
    '--music-pill-anchor',
    '--right-sidebar-size',
]);

const collectCssFiles = (dir: string): string[] => {
    return readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
        if (entry.name === 'node_modules' || entry.name === 'dist') {
            return [];
        }

        const full = join(dir, entry.name);

        if (entry.isDirectory()) {
            return collectCssFiles(full);
        }

        return entry.name.endsWith('.css') ? [full] : [];
    });
};

const DECLARATION = /(?:^|[;{\s])(--[a-z0-9-]+)\s*:/gi;
const USAGE = /var\(\s*(--[a-z0-9-]+)\s*([,)])/g;

const sources = CSS_ROOTS
    .flatMap((root) => collectCssFiles(join(repoRoot, root)))
    .map((path) => ({
        path: relative(repoRoot, path),
        text: readFileSync(path, 'utf8'),
    }));

describe('css custom properties', () => {
    it('collects css from every in-scope package', () => {
        expect(sources.length).toBeGreaterThan(100);
    });

    it('never reads an undeclared custom property without a fallback', () => {
        const declared = new Set<string>(RUNTIME_INJECTED);

        for (const {text} of sources) {
            for (const match of text.matchAll(DECLARATION)) {
                declared.add(match[1]);
            }
        }

        const missing = new Set<string>();

        for (const {text} of sources) {
            for (const match of text.matchAll(USAGE)) {
                const [, name, terminator] = match;

                if (terminator === ',') {
                    continue;
                }

                if (!declared.has(name)) {
                    missing.add(name);
                }
            }
        }

        expect([...missing].sort()).toEqual([]);
    });
});
```

- [ ] **Step 2: Run the test to verify it fails with exactly the triaged set**

```bash
pnpm --filter @stagistic/ui test
```

Expected: FAIL on `never reads an undeclared custom property without a fallback`, with the received array being exactly:

```
[
  '--color-danger',
  '--color-link',
  '--color-warning',
  '--font-weight-regular',
  '--letter-spacing-wide',
  '--select-menu-hover-bg',
  '--toolbar-toggle-width',
]
```

If any other name appears, **stop and report it**. It is an untriaged defect of the same class and needs its own normalization row before being touched.

- [ ] **Step 3: Apply N1 — remove the three dead hover rules**

In `packages/ui/src/molecules/forms/Select.module.css`, delete the nested hover block so the expanded state reads:

```css
    &[aria-expanded = 'true'] {
        background: var(--select-menu-bg);
        border-color: var(--color-border);
        border-bottom-color: transparent;
        border-bottom-right-radius: 0;
        border-bottom-left-radius: 0;
    }
```

In `packages/editor/src/editor/components/EditorToolbar.module.css`, delete the same nested hover block, keeping the sibling `& .selectIcon { opacity: 1; }` rule that follows it.

In `packages/app-routes/src/routes/script/editor/sidebar/SidebarPanelSelect.module.css`, delete the `&:hover { background: var(--select-menu-hover-bg); }` block at line 44, keeping the surrounding expanded-state rule intact.

These three still name `--select-menu-bg`; Task 4 renames it. Do not rename it here.

- [ ] **Step 4: Apply N2–N5 — four single-line token corrections**

```bash
cd /Users/milanzitka/git/stagistic
sed -i '' 's/var(--color-danger)/var(--color-status-danger)/' \
  packages/app-routes/src/routes/home/HomeRoute.module.css
sed -i '' 's/var(--color-warning)/var(--color-status-warning)/' \
  packages/editor/src/editor/components/musicRange/MusicRangeOverlay.module.css
sed -i '' 's/var(--color-focus-ring, var(--color-link))/var(--color-focus-ring)/' \
  packages/app-routes/src/routes/script/editor/settings/element/ElementSettingsPanel.module.css
sed -i '' 's/var(--font-weight-regular)/var(--font-weight-normal)/' \
  packages/ui/src/editor-panels/EditorSidebar.module.css
```

- [ ] **Step 5: Apply N6 — the three uppercase-label tracking sites**

```bash
cd /Users/milanzitka/git/stagistic
sed -i '' 's/var(--letter-spacing-wide)/var(--letter-spacing-sm)/g' \
  packages/app-routes/src/routes/script/editor/sidebar/SidebarPanelSelect.module.css \
  packages/ui/src/dialogs/AttributeManagerListPanel.module.css
```

`sm` (.02em) is the approved value — it matches every comparable uppercase label in the repo. Do not substitute `md`.

- [ ] **Step 6: Apply N7 — declare the toolbar toggle width**

In `packages/editor/src/editor/components/editorShell/EditorStatusBar.module.css`, add the declaration to the top of the existing `.statusBar` block, above `display: grid;`:

```css
.statusBar {
    /* Read by the narrow-viewport grid below and probed by useResponsiveScale.
       Square footprint, matching the other toolbar controls. */
    --toolbar-toggle-width: var(--control-height-md);

    display: grid;
```

The `@media (max-width: 1199px)` rule that reads it needs no change.

- [ ] **Step 7: Run the test to verify it passes**

```bash
pnpm --filter @stagistic/ui test
```

Expected: PASS, both tests green.

- [ ] **Step 8: Run the full checks**

```bash
npx tsc -b
npx --no-install stylelint "packages/**/*.css"
pnpm test
pnpm --filter @stagistic/ui test:browser
pnpm --filter @stagistic/app-routes test:browser
pnpm --filter @stagistic/editor test:browser
```

Expected: green apart from the known pre-existing `packages/editor` failures (overlay viewport-fit, cueCaret off-by-one). N2, N3, N5 and N6 change rendered colour, weight and tracking; if a screenshot snapshot moves, that is the fix landing — confirm the diff matches the approved row and report it rather than re-recording silently.

- [ ] **Step 9: Stage and propose the commit**

```bash
git add packages/ui/src/tokens.test.ts \
        packages/ui/src/molecules/forms/Select.module.css \
        packages/ui/src/editor-panels/EditorSidebar.module.css \
        packages/ui/src/dialogs/AttributeManagerListPanel.module.css \
        packages/editor/src/editor/components/EditorToolbar.module.css \
        packages/editor/src/editor/components/musicRange/MusicRangeOverlay.module.css \
        packages/editor/src/editor/components/editorShell/EditorStatusBar.module.css \
        packages/app-routes/src/routes/home/HomeRoute.module.css \
        packages/app-routes/src/routes/script/editor/sidebar/SidebarPanelSelect.module.css \
        packages/app-routes/src/routes/script/editor/settings/element/ElementSettingsPanel.module.css
```

Proposed message:

```
fix: repair seven reads of undeclared custom properties

A var() with no fallback naming an undeclared property makes the whole
declaration invalid at computed-value time, so the property silently
resolves to unset. Seven such reads had accumulated:

- open select triggers lost their fill on hover (3 files)
- destructive text on the home route inherited body colour
- warning text in the music range overlay inherited body colour
- the editor sidebar label inherited its weight instead of 400
- three uppercase mono labels rendered with no tracking
- the status bar lost its three-column grid below 1200px

Adds a test that fails on any such read, with an allowlist for the five
properties legitimately set from TypeScript inline styles.
```

Do not commit. Report to the maintainer.

---

### Task 3: Rename shared trigger geometry to `--control-*`

**Files:**
- Modify: `packages/ui/styles/tokens.css:232-247` (the `--select-button-*`, `--select-icon-size`, `--select-chevron-size` declarations)
- Modify: every `.css` file reading those names — enumerated by the command in Step 1

**Interfaces:**
- Consumes: the classification in Task 1.
- Produces: layer-0 token names `--control-trigger-height`, `--control-trigger-padding-inline`, `--control-trigger-gap`, `--control-trigger-font-size`, `--control-trigger-font-weight`, `--control-trigger-color`, `--control-trigger-bg`, `--control-trigger-hover-bg`, `--control-trigger-border-color`, `--control-trigger-border-width`, `--control-trigger-radius`, `--control-icon-size`, `--control-chevron-size`. Tasks 4 and 5 and all later plans use these names.

- [ ] **Step 1: Record the file set before changing anything**

```bash
cd /Users/milanzitka/git/stagistic
grep -rlE -- '--select-(button-|icon-size|chevron-size)' --include='*.css' packages apps \
  | grep -v node_modules | grep -v dist | sort | tee /tmp/control-rename-files.txt
wc -l < /tmp/control-rename-files.txt
```

Expected: 17 files, including `packages/ui/styles/tokens.css`.

- [ ] **Step 2: Confirm no TypeScript file references these names**

```bash
grep -rn --include="*.tsx" --include="*.ts" -E -- '--select-(button-|icon-size|chevron-size)' packages apps \
  | grep -v node_modules | grep -v dist || echo "clean"
```

Expected: `clean`. The only TS occurrence of `--select-` is the runtime anchor name in `packages/ui/src/molecules/forms/Select.tsx:57`, which uses neither prefix and must not be touched.

- [ ] **Step 3: Apply the rename**

```bash
cd /Users/milanzitka/git/stagistic
sed -i '' \
  -e 's/--select-button-/--control-trigger-/g' \
  -e 's/--select-icon-size/--control-icon-size/g' \
  -e 's/--select-chevron-size/--control-chevron-size/g' \
  $(cat /tmp/control-rename-files.txt)
```

- [ ] **Step 4: Verify no old name survives and no new name is undeclared**

```bash
grep -rn -- '--select-button-\|--select-icon-size\|--select-chevron-size' --include='*.css' packages apps 2>/dev/null \
  | grep -v node_modules | grep -v dist || echo "no old names remain"
grep -c -- '--control-trigger-' packages/ui/styles/tokens.css
grep -rnE --include='*.css' '^\s*--control-trigger-[a-z-]+\s*:' packages apps 2>/dev/null \
  | grep -v node_modules | grep -v dist | grep -v 'styles/tokens.css' | wc -l
```

Expected: `no old names remain`; a non-zero count in `tokens.css`, confirming the `:root` declarations were renamed and not only the reads; and 13 override declarations across the four files listed in the Evidence section, confirming the override API was carried over intact.

- [ ] **Step 5: Run the checks**

```bash
pnpm --filter @stagistic/ui test
npx tsc -b
npx --no-install stylelint "packages/**/*.css"
pnpm --filter @stagistic/ui test:browser
pnpm --filter @stagistic/app-routes test:browser
```

Expected: all green. The undeclared-variable test from Task 2 is the real guard here — it fails if any read was renamed without its declaration, or vice versa.

- [ ] **Step 6: Stage and propose the commit**

```bash
git add $(cat /tmp/control-rename-files.txt)
```

Proposed message:

```
refactor: rename --select-button-* to --control-trigger-*

These are read by Input, InputTable, MultiComboBox, EditorToolbar and
five dialog modules, not only by Select. They are shared trigger
geometry, so they get a name that says so and stay on :root.
```

Do not commit. Report to the maintainer.

---

### Task 4: Rename shared menu surface to `--menu-*` and drop the dead variable

**Files:**
- Modify: `packages/ui/styles/tokens.css` (the `--select-menu-*` declarations; delete `--select-menu-offset`)
- Modify: every `.css` file reading those names — enumerated by the command in Step 1

**Interfaces:**
- Consumes: the classification in Task 1; the `--control-*` names from Task 3 are already in place and are not touched here.
- Produces: layer-0 token names `--menu-bg`, `--menu-border`, `--menu-radius`, `--menu-shadow`, `--menu-padding`, `--menu-max-height`, `--menu-z-index`, and `--menu-item-min-height`, `--menu-item-padding`, `--menu-item-gap`, `--menu-item-font-size`, `--menu-item-color`, `--menu-item-radius`, `--menu-item-hover-bg`, `--menu-item-active-bg`, `--menu-item-active-font-weight`. Later plans use these names.

- [ ] **Step 1: Record the file set**

```bash
cd /Users/milanzitka/git/stagistic
grep -rl -- '--select-menu-' --include='*.css' packages apps \
  | grep -v node_modules | grep -v dist | sort | tee /tmp/menu-rename-files.txt
wc -l < /tmp/menu-rename-files.txt
```

Expected: 10 files, including `packages/ui/styles/tokens.css`.

- [ ] **Step 2: Delete the dead variable**

In `packages/ui/styles/tokens.css`, delete the single line:

```css
    --select-menu-offset: 0;
```

Confirm it is read nowhere first:

```bash
grep -rn -- '--select-menu-offset' --include='*.css' --include='*.ts' --include='*.tsx' packages apps \
  | grep -v node_modules | grep -v dist
```

Expected: exactly one line, the declaration in `tokens.css`. If a read appears, stop — the variable is not dead and needs a normalization row.

- [ ] **Step 3: Apply the rename, longest prefix first**

Order matters: `--select-menu-item-` must be rewritten before `--select-menu-`, otherwise the item variables get the wrong target name.

```bash
cd /Users/milanzitka/git/stagistic
sed -i '' \
  -e 's/--select-menu-item-/--menu-item-/g' \
  -e 's/--select-menu-/--menu-/g' \
  $(cat /tmp/menu-rename-files.txt)
```

- [ ] **Step 4: Verify**

```bash
grep -rn -- '--select-menu' --include='*.css' packages apps \
  | grep -v node_modules | grep -v dist || echo "no old names remain"
grep -rn -- '--menu-item-item-\|--menu-menu-' --include='*.css' packages apps \
  | grep -v node_modules | grep -v dist || echo "no double-substitution"
```

Expected: `no old names remain` and `no double-substitution`.

- [ ] **Step 5: Run the checks**

```bash
pnpm --filter @stagistic/ui test
npx tsc -b
npx --no-install stylelint "packages/**/*.css"
pnpm --filter @stagistic/ui test:browser
pnpm --filter @stagistic/app-routes test:browser
pnpm --filter @stagistic/editor test:browser
```

Expected: all green apart from the known pre-existing `packages/editor` failures.

- [ ] **Step 6: Stage and propose the commit**

```bash
git add $(cat /tmp/menu-rename-files.txt)
```

Proposed message:

```
refactor: rename --select-menu-* to --menu-*, drop dead --select-menu-offset

The menu surface and item tokens are read by MultiComboBox,
EditorToolbar, SidebarPanelSelect and five dialog modules. They describe
a popover menu, not a Select. --select-menu-offset was read nowhere.
```

Do not commit. Report to the maintainer.

---

### Task 5: Scope `--segment-*` into AppHeader and lock the boundary

**Files:**
- Modify: `packages/ui/styles/tokens.css` (delete the `--segment-*` block, including its dark-theme overrides)
- Modify: `packages/ui/src/layout/AppHeader.module.css` (declare them on the segmented-control class)
- Modify: `packages/ui/src/tokens.test.ts` (add the boundary test)

**Interfaces:**
- Consumes: the `--control-*` and `--menu-*` names from Tasks 3 and 4.
- Produces: a third test in `packages/ui/src/tokens.test.ts` named `declares no :root variable named after a single component`, reusing the module-scope `DECLARATION` regex from Task 2.

- [ ] **Step 1: Locate the declarations and the consuming class**

```bash
cd /Users/milanzitka/git/stagistic
grep -n -- '--segment-' packages/ui/styles/tokens.css
grep -n -- '--segment-' packages/ui/src/layout/AppHeader.module.css
```

Record the light-theme block, the `:root[data-theme='dark']` overrides of `--segment-track-bg` and `--segment-active-bg`, and the class in `AppHeader.module.css` that reads them. That class is the new declaration site.

- [ ] **Step 2: Write the failing boundary test**

Append to the `describe('css custom properties', ...)` block in `packages/ui/src/tokens.test.ts`:

```ts
    it('declares no :root variable named after a single component', () => {
        const tokens = readFileSync(
            join(repoRoot, 'packages/ui/styles/tokens.css'),
            'utf8',
        );

        // --bubble-menu-* is deliberately allowed: both of its readers are
        // bubble menus, so the name describes the pattern rather than one
        // component. See docs/design/token-triage-2026-08-25.md.
        const offenders = [...tokens.matchAll(DECLARATION)]
            .map((match) => match[1])
            .filter((name) => /^--(select|segment)-/.test(name));

        expect(offenders).toEqual([]);
    });
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
pnpm --filter @stagistic/ui test
```

Expected: FAIL with a received array of seven entries — the five light-theme declarations (`--segment-track-bg`, `--segment-active-bg`, `--segment-active-shadow`, `--segment-hover-bg`, `--segment-active-hover-bg`) plus the two dark-theme re-declarations of `--segment-track-bg` and `--segment-active-bg`. The array is not deduplicated, so duplicates are expected. No `--select-*` name may appear: Tasks 3 and 4 removed them all from `tokens.css`, and if one is still listed, an earlier rename was incomplete.

- [ ] **Step 4: Move the declarations into the component**

Delete the `--segment-*` block from `:root` in `packages/ui/styles/tokens.css`, and delete the two `--segment-track-bg` / `--segment-active-bg` lines from the `:root[data-theme = 'dark']` block.

`.themeControls` (`AppHeader.module.css:359`) is the consuming class and already exists — add the declarations at the top of that existing block rather than creating a new one. Both themes must be preserved; the dark variant moves to a `:root[data-theme='dark']` descendant selector so the mechanic is unchanged:

```css
.themeControls {
    --segment-track-bg: var(--color-surface-raised);
    --segment-active-bg: var(--color-surface);
    --segment-active-shadow: var(--shadow-hairline);
    --segment-hover-bg: color-mix(in oklch, var(--color-text) 7%, var(--segment-track-bg));
    --segment-active-hover-bg: color-mix(in oklch, var(--color-text) 5%, var(--segment-active-bg));
}

:root[data-theme = 'dark'] .themeControls {
    /* The light pairing would seat the active pill at the popover's own
       lightness, reading as a hole rather than a raised segment. Dark keeps
       the mechanic and swaps the pair: track below the popover, pill well
       above it. */
    --segment-track-bg: var(--color-bg);
    --segment-active-bg: var(--color-surface-raised);
}
```

Carry the explanatory comment across from `tokens.css:332-333` rather than dropping it.

The two `color-mix` values must stay on the same element as `--segment-track-bg` and `--segment-active-bg`, not be split across the two selectors. `color-mix` resolves against the cascaded value on that element, so the dark override of the track feeds the hover value automatically — exactly as it does today on `:root`.

- [ ] **Step 5: Run the test to verify it passes**

```bash
pnpm --filter @stagistic/ui test
```

Expected: PASS, all three tests green. The undeclared-variable test proves the move did not orphan any read.

- [ ] **Step 6: Verify the theme switch visually in both themes**

```bash
pnpm --filter @stagistic/ui test:browser
npx tsc -b
npx --no-install stylelint "packages/**/*.css"
```

Expected: green. Screenshot snapshots for `AppHeader` must be unchanged — this task is a pure relocation with no approved normalization decision behind it. If a snapshot differs, the dark-theme selector is wrong; fix the selector rather than re-recording the snapshot.

- [ ] **Step 7: Stage and propose the commit**

```bash
git add packages/ui/styles/tokens.css \
        packages/ui/src/layout/AppHeader.module.css \
        packages/ui/src/tokens.test.ts
```

Proposed message:

```
refactor: scope --segment-* to the theme segmented control

AppHeader is its only reader, so these are a component contract rather
than design tokens. Adds a test asserting :root declares no variable
named after a single component.
```

Do not commit. Report to the maintainer.

---

### Task 6: Record the component contract rules in `DESIGN.md`

**Files:**
- Modify: `DESIGN.md` — insert a new `### The component contract` subsection and a `### Named rules` subsection at the start of `## 6. Components` (currently line 294), before `### Buttons` (line 296)

**Interfaces:**
- Consumes: the token namespaces established in Tasks 3–5 (`--control-*`, `--menu-*`).
- Produces: the written rules that later plans are reviewed against. No code symbols.

- [ ] **Step 1: Confirm the insertion point**

```bash
cd /Users/milanzitka/git/stagistic
grep -n '^## 6. Components' DESIGN.md
sed -n '294,300p' DESIGN.md
```

Expected: `## 6. Components` followed by `### Buttons`. Insert between them. No section renumbering is needed.

- [ ] **Step 2: Insert the subsections**

Insert immediately after the `## 6. Components` heading:

````markdown
### The component contract

Appearance is expressed three ways, in order of preference.

| Level | Use when | Written as |
|---|---|---|
| Variant prop | the appearance is a bounded, named set | `<Button variant="danger" size="sm">` |
| CSS variable | the value is genuinely per-instance | `<Panel style={{'--panel-pad': 'var(--space-xl)'}}>` |
| `className` | positioning by the parent only | `<Button className="col-span-2">` |

Components are organised in layers: tokens, then primitives (`Stack`, `Text`,
`Panel`, `Overlay`), then controls, then patterns, then routes.

### Named rules

**The Layer Dependency Rule.** Tokens, then primitives, then controls, then patterns, then routes. A layer may use tokens and the layers below it, never the layers above it. A primitive knows nothing about a script, a scene, or a character.

**The className Is Position Only Rule.** `className` on a control or a pattern may affect where the element sits in its parent—margin, grid or flex placement, width. It may never affect how the element looks—background, border, radius, padding, colour, typography. Those go through a variant or a declared variable. Utility class precedence is decided by the stylesheet, not by the attribute, so repainting through `className` is non-deterministic. Primitives are exempt: placement is what they are for.

**The Declared Surface Rule.** A component's overridable variables are published API: named, defaulted from tokens, listed in its type and in the catalog. Typically three to six. Everything else is internal and may change without notice.

**The Component Variables Are Scoped Rule.** A variable belonging to one component is declared on that component's own root class, not on `:root`. `:root` carries design tokens only. The corollary is a naming obligation: a variable on `:root` must not be named after a component, because the moment a second component reads it the name is a lie. Shared control and menu values live in `--control-*` and `--menu-*`.

**The Variant Before Override Rule.** If an appearance recurs, it is a variant with a name. A variable override is for a value that is genuinely per-instance. Three call sites overriding the same variable to the same value is a missing variant.

**The Routes Carry No CSS Rule.** A route composes components. If a route needs a style no component provides, that is a missing component or a missing variant, not a new `.module.css`. The exception is genuinely singular geometry, such as the export page schematic.
````

- [ ] **Step 3: Verify the document still parses as expected**

```bash
grep -nE '^#{2,3} ' DESIGN.md | sed -n '/## 6/,/## 7/p'
```

Expected: `## 6. Components`, `### The component contract`, `### Named rules`, `### Buttons`, `### Cards`, `### Inputs and form controls`, `### Tags`, `### App layout`, `### Signature component: Script Canvas`, then `## 7. Responsive Layout Contract`.

- [ ] **Step 4: Stage and propose the commit**

```bash
git add DESIGN.md
```

Proposed message:

```
docs: add the component contract and its named rules to DESIGN.md
```

Do not commit. Report to the maintainer.

---

## Definition of done

- `docs/design/token-triage-2026-08-25.md` exists and is approved.
- `packages/ui/src/tokens.test.ts` has three passing tests: source collection, no undeclared reads, no `--select-*` or `--segment-*` variable in `:root`.
- No `--select-button-*`, `--select-icon-size`, `--select-chevron-size`, `--select-menu-*`, or `--segment-*` appears anywhere; `--select-menu-offset` is gone.
- `--bubble-menu-*` remains on `:root`, with its rationale recorded in the triage document.
- All seven undeclared-property reads are repaired per N1–N7, and the guard test fails if an eighth appears.
- `DESIGN.md` §6 opens with the component contract and its six named rules.
- `npx tsc -b` green; `npx --no-install stylelint "packages/**/*.css"` clean; ESLint clean
  on every touched file, via the vendored-binary invocation in Global Constraints.
- `pnpm test` introduces no new failing test **names** against the baseline. Never gate on a
  failure count: the suite is flaky (13/13/10/14/13 across five runs of one tree). Compare with
  `pnpm test 2>&1 | grep -E '^\s*FAIL' | sort -u`. Browser tests likewise green apart from the
  pre-existing `packages/editor` failures.
- Every screenshot snapshot that moved is traceable to an approved row (N1, N2, N3, N5, N6, N7 change rendered output; N4 does not). No snapshot re-recorded without naming the row that justifies it.

## What this plan deliberately does not do

- No primitives (`Stack`, `Text`, `Panel`, `Overlay`) — Primitives plan.
- No `/dev/ui` catalog — Primitives plan.
- No route CSS removal — Patterns plan.
- No hardcoded-pixel tokenization — Editor plan.
- No UnoCSS — phase 2.
