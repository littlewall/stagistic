# Yellow-accent Product Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Replace the product application's copper/lavender identity with the approved Snow White, Steel Wool, Wet Weather, Muted Lime, and Primrose Yellow semantic theme in light and dark modes without changing product UX.

**Architecture:** Keep palette anchors and semantic derivation centralized in packages/ui/styles/tokens.css, then make narrow component corrections where token remapping cannot express the approved behavior. Shared product tokens intentionally reach every apps/web route; apps/landing remains unchanged until a separate second phase.

**Tech Stack:** CSS Modules, relative CSS OKLCH colors, React 19, React Aria Components, Vite+ tests, Chromium browser tests

**Spec:** docs/superpowers/specs/2026-09-10-yellow-accent-product-theme-design.md

## Global Constraints

- Preserve the dirty worktree and never revert unrelated edits.
- Do not commit. At each checkpoint, show the diff and propose a commit message; the user performs the commit.
- Keep the five exact palette anchors from the spec unchanged.
- Use relative oklch(from ...) for new theme derivations, not color-mix().
- Leave unrelated existing color-mix() expressions alone.
- Support light, dark, and automatic theme modes with the same semantic roles.
- Do not change layout, spacing, dimensions, breakpoints, navigation, keyboard behavior, document behavior, or stored data.
- Do not modify apps/landing, database schema, migrations, or SCRIPT_DOCUMENT_SCHEMA_VERSION.
- Preserve character-assigned colors and the independent success/danger families.
- Use the canonical checks from AGENTS.md.
- Establish a failing-check baseline once when necessary; never loosen assertions, mutate snapshots, or change viewports to hide failures.
- Run graphify update . once after all code changes.

## File Structure

### Theme foundation

- Modify packages/ui/styles/tokens.css — exact anchors, semantic foundations, light/dark ramps, accent-content colors, and editor-domain semantic tokens.
- Modify packages/ui/src/tokens.test.ts — static palette and legacy-token contract.
- Create packages/ui/src/test/colorContrast.ts — browser-test-only CSS color resolution and WCAG contrast helpers.
- Create packages/ui/src/themeTokens.browser.test.ts — light/dark computed-token and contrast contract.

### Shared product UI

- Modify packages/ui/src/atoms/Button.module.css.
- Create packages/ui/src/atoms/Button.browser.test.tsx.
- Modify packages/ui/src/dialogs/ModalDialog.module.css.
- Modify packages/ui/src/dialogs/AttributeManagerModal.module.css.
- Modify packages/ui/src/dialogs/ScriptSettingsModal.module.css.
- Modify packages/ui/src/layout/AppHeader.module.css.
- Modify packages/ui/src/molecules/ScriptActionsMenu.module.css.
- Modify packages/ui/src/dialogs/ModalDialog.browser.test.tsx.

### Sidebar treatment

- Modify packages/ui/src/molecules/ListRow.module.css.
- Modify packages/ui/src/editor-panels/EditorSidebar.module.css.
- Modify packages/ui/src/editor-panels/EditorSidebar.browser.test.tsx.
- Modify packages/app-routes/src/routes/script/editor/structure/ScriptStructureSidebar.module.css.
- Create packages/app-routes/src/routes/script/editor/structure/ScriptStructureSidebar.styles.test.ts.
- Modify packages/app-routes/src/routes/script/editor/music/ScriptMusicSidebar.module.css.
- Modify packages/app-routes/src/routes/script/editor/music/ScriptMusicSidebar.browser.test.tsx.

### Editor semantics

- Modify packages/editor/src/editor/Editor.module.css.
- Modify packages/editor/src/editor/tiptap/extensions/sceneNumbering.browser.test.tsx.
- Modify packages/editor/src/editor/mini/MiniScriptEditor.module.css.
- Modify packages/editor/src/editor/mini/MiniScriptEditor.browser.test.tsx.
- Modify packages/app-routes/src/routes/script/editor/settings/ScriptEditorSettingsPanel.module.css.

### Music, drag, and floating UI

- Modify packages/editor/src/editor/tiptap/nodes/MusicPill.module.css.
- Modify packages/editor/src/editor/components/musicRange/MusicRangeOverlay.module.css.
- Modify packages/editor/src/editor/components/blockActions/overlay/useDragSourceHighlight.ts.
- Create packages/editor/src/editor/components/blockActions/overlay/useDragSourceHighlight.browser.test.tsx.
- Modify packages/editor/src/editor/tiptap/nodes/musicNode.browser.test.tsx.
- Modify packages/editor/src/editor/components/CharacterSuggestionsOverlay.module.css.
- Modify packages/editor/src/editor/components/MusicSuggestionsOverlay.module.css.
- Modify packages/editor/src/editor/components/EditorBlockActionsOverlay.module.css.
- Modify packages/editor/src/editor/components/characterSuggestions/CharacterSuggestionsOverlay.browser.test.tsx.

---

### Task 1: Establish the semantic theme foundation

**Files:**

- Modify: packages/ui/src/tokens.test.ts
- Create: packages/ui/src/test/colorContrast.ts
- Create: packages/ui/src/themeTokens.browser.test.ts
- Modify: packages/ui/styles/tokens.css

**Interfaces:**

- Consumes: exact palette values and semantic roles from the approved spec.
- Produces: --base-neutral, --base-selection, --base-action, --color-on-accent, --color-accent-hover, --color-music-outline, --color-drag-source-bg, --color-drag-source-edge, and --color-drag-source-outline.

- [ ] **Step 1: Add the failing static palette contract**

Add this test inside the css custom properties describe block in packages/ui/src/tokens.test.ts:

    it('declares the approved product palette and retires hue-specific foundations', () => {
        const tokens = readFileSync(
            join(repoRoot, 'packages/ui/styles/tokens.css'),
            'utf8',
        );

        expect(tokens).toContain('--palette-snow-white: oklch(.9490 .0083 91.48);');
        expect(tokens).toContain('--palette-steel-wool: oklch(.4918 .0118 238.71);');
        expect(tokens).toContain('--palette-muted-lime: oklch(.8000 .0978 101.11);');
        expect(tokens).toContain('--palette-primrose-yellow: oklch(.8540 .1432 89.53);');
        expect(tokens).toContain('--palette-wet-weather: oklch(.6184 .0024 17.22);');
        expect(tokens).toContain('--base-neutral: var(--palette-steel-wool);');
        expect(tokens).toContain('--base-selection: var(--palette-muted-lime);');
        expect(tokens).toContain('--base-action: var(--palette-primrose-yellow);');

        expect(tokens).not.toMatch(/--palette-(lavender|copper|paper|umber|aubergine):/);
        expect(tokens).not.toContain('--base-blue:');
        expect(tokens).not.toContain('--base-amber:');
    });

- [ ] **Step 2: Run the static test and verify it fails**

Run:

    pnpm --filter @stagistic/ui test -- src/tokens.test.ts

Expected: FAIL because the new anchors are absent and the old palette remains.

- [ ] **Step 3: Create the reusable browser contrast helper**

Create packages/ui/src/test/colorContrast.ts:

    const getRgb = (color: string) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
            throw new Error('Canvas context is unavailable');
        }

        canvas.width = 1;
        canvas.height = 1;
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);

        return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
    };

    const getRelativeLuminance = (color: string) => {
        const channels = getRgb(color).map(channel => {
            const value = channel / 255;

            return value <= .04045
                ? value / 12.92
                : ((value + .055) / 1.055) ** 2.4;
        });

        return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
    };

    export const getContrastRatio = (foreground: string, background: string) => {
        const foregroundLuminance = getRelativeLuminance(foreground);
        const backgroundLuminance = getRelativeLuminance(background);
        const lighter = Math.max(foregroundLuminance, backgroundLuminance);
        const darker = Math.min(foregroundLuminance, backgroundLuminance);

        return (lighter + .05) / (darker + .05);
    };

    export const readTokenColor = (name: string) => {
        const probe = document.createElement('div');

        probe.style.color = 'var(' + name + ')';
        document.body.appendChild(probe);

        const color = getComputedStyle(probe).color;

        probe.remove();

        return color;
    };

- [ ] **Step 4: Add the failing light/dark contrast contract**

Create packages/ui/src/themeTokens.browser.test.ts:

    import '../styles/base.css';

    import {
        afterEach, describe, expect, it,
    } from 'vite-plus/test';

    import {
        getContrastRatio,
        readTokenColor,
    } from './test/colorContrast';

    const read = (name: string) => readTokenColor(name);

    afterEach(() => {
        document.body.innerHTML = '';
        delete document.documentElement.dataset.theme;
    });

    describe.each(['light', 'dark'] as const)('%s product theme', theme => {
        it('keeps text, muted text, focus, and accent content accessible', () => {
            document.documentElement.dataset.theme = theme;

            expect(getContrastRatio(
                read('--color-text'),
                read('--color-surface-paper'),
            )).toBeGreaterThanOrEqual(4.5);
            expect(getContrastRatio(
                read('--color-text-muted'),
                read('--color-surface'),
            )).toBeGreaterThanOrEqual(4.5);
            expect(getContrastRatio(
                read('--color-focus-ring'),
                read('--color-surface'),
            )).toBeGreaterThanOrEqual(3);
            expect(getContrastRatio(
                read('--color-on-accent'),
                read('--color-accent'),
            )).toBeGreaterThanOrEqual(4.5);
        });

        it('keeps selection, action, and hover as distinct mechanics', () => {
            document.documentElement.dataset.theme = theme;

            expect(read('--state-selected')).not.toBe(read('--state-hover'));
            expect(read('--state-selected')).not.toBe(read('--color-accent'));
            expect(read('--color-focus-ring')).not.toBe(read('--color-accent'));
        });
    });

- [ ] **Step 5: Run the browser contract and verify it fails**

Run:

    pnpm --filter @stagistic/ui test:browser -- src/themeTokens.browser.test.ts

Expected: FAIL because --color-on-accent and the new semantic foundations do not exist.

- [ ] **Step 6: Replace the palette and semantic color blocks**

In packages/ui/styles/tokens.css, leave typography, spacing, dimensions, motion, and control geometry unchanged. Replace the old palette/foundation declarations with:

    --palette-snow-white: oklch(.9490 .0083 91.48); /* #f0eee8 */
    --palette-steel-wool: oklch(.4918 .0118 238.71); /* #5b6267 */
    --palette-muted-lime: oklch(.8000 .0978 101.11); /* #cbc074 */
    --palette-primrose-yellow: oklch(.8540 .1432 89.53); /* #f4ca52 */
    --palette-wet-weather: oklch(.6184 .0024 17.22); /* #878585 */

    --base-neutral: var(--palette-steel-wool);
    --base-selection: var(--palette-muted-lime);
    --base-action: var(--palette-primrose-yellow);
    --base-green: oklch(.52 .0971 165.2);
    --base-red: oklch(.554 .1273 14.8);
    --base-shadow: oklch(from var(--base-neutral) .10 c h);

Use these exact light-theme semantic relationships:

    --color-bg: oklch(from var(--base-neutral) .90 calc(c * .35) h);
    --color-surface: oklch(from var(--base-neutral) .925 calc(c * .25) h);
    --color-surface-raised: oklch(from var(--base-neutral) .955 calc(c * .20) h);
    --color-surface-accent: oklch(from var(--base-selection) .92 calc(c * .30) h);
    --color-surface-paper: var(--palette-snow-white);

    --color-text: oklch(from var(--base-neutral) .28 calc(c * 1.25) h);
    --color-text-muted: oklch(from var(--palette-wet-weather) .46 c h);
    --color-text-placeholder: oklch(from var(--palette-wet-weather) .44 c h);
    --color-text-link: oklch(from var(--base-selection) .48 c h);
    --color-accent: var(--base-action);
    --color-accent-hover: oklch(from var(--base-action) .80 calc(c * 1.05) h);
    --color-on-accent: oklch(from var(--base-neutral) .27 calc(c * 1.20) h);

    --color-border-subtle: oklch(from var(--base-neutral) .87 calc(c * .25) h);
    --color-border: oklch(from var(--base-neutral) .80 calc(c * .35) h);
    --color-border-strong: oklch(from var(--base-neutral) .70 calc(c * .50) h);

    --state-hover: oklch(from var(--base-neutral) .90 calc(c * .25) h);
    --state-selected: oklch(from var(--base-selection) .91 calc(c * .35) h);
    --state-selected-edge: oklch(from var(--base-selection) .59 calc(c * .95) h);
    --state-drop-edge: 1.5px dashed oklch(from var(--base-selection) .59 calc(c * .95) h);
    --color-focus-ring: oklch(from var(--base-selection) .55 calc(c * 1.10) h);
    --color-selection-outline: oklch(from var(--base-selection) .55 calc(c * 1.10) h / .80);

    --color-status-warning: oklch(from var(--base-action) .70 c h);
    --color-progress-start: oklch(from var(--base-action) .60 c h);
    --color-progress-middle: oklch(from var(--base-action) .72 c h);
    --color-progress-end: oklch(from var(--base-action) .84 calc(c * .85) h);

    --color-music-outline: oklch(from var(--base-action) .62 calc(c * .85) h);
    --color-drag-source-bg: oklch(from var(--base-action) .93 calc(c * .30) h);
    --color-drag-source-edge: oklch(from var(--base-action) .72 calc(c * .75) h);
    --color-drag-source-outline: oklch(from var(--base-action) .62 calc(c * .95) h);

Use relative OKLCH for scrim and shadows, preserving the existing alpha knobs. Do not convert them to opaque colors.

In :root[data-theme = 'dark'], override the semantic colors with:

    --color-bg: oklch(from var(--base-neutral) .12 calc(c * 1.15) h);
    --color-surface: oklch(from var(--base-neutral) .17 calc(c * 1.05) h);
    --color-surface-raised: oklch(from var(--base-neutral) .25 c h);
    --color-surface-accent: oklch(from var(--base-selection) .25 calc(c * .35) h);
    --color-surface-paper: oklch(from var(--base-neutral) .22 c h);

    --color-text: oklch(from var(--palette-snow-white) .91 c h);
    --color-text-muted: oklch(from var(--palette-wet-weather) .72 c h);
    --color-text-placeholder: oklch(from var(--palette-wet-weather) .68 c h);
    --color-text-link: oklch(from var(--base-selection) .74 calc(c * .90) h);

    --color-border-subtle: oklch(from var(--base-neutral) .27 calc(c * .70) h);
    --color-border: oklch(from var(--base-neutral) .34 calc(c * .80) h);
    --color-border-strong: oklch(from var(--base-neutral) .46 c h);

    --state-hover: oklch(from var(--base-neutral) .23 calc(c * .80) h);
    --state-selected: oklch(from var(--base-selection) .28 calc(c * .38) h);
    --state-selected-edge: oklch(from var(--base-selection) .68 calc(c * .85) h);
    --state-drop-edge: 1.5px dashed oklch(from var(--base-selection) .68 calc(c * .85) h);
    --color-focus-ring: oklch(from var(--base-selection) .72 c h);
    --color-selection-outline: oklch(from var(--base-selection) .72 c h / .82);

    --color-status-warning: oklch(from var(--base-action) .76 calc(c * .90) h);
    --color-music-outline: oklch(from var(--base-action) .76 calc(c * .90) h);
    --color-drag-source-bg: oklch(from var(--base-action) .30 calc(c * .35) h);
    --color-drag-source-edge: oklch(from var(--base-action) .66 calc(c * .70) h);
    --color-drag-source-outline: oklch(from var(--base-action) .76 calc(c * .90) h);

If a specified value fails the contract because of browser gamut mapping, change only L or C on that semantic derivative, rerun the test, and record the final value in the task checkpoint. Do not change anchor hue or role.

- [ ] **Step 7: Run the focused theme tests**

Run:

    pnpm --filter @stagistic/ui test -- src/tokens.test.ts
    pnpm --filter @stagistic/ui test:browser -- src/themeTokens.browser.test.ts src/atoms/Input.browser.test.tsx src/focusRing.browser.test.tsx

Expected: PASS.

- [ ] **Step 8: Prepare the review checkpoint**

Run:

    git diff --check
    git diff -- packages/ui/styles/tokens.css packages/ui/src/tokens.test.ts packages/ui/src/test/colorContrast.ts packages/ui/src/themeTokens.browser.test.ts

Proposed commit message for the user:

    feat(ui): establish yellow accent product theme

Do not run git commit.

---

### Task 2: Separate music identity from interaction state

**Files:**

- Modify: packages/editor/src/editor/tiptap/nodes/MusicPill.module.css
- Modify: packages/editor/src/editor/components/musicRange/MusicRangeOverlay.module.css
- Modify: packages/editor/src/editor/components/blockActions/overlay/useDragSourceHighlight.ts
- Create: packages/editor/src/editor/components/blockActions/overlay/useDragSourceHighlight.browser.test.tsx
- Modify: packages/editor/src/editor/tiptap/nodes/musicNode.browser.test.tsx

**Interfaces:**

- Consumes: --color-music-outline, --color-selection-outline, --color-focus-ring, and the three --color-drag-source-* tokens from Task 1.
- Produces: yellow persistent music identity, Lime active/manipulation feedback, and yellow drag-source highlighting without inline color mixing.

- [ ] **Step 1: Add failing music color assertions**

Extend boxes the music with an outline and no horizontal padding or border in packages/editor/src/editor/tiptap/nodes/musicNode.browser.test.tsx:

    const musicReference = document.createElement('span');

    musicReference.style.color = 'var(--color-music-outline)';
    document.body.appendChild(musicReference);

    expect(cs.outlineColor).toBe(getComputedStyle(musicReference).color);

    musicReference.remove();

Add a second test beside it:

    it('uses Lime rather than yellow for the active music interaction', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'Night');
        await activatePill();

        const tagBody = await poll(
            () => document.querySelector<HTMLElement>(
                '[data-music-pill="start"] [data-music-title-input="start"]',
            )?.parentElement,
            'active music body',
        );
        const selectionReference = document.createElement('span');

        selectionReference.style.color = 'var(--color-selection-outline)';
        document.body.appendChild(selectionReference);

        expect(getComputedStyle(tagBody).outlineColor)
            .toBe(getComputedStyle(selectionReference).color);

        selectionReference.remove();
    });

In renders one persistent range aligned with the start of its endpoint blocks, after the range is found, add:

    const musicReference = document.createElement('span');

    musicReference.style.color = 'var(--color-music-outline)';
    document.body.appendChild(musicReference);

    expect(getComputedStyle(range).backgroundColor)
        .toBe(getComputedStyle(musicReference).color);

    musicReference.remove();

- [ ] **Step 2: Create the failing drag-source semantic test**

Create packages/editor/src/editor/components/blockActions/overlay/useDragSourceHighlight.browser.test.tsx:

    import '@stagistic/ui/styles/base.css';

    import {createRoot, type Root} from 'react-dom/client';
    import {
        afterEach, describe, expect, it,
    } from 'vite-plus/test';
    import {userEvent} from 'vite-plus/test/browser';

    import {useDragSourceHighlight} from './useDragSourceHighlight';

    let root: Root | null = null;

    const Harness = () => {
        const {applyDraggedSourceHighlight} = useDragSourceHighlight();

        return (
            <div data-editor="true">
                <p data-id="block-1" blocktype="dialogue">Text</p>
                <button
                    type="button"
                    onClick={() => applyDraggedSourceHighlight('block-1')}
                >
                    Highlight
                </button>
            </div>
        );
    };

    afterEach(() => {
        root?.unmount();
        root = null;
        document.body.innerHTML = '';
        document.querySelectorAll('[data-drag-source-highlight]').forEach(
            element => element.remove(),
        );
    });

    describe('drag source highlight', () => {
        it('uses the named yellow drag-source tokens', async () => {
            const host = document.createElement('div');

            document.body.appendChild(host);
            root = createRoot(host);
            root.render(<Harness />);

            await expect.poll(() => host.querySelector('button')).not.toBeNull();
            await userEvent.click(host.querySelector('button')!);

            const style = document.querySelector<HTMLStyleElement>(
                'style[data-drag-source-highlight="true"]',
            );

            expect(style?.textContent).toContain('var(--color-drag-source-bg)');
            expect(style?.textContent).toContain('var(--color-drag-source-edge)');
            expect(style?.textContent).toContain('var(--color-drag-source-outline)');
            expect(style?.textContent).not.toContain('color-mix');
        });
    });

- [ ] **Step 3: Run the focused tests and verify they fail**

Run:

    pnpm --filter @stagistic/editor test:browser -- src/editor/tiptap/nodes/musicNode.browser.test.tsx src/editor/components/blockActions/overlay/useDragSourceHighlight.browser.test.tsx

Expected: FAIL because music is neutral at rest and drag-source CSS still embeds color-mix().

- [ ] **Step 4: Implement music-domain and interaction colors**

In packages/editor/src/editor/tiptap/nodes/MusicPill.module.css, set:

    .pill {
        --music-active-border-color: var(--color-selection-outline);
        --music-border-color: var(--color-music-outline);

        /* Preserve all existing non-color declarations. */
    }

Keep the existing .active assignment to --music-active-border-color.

In packages/editor/src/editor/components/musicRange/MusicRangeOverlay.module.css:

    .range {
        /* Preserve positioning and dimensions. */
        background: var(--color-music-outline);
    }

    .dropRangePreview {
        /* Preserve positioning and dimensions. */
        background: var(--color-focus-ring);
        opacity: .68;
    }

    .dropTarget {
        /* Preserve positioning and dimensions. */
        background: var(--color-focus-ring);
        opacity: .50;
    }

Keep orphan/error semantics independent. Do not replace --color-status-warning or --color-status-danger.

- [ ] **Step 5: Replace inline drag-source mixing with named tokens**

In packages/editor/src/editor/components/blockActions/overlay/useDragSourceHighlight.ts, replace the three generated declarations:

    'background: var(--color-drag-source-bg) !important;',
    'box-shadow: inset 0 0 0 1px var(--color-drag-source-edge) !important;',
    'outline: 1px solid var(--color-drag-source-outline) !important;',

Keep selector escaping, lifecycle cleanup, radius, and important flags unchanged.

- [ ] **Step 6: Run editor music and drag coverage**

Run:

    pnpm --filter @stagistic/editor test:browser -- src/editor/tiptap/nodes/musicNode.browser.test.tsx src/editor/tiptap/nodes/musicPillInteraction.browser.test.tsx src/editor/components/blockActions/overlay/useDragSourceHighlight.browser.test.tsx
    pnpm --filter @stagistic/editor typecheck

Expected: PASS.

- [ ] **Step 7: Prepare the review checkpoint**

Run:

    git diff --check
    git diff -- packages/editor/src/editor/tiptap/nodes/MusicPill.module.css packages/editor/src/editor/components/musicRange/MusicRangeOverlay.module.css packages/editor/src/editor/components/blockActions/overlay/useDragSourceHighlight.ts packages/editor/src/editor/components/blockActions/overlay/useDragSourceHighlight.browser.test.tsx packages/editor/src/editor/tiptap/nodes/musicNode.browser.test.tsx

Proposed commit message for the user:

    style(editor): separate music and selection accents

Do not run git commit.

---

### Task 3: Tighten floating-surface radii

**Files:**

- Modify: packages/ui/styles/tokens.css
- Modify: packages/ui/src/dialogs/ModalDialog.module.css
- Modify: packages/ui/src/dialogs/AttributeManagerModal.module.css
- Modify: packages/ui/src/dialogs/ScriptSettingsModal.module.css
- Modify: packages/ui/src/layout/AppHeader.module.css
- Modify: packages/ui/src/molecules/ScriptActionsMenu.module.css
- Modify: packages/ui/src/dialogs/ModalDialog.browser.test.tsx
- Modify: packages/editor/src/editor/components/CharacterSuggestionsOverlay.module.css
- Modify: packages/editor/src/editor/components/MusicSuggestionsOverlay.module.css
- Modify: packages/editor/src/editor/components/EditorBlockActionsOverlay.module.css
- Modify: packages/editor/src/editor/components/characterSuggestions/CharacterSuggestionsOverlay.browser.test.tsx

**Interfaces:**

- Consumes: --radius-md and existing menu/bubble-menu tokens.
- Produces: one 8px radius for ordinary dialogs, menus, and suggestion panels while preserving full-radius semantic shapes.

- [ ] **Step 1: Add a failing modal-radius assertion**

Extend mounts the dialog element once opened in packages/ui/src/dialogs/ModalDialog.browser.test.tsx:

    const panel = dialog.firstElementChild;

    if (!(panel instanceof HTMLElement)) {
        throw new Error('Expected modal panel');
    }

    expect(getComputedStyle(panel).borderRadius).toBe('8px');

- [ ] **Step 2: Add a failing character-suggestion radius assertion**

In packages/editor/src/editor/components/characterSuggestions/CharacterSuggestionsOverlay.browser.test.tsx, extend the first test that opens the character listbox:

    const listbox = await waitForVisibleListbox();

    expect(getComputedStyle(listbox).borderRadius).toBe('8px');

Use the existing waitForVisibleListbox helper; do not create a second overlay harness.

- [ ] **Step 3: Run both tests and verify they fail**

Run:

    pnpm --filter @stagistic/ui test:browser -- src/dialogs/ModalDialog.browser.test.tsx
    pnpm --filter @stagistic/editor test:browser -- src/editor/components/characterSuggestions/CharacterSuggestionsOverlay.browser.test.tsx

Expected: FAIL because modal panels use --radius-lg and suggestion panels use --radius-xl.

- [ ] **Step 4: Change only ordinary floating surfaces to medium radius**

Make these exact substitutions:

- packages/ui/styles/tokens.css: --bubble-menu-radius becomes var(--radius-md).
- packages/ui/src/dialogs/ModalDialog.module.css: .panel uses var(--radius-md).
- packages/ui/src/dialogs/AttributeManagerModal.module.css: the top-level modal surface uses var(--radius-md).
- packages/ui/src/dialogs/ScriptSettingsModal.module.css: the top-level modal surface uses var(--radius-md).
- packages/ui/src/layout/AppHeader.module.css: .menuPopover uses var(--radius-md).
- packages/ui/src/molecules/ScriptActionsMenu.module.css: the floating menu panel uses var(--radius-md).
- packages/editor/src/editor/components/CharacterSuggestionsOverlay.module.css: .panel uses var(--radius-md).
- packages/editor/src/editor/components/MusicSuggestionsOverlay.module.css: .panel uses var(--radius-md).
- packages/editor/src/editor/components/EditorBlockActionsOverlay.module.css: .menu uses var(--radius-md).

Do not change full-radius tags, switches, sliders, progress tracks, dots, icon-button pill opt-ins, or status chips. Do not change Card, Section, or PageHeader container radii in this phase.

- [ ] **Step 5: Run floating-layer coverage**

Run:

    pnpm --filter @stagistic/ui test:browser -- src/dialogs/ModalDialog.browser.test.tsx src/dialogs/ScriptSettingsModal.browser.test.tsx src/layout/AppHeader.browser.test.tsx
    pnpm --filter @stagistic/editor test:browser -- src/editor/components/characterSuggestions/CharacterSuggestionsOverlay.browser.test.tsx src/editor/components/blockActions/BlockActionMenu.browser.test.tsx

Expected: PASS.

- [ ] **Step 6: Prepare the review checkpoint**

Run:

    git diff --check
    git diff -- packages/ui/styles/tokens.css packages/ui/src/dialogs packages/ui/src/layout/AppHeader.module.css packages/ui/src/molecules/ScriptActionsMenu.module.css packages/editor/src/editor/components/CharacterSuggestionsOverlay.module.css packages/editor/src/editor/components/MusicSuggestionsOverlay.module.css packages/editor/src/editor/components/EditorBlockActionsOverlay.module.css packages/editor/src/editor/components/characterSuggestions/CharacterSuggestionsOverlay.browser.test.tsx

Proposed commit message for the user:

    style(ui): tighten floating surface radii

Do not run git commit.

---

### Task 4: Apply action semantics to shared buttons

**Files:**

- Create: packages/ui/src/atoms/Button.browser.test.tsx
- Modify: packages/ui/src/atoms/Button.module.css

**Interfaces:**

- Consumes: --color-accent, --color-accent-hover, --color-on-accent, and --radius-md from Task 1.
- Produces: the shared primary-action appearance consumed by home, editor, export, settings, and dialogs.

- [ ] **Step 1: Add the failing computed-style test**

Create packages/ui/src/atoms/Button.browser.test.tsx:

    import '../../styles/base.css';

    import {createRoot, type Root} from 'react-dom/client';
    import {
        afterEach, describe, expect, it,
    } from 'vite-plus/test';

    import {
        getContrastRatio,
        readTokenColor,
    } from '../test/colorContrast';
    import {Button} from './Button';

    let root: Root | null = null;

    const renderPrimary = async () => {
        const host = document.createElement('div');

        document.body.appendChild(host);
        root = createRoot(host);
        root.render(<Button>Save</Button>);

        await expect.poll(() => host.querySelector('button')).not.toBeNull();

        return host.querySelector<HTMLButtonElement>('button')!;
    };

    afterEach(() => {
        root?.unmount();
        root = null;
        document.body.innerHTML = '';
        delete document.documentElement.dataset.theme;
    });

    describe.each(['light', 'dark'] as const)('%s primary Button', theme => {
        it('uses the action family with dark readable content and a medium radius', async () => {
            document.documentElement.dataset.theme = theme;

            const button = await renderPrimary();
            const styles = getComputedStyle(button);

            expect(styles.backgroundColor).toBe(readTokenColor('--color-accent'));
            expect(styles.color).toBe(readTokenColor('--color-on-accent'));
            expect(styles.borderRadius).toBe('8px');
            expect(getContrastRatio(styles.color, styles.backgroundColor))
                .toBeGreaterThanOrEqual(4.5);
        });
    });

- [ ] **Step 2: Run the test and verify it fails**

Run:

    pnpm --filter @stagistic/ui test:browser -- src/atoms/Button.browser.test.tsx

Expected: FAIL because the primary button still uses neutral text/surface colors and the full radius.

- [ ] **Step 3: Implement the shared button treatment**

Change the base button and primary variant in packages/ui/src/atoms/Button.module.css:

    .button {
        /* Keep all existing declarations except this radius change. */
        border-radius: var(--radius-md);
    }

    .button.primary {
        color: var(--color-on-accent);
        background: var(--color-accent);

        &:hover {
            background: var(--color-accent-hover);
        }
    }

Do not change Button.tsx, its variants, dimensions, pending behavior, or focus behavior. IconButton's explicit pill opt-in remains unchanged.

- [ ] **Step 4: Run shared-control coverage**

Run:

    pnpm --filter @stagistic/ui test -- src/atoms/Button.test.tsx src/atoms/IconButton.test.tsx
    pnpm --filter @stagistic/ui test:browser -- src/atoms/Button.browser.test.tsx src/atoms/Input.browser.test.tsx src/focusRing.browser.test.tsx

Expected: PASS.

- [ ] **Step 5: Prepare the review checkpoint**

Run:

    git diff --check
    git diff -- packages/ui/src/atoms/Button.module.css packages/ui/src/atoms/Button.browser.test.tsx

Proposed commit message for the user:

    feat(ui): apply yellow primary actions

Do not run git commit.

---

### Task 5: Make active sidebar rows fill-only

**Files:**

- Modify: packages/ui/src/molecules/ListRow.module.css
- Modify: packages/ui/src/editor-panels/EditorSidebar.module.css
- Modify: packages/ui/src/editor-panels/EditorSidebar.browser.test.tsx
- Modify: packages/app-routes/src/routes/script/editor/structure/ScriptStructureSidebar.module.css
- Create: packages/app-routes/src/routes/script/editor/structure/ScriptStructureSidebar.styles.test.ts
- Modify: packages/app-routes/src/routes/script/editor/music/ScriptMusicSidebar.module.css
- Modify: packages/app-routes/src/routes/script/editor/music/ScriptMusicSidebar.browser.test.tsx

**Interfaces:**

- Consumes: --state-hover and --state-selected from Task 1.
- Produces: a private --list-row-selected-shadow override used only by sidebar ListRow consumers. Generic selected ListRow instances keep their existing edge.

- [ ] **Step 1: Add failing character-sidebar assertions**

Extend the existing marks the matching character as active test in packages/ui/src/editor-panels/EditorSidebar.browser.test.tsx:

    const styles = getComputedStyle(activeRow);

    expect(styles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(styles.borderTopColor).toBe('rgba(0, 0, 0, 0)');
    expect(styles.boxShadow).toBe('none');

- [ ] **Step 2: Add a failing structure-sidebar source contract**

Create packages/app-routes/src/routes/script/editor/structure/ScriptStructureSidebar.styles.test.ts:

    import {readFileSync} from 'node:fs';

    import {
        describe, expect, it,
    } from 'vite-plus/test';

    const css = readFileSync(
        new URL('./ScriptStructureSidebar.module.css', import.meta.url),
        'utf8',
    );

    describe('structure sidebar selected row', () => {
        it('uses selected fill without a persistent edge', () => {
            const activeRule = css.match(/&\.active\s*\{([^}]*)\}/)?.[1] ?? '';

            expect(activeRule).toContain('background: var(--state-selected);');
            expect(activeRule).not.toContain('box-shadow');
            expect(activeRule).not.toContain('border');
        });
    });

- [ ] **Step 3: Add failing music-sidebar assertions**

In the highlights a music clicked in the editor test in packages/app-routes/src/routes/script/editor/music/ScriptMusicSidebar.browser.test.tsx, after aria-current becomes true, add:

    const selectedRow = navigationButton.closest('li');

    if (!selectedRow) {
        throw new Error('Expected selected music row');
    }

    const selectedStyles = getComputedStyle(selectedRow);

    expect(selectedStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(selectedStyles.boxShadow).toBe('none');

- [ ] **Step 4: Run the three tests and verify they fail**

Run:

    pnpm --filter @stagistic/ui test:browser -- src/editor-panels/EditorSidebar.browser.test.tsx
    pnpm --filter @stagistic/app-routes test -- src/routes/script/editor/structure/ScriptStructureSidebar.styles.test.ts
    pnpm --filter @stagistic/app-routes test:browser -- src/routes/script/editor/music/ScriptMusicSidebar.browser.test.tsx

Expected: all three new contracts FAIL against the current bordered/inset selected states.

- [ ] **Step 5: Add a private ListRow selected-edge override**

Change packages/ui/src/molecules/ListRow.module.css:

    .selected {
        background: var(--state-selected);
        box-shadow: var(
            --list-row-selected-shadow,
            inset 0 0 0 1px var(--state-selected-edge)
        );
    }

The default is deliberately unchanged outside sidebars.

- [ ] **Step 6: Remove persistent edges from each sidebar family**

In packages/ui/src/editor-panels/EditorSidebar.module.css, keep the one-pixel box model but make confirmed rows visually flat:

    .characterItem {
        overflow: hidden;
        background: transparent;
        border: 1px solid transparent;
        border-radius: var(--radius-md);

        &.unconfirmed {
            background: transparent;
            border-color: color-mix(
                in oklch,
                var(--character-color) 58%,
                var(--color-border)
            );
        }

        &.active {
            background: var(--state-selected);
            border-color: transparent;
            box-shadow: none;
        }
    }

Keep the unconfirmed border because it communicates data status. Ordering active after unconfirmed ensures an active unconfirmed row is still borderless.

In packages/app-routes/src/routes/script/editor/structure/ScriptStructureSidebar.module.css, reduce the active rule to:

    &.active {
        background: var(--state-selected);

        & .itemButton {
            background: transparent;
        }
    }

In packages/app-routes/src/routes/script/editor/music/ScriptMusicSidebar.module.css, opt the sidebar row out of the generic ListRow edge:

    .row {
        --list-row-selected-shadow: none;

        color: var(--color-text);
    }

- [ ] **Step 7: Run focused sidebar coverage**

Run:

    pnpm --filter @stagistic/ui test -- src/molecules/ListRow.test.tsx
    pnpm --filter @stagistic/ui test:browser -- src/editor-panels/EditorSidebar.browser.test.tsx
    pnpm --filter @stagistic/app-routes test -- src/routes/script/editor/structure/ScriptStructureSidebar.styles.test.ts
    pnpm --filter @stagistic/app-routes test:browser -- src/routes/script/editor/music/ScriptMusicSidebar.browser.test.tsx

Expected: PASS.

- [ ] **Step 8: Prepare the review checkpoint**

Run:

    git diff --check
    git diff -- packages/ui/src/molecules/ListRow.module.css packages/ui/src/editor-panels/EditorSidebar.module.css packages/ui/src/editor-panels/EditorSidebar.browser.test.tsx packages/app-routes/src/routes/script/editor/structure packages/app-routes/src/routes/script/editor/music/ScriptMusicSidebar.module.css packages/app-routes/src/routes/script/editor/music/ScriptMusicSidebar.browser.test.tsx

Proposed commit message for the user:

    style(editor): simplify active sidebar rows

Do not run git commit.

---

### Task 6: Recolor the continuous script surface and scene marker

**Files:**

- Modify: packages/editor/src/editor/Editor.module.css
- Modify: packages/editor/src/editor/tiptap/extensions/sceneNumbering.browser.test.tsx
- Modify: packages/editor/src/editor/mini/MiniScriptEditor.module.css
- Modify: packages/editor/src/editor/mini/MiniScriptEditor.browser.test.tsx
- Modify: packages/app-routes/src/routes/script/editor/settings/ScriptEditorSettingsPanel.module.css

**Interfaces:**

- Consumes: --base-action, --base-selection, --color-surface-paper, and the text tokens from Task 1.
- Produces: a yellow scene-start sticker, continuous paper contract, and semantic editor-preview names with no --base-blue or --base-amber reads.

- [ ] **Step 1: Add failing scene surface and marker assertions**

In the first scene numbering test, after reading the ::before style, add:

    const after = window.getComputedStyle(sceneEl, '::after');
    const actionReference = document.createElement('span');

    actionReference.style.background = 'var(--color-accent)';
    document.body.appendChild(actionReference);

    expect(after.backgroundColor).toBe(
        getComputedStyle(actionReference).backgroundColor,
    );
    expect(getComputedStyle(sceneEl).backgroundColor)
        .toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(sceneEl).borderTopWidth).toBe('0px');

    actionReference.remove();

- [ ] **Step 2: Add a failing mini-editor palette assertion**

In packages/editor/src/editor/mini/MiniScriptEditor.browser.test.tsx, add a test using the file's existing mount helper:

    it('uses the yellow scene marker and Lime selection family', async () => {
        const host = renderMiniEditor();
        const scene = await waitForElement<HTMLElement>(
            host,
            '[blocktype="scene"]',
        );
        const actionReference = document.createElement('span');
        const selectionReference = document.createElement('span');

        actionReference.style.background = 'var(--color-accent)';
        selectionReference.style.color = 'var(--color-selection-outline)';
        const miniRoot = host.firstElementChild;
        if (!(miniRoot instanceof HTMLElement)) {
            throw new Error('Mini editor root was not rendered');
        }
        miniRoot.append(actionReference, selectionReference);

        expect(getComputedStyle(scene, '::after').backgroundColor)
            .toBe(getComputedStyle(actionReference).backgroundColor);
        expect(getComputedStyle(selectionReference).color)
            .not.toBe(getComputedStyle(actionReference).backgroundColor);

        actionReference.remove();
        selectionReference.remove();
    });

- [ ] **Step 3: Run the editor tests and verify they fail**

Run:

    pnpm --filter @stagistic/editor test:browser -- src/editor/tiptap/extensions/sceneNumbering.browser.test.tsx src/editor/mini/MiniScriptEditor.browser.test.tsx

Expected: FAIL because the main marker reads --base-amber and the mini editor embeds the old palette.

- [ ] **Step 4: Map the main scene marker to the action role**

In packages/editor/src/editor/Editor.module.css, change:

    --color-scene-marker: var(--base-action);

Do not add a block background, border, card, divider, or other per-block surface.

- [ ] **Step 5: Replace the mini editor's embedded palette**

At the top of packages/editor/src/editor/mini/MiniScriptEditor.module.css, replace only the embedded color declarations:

    --mini-snow-white: oklch(.9490 .0083 91.48);
    --mini-steel-wool: oklch(.4918 .0118 238.71);
    --mini-muted-lime: oklch(.8000 .0978 101.11);
    --mini-primrose-yellow: oklch(.8540 .1432 89.53);
    --mini-wet-weather: oklch(.6184 .0024 17.22);
    --color-text: oklch(from var(--mini-steel-wool) .28 calc(c * 1.25) h);
    --color-text-muted: oklch(from var(--mini-wet-weather) .46 c h);
    --color-border: oklch(from var(--mini-steel-wool) .80 calc(c * .35) h);
    --color-surface: var(--mini-snow-white);
    --color-surface-accent: oklch(from var(--mini-muted-lime) .92 calc(c * .30) h);
    --color-selection-outline: oklch(from var(--mini-muted-lime) .55 calc(c * 1.10) h);
    --color-scene-marker: var(--mini-primrose-yellow);
    --color-accent: var(--mini-primrose-yellow);

Do not import the global product stylesheet into MiniScriptEditor; its existing isolation remains intentional.

- [ ] **Step 6: Rename editor-settings preview foundations**

In packages/app-routes/src/routes/script/editor/settings/ScriptEditorSettingsPanel.module.css:

- Rename --L-preview-amber to --L-preview-action.
- Rename --A-preview-amber, --A-preview-amber-soft, and --A-preview-amber-strong to the equivalent --A-preview-action names.
- Rename --L-preview-blue and --A-preview-blue to --L-preview-selection and --A-preview-selection.
- Change every --base-amber read to --base-action.
- Change every --base-blue read to --base-selection.

The resulting declarations begin:

    --L-preview-action: .64;
    --A-preview-action: .72;
    --A-preview-action-soft: .2;
    --A-preview-action-strong: .42;
    --L-preview-selection: .58;
    --A-preview-selection: .95;

Preserve the existing light/dark numeric values and alpha behavior; this step changes semantic ownership, not preview geometry.

- [ ] **Step 7: Run editor and route checks**

Run:

    pnpm --filter @stagistic/editor test:browser -- src/editor/tiptap/extensions/sceneNumbering.browser.test.tsx src/editor/mini/MiniScriptEditor.browser.test.tsx
    pnpm --filter @stagistic/app-routes test:browser -- src/routes/script/editor/settings/initial-pages/InitialPagesSettingsPanel.browser.test.tsx
    pnpm --filter @stagistic/editor typecheck
    pnpm --filter @stagistic/app-routes typecheck

Expected: PASS.

- [ ] **Step 8: Prepare the review checkpoint**

Run:

    git diff --check
    git diff -- packages/editor/src/editor/Editor.module.css packages/editor/src/editor/tiptap/extensions/sceneNumbering.browser.test.tsx packages/editor/src/editor/mini packages/app-routes/src/routes/script/editor/settings/ScriptEditorSettingsPanel.module.css

Proposed commit message for the user:

    style(editor): apply yellow scene semantics

Do not run git commit.

---

### Task 7: Verify the complete product theme

**Files:**

- Modify only if a check identifies a defect in files already changed by Tasks 1–6.
- Do not modify snapshots, test viewports, apps/landing, or unrelated failing code.

**Interfaces:**

- Consumes: all completed theme and component tasks.
- Produces: verified product-wide light/dark theme changes and an updated code graph.

- [ ] **Step 1: Prove legacy palette names are gone from product code**

Run:

    rg -n --glob '*.{css,ts,tsx}' -- '--palette-(lavender|copper|paper|umber|aubergine)|--base-(blue|amber)' packages/ui packages/editor packages/app-routes apps/web

Expected: no output.

- [ ] **Step 2: Prove landing remains untouched**

Run:

    git diff --name-only -- apps/landing

Expected: no output.

- [ ] **Step 3: Run package unit tests**

Run:

    pnpm --filter @stagistic/ui test
    pnpm --filter @stagistic/editor test
    pnpm --filter @stagistic/app-routes test

Expected: PASS, except any separately established pre-existing failure.

- [ ] **Step 4: Run package browser tests**

Run:

    pnpm --filter @stagistic/ui test:browser
    pnpm --filter @stagistic/app-routes test:browser
    pnpm --filter @stagistic/editor test:browser

Expected: PASS, except the editor's documented pre-existing viewport-sensitive failures. Report those without changing assertions or viewports.

- [ ] **Step 5: Run graph-wide typecheck and lint**

Run:

    npx tsc -b
    pnpm lint

Expected: PASS, except a separately established pre-existing failure in untouched code.

- [ ] **Step 6: Perform product visual QA**

Run the web app:

    pnpm --filter @stagistic/web dev --host 127.0.0.1

Inspect these states in both light and dark themes:

- home with normal, hover, focus-visible, primary, and disabled controls;
- editor with no sidebar, left sidebar, right sidebar, and both sidebars;
- active character, structure, and music rows;
- toolbar selected formats and open block-type menu;
- scene-start stickers while scrolling a multi-scene script;
- music pill, persistent range, drag source, and drop target;
- settings dialog, attribute manager, destructive confirmation, tooltip, and popover;
- export route and progress/warning states;
- narrow editor viewport using the existing responsive behavior.

Acceptance during inspection:

- the paper remains the dominant plane;
- script blocks remain one uninterrupted document;
- no active sidebar row has a resting border or inset edge;
- Yellow means action/music/progress/scene start;
- Lime means selection/focus/drop;
- no resting panel/card gains a shadow;
- ordinary buttons and floating surfaces are less pill-like;
- focus remains visible and no text becomes low-contrast.

If the shared browser host is unavailable, report that limitation and rely on the complete browser-test matrix above; do not substitute OS automation.

- [ ] **Step 7: Update the project graph**

Run:

    graphify update .

Expected: graphify completes without reporting an empty or corrupt update.

- [ ] **Step 8: Prepare the final review handoff**

Run:

    git diff --check
    git status --short
    git diff --stat

Summarize:

- final semantic token values;
- light/dark contrast ratios from themeTokens.browser.test.ts;
- all test/typecheck/lint results;
- any pre-existing failures;
- visual-QA status;
- confirmation that apps/landing and stored schemas were untouched.

Proposed final commit message for the user if they prefer one squashed commit:

    feat(ui): adopt yellow accent product theme

Do not run git commit.
