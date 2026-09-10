# Whole-Number Pixel Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire `--size-scale` from the design system so every size token is a whole number of pixels expressed in `rem`, scaling with the reader's browser font size, while the editor keeps a page-geometry zoom of its own.

**Architecture:** One coefficient (`--size-scale: 1.08`) currently multiplies 36 tokens and 194 hand-written `calc()` expressions. It was built for an editor text-zoom feature that no longer ships, and it leaked into the whole UI. The pass splits that one coefficient into two unrelated things — an editor-owned `--editor-zoom` for canvas geometry, and nothing at all for the UI — then re-expresses the surviving whole-number ladder in `rem` so it responds to the reader's font-size setting. Work proceeds in seven tasks. Task 4 carries the whole 8% shrink; Task 6 moves three named values; every other task is verified to move nothing.

**Tech Stack:** pnpm monorepo, React 19, TypeScript, CSS Modules, OKLCH design tokens in `packages/ui/styles/tokens.css`, vite-plus test runner (node + Playwright browser mode), eslint (which is also the formatter), stylelint.

**Spec:** `docs/superpowers/specs/2026-09-07-whole-number-pixel-pass-design.md`

## Global Constraints

- **Never commit or push.** Every task ends by *preparing* a commit message; the maintainer commits. This is the `AGENTS.md` golden rule (L5).
- **Never `git stash`** to get a clean baseline — the maintainer commits concurrently in the same checkout. Use `git diff > /tmp/x.patch` then `git apply -R /tmp/x.patch`, always **from the repo root**; running `git apply` from a subdirectory silently applies only that subtree and exits 0. Verify with `git status --porcelain | wc -l` against an expected count, not the exit code.
- **Canonical checks**, all from `/Users/milanzitka/git/stagistic`:
  - `pnpm -w exec tsc -b`
  - `pnpm -w exec eslint --fix <paths>` — eslint **is** the formatter; do not run `vp lint` or `vp fmt`
  - `pnpm -w exec stylelint --fix <paths>`
  - node tests: `cd packages/<pkg> && pnpm exec vp test run`
  - browser tests: `cd packages/<pkg> && pnpm exec vp test run -c vitest.browser.config.ts` — the browser config is **per-package**
- The Bash tool's working directory persists between calls. Use absolute paths or an explicit `cd` in every command.
- **`vite.config.js` is a gitignored build artifact** — never edit or commit it.
- **`--font-family-mono` is reserved for script content.** Do not introduce mono anywhere else.
- This is a **mechanical** pass: no behaviour, copy, ARIA, heading-level or DOM change. Only sizes move — the whole shrink in Task 4, three named values in Task 6, nothing anywhere else.
- **zsh:** quote grep include patterns (`--include='*.tsx'`); zsh does not word-split unquoted variables, so pass file lists literally.
- **Known pre-existing reds** — report, never "fix":
  - `packages/app-routes` node: `prepareExampleScriptDocument.test.ts > prepares the example source as a two-act musical with linked-ready characters`
  - `packages/app-routes` browser: `ScriptExportRoute.browser.test.tsx > export character filter > renders exact-kind character catalog rows only`
  - `packages/app-routes` browser, full-directory runs only: `useScriptEditorSettingsDraft.browser.test.tsx > retains toggle and formatting changes after failure and retries them together`
  - `packages/ui` browser, load-dependent flake: `useSaveIndicator.browser.test.tsx > shows slow saving and a full success confirmation after a delayed render`
- **`packages/editor` is in scope for this pass** (unlike phase 1), but only for the files named in Task 2 and the chrome CSS in Tasks 3–5.

**Prerequisite already done:** the 63 committed `__screenshots__/*.png` files were vitest `screenshotOnFailure` debris, not baselines — nothing in the repo compares them. They have been deleted and `**/__screenshots__/` added to `.gitignore`. That change is in the working tree, uncommitted, and belongs with Task 1's commit.

---

## File Structure

**Created (temporary, removed in Task 7):**
- `packages/ui/src/sizeProbe.browser.test.tsx` — renders one representative surface per token family and dumps every measurement as JSON
- `/tmp/probe-extract.py` — strips ANSI from a test run and extracts the JSON payload
- `/tmp/probe-compare.py` — compares two payloads against an expected ratio and prints outliers

**Modified — the coefficient's definition and death:**
- `packages/ui/styles/tokens.css` — the 36 token definitions (Task 4), then their units (Task 5)
- `packages/ui/styles/base.css` — dead `.size-sm/.size-md/.size-lg` (Task 4)

**Modified — the editor's zoom:**
- `packages/editor/src/editor/Editor.tsx` — the `sizeScale` memo becomes an `editorZoom` prop
- `packages/editor/src/editor/hooks/useResponsiveScale.ts` — parameter rename
- `packages/editor/src/editor/useEditorExtensions.ts` — parameter rename
- `packages/editor/src/editor/editorSettings/cssVars.ts` — emits `--editor-zoom`
- `packages/editor/src/editor/components/characterSuggestions/model/overlayPosition.ts` — reads `--editor-zoom`
- `packages/editor/src/editor/mini/MiniScriptEditor.module.css` — the local `--size-scale: 1` pin

**Modified — the sweep (Tasks 3–5), 33 CSS files across three packages** plus `packages/app-routes/src/routes/script/ScriptEditorRoute.tsx:44`.

**Modified — documentation:**
- `DESIGN.md` — the units-by-domain rule (Task 5)
- `docs/design/route-composition-audit-2026-09-01.md` — pass close-out (Task 7)

---

### Task 1: Measurement probe harness

The probe is this pass's only verification — there are no image baselines. It must cover one surface from every family the ladder touches, not a sample.

**Files:**
- Create: `packages/ui/src/sizeProbe.browser.test.tsx`
- Create: `/tmp/probe-extract.py`
- Create: `/tmp/probe-compare.py`
- Modify: `.gitignore` (already done — verify only)

**Interfaces:**
- Produces: `/tmp/probe-<label>.json`, an object of the shape `{tokens: Record<string, string>, boxes: Record<string, {w: number, h: number, fontSize: string, paddingTop: string, paddingLeft: string, borderTopWidth: string, borderRadius: string}>}`. Every later task consumes this by capturing a payload before and after its edit and running `/tmp/probe-compare.py`.

- [ ] **Step 1: Confirm the screenshot cleanup is in the tree**

```bash
cd /Users/milanzitka/git/stagistic
git ls-files '*__screenshots__*' | wc -l          # expect 0
git status --porcelain | grep -c '^ D'            # expect 63
grep -c '__screenshots__' .gitignore              # expect 1
```

- [ ] **Step 2: Write the probe**

Create `packages/ui/src/sizeProbe.browser.test.tsx`. It imports the real stylesheet, renders the surfaces, and throws the payload — browser-mode stdout is not forwarded to the terminal, but failure messages are, which is why this dumps by throwing rather than by `console.log`.

```tsx
import '../styles/base.css';

import {createRoot, type Root} from 'react-dom/client';
import {describe, it} from 'vite-plus/test';

import {Button} from './atoms/Button';
import {Select} from './molecules/forms/Select';

const TOKENS = [
    '--space-xs', '--space-sm', '--space-md', '--space-lg', '--space-xl',
    '--space-2xl', '--space-3xl', '--space-4xl', '--space-5xl', '--space-6xl',
    '--space-7xl',
    '--radius-xs', '--radius-sm', '--radius-md', '--radius-lg', '--radius-xl',
    '--font-size-xxs', '--font-size-xs', '--font-size-sm', '--font-size-md',
    '--font-size-lg', '--font-size-xl', '--font-size-2xl', '--font-size-3xl',
    '--font-size-4xl',
    '--control-height-xs', '--control-height-sm', '--control-height-md',
    '--control-height-lg',
    '--shell-height', '--sidebar-width', '--control-chevron-size',
    '--menu-max-height', '--menu-item-min-height',
    '--bubble-menu-button-size', '--bubble-menu-icon-size',
];

/*
 * A token is a calc() expression today, so getPropertyValue returns the
 * expression rather than a length. Resolving it needs a real element that
 * uses it.
 */
const resolveToken = (name: string) => {
    const probe = document.createElement('div');

    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    /*
     * Measured 64x and divided back down. Layout quantises to 1/64px, so a
     * direct read returns 8.64px as 8.625; multiplying first pushes that error
     * to 1/4096px and the comparison stays sharp.
     */
    probe.style.width = `calc(var(${name}) * 64)`;
    document.body.appendChild(probe);

    const width = Number.parseFloat(window.getComputedStyle(probe).width) / 64;

    probe.remove();

    return Math.round(width * 10000) / 10000;
};

const settle = async () => {
    await new Promise(resolve => {
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve(null));
        });
    });
    await document.fonts.ready;
    await new Promise(resolve => {
        window.setTimeout(resolve, 500);
    });
};

const measure = (element: Element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    return {
        w: Math.round(rect.width * 1000) / 1000,
        h: Math.round(rect.height * 1000) / 1000,
        fontSize: style.fontSize,
        paddingTop: style.paddingTop,
        paddingLeft: style.paddingLeft,
        borderTopWidth: style.borderTopWidth,
        borderRadius: style.borderTopLeftRadius,
    };
};

describe('sizeProbe', () => {
    it('dumps every measured size', async () => {
        const host = document.createElement('div');

        host.style.width = '1000px';
        document.body.appendChild(host);

        const root: Root = createRoot(host);

        /*
         * Two real components with APIs verified against their source, plus a
         * raw box per token family. The raw boxes are immune to component
         * refactors, so a diff in them is unambiguously a ladder change.
         */
        root.render(
            <div>
                <div data-probe="rawControl" style={{height: 'var(--control-height-md)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)'}} />
                <div data-probe="rawMenuItem" style={{minHeight: 'var(--menu-item-min-height)', padding: 'var(--space-sm) var(--space-lg)', fontSize: 'var(--font-size-md)'}} />
                <div data-probe="rawShell" style={{height: 'var(--shell-height)', width: 'var(--sidebar-width)'}} />
                <div data-probe="button">
                    <Button>Button</Button>
                </div>
                <div data-probe="select">
                    <Select
                        ariaLabel="Select"
                        value="a"
                        options={[{value: 'a', label: 'Option A'}]}
                        onChange={() => {}}
                    />
                </div>
            </div>,
        );

        await settle();

        const tokens: Record<string, number> = {};

        TOKENS.forEach(name => {
            tokens[name] = resolveToken(name);
        });

        const boxes: Record<string, ReturnType<typeof measure>> = {};

        host.querySelectorAll('[data-probe]').forEach(element => {
            const key = element.getAttribute('data-probe') ?? '?';
            const target = element.firstElementChild ?? element;

            boxes[key] = measure(target);
        });

        root.unmount();
        host.remove();

        throw new Error(`__PROBE__${JSON.stringify({tokens, boxes})}__END__`);
    });
});
```

`Button` takes only children here and `Select`'s props are the ones it declares
(`ariaLabel`, `value`, `options`, `onChange`) — both verified against their source. Every
component sits inside a `<div data-probe>` wrapper and the probe measures the wrapper's
first element child, so no component needs to forward a `data-*` attribute.

Widening the probe with more components is welcome, but each addition must compile: read
the component's props from its source rather than guessing, and wrap it the same way.

- [ ] **Step 3: Write the extractor**

Create `/tmp/probe-extract.py`:

```python
#!/usr/bin/env python3
"""Pull the __PROBE__…__END__ JSON payload out of a browser-test run."""
import json
import re
import sys

raw = sys.stdin.read()
clean = re.sub(r'\x1b\[[0-9;]*[A-Za-z]', '', raw)
match = re.search(r'__PROBE__(.*?)__END__', clean, re.S)

if not match:
    sys.exit('no probe payload found')

payload = json.loads(match.group(1))
json.dump(payload, open(sys.argv[1], 'w'), indent=2, sort_keys=True)
print(f'wrote {sys.argv[1]}: {len(payload["tokens"])} tokens, {len(payload["boxes"])} boxes')
```

- [ ] **Step 4: Write the comparator**

Create `/tmp/probe-compare.py`. It takes two payloads and an expected ratio, and prints only what disagrees.

```python
#!/usr/bin/env python3
"""Compare two probe payloads against an expected ratio. Usage:
       probe-compare.py before.json after.json 1.08
   Ratio 1.08 means `after` should be `before / 1.08`; ratio 1 means identical."""
import json
import sys

before = json.load(open(sys.argv[1]))
after = json.load(open(sys.argv[2]))
ratio = float(sys.argv[3])
TOKEN_TOL = 0.005
# Box dimensions come from getBoundingClientRect, which quantises to 1/64px.
BOX_TOL = 0.03

def num(value):
    try:
        return float(str(value).replace('px', ''))
    except ValueError:
        return None

outliers = []

for name, want in before['tokens'].items():
    got = after['tokens'].get(name)
    if got is None:
        outliers.append(f'token {name}: missing after')
    elif abs(got - want / ratio) > TOKEN_TOL:
        outliers.append(f'token {name}: {want} -> {got}, expected {want / ratio:.3f}')

for box, props in before['boxes'].items():
    for prop, want in props.items():
        got = after['boxes'].get(box, {}).get(prop)
        w, g = num(want), num(got)
        if w is None or g is None:
            if want != got:
                outliers.append(f'{box}.{prop}: {want!r} -> {got!r}')
        elif abs(g - w / ratio) > BOX_TOL:
            outliers.append(f'{box}.{prop}: {want} -> {got}, expected {w / ratio:.3f}')

print(f'{len(outliers)} outlier(s)')
for line in outliers:
    print(' ', line)
```

Hairlines are the expected outliers at ratio 1.08: `borderTopWidth` is a hardcoded `1px` and must not shrink. Every outlier the comparator prints has to be explained in writing before a task is called done — "border, expected" is a fine explanation; silence is not.

- [ ] **Step 5: Capture the baseline**

```bash
cd /Users/milanzitka/git/stagistic/packages/ui
pnpm exec vp test run -c vitest.browser.config.ts src/sizeProbe.browser.test.tsx 2>&1 \
  | python3 /tmp/probe-extract.py /tmp/probe-baseline.json
```

Expected: `wrote /tmp/probe-baseline.json: 36 tokens, 5 boxes`. Sanity-check a few values against the shipped scale — `--space-md` must read `8.6399`, `--font-size-sm` `12.96`, `--menu-item-min-height` `34.5598` (the trailing digits are the 1/4096px residue of the 64x trick). If they read `8`, `12`, `32`, the stylesheet did not load; fix the import before going further.

- [ ] **Step 6: Prove the comparator agrees with itself**

```bash
python3 /tmp/probe-compare.py /tmp/probe-baseline.json /tmp/probe-baseline.json 1
```

Expected: `0 outlier(s)`.

- [ ] **Step 7: Checks**

```bash
cd /Users/milanzitka/git/stagistic
pnpm -w exec tsc -b
pnpm -w exec eslint --fix packages/ui/src/sizeProbe.browser.test.tsx
```

The probe test itself is expected to FAIL by design — that is how it reports. Note that in the commit message so the failure is not mistaken for a regression.

- [ ] **Step 8: Prepare the commit message — do not commit**

```
chore: delete committed screenshot debris, add a size measurement probe

The 63 PNGs under __screenshots__/ were vitest screenshotOnFailure artifacts
that got committed, not baselines: nothing in the repo calls toMatchScreenshot
or configures image comparison, and the filenames are test names with a -1
suffix. One of them belongs to a test on the known-red list. Deleted, and
**/__screenshots__/ added to .gitignore so failing runs stop seeding more.

That leaves the pixel pass with no visual safety net, so this adds one:
sizeProbe.browser.test.tsx renders a representative surface per token family
and dumps every measured size as JSON by throwing, since browser-mode stdout
is not forwarded. The probe test fails by design — that is how it reports —
and is removed at the end of the pass.
```

---

### Task 2: The editor owns its zoom

Rename the coefficient to say what it does, and move its ownership from a global the UI defines to an input the editor controls. **Its value stays 1.08 here**, so nothing moves.

**Files:**
- Modify: `packages/editor/src/editor/Editor.tsx:110-121`, and the `sizeScale` references at 149, 155, 195, 197, 210
- Modify: `packages/editor/src/editor/hooks/useResponsiveScale.ts:11,39,51,132`
- Modify: `packages/editor/src/editor/useEditorExtensions.ts:58,75,94`
- Modify: `packages/editor/src/editor/editorSettings/cssVars.ts:93`
- Modify: `packages/editor/src/editor/components/characterSuggestions/model/overlayPosition.ts:15-20,55`
- Modify: `packages/editor/src/editor/editorShellLayout.browser.test.tsx:93,97`

**Interfaces:**
- Produces: `Editor` gains an optional prop `editorZoom?: number` (default `1.08` in this task, changed to `1` in Task 4). `getEditorCssVars(settings: EditorSettings, scale?: number, editorZoom?: number): EditorCssVars` emits `--editor-zoom`. `useResponsiveScale` and `useEditorExtensions` take `editorZoom: number` where they took `sizeScale: number`.

- [ ] **Step 1: Capture the before payload**

```bash
cd /Users/milanzitka/git/stagistic/packages/ui
pnpm exec vp test run -c vitest.browser.config.ts src/sizeProbe.browser.test.tsx 2>&1 \
  | python3 /tmp/probe-extract.py /tmp/probe-t2-before.json
```

- [ ] **Step 2: Replace the global read with a prop in `Editor.tsx`**

Delete the memo at `Editor.tsx:110-121`:

```tsx
    const sizeScale = useMemo(() => {
        if (typeof window === 'undefined') {
            return 1;
        }

        const raw = window
            .getComputedStyle(window.document.documentElement)
            .getPropertyValue('--size-scale');
        const parsed = Number.parseFloat(raw);

        return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    }, []);
```

Add `editorZoom` to the component's props type and destructure it with a default:

```tsx
    /**
     * Zooms the page canvas only: page width, render scale, pagination and
     * overlay placement. Chrome sizes from the shared tokens and does not
     * see this value.
     */
    editorZoom?: number,
```

```tsx
    editorZoom = 1.08,
```

Then rename the five remaining uses — `surfaceSignature` (155), `useResponsiveScale` (195), `renderScale` (197), `useEditorExtensions` (210) — from `sizeScale` to `editorZoom`, including the dependency arrays.

- [ ] **Step 3: Emit the variable so CSS and `overlayPosition` can read it**

In `cssVars.ts`, widen the signature and add the variable to the returned object:

```tsx
export const getEditorCssVars = (
    settings: EditorSettings,
    scale = 1,
    editorZoom = 1,
): EditorCssVars => {
```

Add to the returned object literal:

```tsx
        '--editor-zoom': `${editorZoom}`,
```

In `Editor.tsx`, pass it through:

```tsx
    const editorStyle = useMemo(
        () => getEditorCssVars(resolvedSettings, renderScale, editorZoom),
        [editorZoom, renderScale, resolvedSettings],
    );
```

- [ ] **Step 4: Point `overlayPosition` at the new name**

In `overlayPosition.ts`, rename the helper and the property it reads:

```tsx
const getEditorZoom = (element: HTMLElement) => {
    const raw = window.getComputedStyle(element).getPropertyValue('--editor-zoom');
    const parsed = Number.parseFloat(raw);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};
```

and at line 55:

```tsx
    const editorZoom = getEditorZoom(canvas);
    const tagPadding = horizontalPaddingPx * editorZoom;
```

- [ ] **Step 5: Rename the two hook parameters**

In `useResponsiveScale.ts` rename `sizeScale` to `editorZoom` in the args type (line 11), the destructure (39), the `pageWidth` product (51) and the dependency array (132). In `useEditorExtensions.ts` rename it in the args type (58), the destructure (75) and the `createPaginationExtension` call (94).

- [ ] **Step 6: Update the editor's own browser test**

`editorShellLayout.browser.test.tsx:93,97` sets and removes `--size-scale` on `documentElement`. That variable no longer reaches the editor, so replace both lines with the `--editor-zoom` equivalent on the same element, keeping the value `1`.

- [ ] **Step 7: Checks**

```bash
cd /Users/milanzitka/git/stagistic
pnpm -w exec tsc -b
pnpm -w exec eslint --fix packages/editor/src/editor/Editor.tsx packages/editor/src/editor/hooks/useResponsiveScale.ts packages/editor/src/editor/useEditorExtensions.ts packages/editor/src/editor/editorSettings/cssVars.ts packages/editor/src/editor/components/characterSuggestions/model/overlayPosition.ts packages/editor/src/editor/editorShellLayout.browser.test.tsx
cd /Users/milanzitka/git/stagistic/packages/editor && pnpm exec vp test run
cd /Users/milanzitka/git/stagistic/packages/editor && pnpm exec vp test run -c vitest.browser.config.ts
```

Expected: green, save for the known reds.

- [ ] **Step 8: Prove nothing moved**

```bash
cd /Users/milanzitka/git/stagistic/packages/ui
pnpm exec vp test run -c vitest.browser.config.ts src/sizeProbe.browser.test.tsx 2>&1 \
  | python3 /tmp/probe-extract.py /tmp/probe-t2-after.json
python3 /tmp/probe-compare.py /tmp/probe-t2-before.json /tmp/probe-t2-after.json 1
```

Expected: `0 outlier(s)`. Any outlier here is a real regression — this task must not move a pixel.

- [ ] **Step 9: Prepare the commit message — do not commit**

```
refactor(editor): give the canvas its own zoom variable

--size-scale was born as the editor's text zoom, keeping the canvas faithful
to A4/Letter while the text grew, and then leaked into every UI token. The
zoom feature no longer ships; the leak stayed.

This splits the two apart. Page geometry — page width, render scale,
pagination, overlay placement — now reads editorZoom, an explicit prop with a
--editor-zoom CSS variable the editor emits itself, instead of reaching into
document.documentElement for a global the UI owns.

The value is still 1.08, so nothing moves. The measurement probe reads
identical values before and after.
```

---

### Task 3: Hand-written `calc()` becomes tokens

194 hand-written `calc(Npx * var(--size-scale))` expressions duplicate values that tokens already carry. Tokenising them now means Task 5 changes the unit in one file instead of 194 places. **Still multiplied, still 1.08 — nothing moves.**

**Files:**
- Modify: the CSS modules listed by the inventory command in Step 2 (33 files: 125 occurrences in `packages/ui`, 42 in `packages/editor`, 27 in `packages/app-routes`)
- Modify: `packages/app-routes/src/routes/script/ScriptEditorRoute.tsx:44`

**Interfaces:**
- Consumes: nothing from Task 2.
- Produces: no new API. Later tasks rely on the count of surviving hand-written calcs being only those with no matching token.

- [ ] **Step 1: Capture the before payload**

```bash
cd /Users/milanzitka/git/stagistic/packages/ui
pnpm exec vp test run -c vitest.browser.config.ts src/sizeProbe.browser.test.tsx 2>&1 \
  | python3 /tmp/probe-extract.py /tmp/probe-t3-before.json
```

- [ ] **Step 2: Take the inventory**

```bash
cd /Users/milanzitka/git/stagistic
grep -rn 'calc([0-9.]*px \* var(--size-scale))' packages --include='*.css' \
  | grep -v 'styles/tokens.css' > /tmp/adhoc-calc.txt
wc -l < /tmp/adhoc-calc.txt          # expect 194
grep -o 'calc([0-9]*' /tmp/adhoc-calc.txt | cut -c6- | sort -n | uniq -c | sort -rn
```

- [ ] **Step 3: Replace every occurrence whose number matches a token**

The mapping, from `tokens.css`:

| px | token | | px | token |
| ---: | --- | --- | ---: | --- |
| 2 | `--space-xs` | | 4 | `--space-sm` |
| 8 | `--space-md` | | 12 | `--space-lg` |
| 16 | `--space-xl` | | 20 | `--space-2xl` |
| 24 | `--space-3xl` | | 28 | `--space-4xl` |
| 32 | `--space-5xl` | | 40 | `--space-6xl` |
| 48 | `--space-7xl` | | 256 | `--sidebar-width` |
| 280 | `--menu-max-height` | | | |

Two cautions, both real:

- **A number is not a token just because it matches.** `--space-4xl` is spacing; a 28px *control box* (`IconButton.module.css:57-58`, `ListRow.module.css:2,16`, `ToggleButtonGroup.module.css:18,64`, `ActionCard.module.css:97-98`) is a height, not a gap. Leave those as `calc(28px * var(--size-scale))` for now; Task 6 gives them `--control-height-sm` once it is 28. Substituting a spacing token for a height is exactly the kind of false tidiness this pass must avoid.
- Numbers with no token — `9`, `10`, `11`, `13`, `14`, `15`, `18`, `210`, `220`, `320` — stay as they are. Task 6 covers the `14/16/18` icon cluster; the rest become plain px in Task 4.

- [ ] **Step 4: Fix the duplicated sidebar width**

`packages/app-routes/src/routes/script/ScriptEditorRoute.tsx:44` hand-builds a token:

```tsx
const SIDEBAR_WIDTH = 'calc(256px * var(--size-scale))';
```

becomes

```tsx
const SIDEBAR_WIDTH = 'var(--sidebar-width)';
```

- [ ] **Step 5: Checks**

```bash
cd /Users/milanzitka/git/stagistic
pnpm -w exec tsc -b
pnpm -w exec eslint --fix packages/app-routes/src/routes/script/ScriptEditorRoute.tsx
pnpm -w exec stylelint --fix $(git diff --name-only -- '*.css' | tr '\n' ' ')
```

Then the three suites, node and browser, for `ui`, `editor` and `app-routes`.

- [ ] **Step 6: Prove nothing moved**

```bash
cd /Users/milanzitka/git/stagistic/packages/ui
pnpm exec vp test run -c vitest.browser.config.ts src/sizeProbe.browser.test.tsx 2>&1 \
  | python3 /tmp/probe-extract.py /tmp/probe-t3-after.json
python3 /tmp/probe-compare.py /tmp/probe-t3-before.json /tmp/probe-t3-after.json 1
```

Expected: `0 outlier(s)`.

- [ ] **Step 7: Prepare the commit message — do not commit**

```
refactor(styles): use tokens instead of hand-written scaled pixels

194 places wrote calc(Npx * var(--size-scale)) by hand for a number a token
already carried — including ScriptEditorRoute, which rebuilt --sidebar-width
from scratch. Every occurrence whose number matches a token now uses the
token.

Left alone deliberately: the 28px control boxes, which are heights and get
--control-height-sm once that token is 28 rather than a spacing token that
happens to share the number; and the numbers no token covers.

Values are unchanged and the measurement probe reads identical values before
and after.
```

---

### Task 4: The flip

The only task that changes what the user sees. Everything renders 8% smaller.

**Files:**
- Modify: `packages/ui/styles/tokens.css` — the 36 definitions
- Modify: `packages/ui/styles/base.css` — delete `.size-sm`, `.size-md`, `.size-lg`
- Modify: `packages/editor/src/editor/Editor.tsx` — `editorZoom = 1.08` becomes `editorZoom = 1`
- Modify: `packages/editor/src/editor/mini/MiniScriptEditor.module.css:2` — delete the `--size-scale: 1` pin
- Modify: the CSS files still holding hand-written calcs after Task 3
- Modify: the ten browser tests that set `--size-scale: 1`

**Interfaces:**
- Consumes: `editorZoom` from Task 2; the token-ised CSS from Task 3.
- Produces: `tokens.css` with 36 literal px values; `--size-scale` no longer exists.

- [ ] **Step 1: Capture the before payload**

```bash
cd /Users/milanzitka/git/stagistic/packages/ui
pnpm exec vp test run -c vitest.browser.config.ts src/sizeProbe.browser.test.tsx 2>&1 \
  | python3 /tmp/probe-extract.py /tmp/probe-t4-before.json
```

- [ ] **Step 2: Flip the tokens**

In `tokens.css`, delete the `--size-scale: 1.08` declaration and its comment block, then rewrite each of the 36 definitions to its literal base value — `--space-md: calc(8px * var(--size-scale));` becomes `--space-md: 8px;`. The base numbers are exactly what is inside each `calc()` today; do not round, adjust or "improve" any of them in this task.

- [ ] **Step 3: Delete the dead size classes**

Remove `.size-sm`, `.size-md` and `.size-lg` from `base.css:57-67`. Nothing applies them — `AccountMenu.tsx:44` already says so in a comment. Update that comment, which now describes a state that no longer exists.

- [ ] **Step 4: Default the editor zoom to 1**

In `Editor.tsx`, `editorZoom = 1.08` becomes `editorZoom = 1`. The canvas now renders the page at its nominal size, which is what the geometry always claimed.

Delete the `--size-scale: 1` pin at `MiniScriptEditor.module.css:2`.

- [ ] **Step 5: Drop the remaining hand-written calcs**

```bash
cd /Users/milanzitka/git/stagistic
grep -rn 'var(--size-scale)' packages apps --include='*.css' --include='*.ts' --include='*.tsx'
```

Every hit becomes its plain px value: `calc(14px * var(--size-scale))` becomes `14px`. When the list is empty, the coefficient is gone.

- [ ] **Step 6: Drop the test setup lines**

These ten files set `--size-scale: 1` on their host so their assertions could be whole numbers:

```
packages/app-routes/src/routes/script/editor/structure/StructureRowAct.browser.test.tsx
packages/ui/src/molecules/forms/MultiComboBox.browser.test.tsx
packages/ui/src/editor-panels/EditorSidebar.browser.test.tsx
packages/ui/src/feedback/ToastProvider.browser.test.tsx
packages/ui/src/dialogs/AttributeManagerCharactersRename.browser.test.tsx
packages/ui/src/dialogs/AttributeManagerPlacesPanel.browser.test.tsx
packages/ui/src/dialogs/AttributeManagerCharactersPanel.browser.testUtils.tsx
packages/ui/src/dialogs/AttributeManagerListPanel.browser.test.tsx
packages/ui/src/dialogs/AttributeManagerCharactersPanel.browser.test.tsx
packages/editor/src/editor/editorShellLayout.browser.test.tsx
```

Delete the `setProperty` and matching `removeProperty` lines. Their assertions already expect the unscaled base values, which is exactly what the tokens now are, so the assertions themselves must not change. (`editorShellLayout.browser.test.tsx` was switched to `--editor-zoom` in Task 2; leave that one as it is.)

- [ ] **Step 7: Verify the ratio, then explain every outlier**

```bash
cd /Users/milanzitka/git/stagistic/packages/ui
pnpm exec vp test run -c vitest.browser.config.ts src/sizeProbe.browser.test.tsx 2>&1 \
  | python3 /tmp/probe-extract.py /tmp/probe-t4-after.json
python3 /tmp/probe-compare.py /tmp/probe-t4-before.json /tmp/probe-t4-after.json 1.08
```

Expected outliers, and only these: `borderTopWidth` on any box that has a border, because hairlines are hardcoded `1px` and must not shrink. Anything else is a candidate regression. Write the explanation for each outlier into the commit message — an unexplained outlier means the task is not done.

- [ ] **Step 8: Checks**

```bash
cd /Users/milanzitka/git/stagistic
pnpm -w exec tsc -b
pnpm -w exec stylelint --fix packages/ui/styles/tokens.css packages/ui/styles/base.css $(git diff --name-only -- '*.css' | tr '\n' ' ')
pnpm -w exec eslint --fix $(git diff --name-only -- '*.ts' '*.tsx' | tr '\n' ' ')
```

Then node and browser suites for `ui`, `editor` and `app-routes`. Any test that now fails on a numeric assertion should fail by exactly the ÷1.08 relation; update the expected number and say so. A test that fails any other way is a regression — stop and investigate rather than adjusting the assertion.

- [ ] **Step 9: Confirm the coefficient is gone**

```bash
cd /Users/milanzitka/git/stagistic
grep -ri 'size-scale\|sizeScale' packages apps --include='*.css' --include='*.ts' --include='*.tsx'
```

Expected: no output.

- [ ] **Step 10: Prepare the commit message — do not commit**

Include the outlier explanations from Step 7.

```
refactor(styles): whole-number pixels — retire --size-scale

Every size in the app was a decimal: --space-md 8.64px, --font-size-sm
12.96px, --menu-item-min-height 34.56px. None of them were designed. They
were all one constant, --size-scale: 1.08, applied to 36 tokens.

The constant was the editor's text zoom, which no longer ships and which
Task 2 moved to --editor-zoom. Nothing else needed it: .size-sm/.size-md/
.size-lg existed in base.css with nothing applying them, and ten browser
tests pinned it to 1 just to get whole numbers to assert.

Tokens are now their literal base values, so the UI renders 8% smaller and
the editor canvas renders the page at nominal size. The measurement probe
confirms every token-derived dimension is exactly the previous value ÷ 1.08;
hairline borders are the only outliers, because they were hardcoded 1px and
must stay sharp.
```

---

### Task 5: Units — a `rem` ladder and `em` breakpoints

Whole numbers at the default setting, proportional for a reader who enlarges their font. Provably zero change at a 16px root.

**Files:**
- Modify: `packages/ui/styles/tokens.css` — the 36 definitions and their comments
- Modify: the 20 CSS files holding the 40 media-query declarations
- Modify: `DESIGN.md`

**Interfaces:**
- Consumes: the literal-px `tokens.css` from Task 4.
- Produces: tokens in `rem`; breakpoints in `em`; a named `DESIGN.md` rule.

- [ ] **Step 1: Capture the before payload**

```bash
cd /Users/milanzitka/git/stagistic/packages/ui
pnpm exec vp test run -c vitest.browser.config.ts src/sizeProbe.browser.test.tsx 2>&1 \
  | python3 /tmp/probe-extract.py /tmp/probe-t5-before.json
```

- [ ] **Step 2: Convert the ladder**

The root is 16px and 16 is a power of two, so every value converts exactly — no rounding anywhere:

| px | rem | px | rem | px | rem |
| ---: | --- | ---: | --- | ---: | --- |
| 2 | 0.125 | 13 | 0.8125 | 26 | 1.625 |
| 4 | 0.25 | 14 | 0.875 | 28 | 1.75 |
| 6 | 0.375 | 15 | 0.9375 | 32 | 2 |
| 8 | 0.5 | 16 | 1 | 35 | 2.1875 |
| 10 | 0.625 | 18 | 1.125 | 36 | 2.25 |
| 11 | 0.6875 | 20 | 1.25 | 40 | 2.5 |
| 12 | 0.75 | 22 | 1.375 | 48 | 3 |
| | | 24 | 1.5 | 256 | 16 |
| | | | | 280 | 17.5 |

Each line keeps the pixel in a trailing comment so the ladder stays readable where it is defined:

```css
    --font-size-xs: 0.6875rem; /* 11px */
```

Leave `--space-none: 0px` and `--space-px: 1px` alone: zero has no unit to scale and `--space-px` is a hairline by definition.

- [ ] **Step 3: Convert the breakpoints**

```bash
cd /Users/milanzitka/git/stagistic
grep -rn '@media[^{]*[0-9]px' packages apps --include='*.css' | wc -l    # expect 40
```

Divide each width by 16: 560→35, 640→40, 720→45, 860→53.75, 900→56.25, 980→61.25, 999→62.4375, 1024→64, 1100→68.75, 1199→74.9375. All ten are exact. In a media query the unit resolves against the root font size, so `em` and `rem` behave identically here; `em` is the conventional choice.

- [ ] **Step 4: Leave px where px is correct**

Do not convert: hairline borders and dividers (`1px`, `2px`), the editor canvas page geometry, or `--editor-font-size`. A scaled hairline is a blurred sub-pixel line, and A4 is a physical size that must not change because the reader enlarged their menu text.

- [ ] **Step 5: Prove the conversion is the identity**

```bash
cd /Users/milanzitka/git/stagistic/packages/ui
pnpm exec vp test run -c vitest.browser.config.ts src/sizeProbe.browser.test.tsx 2>&1 \
  | python3 /tmp/probe-extract.py /tmp/probe-t5-after.json
python3 /tmp/probe-compare.py /tmp/probe-t5-before.json /tmp/probe-t5-after.json 1
```

Expected: `0 outlier(s)`. A single differing value is a conversion error, not a rounding artifact — the arithmetic is exact.

- [ ] **Step 6: Prove the accessibility goal**

Temporarily add `document.documentElement.style.fontSize = '20px';` as the first line of the probe's test body, capture a payload, and compare it against the 16px one at ratio `0.8` (that is, `after == before / 0.8 == before × 1.25`):

```bash
cd /Users/milanzitka/git/stagistic/packages/ui
pnpm exec vp test run -c vitest.browser.config.ts src/sizeProbe.browser.test.tsx 2>&1 \
  | python3 /tmp/probe-extract.py /tmp/probe-t5-root20.json
python3 /tmp/probe-compare.py /tmp/probe-t5-after.json /tmp/probe-t5-root20.json 0.8
```

Expected outliers, and only these: `borderTopWidth`, which must stay `1px`. A token-derived dimension that refuses to grow is a px value that escaped the sweep — find it and convert it. Remove the temporary line afterwards.

- [ ] **Step 7: Add the rule to `DESIGN.md`**

Follow the existing "The X Rule" naming and one-paragraph form used throughout that file:

> **The Sizes Scale With The Reader Rule.** Sizes are `rem`, drawn from the whole-pixel ladder in `tokens.css` where each token carries its pixel value in a comment. A reader who raises their browser's default font size gets a proportionally larger interface, which px cannot give them. Three domains are deliberately exempt: hairline borders stay `px`, because a scaled hairline is a blurred sub-pixel line; media-query breakpoints are `em`, so the layout responds along with the type; and the editor canvas is `px` times `--editor-zoom`, because A4 is a physical size and must not change because the menu text grew. Components never write a `rem` literal — they use tokens, which carry the right unit for their domain.

- [ ] **Step 8: Checks**

```bash
cd /Users/milanzitka/git/stagistic
pnpm -w exec tsc -b
pnpm -w exec stylelint --fix $(git diff --name-only -- '*.css' | tr '\n' ' ')
```

Then node and browser suites for `ui`, `editor` and `app-routes`. No assertion should change: the test root is the default 16px, so every computed value is what it was before this task.

- [ ] **Step 9: Prepare the commit message — do not commit**

```
feat(a11y): scale the interface with the reader's font size

px ignores the browser's default-font-size setting, which is the standard
remedy for low vision — so a reader who enlarged their text got nothing from
us (WCAG 1.4.4). Page zoom worked, because it scales px too; the font-size
setting did not.

The ladder now ships in rem. The root is 16px and 16 is a power of two, so
every value converts exactly — 12px is 0.75rem, 11px is 0.6875rem — and each
token keeps its pixel value in a comment. At the default setting the rendered
pixels are unchanged, which the measurement probe confirms exactly; at a 20px
root every dimension grows by 20/16.

Breakpoints become em for the same reason: px breakpoints would give a reader
with large text more content in an unchanged column. Hairlines stay px so
they stay sharp, and the editor canvas stays px times --editor-zoom because
A4 is a physical size.
```

---

### Task 6: Ladder tidy and the icon-size family

Three off-grid values and one missing token family. Each carries its own visual change, unlike Tasks 2, 3 and 5.

**Files:**
- Modify: `packages/ui/styles/tokens.css`
- Modify: the 5 files using `--control-height-sm`, the 1 using `--font-size-4xl`, the 2 using `--bubble-menu-icon-size`
- Modify: the CSS files holding the 55 icon-size occurrences

**Interfaces:**
- Produces: `--icon-size-sm: 0.875rem` (14px), `--icon-size-md: 1rem` (16px), `--icon-size-lg: 1.125rem` (18px).

- [ ] **Step 1: Capture the before payload**

```bash
cd /Users/milanzitka/git/stagistic/packages/ui
pnpm exec vp test run -c vitest.browser.config.ts src/sizeProbe.browser.test.tsx 2>&1 \
  | python3 /tmp/probe-extract.py /tmp/probe-t6-before.json
```

- [ ] **Step 2: Move the three off-grid values**

| Token | From | To | Why |
| --- | --- | --- | --- |
| `--control-height-sm` | 1.625rem (26px) | 1.75rem (28px) | 28px is the most common hand-written control height in the repo; 26 matches nothing |
| `--font-size-4xl` | 2.1875rem (35px) | 2.25rem (36px) | One consumer, and 35 is arbitrary |
| `--bubble-menu-icon-size` | 0.9375rem (15px) | 1rem (16px) | 16 is already the icon size everywhere else |

- [ ] **Step 3: Adopt the height token for the 28px control boxes**

The boxes Task 3 deliberately left alone — `IconButton.module.css:57-58`, `ListRow.module.css:2,16`, `ToggleButtonGroup.module.css:18,64`, `ActionCard.module.css:97-98` — now use `var(--control-height-sm)`, which is finally the right token rather than a spacing token that shared a number.

This also retires the deviation phase 1 recorded against The Sidebar Row Rule: the structure sidebar's rows were hardcoded to a raw 28px and sat short of the rule at the shipped scale. Update that paragraph in `DESIGN.md` — it currently says the height "is reconciled by the whole-number pixel pass, not by a local patch", and this is that pass.

- [ ] **Step 4: Add the icon-size family**

```css
    --icon-size-sm: 0.875rem; /* 14px */
    --icon-size-md: 1rem; /* 16px */
    --icon-size-lg: 1.125rem; /* 18px */
```

```bash
cd /Users/milanzitka/git/stagistic
grep -rn 'width: 1[468]px\|height: 1[468]px' packages apps --include='*.css' | wc -l
```

Convert the icon sites. A `14px`/`16px`/`18px` that is *not* an icon box — a min-width, a font-size, a gap — keeps its own token or value. The family is for icon boxes only.

- [ ] **Step 5: Measure, and record the change**

```bash
cd /Users/milanzitka/git/stagistic/packages/ui
pnpm exec vp test run -c vitest.browser.config.ts src/sizeProbe.browser.test.tsx 2>&1 \
  | python3 /tmp/probe-extract.py /tmp/probe-t6-after.json
python3 /tmp/probe-compare.py /tmp/probe-t6-before.json /tmp/probe-t6-after.json 1
```

Outliers are expected here — this task moves three values on purpose. Every outlier must correspond to a row in the table above; an outlier that does not is a regression.

- [ ] **Step 6: Checks**

```bash
cd /Users/milanzitka/git/stagistic
pnpm -w exec tsc -b
pnpm -w exec stylelint --fix $(git diff --name-only -- '*.css' | tr '\n' ' ')
```

Then node and browser suites for `ui`, `editor` and `app-routes`.

- [ ] **Step 7: Prepare the commit message — do not commit**

```
refactor(styles): put the last three values on the grid

--control-height-sm was 26px, which matched nothing and which five files
used; 28px is the most common hand-written control height in the repo, so the
token moves to 28 and the four components that hand-wrote a 28px box adopt
it. That also retires the Sidebar Row Rule deviation recorded in phase 1: the
structure sidebar's rows were waiting for exactly this pass.

--font-size-4xl 35 -> 36 and --bubble-menu-icon-size 15 -> 16 for the same
reason: one arbitrary value each, matching nothing.

Adds --icon-size-sm/md/lg for the 14/16/18 icon boxes, which had no token and
were hand-written in 55 places.
```

---

### Task 7: Retire the probe and write the close-out

**Files:**
- Delete: `packages/ui/src/sizeProbe.browser.test.tsx`
- Modify: `docs/design/route-composition-audit-2026-09-01.md`

- [ ] **Step 1: Delete the probe**

```bash
cd /Users/milanzitka/git/stagistic
rm packages/ui/src/sizeProbe.browser.test.tsx
```

- [ ] **Step 2: Confirm the suites are clean without it**

```bash
cd /Users/milanzitka/git/stagistic/packages/ui && pnpm exec vp test run -c vitest.browser.config.ts
```

Expected: green save for the known reds. The deliberate probe failure is gone.

- [ ] **Step 3: Verify every success criterion from the spec**

```bash
cd /Users/milanzitka/git/stagistic
grep -ri 'size-scale\|sizeScale' packages apps --include='*.css' --include='*.ts' --include='*.tsx'   # expect nothing
grep -c 'calc(' packages/ui/styles/tokens.css                                                        # expect 0
grep -rn 'calc([0-9.]*px \* var(' packages apps --include='*.css'                                    # expect nothing
git ls-files '*__screenshots__*' | wc -l                                                             # expect 0
```

- [ ] **Step 4: Write the close-out**

Append a section to `docs/design/route-composition-audit-2026-09-01.md`, following the structure the phase-1 close-outs already use in that file: outcome table, measured-parity table, behaviour-preserved notes, residue list. It must record:

- the before/after ladder, in both px and rem;
- the probe's outlier list for Task 4 with each outlier's explanation;
- the 16px/20px root check result from Task 5;
- the screenshot-debris finding, since it invalidates the phase-1 close-out's claim that goldens were being protected;
- that this pass retires the Sidebar Row Rule deviation recorded in phase 1;
- the two still-open items: the hardcoded mono stack at `IndentRangeSlider.module.css:131`, and the root-cause fix for the UA `dialog { color: CanvasText }` break.

- [ ] **Step 5: Prepare the commit message — do not commit**

```
docs: close out the whole-number pixel pass

Records the ladder before and after, the probe's outlier list for the flip
and its explanations, the 16px/20px root check, and the finding that the 63
committed screenshots were never baselines. Removes the temporary probe.

Open after this pass: the hardcoded mono stack on the indent slider's
measurement labels, and the UA dialog { color: CanvasText } root-cause fix.
Both need their own normalization rows.
```

---

## Self-Review

**Spec coverage:** §4 ownership split → Task 2. §5 ladder → Tasks 4 and 6. §6 units by domain → Task 5 (including the `DESIGN.md` rule). §7 calc sweep → Task 3, with the icon cluster in Task 6. §8 verification → Task 1 builds the probe; every task uses it; §8's screenshot finding → Task 1 Step 1 and Task 7 Step 4. §9 steps 1–5 → Tasks 2–6. §10 success criteria → Task 7 Step 3.

**Naming consistency:** `editorZoom` (prop, TS) and `--editor-zoom` (CSS variable) are used in Tasks 2, 4 and 5 with those exact spellings. `getEditorCssVars(settings, scale, editorZoom)` is defined in Task 2 Step 3 and used in Task 2 Step 3 only. The probe payload shape defined in Task 1 is consumed unchanged by every later task's compare step.

**Known gap, stated rather than hidden:** the probe renders five `packages/ui` surfaces. It cannot render `app-routes` or `editor` components, because `packages/ui` cannot import them. Those packages are covered by their own test suites and by the `grep` checks, not by measurement. If Task 4's outlier list looks too clean to be true, that is the reason — widen the probe with a second file in the affected package rather than trusting the silence.
