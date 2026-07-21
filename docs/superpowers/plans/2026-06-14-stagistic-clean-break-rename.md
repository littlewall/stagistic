# Stagistic Clean-Break Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Fountain-flavoured data-model identifiers and types with clean Stagistic ones, drop the legacy node mode and the old Fountain parser/serializer, and add a temporary one-shot migration for the single local test script.

**Architecture:** Evolution + clean break (no production data). Keep the dual representation (ProseMirror doc + relational projection), the block-spec registry, and the relational schema. Rename `fountain*` → neutral domain names, rename block identifiers (`scene_heading`→`scene`, `action`→`stage_direction`, `parenthetical`→`aside`), remove `legacyType`/`ELEMENT_*`, remove the legacy `fountainBlock` node mode, and delete the old Fountain parser/serializer + import wiring (the new syntax parser is downstream spec #2). A temporary load-time migration upgrades the one local test script, then is deleted.

**Tech Stack:** TypeScript, pnpm workspaces, Tiptap/ProseMirror, Drizzle (pglite), Vitest via the `vp` wrapper.

**Source specs:** [data model](../specs/2026-06-14-stagistic-data-model-design.md), [syntax](../specs/2026-06-14-stagistic-syntax-design.md).

---

## Execution notes (read first)

- **This is a coordinated cross-package rename.** `@stagistic/script` is the source of truth; renaming it breaks every downstream package until that package is updated. **The monorepo typecheck is expected to be RED between phases and GREEN only at the end of Phase D.** Per-phase commits are checkpoints, not independently-shippable builds. Phase E (migration) lands last.
- **Dependency order is mandatory:** A (script) → B (db) → C (editor) → D (app-routes + ui) → E (migration).
- **Verification commands:**
  - Package typecheck: `pnpm exec tsc --noEmit -p packages/<pkg>/tsconfig.json`
  - Full test suite: `pnpm test` (runs `vp test run`)
  - The repo-wide typecheck/lint: `pnpm exec tsc --noEmit -p tsconfig.json && pnpm lint`
- **`@stagistic/script` currently has no tests.** Phase A adds the first ones (resolvers + enter-fallback). Phase E adds migration tests. The DB package already has tests that must be updated in Phase B.
- **No `ELEMENT_*` survives.** If you find yourself keeping a legacy constant "just in case", that is the coercion we explicitly decided against — delete it.

---

## Phase A — `@stagistic/script`: vocabulary, types, drop legacy, remove parser

**Outcome:** the block-type vocabulary and identifier scheme are clean; `legacyType`/`ELEMENT_*`/legacy node mode/old parser are gone; new resolver + enter-fallback tests pass; `@stagistic/script` typechecks on its own.

### Task A1: Rename block-spec identifiers and drop `legacyType`

**Files:**
- Modify + rename: `packages/script/src/blocks/specs/sceneHeading.ts` → `scene.ts`
- Modify + rename: `packages/script/src/blocks/specs/stageDirections.ts` → `stageDirection.ts`
- Modify: `packages/script/src/blocks/specs/aside.ts`
- Modify: `packages/script/src/blocks/specs/{act,character,dialogue,lyrics,note}.ts`
- Modify: `packages/script/src/blocks/specs/index.ts`
- Modify: `packages/script/src/blocks/types.ts`

**Identifier rename map (apply across every spec):**

| Export | `nodeType` | `blockType` | `listId` | `label` |
|---|---|---|---|---|
| `sceneSpec` (was `sceneHeadingSpec`) | `sceneHeading`→`scene` | `scene_heading`→`scene` | `element-scene-heading`→`element-scene` | `Scene heading`→`Scene` |
| `stageDirectionSpec` (was `stageDirectionsSpec`) | `action`→`stageDirection` | `action`→`stage_direction` | `element-action`→`element-stage-direction` | `Stage directions`→`Stage direction` |
| `asideSpec` | `parenthetical`→`aside` | `parenthetical`→`aside` | `element-parenthetical`→`element-aside` | `Aside` (unchanged) |
| `actSpec`, `characterSpec`, `dialogueSpec`, `lyricsSpec`, `noteSpec` | unchanged | unchanged | unchanged | unchanged |

- [ ] **Step 1: Edit `blocks/types.ts` to drop `legacyType` and rename the interface**

Remove the `legacyType` field and the `FountainElementType` import. Rename `FountainBlockSpec` → `BlockSpec` and `FountainBlockSpecDefaults` → `BlockSpecDefaults`. `enterFallback`/`nextElement` are typed `ScriptBlockNodeType` (defined in A2's resolver file); for now type them `string` and tighten in A2 — but prefer importing the type once A2 exists. Concretely, the interface becomes:

```ts
import type {BlockSpacingSettings} from '../settings';

export type BlockSpecDefaults = Required<Pick<
    BlockSpacingSettings,
    'spacingBeforeEm' | 'lineHeight' | 'nextElement' | 'textAlign' | 'casing' | 'isBold' | 'isItalic' | 'isUnderline'
>> & Pick<
    BlockSpacingSettings,
    'spacingAfterEm' | 'shortcut' | 'indentLeftChars' | 'indentRightChars' | 'indentLeftPx' | 'indentRightPx' | 'fontSizePx'
>;

export interface BlockSpec {
    readonly nodeType: string,
    readonly blockType: string,
    readonly label: string,
    readonly listId: string,
    readonly enterFallback: string,
    readonly defaultSettings: BlockSpecDefaults,
}
```

- [ ] **Step 2: Rewrite each spec file**

For each spec: drop the `legacyType` field, drop the `ELEMENT_*` imports, change `... satisfies FountainBlockSpec` → `... satisfies BlockSpec`, and set `enterFallback`/`nextElement` to the new `nodeType` string of the target block. Example for the renamed scene spec (`scene.ts`):

```ts
import type {BlockSpec} from '../types';

export const sceneSpec = {
    nodeType: 'scene',
    blockType: 'scene',
    label: 'Scene',
    listId: 'element-scene',
    enterFallback: 'stageDirection',
    defaultSettings: {
        spacingBeforeEm: 2.0,
        lineHeight: 1.2,
        shortcut: '1',
        nextElement: 'stageDirection',
        textAlign: 'left',
        casing: 'uppercase',
        isBold: true,
        isItalic: false,
        isUnderline: false,
    },
} as const satisfies BlockSpec;
```

Apply the same shape to the other specs, using these `enterFallback`/`nextElement` targets (preserving today's chains): `act`→`scene`; `stageDirection`→`stageDirection`; `character`→`dialogue`; `aside`→`character`; `dialogue`→`character`; `lyrics`→`lyrics`; `note`→`stageDirection`.

- [ ] **Step 3: Update `specs/index.ts`**

Update imports to the renamed files/exports and the `ALL_BLOCK_SPECS` array:

```ts
import {actSpec} from './act';
import {asideSpec} from './aside';
import {characterSpec} from './character';
import {dialogueSpec} from './dialogue';
import {lyricsSpec} from './lyrics';
import {noteSpec} from './note';
import {sceneSpec} from './scene';
import {stageDirectionSpec} from './stageDirection';

export const ALL_BLOCK_SPECS = [
    sceneSpec,
    actSpec,
    stageDirectionSpec,
    characterSpec,
    asideSpec,
    dialogueSpec,
    lyricsSpec,
    noteSpec,
] as const;

export {actSpec, asideSpec, characterSpec, dialogueSpec, lyricsSpec, noteSpec, sceneSpec, stageDirectionSpec};
```

- [ ] **Step 4: Commit**

```bash
git add packages/script/src/blocks
git commit -m "refactor(script): clean-break block vocabulary, drop legacyType"
```

### Task A2: Simplify the resolver layer (drop legacy maps) and rename the package directory

**Files:**
- Modify + rename: `packages/script/src/fountain/blockTypeMapping.ts` → `packages/script/src/syntax/blockTypeMapping.ts`
- Modify + rename: `packages/script/src/fountain/fountainBlocks.ts` → `packages/script/src/syntax/blockItems.ts`
- Modify + rename: `packages/script/src/fountain/characterNames.ts` → `packages/script/src/syntax/characterNames.ts`
- Modify + rename: `packages/script/src/fountain/sharedText.ts` → `packages/script/src/syntax/sharedText.ts` (keep only if still imported after parser removal; otherwise delete in A4)
- Delete: `packages/script/src/fountain/types.ts` (the `ELEMENT_*` + AST types die with the parser)
- Modify: `packages/script/src/blocks/derived/blockItems.ts`, `enterFallback.ts`, `defaultBlockSettings.ts`
- Modify: `packages/script/src/index.ts`

- [ ] **Step 1: Rewrite `blockTypeMapping.ts` without the legacy maps**

Remove `buildLegacyByNodeType`, `buildNodeTypeByLegacy`, `LEGACY_*` exports, `isLegacyFountainBlockType`, `getLegacyFountainBlockTypeFromNodeType`, `resolveLegacyFountainBlockType`, and the legacy branch of `resolveScriptBlockNodeType`. Keep `ScriptBlockNodeType`/`ScriptBlockType` (derived from `ALL_BLOCK_SPECS`), `SCRIPT_BLOCK_TYPE_BY_NODE_TYPE`, `SCRIPT_BLOCK_NODE_TYPE_BY_BLOCK_TYPE`, the `is*` guards, `get*FromNodeType`/`getScriptBlockNodeTypeFromBlockType`, and `resolveScriptBlockNodeType`/`resolveScriptBlockType` (now only node-type + block-type branches). Result:

```ts
import {ALL_BLOCK_SPECS} from '../blocks/specs';

export type ScriptBlockNodeType = (typeof ALL_BLOCK_SPECS)[number]['nodeType'];
export type ScriptBlockType = (typeof ALL_BLOCK_SPECS)[number]['blockType'];

const SCRIPT_BLOCK_TYPE_BY_NODE_TYPE = (() => {
    const map = {} as Record<ScriptBlockNodeType, ScriptBlockType>;
    for (const spec of ALL_BLOCK_SPECS) map[spec.nodeType] = spec.blockType;
    return map;
})();

const SCRIPT_BLOCK_NODE_TYPE_BY_BLOCK_TYPE = (() => {
    const map = {} as Record<ScriptBlockType, ScriptBlockNodeType>;
    for (const spec of ALL_BLOCK_SPECS) map[spec.blockType] = spec.nodeType;
    return map;
})();

const NODE_TYPE_SET: ReadonlySet<string> = new Set(Object.keys(SCRIPT_BLOCK_TYPE_BY_NODE_TYPE));
const BLOCK_TYPE_SET: ReadonlySet<string> = new Set(Object.values(SCRIPT_BLOCK_TYPE_BY_NODE_TYPE));

export const SCRIPT_BLOCK_NODE_TYPES = Object.keys(SCRIPT_BLOCK_TYPE_BY_NODE_TYPE) as ScriptBlockNodeType[];
export const SCRIPT_BLOCK_TYPES = Object.values(SCRIPT_BLOCK_TYPE_BY_NODE_TYPE);

export const isScriptBlockNodeType = (v: unknown): v is ScriptBlockNodeType => typeof v === 'string' && NODE_TYPE_SET.has(v);
export const isScriptBlockType = (v: unknown): v is ScriptBlockType => typeof v === 'string' && BLOCK_TYPE_SET.has(v);

export const getScriptBlockNodeTypeFromBlockType = (b: ScriptBlockType): ScriptBlockNodeType => SCRIPT_BLOCK_NODE_TYPE_BY_BLOCK_TYPE[b];
export const getScriptBlockTypeFromNodeType = (n: ScriptBlockNodeType): ScriptBlockType => SCRIPT_BLOCK_TYPE_BY_NODE_TYPE[n];

export const resolveScriptBlockNodeType = (v: unknown): ScriptBlockNodeType | null =>
    isScriptBlockNodeType(v) ? v : isScriptBlockType(v) ? SCRIPT_BLOCK_NODE_TYPE_BY_BLOCK_TYPE[v] : null;

export const resolveScriptBlockType = (v: unknown): ScriptBlockType | null => {
    const n = resolveScriptBlockNodeType(v);
    return n ? SCRIPT_BLOCK_TYPE_BY_NODE_TYPE[n] : null;
};
```

- [ ] **Step 2: Update the derived block files**

In `blocks/derived/blockItems.ts`, `enterFallback.ts`, `defaultBlockSettings.ts`: remove all `ELEMENT_*`/`legacyType`/`FountainElementType` usage; key everything off `nodeType`/`blockType`. `getEnterFallback` now returns a `ScriptBlockNodeType`. Rename `buildFountainBlockItems` → `buildBlockItems` and `FOUNTAIN_BLOCK_ITEMS` → `BLOCK_ITEMS`, `FountainBlockMeta` → `BlockMeta` (these live in the renamed `syntax/blockItems.ts`).

- [ ] **Step 3: Update `script/src/index.ts`**

Replace `export * from './fountain';` with `export * from './syntax';` and add a `packages/script/src/syntax/index.ts` re-exporting `blockTypeMapping`, `blockItems`, `characterNames`, `sharedText` (drop `parser`, `serializer`, `types`).

- [ ] **Step 4: Verify the package typechecks in isolation**

Run: `pnpm exec tsc --noEmit -p packages/script/tsconfig.json`
Expected: PASS (downstream packages will still be red — that is fine).

- [ ] **Step 5: Commit**

```bash
git add packages/script/src
git commit -m "refactor(script): rename fountain/ to syntax/, drop legacy resolver maps"
```

### Task A3: Remove the old Fountain parser, serializer, and AST types

**Files:**
- Delete: `packages/script/src/fountain/parser/` (entire directory)
- Delete: `packages/script/src/fountain/serializer.ts`
- Delete: `packages/script/src/document/fountainSerialization.ts` and `scriptDocumentConversion.ts` if they only serve Fountain import/export (verify with `grep -rn "fountainSerialization\|scriptDocumentConversion" packages --include="*.ts" | grep -v dist`); otherwise strip their Fountain-only functions.
- Modify: `packages/script/src/document/index.ts`, `packages/script/src/index.ts` (remove deleted exports)

- [ ] **Step 1: Delete parser + serializer**

```bash
git rm -r packages/script/src/fountain/parser packages/script/src/fountain/serializer.ts
```

- [ ] **Step 2: Remove their re-exports and any now-dangling imports**

Remove `parser`/`serializer` from the new `syntax/index.ts` and any imports of `parseFountain`/serializer functions inside `packages/script` (search: `grep -rn "parseFountain\|serializeFountain\|fountainSerialization" packages/script/src`). Delete the now-unused AST types file `fountain/types.ts` if not already gone.

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc --noEmit -p packages/script/tsconfig.json`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A packages/script
git commit -m "refactor(script): remove old Fountain parser/serializer (new parser is phase 2)"
```

### Task A4: Drop the legacy node mode

**Files:**
- Modify: `packages/script/src/document/scriptDocument.ts`
- Modify: `packages/script/src/document/coerceUnknownBlocks.ts`
- Modify: `packages/script/src/document/index.ts`

- [ ] **Step 1: Remove legacy node plumbing**

In `scriptDocument.ts`: rename `FountainJSONContent` → `ScriptNode` (export an alias-free type), delete `FOUNTAIN_BLOCK_NODE_NAME`, `ScriptDocumentNodeMode`, `DEFAULT_SCRIPT_DOCUMENT_NODE_MODE`, `createLegacyScriptBlockNode`, and the `nodeMode` parameter on `createEmptyScriptBlockNode`/`createEmptyScriptDocument`. `getScriptBlockNodeTypeFromNode` keeps only the `isScriptBlockNodeType(node.type)` branch (drop the `FOUNTAIN_BLOCK_NODE_NAME` + `attrs.blockType` fallback). Update `createEmptyScriptDocument` to seed an `act` + `scene` block (was `ELEMENT_ACT` + `ELEMENT_SCENE_HEADING`; now `'act'` + `'scene'`).

- [ ] **Step 2: Rename `FountainJSONContent` repo-wide later** — for Phase A, export `ScriptNode` and keep no `FountainJSONContent` alias (downstream packages get fixed in their phases).

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc --noEmit -p packages/script/tsconfig.json`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/script/src/document
git commit -m "refactor(script): drop legacy fountainBlock node mode"
```

### Task A5: Add resolver + enter-fallback tests (first tests in `@stagistic/script`)

**Files:**
- Create: `packages/script/src/syntax/blockTypeMapping.test.ts`
- Create: `packages/script/src/blocks/derived/enterFallback.test.ts`

- [ ] **Step 1: Write the resolver test**

```ts
import {describe, expect, it} from 'vitest';
import {
    getScriptBlockNodeTypeFromBlockType,
    getScriptBlockTypeFromNodeType,
    isScriptBlockNodeType,
    isScriptBlockType,
    resolveScriptBlockNodeType,
    SCRIPT_BLOCK_NODE_TYPES,
    SCRIPT_BLOCK_TYPES,
} from './blockTypeMapping';

describe('block type mapping', () => {
    it('exposes the clean Stagistic vocabulary', () => {
        expect(new Set(SCRIPT_BLOCK_NODE_TYPES)).toEqual(new Set([
            'scene', 'act', 'stageDirection', 'character', 'aside', 'dialogue', 'lyrics', 'note',
        ]));
        expect(new Set(SCRIPT_BLOCK_TYPES)).toEqual(new Set([
            'scene', 'act', 'stage_direction', 'character', 'aside', 'dialogue', 'lyrics', 'note',
        ]));
    });

    it('round-trips nodeType <-> blockType', () => {
        for (const nodeType of SCRIPT_BLOCK_NODE_TYPES) {
            const blockType = getScriptBlockTypeFromNodeType(nodeType);
            expect(getScriptBlockNodeTypeFromBlockType(blockType)).toBe(nodeType);
        }
    });

    it('resolves both node and block identifiers, rejects legacy ones', () => {
        expect(resolveScriptBlockNodeType('stage_direction')).toBe('stageDirection');
        expect(resolveScriptBlockNodeType('stageDirection')).toBe('stageDirection');
        expect(resolveScriptBlockNodeType('scene')).toBe('scene');
        expect(resolveScriptBlockNodeType('fountain_action')).toBeNull();
        expect(resolveScriptBlockNodeType('scene_heading')).toBeNull();
        expect(isScriptBlockNodeType('parenthetical')).toBe(false);
        expect(isScriptBlockType('action')).toBe(false);
    });
});
```

- [ ] **Step 2: Write the enter-fallback test**

```ts
import {describe, expect, it} from 'vitest';
import {getEnterFallback} from './enterFallback';

describe('enter fallback chain', () => {
    it('follows the speech chain', () => {
        expect(getEnterFallback('character')).toBe('dialogue');
        expect(getEnterFallback('dialogue')).toBe('character');
        expect(getEnterFallback('aside')).toBe('character');
        expect(getEnterFallback('lyrics')).toBe('lyrics');
        expect(getEnterFallback('act')).toBe('scene');
        expect(getEnterFallback('scene')).toBe('stageDirection');
        expect(getEnterFallback('note')).toBe('stageDirection');
    });
});
```

(If `getEnterFallback`'s real signature differs, match it — but the chain assertions above are the contract.)

- [ ] **Step 3: Run the tests**

Run: `pnpm test`
Expected: the two new test files PASS. (DB tests will still fail — they are fixed in Phase B.)

- [ ] **Step 4: Commit**

```bash
git add packages/script/src/syntax/blockTypeMapping.test.ts packages/script/src/blocks/derived/enterFallback.test.ts
git commit -m "test(script): resolver and enter-fallback coverage for new vocabulary"
```

---

## Phase B — `@stagistic/db`

**Outcome:** the DB extract/rebuild/migrate layer and its tests use the new identifiers; `@stagistic/db` typechecks and its tests pass.

### Task B1: Update DB block constants and types

**Files:**
- Modify: `packages/db/src/blocks/types.ts`
- Modify: `packages/db/src/blocks/extract.ts`, `extractHelpers.ts`, `rebuild.ts`, `migrate.ts`, `migrateAudit.ts`

- [ ] **Step 1: Replace the local legacy constants**

In `blocks/types.ts` delete `ELEMENT_SCENE_HEADING`/`ELEMENT_ACT`/`ELEMENT_STAGE_DIRECTIONS` and `FOUNTAIN_BLOCK_NODE_NAME`. Where the extract/rebuild code needs structural block identifiers, import them from `@stagistic/script` (`'scene'`, `'act'`, `'stage_direction'` blockType strings, or the `ScriptBlockType` resolvers). Rename `RewriteScriptDocument`'s underlying `FountainJSONContent` references to `ScriptNode`. Keep `FOUNTAIN_COLUMN_GROUP_NODE_NAME`/`FOUNTAIN_COLUMN_NODE_NAME` but rename to `COLUMN_GROUP_NODE_NAME`/`COLUMN_NODE_NAME` (their string values `'column_group'`/`'column'` were already neutral in the doc model — verify against `packages/script/src/document/scriptDocument.ts` which uses `fountainColumnGroup`; align both to the same literal and pick `'columnGroup'`/`'column'`).

- [ ] **Step 2: Update extract/rebuild/migrate logic**

Replace every `scene_heading`/`'action'`/`parenthetical`/`ELEMENT_*`/`fountainBlock` literal with the new identifiers. The block-walking logic is unchanged in shape.

- [ ] **Step 3: Verify typecheck**

Run: `pnpm exec tsc --noEmit -p packages/db/tsconfig.json`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/blocks
git commit -m "refactor(db): use new Stagistic block identifiers in extract/rebuild/migrate"
```

### Task B2: Update DB tests to the new identifiers

**Files:**
- Modify: `packages/db/src/repo/persist/diffExtractedBlocks.test.ts`
- Modify: `packages/db/src/repo/persist/persistDocumentDelta.test.ts`
- Modify: `packages/db/src/repo/persist/persistDocumentDelta.scale.test.ts`
- Modify: `packages/db/src/repo/persist/importFlow.test.ts`

- [ ] **Step 1: Replace identifiers in fixtures/assertions**

In every test fixture and assertion replace `scene_heading`→`scene`, `'action'`→`'stage_direction'`, `parenthetical`→`aside`, `fountain_*`→removed, and any `fountainBlock` node literals → node-per-type (`{type: 'stageDirection', ...}`). Update expected `blockType` strings accordingly.

- [ ] **Step 2: Run the DB tests**

Run: `pnpm test`
Expected: the `packages/db` persist tests PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/db/src/repo/persist
git commit -m "test(db): migrate persist tests to new block identifiers"
```

---

## Phase C — `@stagistic/editor`

**Outcome:** editor bindings, tiptap nodes, behaviour extensions, styles, and css-var dispatch use the new identifiers and `ScriptNode`; `@stagistic/editor` typechecks.

### Task C1: Rename block bindings and the tiptap block subsystem

**Files (rename + edit):**
- `packages/editor/src/editor/blocks/parenthetical/` → `aside/` (binding `cssVarPrefix`/class stay or rename to `aside`)
- `packages/editor/src/editor/blocks/<action dir>` → `stageDirection/`
- `packages/editor/src/editor/blocks/<sceneHeading dir>` → `scene/`
- `packages/editor/src/editor/blocks/fountain/blockTypes.ts`, `blockStyles.ts`
- `packages/editor/src/editor/blocks/fountainBlockRegistry.ts` → `blockRegistry.ts`
- `packages/editor/src/editor/tiptap/fountainCore.ts` → `scriptCore.ts`
- `packages/editor/src/editor/tiptap/nodes/createFountainNode.ts` → `createScriptNode.ts`
- `packages/editor/src/editor/tiptap/fountainBlock/` → `scriptBlock/` (and `FountainBehaviorExtension.ts` → `ScriptBehaviorExtension.ts`)
- `packages/editor/src/editor/editorSettings/cssVars.ts`, `blocks/controls/blockIcons.tsx`

- [ ] **Step 1: Rename directories/files and their symbol names**

Use the rename map from Phase A for identifiers (`action`→`stageDirection`, etc.). Rename the `Fountain*` symbol names to neutral (`FountainBehaviorExtension`→`ScriptBehaviorExtension`, `createFountainNode`→`createScriptNode`, `fountainCore`→`scriptCore`). Update `cssVars.ts` — the act override block keys off `nodeType`; ensure the `--act-*` special case still matches `'act'` and the loop emits `--scene-*`/`--stage-direction-*`/`--aside-*` prefixes per the renamed bindings' `cssVarPrefix`.

- [ ] **Step 2: Update all intra-editor imports** of `FountainJSONContent` → `ScriptNode`, and the renamed registry/core/node modules (search: `grep -rn "fountain\|Fountain\|FountainJSONContent" packages/editor/src --include="*.ts*"`).

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc --noEmit -p packages/editor/tsconfig.json`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/editor/src
git commit -m "refactor(editor): rename fountain block subsystem to Stagistic vocabulary"
```

---

## Phase D — `@stagistic/app-routes` + `@stagistic/ui`

**Outcome:** routes/settings use the new identifiers; the old Fountain import flow is removed; the whole monorepo typechecks and lints green.

### Task D1: Update settings + routes identifiers

**Files:**
- `packages/app-routes/src/routes/script/editor/settings/constants.ts` (`BLOCK_PREVIEW_TEXT`, `BLOCK_PREVIEW_TEXT_COLOR` keyed by the removed `FountainElementType` → key by `ScriptBlockNodeType`)
- `packages/app-routes/src/routes/script/editor/settings/{types.ts,normalizeSettingsOverride.ts,element/*}`
- `packages/app-routes/src/routes/script/{ScriptCharactersContext.tsx,ScriptEditorRoute.tsx,settings/settingsMenu.ts,useScriptEditorSettingsDraft.ts}`

- [ ] **Step 1: Re-key the preview maps**

Change `Record<FountainElementType, string>` → `Record<ScriptBlockNodeType, string>` and update the keys (`'scene'`, `'stageDirection'`, `'aside'`, …). The TypeScript checker enforces completeness, so a missing/renamed key fails the build — fix until green.

- [ ] **Step 2: Replace remaining `ELEMENT_*`/`fountain` references** across app-routes (search: `grep -rn "ELEMENT_\|fountain\|Fountain" packages/app-routes/src --include="*.ts*"`).

- [ ] **Step 3: Commit**

```bash
git add packages/app-routes/src
git commit -m "refactor(app-routes): new block identifiers in settings and routes"
```

### Task D2: Remove the old import flow

**Files:**
- Modify/Delete: `packages/app-routes/src/global-modals/services/scriptImportService.ts`, `global-modals/modals/useGlobalModalActions.ts`
- Modify/Delete: `packages/ui/src/dialogs/ImportScriptModal.tsx`, `ui/src/dialogs/importScript/*`

- [ ] **Step 1: Disconnect the import entry point**

Remove the import modal's call into the deleted Fountain parser. Either delete the import modal + its menu action entirely, or stub the action to a disabled state with a comment `// import returns in phase 2 (new syntax parser)`. Prefer deletion of the dead `importScript/` model + service code (search for `parseFountain` consumers: `grep -rn "parseFountain\|scriptImportService" packages --include="*.ts*" | grep -v dist`).

- [ ] **Step 2: Verify the whole monorepo**

Run: `pnpm exec tsc --noEmit -p tsconfig.json && pnpm lint && pnpm test`
Expected: typecheck PASS, lint PASS, all tests PASS. **This is the first all-green checkpoint.**

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: remove old Fountain import flow (new import is phase 2)"
```

---

## Phase E — Temporary one-shot migration for the local test script

**Outcome:** the single local test script loads under the new identifiers, is saved upgraded, and the migration code is then removed.

### Task E1: Add the temporary load-time migration

**Files:**
- Create: `packages/script/src/document/migrateLegacyDocument.ts`
- Create: `packages/script/src/document/migrateLegacyDocument.test.ts`
- Modify: `packages/app-routes/src/routes/script/controller/useScriptLoader.ts`

- [ ] **Step 1: Write the failing migration test**

```ts
import {describe, expect, it} from 'vitest';
import {migrateLegacyDocument} from './migrateLegacyDocument';

describe('migrateLegacyDocument (temporary)', () => {
    it('maps legacy node/block identifiers to the new vocabulary', () => {
        const legacy = {
            type: 'doc',
            content: [
                {type: 'fountainBlock', attrs: {blockType: 'scene_heading', id: 'b1'}, content: [{type: 'text', text: 'LES'}]},
                {type: 'action', attrs: {id: 'b2'}, content: [{type: 'text', text: 'Anna vejde.'}]},
                {type: 'parenthetical', attrs: {id: 'b3'}, content: [{type: 'text', text: '(tiše)'}]},
                {type: 'character', attrs: {id: 'b4'}, content: [{type: 'text', text: 'ANNA + PETR'}]},
            ],
        };
        const {document: result, changed} = migrateLegacyDocument(legacy);
        expect(changed).toBe(true);
        expect(result.content.map(n => n.type)).toEqual(['scene', 'stageDirection', 'aside', 'character']);
        expect(result.content[3].content?.[0]?.text).toBe('ANNA / PETR');
    });

    it('is a no-op on an already-clean document', () => {
        const clean = {type: 'doc', content: [{type: 'scene', attrs: {id: 'b1'}, content: []}]};
        const {changed} = migrateLegacyDocument(clean);
        expect(changed).toBe(false);
    });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm test`
Expected: FAIL with "migrateLegacyDocument is not a function" (or module-not-found).

- [ ] **Step 3: Implement `migrateLegacyDocument`**

```ts
import type {ScriptNode} from './scriptDocument';

const NODE_TYPE_REMAP: Record<string, string> = {
    fountainBlock: '', // resolved from attrs.blockType below
    action: 'stageDirection',
    sceneHeading: 'scene',
    parenthetical: 'aside',
};

const BLOCK_TYPE_REMAP: Record<string, string> = {
    scene_heading: 'scene',
    action: 'stageDirection',
    parenthetical: 'aside',
    fountain_scene_heading: 'scene',
    fountain_action: 'stageDirection',
    fountain_parenthetical: 'aside',
};

type DocLike = {type: 'doc', content: ScriptNode[], attrs?: Record<string, unknown>};

export const migrateLegacyDocument = (input: DocLike): {document: DocLike, changed: boolean} => {
    let changed = false;

    const migrateNode = (node: ScriptNode): ScriptNode => {
        let next = node;

        if (node.type === 'fountainBlock') {
            const legacyBlockType = (node.attrs?.blockType as string | undefined) ?? 'action';
            const mapped = BLOCK_TYPE_REMAP[legacyBlockType] ?? legacyBlockType;
            const {blockType: _drop, ...restAttrs} = (node.attrs ?? {}) as Record<string, unknown>;
            next = {...node, type: mapped, attrs: restAttrs};
            changed = true;
        } else if (NODE_TYPE_REMAP[node.type]) {
            next = {...node, type: NODE_TYPE_REMAP[node.type]};
            changed = true;
        }

        if (Array.isArray(next.content)) {
            const migratedChildren = next.content.map(child =>
                child.type === 'text' ? migrateText(child) : migrateNode(child),
            );
            next = {...next, content: migratedChildren};
        }

        return next;
    };

    const migrateText = (textNode: ScriptNode): ScriptNode => {
        if (typeof textNode.text === 'string' && textNode.text.includes('+')) {
            const normalized = textNode.text.replace(/\s*\+\s*/g, ' / ');
            if (normalized !== textNode.text) {
                changed = true;
                return {...textNode, text: normalized};
            }
        }
        return textNode;
    };

    const document = {...input, content: input.content.map(migrateNode)};
    return {document, changed};
};
```

(The `+`→`/` normalization here is the broad form; if a character-name tokenizer helper exists in `syntax/characterNames.ts`, prefer routing character-block text through it instead of the regex.)

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm test`
Expected: the migration tests PASS.

- [ ] **Step 5: Wire it into `useScriptLoader` (one-shot, save immediately)**

In `useScriptLoader.ts`, after the document loads, run `migrateLegacyDocument`; if `changed`, set the migrated document and trigger an immediate save (follow the existing R1-5 one-shot precedent in that file's history — load, migrate, persist).

- [ ] **Step 6: Verify end-to-end**

Run: `pnpm exec tsc --noEmit -p tsconfig.json && pnpm test`
Expected: PASS. Then open the local test script in the editor once and confirm it loads with the new block types and saves.

- [ ] **Step 7: Commit**

```bash
git add packages/script/src/document/migrateLegacyDocument.ts packages/script/src/document/migrateLegacyDocument.test.ts packages/app-routes/src/routes/script/controller/useScriptLoader.ts
git commit -m "feat(migration): temporary one-shot legacy document upgrade"
```

### Task E2: Remove the temporary migration

- [ ] **Step 1: After the test script is confirmed migrated, delete the migration**

```bash
git rm packages/script/src/document/migrateLegacyDocument.ts packages/script/src/document/migrateLegacyDocument.test.ts
```

Remove the `migrateLegacyDocument` call + import from `useScriptLoader.ts`.

- [ ] **Step 2: Verify**

Run: `pnpm exec tsc --noEmit -p tsconfig.json && pnpm test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore(migration): remove temporary legacy document upgrade after one-shot run"
```

---

## Self-review notes (for the implementer)

- **Spec coverage:** §5 vocabulary → A1; §6 naming + `fountain/`→`syntax/` + drop legacy node mode → A2/A3/A4; §7 construct mapping (built-now) → A/B/C/D; §9 temporary migration → E. Reserved bindings (§8 music/inline tag) are intentionally **not** in this plan — they are spec-only.
- **Lyric section level (§7):** no task — it already works via leading tabs in `text_content`; nothing to change.
- **Frontmatter / title page:** storage unchanged; the YAML mapping is import/export (phase 2/3), out of scope here.
- **Known red windows:** the monorepo does not typecheck between Phase A start and Phase D Step D2-2. That is expected for a coordinated rename; do not "fix" it with temporary aliases.
