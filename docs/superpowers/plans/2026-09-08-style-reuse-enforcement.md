# Style Reuse Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the toolchain reject an invented value, so the ladder is held up by a failing build rather than by review.

**Architecture:** Four independent parts, in dependency order. First the stylelint configuration comes in-house from `@dvdevcz/stylelint`, provably rule-for-rule identical. Then the value guards go on and the 36 non-compliant declarations are resolved — 19 mechanically, 17 behind an approval gate because the ladder has no step for them. Then the route-module justification header stops being a convention and becomes a check, and the dead `phase-2 Uno` markers go with it. The reuse rules in `DESIGN.md` are already written; the close-out records them.

**Tech Stack:** pnpm 11 workspace, ESM (`"type": "module"`), stylelint 16.26.1 with `@stylistic/stylelint-plugin`, `@carlosjeurissen/stylelint-csstree-validator`, `stylelint-config-clean-order`, `stylelint-order`. CSS Modules with OKLCH tokens in `packages/ui/styles/tokens.css`.

**Spec:** `docs/superpowers/specs/2026-09-08-style-reuse-enforcement-design.md`

## Global Constraints

- **Never commit or push.** Every task ends by *preparing* a commit message; the maintainer commits. `AGENTS.md` golden rule (L5).
- **Never `git stash`** for a clean baseline — the maintainer commits concurrently in the same checkout. Use `git diff > /tmp/x.patch` then `git apply -R /tmp/x.patch`, always **from the repo root**; running `git apply` from a subdirectory silently applies only that subtree and exits 0. Verify with `git status --porcelain | wc -l` against an expected count, not the exit code.
- **Canonical checks**, all from `/Users/milanzitka/git/stagistic`:
  - `pnpm -w exec tsc -b`
  - `pnpm -w exec eslint --fix <paths>` — eslint **is** the formatter; do not run `vp lint` or `vp fmt`
  - `pnpm -w exec stylelint --fix <paths>`
  - node tests: `cd packages/<pkg> && pnpm exec vp test run`
  - browser tests: `cd packages/<pkg> && pnpm exec vp test run -c vitest.browser.config.ts`
- The Bash tool's working directory persists between calls. Use absolute paths or an explicit `cd`.
- **zsh does not word-split unquoted variables.** Build file lists as arrays (`FILES=("${(@f)$(...)}")`) or pass them literally. Quote grep include patterns.
- **Copy first, modernise second (spec D7).** Task 1 changes ownership and nothing else. No rule is added, removed or retuned in it — that would destroy the `--print-config` proof, which is this task's only safety net.
- **`vite.config.js` is a gitignored build artifact** — never edit or commit it.
- **Known pre-existing reds** — report, never "fix":
  - `packages/app-routes` node: `prepareExampleScriptDocument.test.ts > prepares the example source as a two-act musical with linked-ready characters`
  - `packages/app-routes` browser: `ScriptExportRoute.browser.test.tsx > export character filter > renders exact-kind character catalog rows only`
  - `packages/app-routes` browser, full-directory runs only: `useScriptEditorSettingsDraft.browser.test.tsx > retains toggle and formatting changes after failure and retries them together`
  - `packages/ui` browser, load-dependent flake: `useSaveIndicator.browser.test.tsx > shows slow saving and a full success confirmation after a delayed render`
  - `packages/editor` browser: `paginationGolden.browser.test.tsx > produces stable multi-page boundaries…` and `BlockActionMenu.browser.test.tsx > supports keyboard submenu navigation…`
- **Today's stylelint baseline: 129 CSS files, 0 problems.** Any task that ends with a non-zero count has either found something or broken something, and must say which.

---

## File Structure

**Created:**
- `stylelint/base.js` — the configuration inherited from `@dvdevcz/stylelint`, copied verbatim. Kept in its own file precisely so that "inherited, not yet reviewed" stays visually distinct from "ours", which is what makes the deferred modernisation tractable.
- `stylelint/guards.js` — the value rules this work adds. Small, ours, and the file a future reader should look at first.
- `scripts/check-route-css-headers.mjs` — fails if a route module has no opening justification comment.

**Modified:**
- `stylelint.config.js` — composes the two config halves; loses the inlined `csstree/validator` override, which moves into `base.js` where the rest of that rule lives.
- `package.json` — `@dvdevcz/stylelint` out, its four plugin dependencies in, `lint` script gains the header check.
- 19 CSS files in `packages/ui` and `packages/app-routes` (Task 2), then up to 17 more (Task 3).
- `packages/editor/src/editor/components/MusicSuggestionsOverlay.module.css` — the `csstree/validator` disable comment goes.
- 26 route `.module.css` files — the `phase-2 Uno` marker line.
- `DESIGN.md` — The Routes Carry No CSS Rule stops requiring the marker.
- `docs/design/route-composition-audit-2026-09-01.md` — normalization row and close-out.

---

### Task 1: Own the stylelint configuration

Ownership only. If this task changes what stylelint reports, it is wrong.

**Files:**
- Create: `stylelint/base.js`
- Modify: `stylelint.config.js`, `package.json`

**Interfaces:**
- Produces: `stylelint/base.js` default-exports a stylelint config object with `extends`, `plugins`, `ignoreFiles` and `rules`. `stylelint.config.js` composes it. Task 2 adds `stylelint/guards.js` alongside and merges its `rules` in.

- [ ] **Step 1: Snapshot the resolved config and the clean baseline**

```bash
cd /Users/milanzitka/git/stagistic
pnpm -w exec stylelint --print-config packages/ui/styles/tokens.css 2>/dev/null \
  | grep -v '^{"type":"message"' > /tmp/sl-config-before.json
pnpm -w exec stylelint "**/*.{css,scss}" --formatter json -o /tmp/sl-before.json >/dev/null 2>&1
python3 -c "
import json
c=json.load(open('/tmp/sl-config-before.json')); r=json.load(open('/tmp/sl-before.json'))
print('rules resolved:', len(c['rules']))
print('files linted:', len(r), '| problems:', sum(len(f['warnings']) for f in r))
"
```

Expected: `rules resolved: 128`, `files linted: 129 | problems: 0`. If either differs, stop — the baseline this task is measured against is not what the spec recorded.

- [ ] **Step 2: Copy the inherited config before removing the package**

The source is readable JavaScript. Copy it rather than transcribing it; transcription of 265 lines is how rules go missing.

```bash
cd /Users/milanzitka/git/stagistic
mkdir -p stylelint
cp node_modules/@dvdevcz/stylelint/dist/index.js stylelint/base.js
```

Order matters: the package is still installed at this point. Do not run `pnpm remove` first.

- [ ] **Step 3: Convert the copied file from CommonJS to ESM**

The repo is `"type": "module"`, so the two CJS lines must change. Nothing else in the file is touched.

At the top, replace:

```js
'use strict';

var stylelintConfigCleanOrder = require('stylelint-config-clean-order');
```

with:

```js
/*
 * Inherited verbatim from @dvdevcz/stylelint@0.1.0, which this repo no longer
 * depends on. Copied rather than rewritten so the move could be proved
 * rule-for-rule identical; nothing here has been reviewed for whether it still
 * earns its place. That review is scheduled separately — see §5 of
 * docs/superpowers/specs/2026-09-08-style-reuse-enforcement-design.md.
 */
import stylelintConfigCleanOrder from 'stylelint-config-clean-order';
```

`stylelint-config-clean-order` is CommonJS and attaches `propertyGroups` after assigning `module.exports`, so Node's named-export detection does not see it. The default import plus property access is the form that works; `import {propertyGroups} from '...'` would be `undefined` at runtime.

At the bottom, replace:

```js
module.exports = index;
```

with:

```js
export default index;
```

- [ ] **Step 4: Compose it from the root config**

`stylelint.config.js` becomes:

```js
import base from './stylelint/base.js';

export default {
    ...base,
    ignoreFiles: [...base.ignoreFiles, '**/dist/**'],
    rules: {
        ...base.rules,
        'csstree/validator': {
            properties: {
                content: '| attr( <custom-ident> )',
                width: '| <min()> | <max()> | <clamp()>',
                padding: '| <min()> | <max()> | <clamp()>',
                'font-size': '| <min()> | <max()> | <clamp()>',
            },
            ignoreProperties: [
                'composes',
                'scrollbar-width',
                'anchor-name',
                'position-anchor',
                'text-wrap',
            ],
            ignoreValue: '\\b(?:oklch|anchor|anchor-size)\\(',
        },
        'custom-property-empty-line-before': null,
    },
};
```

Two things changed shape and both must be preserved exactly. The old file used `extends: ['@dvdevcz/stylelint']`, so stylelint merged the package's `ignoreFiles` with the local one; spreading `base` replaces rather than merges, which is why `ignoreFiles` is concatenated by hand. And the local `csstree/validator` object previously overrode the package's whole rule — spreading `base.rules` first and then redeclaring the key reproduces that exactly.

- [ ] **Step 5: Swap the dependency**

```bash
cd /Users/milanzitka/git/stagistic
pnpm remove -w @dvdevcz/stylelint
pnpm add -w -D @carlosjeurissen/stylelint-csstree-validator@^3.3.1 \
                @stylistic/stylelint-plugin@^2.1.3 \
                stylelint-config-clean-order@^6.1.0 \
                stylelint-order@^6.0.4
```

These are the four dependencies the removed package declared, pinned to the versions currently resolved. No new software enters the repo.

- [ ] **Step 6: Prove the move changed nothing**

```bash
cd /Users/milanzitka/git/stagistic
pnpm -w exec stylelint --print-config packages/ui/styles/tokens.css 2>/dev/null \
  | grep -v '^{"type":"message"' > /tmp/sl-config-after.json
diff <(python3 -m json.tool --sort-keys /tmp/sl-config-before.json) \
     <(python3 -m json.tool --sort-keys /tmp/sl-config-after.json) && echo "IDENTICAL"
pnpm -w exec stylelint "**/*.{css,scss}" --formatter json -o /tmp/sl-after.json >/dev/null 2>&1
python3 -c "
import json; r=json.load(open('/tmp/sl-after.json'))
print('files linted:', len(r), '| problems:', sum(len(f['warnings']) for f in r))
"
```

Expected: `IDENTICAL`, then `files linted: 129 | problems: 0`.

The `diff` is the real check and it must be empty. A difference in `pluginFunctions` paths is the one acceptable exception — those are absolute paths into the store and will move when the package is removed; confirm by eye that nothing else differs. If a *rule* differs, the conversion lost something: fix it rather than accepting it.

- [ ] **Step 7: Prepare the commit message — do not commit**

```
build: own the stylelint configuration

@dvdevcz/stylelint was a 265-line config object holding 128 rules that decide
how this repo's CSS is allowed to look — including the ones about to enforce
the token ladder. That is a poor thing to rent.

Its config is copied verbatim into stylelint/base.js and its four plugin
dependencies are now named directly, so no new software enters the repo. The
repo had already begun forking it in practice: stylelint.config.js overrode the
whole csstree/validator block to teach it anchor positioning and oklch.

Copied rather than rewritten, and deliberately not reviewed in the same breath:
stylelint --print-config resolves to a byte-identical object before and after,
and the full run still reports 0 problems across 129 files. Whether every one
of those 128 rules still earns its place is a separate question with its own
work list in the spec — notably that the csstree plugin runs on css-tree 2.3.1
while stylelint itself now ships css-tree 3.x with the csstools syntax patches.
```

---

### Task 2: Turn on the value guards, resolve the 19 mechanical sites

**Files:**
- Create: `stylelint/guards.js`
- Modify: `stylelint.config.js`, `packages/editor/src/editor/components/MusicSuggestionsOverlay.module.css`, and the 19 CSS files in the table below

**Interfaces:**
- Consumes: `stylelint/base.js` from Task 1.
- Produces: `stylelint/guards.js` default-exports `{rules: {...}}`, merged into the root config after `base.rules`.

- [ ] **Step 1: Write the guards**

Create `stylelint/guards.js`:

```js
/*
 * The ladder is not a convention if nothing enforces it.
 *
 * The demand is "no absolute lengths", not "no units": px, rem and em are what
 * tokens.css exists to carry, while %, vw and ch are a different tool with no
 * ladder to violate. Expressing it as an allowed-list is what keeps
 * clamp(var(--space-sm), 1vw, var(--space-lg)) legal while padding: 5px is not.
 *
 * The rule reads inside calc(), which is deliberate: a raw 2px in
 * calc(var(--space-md) + 2px) is still an invented value.
 */
const RELATIVE = ['%', 'vw', 'vh', 'svh', 'dvh', 'svw', 'dvw', 'ch', 'fr'];

export default {
    rules: {
        'declaration-property-unit-allowed-list': {
            '/^padding/': RELATIVE,
            '/^margin/': RELATIVE,
            '/gap$/': RELATIVE,
            'font-size': RELATIVE,
            'border-radius': RELATIVE,
            inset: RELATIVE,
        },
        'color-no-hex': true,
    },
};
```

`color-no-hex` locks in a state that already holds — the two packages contain no hex at all — rather than forcing a migration.

- [ ] **Step 2: Merge the guards into the root config**

In `stylelint.config.js`, add the import and spread `guards.rules` after `base.rules` and after the `csstree/validator` override, so the guards win any overlap:

```js
import base from './stylelint/base.js';
import guards from './stylelint/guards.js';
```

```js
        'custom-property-empty-line-before': null,
        ...guards.rules,
    },
};
```

- [ ] **Step 3: Run it and confirm it finds exactly the expected 36**

```bash
cd /Users/milanzitka/git/stagistic
pnpm -w exec stylelint "**/*.{css,scss}" --formatter json -o /tmp/sl-guards.json >/dev/null 2>&1
python3 -c "
import json, collections
r=json.load(open('/tmp/sl-guards.json'))
w=[(f['source'].split('stagistic/')[-1], x['line'], x['rule']) for f in r for x in f['warnings']]
print('problems:', len(w))
print(collections.Counter(rule for _,_,rule in w))
"
```

Expected: 36 problems, all from `declaration-property-unit-allowed-list`, none from `color-no-hex`. A different number means the rule shape does not match the spec's measurement — investigate before editing any CSS.

- [ ] **Step 4: Fix the seven hairline offsets**

These overlap a hairline by one pixel. Granting `px` an exemption on offset properties would also readmit `margin-top: 12px`, so instead the idiom gets a name: `--space-px` already exists and is exactly `1px`.

| File:line | From | To |
| --- | --- | --- |
| `packages/app-routes/src/routes/script/editor/music/ScriptMusicSidebar.module.css:86` | `gap: 1px` | `gap: var(--space-px)` |
| `packages/app-routes/src/routes/script/export/ExportPreview.module.css:33` | `margin: -1px` | `margin: calc(var(--space-px) * -1)` |
| `packages/app-routes/src/routes/script/export/modules/modules.module.css:63` | `left: -1px` | `left: calc(var(--space-px) * -1)` |
| `packages/ui/src/dialogs/AttributeManagerCharactersPanel.module.css:40` | `bottom: -1px` | `bottom: calc(var(--space-px) * -1)` |
| `packages/ui/src/layout/header/ViewSwitcher.module.css:42` | `bottom: -1px` | `bottom: calc(var(--space-px) * -1)` |
| `packages/ui/src/molecules/forms/Select.module.css:174` | `margin-top: -1px` | `margin-top: calc(var(--space-px) * -1)` |
| `packages/ui/src/molecules/forms/Select.module.css:186` | `margin-bottom: -1px` | `margin-bottom: calc(var(--space-px) * -1)` |

- [ ] **Step 5: Fix the twelve sites that duplicate an existing token**

Every one of these writes a number the ladder already carries. `ToggleButtonGroup.module.css:3` writes `gap: 4px` next to a `--space-sm` that is 4px.

| File:line | From | To |
| --- | --- | --- |
| `packages/app-routes/…/attributes/MusicAttachmentPreviewModal.module.css:46` | `padding: 24px` | `padding: var(--space-3xl)` |
| `packages/app-routes/…/editor/music/ScriptMusicSidebar.module.css:37` | `gap: 2px` | `gap: var(--space-xs)` |
| `packages/app-routes/…/editor/structure/ScriptStructureSidebar.module.css:71` | `gap: 2px` | `gap: var(--space-xs)` |
| `packages/ui/src/atoms/RadioChoiceGroup.module.css:43` | `margin-top: 2px` | `margin-top: var(--space-xs)` |
| `packages/ui/src/atoms/Switch.module.css:41` | `padding: 2px` | `padding: var(--space-xs)` |
| `packages/ui/src/atoms/Tag.module.css:5` | `padding: 2px 8px` | `padding: var(--space-xs) var(--space-md)` |
| `packages/ui/src/dialogs/DuplicateScriptModal.module.css:33` | `gap: 2px` | `gap: var(--space-xs)` |
| `packages/ui/src/molecules/ToggleButtonGroup.module.css:3` | `gap: 4px` | `gap: var(--space-sm)` |
| `packages/ui/src/molecules/forms/InputTable.module.css:37` | `padding-top: 4px` | `padding-top: var(--space-sm)` |
| `packages/ui/src/molecules/forms/InputTable.module.css:121` | `right: 4px` | `right: var(--space-sm)` |
| `packages/ui/src/molecules/forms/InputTable.module.css:123` | `padding: 1px 4px` | `padding: var(--space-px) var(--space-sm)` |
| `packages/ui/src/molecules/forms/InputTable.module.css:141` | `margin-top: 2px` | `margin-top: var(--space-xs)` |

All nineteen substitutions are value-identical. Nothing may move.

- [ ] **Step 6: Retire the csstree disable comment**

The whole-number pixel pass added a `stylelint-disable-next-line csstree/validator` in `packages/editor/src/editor/components/MusicSuggestionsOverlay.module.css` because csstree's grammar for `max-height` rejects `min(320px, 50vh)`. The config already has the correct escape hatch for exactly this and merely lacks the entry.

In `stylelint.config.js`, add to the `csstree/validator` `properties` block:

```js
                'max-height': '| <min()> | <max()> | <clamp()>',
```

Then delete the disable comment and its explanatory block comment from `MusicSuggestionsOverlay.module.css`, leaving the declaration itself untouched.

- [ ] **Step 7: Confirm the count drops to exactly the 17 that need a ruling**

```bash
cd /Users/milanzitka/git/stagistic
pnpm -w exec stylelint "**/*.{css,scss}" --formatter json -o /tmp/sl-after2.json >/dev/null 2>&1
python3 -c "
import json
r=json.load(open('/tmp/sl-after2.json'))
w=[(f['source'].split('stagistic/')[-1], x['line'], x['text']) for f in r for x in f['warnings']]
print('remaining:', len(w))
for s,l,t in sorted(w): print(f'  {s}:{l}')
"
```

Expected: exactly 17, and the file:line list must match Task 3's table. Any other file appearing here is a site the spec's measurement missed — add it to Task 3's table rather than fixing it silently.

- [ ] **Step 8: Checks**

```bash
cd /Users/milanzitka/git/stagistic
pnpm -w exec tsc -b
```

Then node and browser suites for `ui`, `editor` and `app-routes`. All nineteen substitutions are value-identical, so no assertion may change. If one does, a substitution was wrong.

- [ ] **Step 9: Prepare the commit message — do not commit**

```
feat(lint): make the toolchain reject an invented value

Nothing in the toolchain objected when a new length was invented, so the token
ladder was held up by review, and review forgets. stylelint/guards.js closes
that: on padding, margin, gap, font-size, border-radius and inset the allowed
units are relative only, which rejects px, rem and em while leaving
clamp(var(--space-sm), 1vw, var(--space-lg)) and percentages alone. The rule
reads inside calc() too — a raw 2px in calc(var(--space-md) + 2px) is still an
invented value. Colour properties are untouched, so rgb(), hsla(), color-mix()
and oklch(from …) are unaffected; color-no-hex locks in a state that already
held.

Nineteen declarations are brought back onto the ladder. Twelve simply wrote a
number a token already carried — ToggleButtonGroup wrote gap: 4px next to a
--space-sm that is 4px. The other seven are the hairline-overlap idiom, which
gets a name instead of an exemption: calc(var(--space-px) * -1).

Also retires the csstree disable comment the pixel pass had to add for
max-height: min(320px, 50vh) — the shared config already had the escape hatch
for width, padding and font-size and just lacked the max-height entry.

Seventeen declarations remain and are deliberately left failing: they use
values the ladder has no step for, and they are the subject of the next commit.
```

---

### Task 3: Rule on the seventeen values the ladder does not carry — approval gate

**This task begins with a decision that is not the implementer's to make.** Do not edit CSS before the ruling.

**Files:**
- Modify: up to 17 CSS files (the table below), `docs/design/route-composition-audit-2026-09-01.md`

**Interfaces:**
- Consumes: the failing list from Task 2 Step 7, which must match this table exactly.

- [ ] **Step 1: Put the table to the maintainer and get a ruling**

Seventeen declarations use `5px` (7×), `6px` (6×), `3px` (4×), `7px` (1×) or `14px` (1×). The space ladder is `2 4 8 12 16 20 24 28 32 40 48`; the radius ladder is `4 6 8 10 12`.

| File:line | Declaration | Off-ladder |
| --- | --- | --- |
| `app-routes/…/settings/IndentRangeSlider.module.css:82` | `margin-top: 6px` | 6 |
| `app-routes/…/document-info/TitlePageSettingsPanel.module.css:31` | `gap: 6px` | 6 |
| `app-routes/…/document-info/TitlePageSettingsPanel.module.css:46` | `padding-bottom: 7px` | 7 |
| `app-routes/…/document-info/TitlePageSettingsPanel.module.css:52` | `padding: 4px 0 5px` | 5 |
| `app-routes/…/header-footer/HeaderFooterSettingsPanel.module.css:143` | `padding: 5px var(--space-lg)` | 5 |
| `app-routes/…/structure/ScriptStructureSidebar.module.css:29` | `padding-left: 14px` | 14 |
| `app-routes/…/structure/ScriptStructureSidebar.module.css:60` | `border-radius: 5px` | 5 |
| `app-routes/…/structure/ScriptStructureSidebar.module.css:172` | `border-radius: 3px` | 3 |
| `ui/src/dialogs/DeleteScriptConfirm.module.css:19` | `padding: 1px 6px` | 6 |
| `ui/src/editor-panels/EditorSidebar.module.css:334` | `padding: 5px var(--space-md)` | 5 |
| `ui/src/feedback/ToastProvider.module.css:46` | `margin-top: 5px` | 5 |
| `ui/src/molecules/ActionCard.module.css:99` | `padding: 5px` | 5 |
| `ui/src/molecules/ToggleButtonGroup.module.css:6` | `padding: 3px` | 3 |
| `ui/src/molecules/forms/InputTable.module.css:42` | `padding: 2px 5px` | 5 |
| `ui/src/molecules/forms/InputTable.module.css:142` | `padding: 3px 6px` | 3, 6 |
| `ui/src/molecules/forms/InputTable.module.css:166` | `padding: 3px 6px` | 3, 6 |
| `ui/src/molecules/forms/formControlStyles.module.css:21` | `gap: 6px` | 6 |

The three options, per value rather than per site, because the same number should not resolve two ways in one repo:

1. **Snap to the nearest ladder step.** `3 → 2 or 4`, `5 → 4`, `6 → 4 or 8` (radius `6` is already a step, so `border-radius: 5px → var(--radius-sm)` or `var(--radius-xs)`), `7 → 8`, `14 → 12 or 16`. A one-or-two-pixel visual change, covered by one approved normalization row for the whole set.
2. **Extend the ladder** if a value turns out to recur for a reason. `5px` appears seven times and `6px` six — that is worth a moment's thought rather than a reflex.
3. **Record a documented exception** where the value is genuinely singular, with a `stylelint-disable-next-line` carrying a one-line reason.

Present the table, recommend per value, and wait. Options 1 and 2 both change what ships and need the maintainer's word.

- [ ] **Step 2: Apply the ruling**

Apply exactly what was approved, one value at a time so the diff reads per decision rather than per file.

- [ ] **Step 3: Confirm the run is clean**

```bash
cd /Users/milanzitka/git/stagistic
pnpm -w exec stylelint "**/*.{css,scss}" --formatter json -o /tmp/sl-clean.json >/dev/null 2>&1
python3 -c "
import json; r=json.load(open('/tmp/sl-clean.json'))
print('files:', len(r), '| problems:', sum(len(f['warnings']) for f in r))
"
```

Expected: `files: 129 | problems: 0`. That number is the point of the whole task: from here on, an invented value fails the build.

- [ ] **Step 4: Record the normalization row**

Append to `docs/design/route-composition-audit-2026-09-01.md` a section listing every value that moved, its old and new figure, and the ruling that authorised it. Under option 3, record the exception and its reason instead.

- [ ] **Step 5: Checks**

`pnpm -w exec tsc -b`, then node and browser suites for all three packages. Snapping a value is a real visual change, so a test asserting one of these numbers is expected to fail and its expectation is updated — say which, and why, in the commit message.

- [ ] **Step 6: Prepare the commit message — do not commit**

Write it against the ruling actually given. It must name every value that moved and the row that authorised it.

---

### Task 4: The route-module header becomes a check

**Files:**
- Create: `scripts/check-route-css-headers.mjs`
- Modify: `package.json`, `DESIGN.md`, 26 route `.module.css` files

**Interfaces:**
- Produces: `pnpm lint` gains a third stage that exits non-zero when a route module has no opening comment.

- [ ] **Step 1: Write the check**

Create `scripts/check-route-css-headers.mjs`:

```js
/*
 * The Routes Carry No CSS Rule asks every surviving route module to open with
 * one line saying why it is singular. That was a convention nothing tested,
 * which is the same failure mode as the token ladder before the guards.
 */
import {globSync, readFileSync} from 'node:fs';

const files = globSync('packages/app-routes/src/**/*.module.css');
const offenders = files.filter(file => !readFileSync(file, 'utf8').trimStart().startsWith('/*'));

if (offenders.length > 0) {
    console.error('Route CSS modules must open with a comment saying why they are singular:');
    offenders.forEach(file => console.error(`  ${file}`));
    process.exit(1);
}

console.log(`${files.length} route CSS modules, all justified.`);
```

`fs.globSync` was verified against the installed Node (v24.19.0) while this plan was written: it exists and matches exactly 27 files.

- [ ] **Step 2: Run it against today's tree**

```bash
cd /Users/milanzitka/git/stagistic
node scripts/check-route-css-headers.mjs
```

Expected: `27 route CSS modules, all justified.` Every module already opens with a comment, including `PageLayoutSettingsPanel.module.css`, which has a justification but never had a marker.

- [ ] **Step 3: Prove it fails when it should**

```bash
cd /Users/milanzitka/git/stagistic
cp packages/app-routes/src/routes/script/settings/DraftSaveError.module.css /tmp/dse.bak
python3 - <<'EOF'
p='packages/app-routes/src/routes/script/settings/DraftSaveError.module.css'
s=open(p).read()
open(p,'w').write(s[s.index('*/')+3:].lstrip())
EOF
node scripts/check-route-css-headers.mjs; echo "exit=$?"
cp /tmp/dse.bak packages/app-routes/src/routes/script/settings/DraftSaveError.module.css
node scripts/check-route-css-headers.mjs
```

Expected: the middle run names `DraftSaveError.module.css` and exits 1; the last run is clean again. A check that has never been seen to fail is not a check.

- [ ] **Step 4: Wire it into `lint`**

In `package.json`:

```json
"lint": "eslint . && stylelint \"**/*.{css,scss}\" && node scripts/check-route-css-headers.mjs",
```

- [ ] **Step 5: Drop the dead markers**

Twenty-six route modules carry a `phase-2 Uno` line pointing at work the spec retired. Remove that line only — the justification above it stays.

```bash
cd /Users/milanzitka/git/stagistic
grep -rln 'phase-2 Uno' packages/app-routes/src --include='*.css' | wc -l   # expect 26
```

The line takes several shapes (` * phase-2 Uno.`, ` * phase-2 Uno: route layout.`, and trailing forms such as `… phase-2 Uno target.` inside a sentence). Delete whole lines where the line is only the marker; where the marker is a clause inside a sentence, remove the clause and leave the sentence reading naturally. Then:

```bash
grep -rn 'phase-2 Uno' packages apps docs/design DESIGN.md | grep -v 'route-composition-audit'
```

Expected: no output. The audit document keeps its historical mentions — it is a record of what was decided when, and rewriting it would be dishonest.

- [ ] **Step 6: Update the rule in the same commit**

In `DESIGN.md`, The Routes Carry No CSS Rule currently ends:

```
Every surviving route module opens with a comment saying in one line why it is singular and carrying a `phase-2 Uno` marker; a module without that header has not been justified and should not exist.
```

Replace with:

```
Every surviving route module opens with a comment saying in one line why it is singular; a module without that header has not been justified and should not exist, and `pnpm lint` enforces it.
```

Documentation and code change together, so the repo never describes a state it is not in.

- [ ] **Step 7: Checks**

```bash
cd /Users/milanzitka/git/stagistic
pnpm lint
```

Expected: eslint and stylelint as before, then `27 route CSS modules, all justified.`

- [ ] **Step 8: Prepare the commit message — do not commit**

```
feat(lint): enforce the route-module justification header

The Routes Carry No CSS Rule has asked since phase 1 that every surviving route
module open with one line saying why it is singular. Nothing tested it, which
is how PageLayoutSettingsPanel ended up as the only one of twenty-seven with a
justification but no marker — a difference no one noticed because no one could.
pnpm lint now checks the justification, which is the durable half.

The marker itself goes. `phase-2 Uno` pointed at a UnoCSS migration that has
since been retired in favour of enforcing the ladder directly, so twenty-six
modules were carrying a signpost to nowhere. DESIGN.md's rule is updated in the
same commit so the documentation never describes a state the code is not in.
The route-composition audit keeps its historical mentions; it records what was
decided when, and editing that would be dishonest.
```

---

### Task 5: Close-out

**Files:**
- Modify: `docs/design/route-composition-audit-2026-09-01.md`

- [ ] **Step 1: Verify every success criterion from the spec**

```bash
cd /Users/milanzitka/git/stagistic
grep -c '@dvdevcz' package.json pnpm-lock.yaml                       # expect 0 0
pnpm -w exec stylelint "**/*.{css,scss}" --formatter json -o /tmp/sl-final.json >/dev/null 2>&1
python3 -c "
import json; r=json.load(open('/tmp/sl-final.json'))
print('files:', len(r), '| problems:', sum(len(f['warnings']) for f in r))"
grep -rn 'phase-2 Uno' packages apps DESIGN.md                        # expect no output
grep -rn 'stylelint-disable' packages/editor/src/editor/components/MusicSuggestionsOverlay.module.css
node scripts/check-route-css-headers.mjs
```

- [ ] **Step 2: Prove the guards actually bite**

A criterion nobody has watched fail is a claim, not a criterion.

```bash
cd /Users/milanzitka/git/stagistic
cat > /tmp/guard-probe.css <<'EOF'
.probe { padding: 13px; gap: 6px; font-size: 1.2rem; color: #3a3a3a; }
EOF
pnpm -w exec stylelint --config stylelint.config.js /tmp/guard-probe.css
```

Expected: four errors — three `declaration-property-unit-allowed-list`, one `color-no-hex`. Delete the probe file afterwards.

- [ ] **Step 3: Write the close-out**

Append to `docs/design/route-composition-audit-2026-09-01.md`, following the structure the earlier close-outs use: what each part did, the `--print-config` proof for the extraction, the 19/17 split with the ruling given for the seventeen, and the residue.

It must record three things in particular:

- **UnoCSS is retired**, with the reasoning, since §11 of the phase-1 spec still promises it to anyone reading that document alone.
- **The deferred modernisation work list** — the csstree 2.3.1 versus stylelint's own css-tree 3.x plus csstools patches finding, the `@stylistic/stylelint-plugin` deprecation question, and the inherited rules that may not fit a CSS-Modules repo.
- **The two `DESIGN.md` rules** added before this plan ran: the amended Variant Before Override Rule carrying the two-call-site threshold in both directions, and the new Nameable Is A Component Rule.

- [ ] **Step 4: Prepare the commit message — do not commit**

---

## Self-Review

**Spec coverage.** §4 part one → Task 2 (guards, hairlines, twelve substitutions, the `max-height` entry) and Task 3 (the seventeen). §5 part two → Task 1, with the modernisation work list carried into Task 5 Step 3 rather than acted on. §6 part three → Task 4. §7 part four → already applied before this plan; Task 5 Step 3 records it. §9 success criteria → Task 5 Steps 1–2. D5's rejected ratchet appears nowhere, correctly.

**Naming consistency.** `stylelint/base.js` and `stylelint/guards.js` are introduced in Tasks 1 and 2 and referenced with those exact paths in the File Structure and in `stylelint.config.js`. `scripts/check-route-css-headers.mjs` is named identically in Task 4 Steps 1, 2, 3, 4 and 7 and in Task 5 Step 1. The `RELATIVE` constant is defined once, in `guards.js`.

**Every command in this plan was executed against this repo while the spec and plan were written**, including the `--print-config` snapshot (128 rules), the clean baseline (129 files, 0 problems), the guard probe's pass and fail lists, and `fs.globSync` on Node v24.19.0 (27 matches). The two counts a reader should treat as assertions to re-check rather than facts are the 36 sites and the 26 markers: both were measured, but the maintainer commits concurrently, so they can move under the plan's feet.

**Ordering constraint that is easy to get wrong.** Task 1 Step 2 copies from `node_modules/@dvdevcz/stylelint/dist/index.js` and Task 1 Step 5 removes that package. Running them out of order deletes the source before it is copied.
