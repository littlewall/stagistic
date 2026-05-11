# Adding a new block type

This codebase has one block-type "registry" split across two packages:

- **`@stagistic/script`** owns the *data-model* facts (identifiers,
  labels, default settings). One file per block in
  `packages/script/src/blocks/specs/`.
- **`@stagistic/editor`** owns the *presentation* facts (CSS class, CSS
  variables, icon). One folder per block in
  `packages/editor/src/editor/blocks/`.

Everything else — identifier maps, default settings, item lists, Tiptap
node definitions, class-name maps, icon maps, CSS-variable dispatch — is
*derived* from these two registries. You don't edit them.

This guide walks through adding a hypothetical `montage` block.

---

## Step 1 — Pick a stable element identifier

Add the new `ELEMENT_*` constant in
`packages/script/src/fountain/types.ts` and include it in the
`FountainElementType` union:

```ts
export const ELEMENT_MONTAGE = 'fountain_montage';

export type FountainElementType =
    | typeof ELEMENT_SCENE_HEADING
    | …
    | typeof ELEMENT_MONTAGE;
```

This is the only place in the script package where you touch a union
manually. Everything else flows from the spec.

---

## Step 2 — Add the spec (one file)

Create `packages/script/src/blocks/specs/montage.ts`:

```ts
import {
    ELEMENT_ACTION,
    ELEMENT_MONTAGE,
} from '../../fountain/types';
import type {FountainBlockSpec} from '../types';

export const montageSpec = {
    nodeType: 'montage',                 // camelCase Tiptap node name
    blockType: 'montage',                // snake_case stored identifier
    legacyType: ELEMENT_MONTAGE,         // the constant from step 1
    label: 'Montage',                    // toolbar/menu label
    listId: 'element-montage',           // stable React key
    enterFallback: ELEMENT_ACTION,       // fallback block after Enter
    defaultSettings: {
        spacingBeforeEm: 1.0,
        lineHeight: 1.2,
        shortcut: '8',                   // optional keyboard shortcut
        nextElement: ELEMENT_ACTION,
        textAlign: 'left',
        casing: 'normal',
        isBold: false,
        isItalic: false,
        isUnderline: false,
    },
} as const satisfies FountainBlockSpec;
```

Then register it in `packages/script/src/blocks/specs/index.ts`:

```ts
import {montageSpec} from './montage';

export const ALL_BLOCK_SPECS = [
    sceneHeadingSpec,
    // …existing entries…
    montageSpec,
] as const;

export {/* …existing exports… */ montageSpec};
```

After this step:
- `DEFAULT_EDITOR_SETTINGS.blocks[ELEMENT_MONTAGE]` works.
- `FOUNTAIN_BLOCK_ITEMS` contains the new entry.
- `resolveScriptBlockNodeType('montage')` resolves correctly.
- `getEnterFallback(ELEMENT_MONTAGE)` returns `ELEMENT_ACTION`.

The `as const satisfies FountainBlockSpec` pattern is what lets the
derived `ScriptBlockNodeType`/`ScriptBlockType` unions automatically
include the new identifiers.

---

## Step 3 — Add the binding folder (3 files)

Create `packages/editor/src/editor/blocks/montage/`:

**`montage.module.css`** — uses the standard 9-variable pattern with
your block's CSS-var prefix (here, `montage`):

```css
.montage {
    padding-top: var(--montage-spacing-before, 0);
    padding-right: var(--montage-indent-right, 0);
    padding-left: var(--montage-indent-left, 0);
    font-weight: var(--montage-font-weight, 400);
    font-style: var(--montage-font-style, normal);
    line-height: var(--montage-line-height, inherit);
    color: var(--color-block-montage);
    text-align: var(--montage-align, left);
    text-decoration-line: var(--montage-underline, none);
    text-transform: var(--montage-casing, none);
}
```

**`icon.tsx`** — an SVG component named `<MontageIcon />`:

```tsx
export const MontageIcon = () => (
    <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
    >
        <path d="M…" />
    </svg>
);
```

**`binding.ts`** — pairs the spec with its presentation:

```ts
import {montageSpec} from '@stagistic/script';

import type {FountainBlockBinding} from '../types';
import {MontageIcon} from './icon';
import styles from './montage.module.css';

export const montageBinding: FountainBlockBinding = {
    spec: montageSpec,
    cssClass: styles.montage,
    cssVarPrefix: 'montage',
    icon: MontageIcon,
};
```

**`index.ts`** — single re-export:

```ts
export {montageBinding} from './binding';
```

---

## Step 4 — Register the binding

Add the binding to
`packages/editor/src/editor/blocks/registry.ts`:

```ts
import {montageBinding} from './montage';

export const ALL_BLOCK_BINDINGS: readonly FountainBlockBinding[] = [
    sceneHeadingBinding,
    // …existing entries…
    montageBinding,
];

export {/* …existing exports… */ montageBinding};
```

After this step:
- `FountainBlockNodes` includes a Tiptap node for `montage`.
- `BLOCK_TYPE_CLASS_NAMES[ELEMENT_MONTAGE]` returns the CSS class.
- `BLOCK_ICONS[ELEMENT_MONTAGE]` renders the icon.
- `getEditorCssVars()` emits the 9 standard `--montage-*` variables.

---

## Step 5 — Add the block colour to `tokens.css`

In `packages/ui/styles/tokens.css`, add the block's per-theme lightness
and derived colour:

```css
/* Light mode :root */
--L-block-montage: 0.180;

/* Light mode semantic tokens */
--color-block-montage: oklch(from var(--base-neutral) var(--L-block-montage) calc(c * var(--C-block)) h);

/* Dark mode :root[data-theme='dark'] */
--L-block-montage: 0.860;
```

This file is theme data; it stays hand-maintained intentionally — the
light/dark split lives here and nowhere else.

---

## Step 6 — Verify

```sh
pnpm exec tsc --noEmit -p packages/script/tsconfig.json
pnpm exec tsc --noEmit -p packages/editor/tsconfig.json
pnpm exec tsc --noEmit -p packages/app-routes/tsconfig.json
```

Manual smoke test:
- Load any script and check the toolbar shows the new block.
- Insert one via the toolbar; the block renders with the styles you set.
- Use the keyboard shortcut from `defaultSettings.shortcut` and confirm
  it switches to your block.
- Press Enter on the new block and confirm it lands on `enterFallback`.
- Toggle light/dark theme and confirm the colour adapts.

---

## What if my block needs bespoke behaviour?

The "act" block is the precedent. It has:
- A special spacing derived from `structure.actDisplay.linesBefore` (not
  the standard `spacingBeforeEm`).
- An extra `--act-spacing-after` variable.

This is handled in `packages/editor/src/editor/editorSettings/cssVars.ts`
as an explicit override block *after* the standard loop. If your block
needs the same treatment, follow the act pattern: emit the 9 standard
vars via the binding, then override or extend in `cssVars.ts`.

---

## Files you did NOT touch

The point of the registry is that these stayed untouched while your
block was added:

- `packages/script/src/fountain/blockTypeMapping.ts` — identifier maps
- `packages/script/src/fountain/fountainBlocks.ts` — `FOUNTAIN_BLOCK_ITEMS`
- `packages/script/src/settings/defaults.ts` — `DEFAULT_EDITOR_SETTINGS`
- `packages/editor/src/editor/tiptap/nodes/` — Tiptap nodes
- `packages/editor/src/editor/blocks/fountain/blockStyles.ts` — class map
- `packages/editor/src/editor/blocks/controls/blockIcons.tsx` — icon map
- `packages/editor/src/editor/editorSettings/cssVars.ts` — CSS-var loop
- `packages/editor/src/editor/blocks/fountain/blockTypes.ts` — type union

If you find yourself editing any of these to add a block, you've drifted
off the path — the registry is designed so the answer is always "edit
the spec or the binding."
