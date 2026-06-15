# Inline Character Tags in Stage Directions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a writer tag the acting character inside a `stage_direction` block via an `@`-triggered, autocompleting pill — confirmed (cast) tags get a filled style, unconfirmed get a dashed border — feeding the same character roster as cue blocks.

**Architecture:** A tag is **prose text + a `characterTag` ProseMirror mark** on a specific span (per-occurrence), not stored syntax. Pure-logic layers (`@stagistic/script`, `@stagistic/db`) learn to read tag marks from block inline content; the editor (`@stagistic/editor`) adds the mark, an authoring-lifecycle plugin, styling, and color/ref propagation. The `@` is a syntax-layer token only and is **not** stored (no syntax serializer exists yet — that is a future spec; live storage is `contentJson` + the `block_character_refs` table).

**Tech Stack:** TypeScript, ProseMirror / Tiptap, Vitest (via `vp test run`), pnpm workspaces, Drizzle (DB).

**Spec:** `docs/superpowers/specs/2026-06-15-stagistic-character-tags-design.md`

**Conventions used in commands below**
- Run one test file: `npx vp test run <path-to-test>`
- Lint + types + format for a package’s changes: `npx vp check`
- The editor package has **no unit-test harness** today; editor tasks are verified with `npx vp check` and manual editor testing (per project preference: no preview tools).

---

## File Structure

**`@stagistic/script` (pure logic — TDD):**
- Create `packages/script/src/characters/characterTagMarks.ts` — the single source of truth for reading/transforming `characterTag` marks in a block’s inline content (used by stats, document ref-ops, and db extract).
- Create `packages/script/src/characters/characterTagMarks.test.ts`.
- Modify `packages/script/src/characters/collectScriptCharacterStats.ts` — count tag marks (per-occurrence) into the roster.
- Modify `packages/script/src/characters/characterRefsInScriptDocument.ts` — link/unlink/replace also rewrite tag-mark `characterId`.
- Modify `packages/script/src/characters/renameCharacterInScriptDocument.ts` — rename also rewrites tag-mark text.
- Modify `packages/script/src/characters/index.ts` — export the new module.

**`@stagistic/db` (pure logic — TDD):**
- Modify `packages/db/src/blocks/extractHelpers.ts` — collect confirmed tag refs from a block’s inline marks.
- Modify `packages/db/src/blocks/extract.ts` — merge tag refs into `characterRefByKey`.
- Create `packages/db/src/blocks/extract.characterTags.test.ts`.

**`@stagistic/editor` (`vp check` + manual):**
- Create `packages/editor/src/editor/tiptap/marks/CharacterTagMark.ts` — the Tiptap mark.
- Create `packages/editor/src/editor/tiptap/marks/index.ts` — barrel.
- Create `packages/editor/src/editor/tiptap/extensions/CharacterTagInputExtension.ts` — the `@`-trigger authoring lifecycle plugin.
- Modify `packages/editor/src/editor/useEditorExtensions.ts` — register the mark + input extension.
- Modify `packages/editor/src/editor/tiptap/scriptBlock/CharacterTagDecorations.module.css` — confirmed/unconfirmed styling (shared by mark + cue decorations).
- Modify `packages/editor/src/editor/characters/characterTokenScan.ts` (+ `buildCharacterRuntime.ts`) — include stage-direction tag marks in color/count scan.
- Modify `packages/editor/src/editor/tiptap/scriptBlock/characterRefCommands.ts` + `packages/editor/src/editor/tiptap/extensions/CharacterRefSyncExtension.ts` — live-editor link/unlink/rename also touch tag marks.
- Modify the character-suggestions overlay to also open inside `stage_direction` for tags (see Task 7).

---

## Phase 1 — Script: the `characterTag` mark model

### Task 1: Tag-mark read/transform helpers

**Files:**
- Create: `packages/script/src/characters/characterTagMarks.ts`
- Test: `packages/script/src/characters/characterTagMarks.test.ts`
- Modify: `packages/script/src/characters/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/script/src/characters/characterTagMarks.test.ts
import {describe, expect, it} from 'vitest';

import type {ScriptNode} from '../document';
import {
    CHARACTER_TAG_ID_ATTR,
    CHARACTER_TAG_KEY_ATTR,
    CHARACTER_TAG_MARK_NAME,
    collectCharacterTags,
    countCharacterTagsByKey,
    collectCharacterTagRefByKey,
    mapCharacterTagMarks,
} from './characterTagMarks';

const tagMark = (key: string, characterId: string | null) => ({
    type: CHARACTER_TAG_MARK_NAME,
    attrs: {[CHARACTER_TAG_KEY_ATTR]: key, [CHARACTER_TAG_ID_ATTR]: characterId},
});

// "Anna goes in. Steve follows Anna." — first Anna + Steve tagged, second Anna plain.
const block = (): ScriptNode => ({
    type: 'stageDirection',
    attrs: {id: 'b1'},
    content: [
        {type: 'text', text: 'Anna', marks: [tagMark('ANNA', 'char-anna')]},
        {type: 'text', text: ' goes in. '},
        {type: 'text', text: 'Steve', marks: [tagMark('STEVE', null)]},
        {type: 'text', text: ' follows Anna.'},
    ],
});

describe('characterTagMarks', () => {
    it('collects each tagged span as a per-occurrence tag', () => {
        const tags = collectCharacterTags(block());

        expect(tags).toEqual([
            {key: 'ANNA', characterId: 'char-anna', text: 'Anna'},
            {key: 'STEVE', characterId: null, text: 'Steve'},
        ]);
    });

    it('counts tags per key (per occurrence, not deduped)', () => {
        const node: ScriptNode = {
            type: 'stageDirection',
            attrs: {id: 'b2'},
            content: [
                {type: 'text', text: 'Anna', marks: [tagMark('ANNA', 'char-anna')]},
                {type: 'text', text: ' and '},
                {type: 'text', text: 'Anna', marks: [tagMark('ANNA', 'char-anna')]},
            ],
        };

        expect(countCharacterTagsByKey(node)).toEqual(new Map([['ANNA', 2]]));
    });

    it('collects confirmed refs only (characterId set)', () => {
        expect(collectCharacterTagRefByKey(block())).toEqual({ANNA: 'char-anna'});
    });

    it('mapCharacterTagMarks rewrites matching mark attrs immutably', () => {
        const next = mapCharacterTagMarks(block(), tag =>
            tag.characterId === 'char-anna' ? {characterId: 'char-anna-2'} : null);

        expect(collectCharacterTagRefByKey(next)).toEqual({ANNA: 'char-anna-2'});
        // original untouched
        expect(collectCharacterTagRefByKey(block())).toEqual({ANNA: 'char-anna'});
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vp test run packages/script/src/characters/characterTagMarks.test.ts`
Expected: FAIL — cannot resolve `./characterTagMarks`.

- [ ] **Step 3: Write the implementation**

```ts
// packages/script/src/characters/characterTagMarks.ts
import type {ScriptNode} from '../document';
import {normalizeCharacterKey} from '../syntax';

export const CHARACTER_TAG_MARK_NAME = 'characterTag';
export const CHARACTER_TAG_KEY_ATTR = 'characterKey';
export const CHARACTER_TAG_ID_ATTR = 'characterId';

export interface CharacterTagRef {
    key: string,
    characterId: string | null,
    text: string,
}

type InlineMark = NonNullable<ScriptNode['marks']>[number];

const findTagMark = (node: ScriptNode): InlineMark | undefined => {
    if (!Array.isArray(node.marks)) {
        return undefined;
    }

    return node.marks.find(mark => mark.type === CHARACTER_TAG_MARK_NAME);
};

const readTagCharacterId = (mark: InlineMark | undefined): string | null => {
    const raw = mark?.attrs?.[CHARACTER_TAG_ID_ATTR];

    return typeof raw === 'string' && raw.length > 0 ? raw : null;
};

/**
 * Collects each tagged span in a block as one per-occurrence tag.
 * Consecutive text nodes that carry a characterTag mark with the same
 * characterId are coalesced into a single tag; the key is re-derived from
 * the visible text (the name is the source of truth, not the stale attr).
 */
export const collectCharacterTags = (blockNode: ScriptNode): CharacterTagRef[] => {
    const content = Array.isArray(blockNode.content) ? blockNode.content : [];
    const tags: CharacterTagRef[] = [];
    let runText = '';
    let runCharacterId: string | null = null;
    let inRun = false;

    const flush = () => {
        if (!inRun) {
            return;
        }

        const key = normalizeCharacterKey(runText);

        if (key.length > 0) {
            tags.push({key, characterId: runCharacterId, text: runText});
        }

        runText = '';
        runCharacterId = null;
        inRun = false;
    };

    content.forEach(child => {
        const mark = findTagMark(child);

        if (!mark || typeof child.text !== 'string') {
            flush();

            return;
        }

        const characterId = readTagCharacterId(mark);

        if (inRun && characterId !== runCharacterId) {
            flush();
        }

        inRun = true;
        runCharacterId = characterId;
        runText += child.text;
    });

    flush();

    return tags;
};

export const countCharacterTagsByKey = (blockNode: ScriptNode): Map<string, number> => {
    const counts = new Map<string, number>();

    collectCharacterTags(blockNode).forEach(tag => {
        counts.set(tag.key, (counts.get(tag.key) ?? 0) + 1);
    });

    return counts;
};

export const collectCharacterTagRefByKey = (blockNode: ScriptNode): Record<string, string> => {
    const refByKey: Record<string, string> = {};

    collectCharacterTags(blockNode).forEach(tag => {
        if (tag.characterId) {
            refByKey[tag.key] = tag.characterId;
        }
    });

    return refByKey;
};

/**
 * Returns a new block node with each characterTag mark's attrs patched by
 * `patch(tag)`. Returning null leaves that mark unchanged. Immutable.
 */
export const mapCharacterTagMarks = (
    blockNode: ScriptNode,
    patch: (tag: CharacterTagRef) => Partial<{characterId: string | null}> | null,
): ScriptNode => {
    if (!Array.isArray(blockNode.content)) {
        return blockNode;
    }

    let changed = false;
    const nextContent = blockNode.content.map(child => {
        const mark = findTagMark(child);

        if (!mark || typeof child.text !== 'string') {
            return child;
        }

        const tag: CharacterTagRef = {
            key: normalizeCharacterKey(child.text),
            characterId: readTagCharacterId(mark),
            text: child.text,
        };
        const result = patch(tag);

        if (!result || !('characterId' in result) || result.characterId === tag.characterId) {
            return child;
        }

        changed = true;
        const nextMarks = (child.marks ?? []).map(existing =>
            existing.type === CHARACTER_TAG_MARK_NAME
                ? {...existing, attrs: {...existing.attrs, [CHARACTER_TAG_ID_ATTR]: result.characterId}}
                : existing);

        return {...child, marks: nextMarks};
    });

    return changed ? {...blockNode, content: nextContent} : blockNode;
};
```

- [ ] **Step 4: Export from the characters barrel**

In `packages/script/src/characters/index.ts`, add:

```ts
export * from './characterTagMarks';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vp test run packages/script/src/characters/characterTagMarks.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/script/src/characters/characterTagMarks.ts \
        packages/script/src/characters/characterTagMarks.test.ts \
        packages/script/src/characters/index.ts
git commit -m "feat(script): characterTag mark read/transform helpers"
```

---

## Phase 2 — Script: tag marks in the character roster

### Task 2: Count tag marks in `collectScriptCharacterStats`

**Files:**
- Modify: `packages/script/src/characters/collectScriptCharacterStats.ts`
- Test: `packages/script/src/characters/collectScriptCharacterStats.test.ts` (create if absent)

- [ ] **Step 1: Write the failing test**

```ts
// packages/script/src/characters/collectScriptCharacterStats.test.ts
import {describe, expect, it} from 'vitest';

import type {ScriptDocument} from '../document';
import {
    CHARACTER_TAG_ID_ATTR,
    CHARACTER_TAG_KEY_ATTR,
    CHARACTER_TAG_MARK_NAME,
} from './characterTagMarks';
import {collectScriptCharacterStats} from './collectScriptCharacterStats';

const tagMark = (key: string, characterId: string | null) => ({
    type: CHARACTER_TAG_MARK_NAME,
    attrs: {[CHARACTER_TAG_KEY_ATTR]: key, [CHARACTER_TAG_ID_ATTR]: characterId},
});

const doc: ScriptDocument = {
    type: 'doc',
    content: [
        {
            type: 'stageDirection',
            attrs: {id: 'b1'},
            content: [
                {type: 'text', text: 'Anna', marks: [tagMark('ANNA', 'char-anna')]},
                {type: 'text', text: ' meets '},
                {type: 'text', text: 'Bob', marks: [tagMark('BOB', null)]},
                {type: 'text', text: '.'},
            ],
        },
    ],
};

describe('collectScriptCharacterStats with tag marks', () => {
    it('counts confirmed tags by id and unconfirmed tags by key', () => {
        const stats = collectScriptCharacterStats(doc, new Set(['char-anna']));

        expect(stats.countsByKey.get('ANNA')).toBe(1);
        expect(stats.countsByKey.get('BOB')).toBe(1);
        expect(stats.confirmedCountsById.get('char-anna')).toBe(1);
        expect(stats.unconfirmedCountsByKey.get('BOB')).toBe(1);
        expect(stats.unconfirmedCountsByKey.has('ANNA')).toBe(false);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vp test run packages/script/src/characters/collectScriptCharacterStats.test.ts`
Expected: FAIL — tag marks are not counted (`countsByKey.get('ANNA')` is `undefined`).

- [ ] **Step 3: Implement — count tag marks for non-character blocks**

In `packages/script/src/characters/collectScriptCharacterStats.ts`, add the import and, inside `walkNodes`’ block branch, count tags from any block that is **not** a character block (tags never live in cue blocks):

```ts
import {collectCharacterTags} from './characterTagMarks';
```

Replace the `if (isScriptBlockNode(node)) { ... }` body with:

```ts
if (isScriptBlockNode(node)) {
    const blockType = getScriptBlockNodeType(node);

    if (isCharacterBlockType(blockType)) {
        const text = getNodeTextContent(node);
        const characterRefByKey = getCharacterRefByKey(node.attrs);

        extractCharacterKeys(text).forEach(key => {
            countsByKey.set(key, (countsByKey.get(key) ?? 0) + 1);

            const characterId = characterRefByKey[key];

            if (characterId && confirmedCharacterIdSet.has(characterId)) {
                confirmedCountsById.set(characterId, (confirmedCountsById.get(characterId) ?? 0) + 1);

                return;
            }

            unconfirmedCountsByKey.set(key, (unconfirmedCountsByKey.get(key) ?? 0) + 1);
        });
    } else {
        collectCharacterTags(node).forEach(tag => {
            countsByKey.set(tag.key, (countsByKey.get(tag.key) ?? 0) + 1);

            if (tag.characterId && confirmedCharacterIdSet.has(tag.characterId)) {
                confirmedCountsById.set(
                    tag.characterId,
                    (confirmedCountsById.get(tag.characterId) ?? 0) + 1,
                );

                return;
            }

            unconfirmedCountsByKey.set(tag.key, (unconfirmedCountsByKey.get(tag.key) ?? 0) + 1);
        });
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vp test run packages/script/src/characters/collectScriptCharacterStats.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/script/src/characters/collectScriptCharacterStats.ts \
        packages/script/src/characters/collectScriptCharacterStats.test.ts
git commit -m "feat(script): count stage-direction tag marks in character roster"
```

---

## Phase 3 — Script: link/unlink/replace/rename propagate to tags

### Task 3: Document ref-ops also rewrite tag marks

**Files:**
- Modify: `packages/script/src/characters/characterRefsInScriptDocument.ts`
- Modify: `packages/script/src/characters/renameCharacterInScriptDocument.ts`
- Test: `packages/script/src/characters/characterRefsInScriptDocument.test.ts` (create if absent)

- [ ] **Step 1: Write the failing test**

```ts
// packages/script/src/characters/characterRefsInScriptDocument.test.ts
import {describe, expect, it} from 'vitest';

import type {ScriptDocument} from '../document';
import {
    CHARACTER_TAG_ID_ATTR,
    CHARACTER_TAG_KEY_ATTR,
    CHARACTER_TAG_MARK_NAME,
    collectCharacterTagRefByKey,
} from './characterTagMarks';
import {
    linkCharacterRefInScriptDocument,
    replaceCharacterRefIdInScriptDocument,
    unlinkCharacterRefInScriptDocument,
} from './characterRefsInScriptDocument';

const tagMark = (key: string, characterId: string | null) => ({
    type: CHARACTER_TAG_MARK_NAME,
    attrs: {[CHARACTER_TAG_KEY_ATTR]: key, [CHARACTER_TAG_ID_ATTR]: characterId},
});

const docWithTag = (characterId: string | null): ScriptDocument => ({
    type: 'doc',
    content: [
        {
            type: 'stageDirection',
            attrs: {id: 'b1'},
            content: [{type: 'text', text: 'Anna', marks: [tagMark('ANNA', characterId)]}],
        },
    ],
});

describe('characterRefsInScriptDocument with tags', () => {
    it('links an unconfirmed tag by key', () => {
        const {value, changed} = linkCharacterRefInScriptDocument(docWithTag(null), 'Anna', 'char-anna');

        expect(changed).toBe(true);
        expect(collectCharacterTagRefByKey(value.content[0])).toEqual({ANNA: 'char-anna'});
    });

    it('unlinks a tag by characterId', () => {
        const {value, changed} = unlinkCharacterRefInScriptDocument(docWithTag('char-anna'), 'char-anna');

        expect(changed).toBe(true);
        expect(collectCharacterTagRefByKey(value.content[0])).toEqual({});
    });

    it('replaces a tag characterId', () => {
        const {value, changed} = replaceCharacterRefIdInScriptDocument(docWithTag('char-anna'), 'char-anna', 'char-merged');

        expect(changed).toBe(true);
        expect(collectCharacterTagRefByKey(value.content[0])).toEqual({ANNA: 'char-merged'});
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vp test run packages/script/src/characters/characterRefsInScriptDocument.test.ts`
Expected: FAIL — only character blocks are touched, tags unchanged.

- [ ] **Step 3: Implement a shared all-block walker that also patches tag marks**

In `packages/script/src/characters/characterRefsInScriptDocument.ts`, add imports and a helper that walks every block node and applies a tag-mark patch alongside the existing cue logic:

The file already imports `normalizeCharacterKey` from `'../syntax'` — reuse it, do not
re-import. Extend the existing `'../document'` import to add `isScriptBlockNode`, and add
the tag-marks import:

```ts
import {
    isScriptBlockNode,
    type ScriptDocument,
} from '../document';
import {mapCharacterTagMarks} from './characterTagMarks';
```

Add this helper near the top of the file:

```ts
const mapAllNodesTagMarks = (
    value: ScriptDocument,
    patch: Parameters<typeof mapCharacterTagMarks>[1],
): ScriptDocumentChangeResult => {
    let changed = false;

    const walk = (nodes: ScriptDocument['content']): ScriptDocument['content'] =>
        nodes.map(node => {
            let next = node;

            if (isScriptBlockNode(node)) {
                const mapped = mapCharacterTagMarks(node, patch);

                if (mapped !== node) {
                    changed = true;
                    next = mapped;
                }
            }

            if (Array.isArray(next.content) && next.content.some(isScriptBlockNode)) {
                const childContent = walk(next.content);

                if (childContent !== next.content) {
                    next = {...next, content: childContent};
                }
            }

            return next;
        });

    const content = walk(value.content);

    return changed ? {value: {...value, content}, changed: true} : unchangedScriptDocument(value);
};
```

Then in each of `linkCharacterRefInScriptDocument`, `unlinkCharacterRefInScriptDocument`,
`replaceCharacterRefIdInScriptDocument`, after computing the existing cue result,
also run the tag patch and merge the `changed` flags. For `link`:

```ts
export const linkCharacterRefInScriptDocument = (
    value: ScriptDocument,
    characterKey: string,
    characterId: string,
): ScriptDocumentChangeResult => {
    const normalizedCharacterKey = normalizeCharacterKey(characterKey);

    if (normalizedCharacterKey.length === 0 || characterId.length === 0) {
        return unchangedScriptDocument(value);
    }

    const cueResult = applyMapResult(
        value,
        mapCharacterBlockNodes(value.content, node => {
            // ...existing body unchanged...
            const text = getNodeTextContent(node);
            const keys = extractCharacterKeys(text);

            if (!keys.includes(normalizedCharacterKey)) {
                return node;
            }

            const sourceCharacterRefByKey = getCharacterRefByKey(node.attrs);

            if (sourceCharacterRefByKey[normalizedCharacterKey] === characterId) {
                return node;
            }

            return withCharacterRefByKey(node, {
                ...sourceCharacterRefByKey,
                [normalizedCharacterKey]: characterId,
            });
        }),
    );

    const tagResult = mapAllNodesTagMarks(cueResult.value, tag =>
        tag.key === normalizedCharacterKey && tag.characterId !== characterId
            ? {characterId}
            : null);

    return {value: tagResult.value, changed: cueResult.changed || tagResult.changed};
};
```

Apply the same pattern to `unlink` (patch `tag.characterId === characterId ? {characterId: null} : null`) and `replace` (patch `tag.characterId === sourceCharacterId ? {characterId: targetCharacterId} : null`), threading each one through `mapAllNodesTagMarks` on the cue result’s value and OR-ing the `changed` flags.

- [ ] **Step 4a: Add a tag text-rename helper to `characterTagMarks.ts`**

The editor commits each tag as a single contiguous `characterTag`-marked text node, so a
per-text-node rewrite is correct. Append to `packages/script/src/characters/characterTagMarks.ts`:

```ts
interface RenameCharacterTagsArgs {
    fromKey: string,        // normalized old key
    newName: string,        // display name to write into the span
    characterId?: string,   // when set, match confirmed tags by id
}

export const renameCharacterTagsInNode = (
    blockNode: ScriptNode,
    {fromKey, newName, characterId}: RenameCharacterTagsArgs,
): ScriptNode => {
    if (!Array.isArray(blockNode.content) || newName.length === 0) {
        return blockNode;
    }

    const newKey = normalizeCharacterKey(newName);
    let changed = false;

    const nextContent = blockNode.content.map(child => {
        const mark = findTagMark(child);

        if (!mark || typeof child.text !== 'string') {
            return child;
        }

        const tagCharacterId = readTagCharacterId(mark);
        const tagKey = normalizeCharacterKey(child.text);
        const matches = characterId
            ? tagCharacterId === characterId || (!tagCharacterId && tagKey === fromKey)
            : tagKey === fromKey;

        if (!matches) {
            return child;
        }

        changed = true;
        const nextMarks = (child.marks ?? []).map(existing =>
            existing.type === CHARACTER_TAG_MARK_NAME
                ? {...existing, attrs: {...existing.attrs, [CHARACTER_TAG_KEY_ATTR]: newKey}}
                : existing);

        return {...child, text: newName, marks: nextMarks};
    });

    return changed ? {...blockNode, content: nextContent} : blockNode;
};
```

- [ ] **Step 4b: Call it from `renameCharacterInScriptDocument`**

In `renameCharacterInScriptDocument.ts`, after the existing `mapCharacterBlockNodes` pass,
walk **all** block nodes and apply `renameCharacterTagsInNode`, OR-ing the `changed` flag.
Add imports `isScriptBlockNode` (from `'../document'`) and `renameCharacterTagsInNode`
(from `'./characterTagMarks'`), then wrap the return:

```ts
const fromKey = normalizeCharacterKey(fromCharacterKey);
let tagsChanged = false;

const withTags = (nextContent ?? value.content).map(node => {
    if (!isScriptBlockNode(node)) {
        return node;
    }

    const replacementName = getCharacterNameForBlockType(toCharacterName, getScriptBlockNodeType(node));
    const renamed = renameCharacterTagsInNode(node, {
        fromKey,
        newName: replacementName,
        characterId: options?.characterId,
    });

    if (renamed !== node) {
        tagsChanged = true;
    }

    return renamed;
});

if (!changed && !tagsChanged) {
    return unchangedScriptDocument(value);
}

return {value: {...value, content: withTags}, changed: true};
```

- [ ] **Step 4c: Add a focused rename test**

```ts
// in renameCharacterInScriptDocument.test.ts
it('renames the text and key of tagged spans for the character', () => {
    const doc: ScriptDocument = {
        type: 'doc',
        content: [{
            type: 'stageDirection',
            attrs: {id: 'b1'},
            content: [
                {type: 'text', text: 'Anna', marks: [{type: 'characterTag', attrs: {characterKey: 'ANNA', characterId: 'char-anna'}}]},
                {type: 'text', text: ' waits for Anna.'},
            ],
        }],
    };
    const {value, changed} = renameCharacterInScriptDocument(doc, 'Anna', 'Anička', name => name, {characterId: 'char-anna'});

    expect(changed).toBe(true);
    const span = value.content[0].content?.[0];
    expect(span?.text).toBe('Anička');
    expect(span?.marks?.[0]?.attrs?.characterKey).toBe('ANIČKA');
    // plain prose untouched
    expect(value.content[0].content?.[1]?.text).toBe(' waits for Anna.');
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vp test run packages/script/src/characters/characterRefsInScriptDocument.test.ts`
Run: `npx vp test run packages/script/src/characters/renameCharacterInScriptDocument.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/script/src/characters/characterTagMarks.ts \
        packages/script/src/characters/characterRefsInScriptDocument.ts \
        packages/script/src/characters/renameCharacterInScriptDocument.ts \
        packages/script/src/characters/characterRefsInScriptDocument.test.ts \
        packages/script/src/characters/renameCharacterInScriptDocument.test.ts
git commit -m "feat(script): propagate character link/unlink/replace/rename to tag marks"
```

---

## Phase 4 — DB: persist confirmed tag refs

### Task 4: Merge tag refs into `characterRefByKey` on extract

**Files:**
- Modify: `packages/db/src/blocks/extractHelpers.ts`
- Modify: `packages/db/src/blocks/extract.ts`
- Test: `packages/db/src/blocks/extract.characterTags.test.ts`

Note: `sanitizeInlineContentNode` already preserves marks into `contentJson` (verified — it copies `node.marks` with attrs), so the tag mark round-trips for free. Only the per-block ref aggregation needs work.

- [ ] **Step 1: Write the failing test**

```ts
// packages/db/src/blocks/extract.characterTags.test.ts
import type {ScriptDocument} from '@stagistic/script';
import {describe, expect, it} from 'vitest';

import {extractScriptBlocks} from './extract';

const doc: ScriptDocument = {
    type: 'doc',
    content: [
        {type: 'scene', attrs: {id: 's1'}, content: [{type: 'text', text: 'Scene 1'}]},
        {
            type: 'stageDirection',
            attrs: {id: 'b1'},
            content: [
                {
                    type: 'text',
                    text: 'Anna',
                    marks: [{type: 'characterTag', attrs: {characterKey: 'ANNA', characterId: 'char-anna'}}],
                },
                {type: 'text', text: ' enters; '},
                {
                    type: 'text',
                    text: 'Bob',
                    marks: [{type: 'characterTag', attrs: {characterKey: 'BOB', characterId: null}}],
                },
                {type: 'text', text: ' waits.'},
            ],
        },
    ],
};

describe('extractScriptBlocks — character tags', () => {
    it('records confirmed tag refs and preserves the mark in contentJson', () => {
        const {blocks} = extractScriptBlocks('script-1', doc);
        const stageBlock = blocks.find(block => block.blockId === 'b1');

        expect(stageBlock?.characterRefByKey).toEqual({ANNA: 'char-anna'});
        expect(stageBlock?.contentJson).toContain('"type":"characterTag"');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vp test run packages/db/src/blocks/extract.characterTags.test.ts`
Expected: FAIL — `characterRefByKey` is `{}` (only block-attr refs are read today).

- [ ] **Step 3: Implement — collect tag refs in extractHelpers**

In `packages/db/src/blocks/extractHelpers.ts`, add an import and a helper, reusing the
script-package source of truth:

```ts
import {collectCharacterTagRefByKey} from '@stagistic/script';
```

```ts
export const toCharacterRefByKeyWithTags = (node: ScriptNode): Record<string, string> => {
    const attrs = isObjectRecord(node.attrs) ? node.attrs : undefined;
    const fromAttrs = toCharacterRefByKey(attrs);
    const fromTags = collectCharacterTagRefByKey(node);

    return {...fromTags, ...fromAttrs};
};
```

- [ ] **Step 4: Use it in extract.ts**

In `packages/db/src/blocks/extract.ts`:
- replace the import `toCharacterRefByKey` with `toCharacterRefByKeyWithTags`;
- replace `const characterRefByKey = toCharacterRefByKey(attrs);` with
  `const characterRefByKey = toCharacterRefByKeyWithTags(node);`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vp test run packages/db/src/blocks/extract.characterTags.test.ts`
Expected: PASS. Then run the existing block tests to confirm no regression:
`npx vp test run packages/db/src/blocks` and `npx vp test run packages/db/src/repo/persist`.

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/blocks/extractHelpers.ts \
        packages/db/src/blocks/extract.ts \
        packages/db/src/blocks/extract.characterTags.test.ts
git commit -m "feat(db): persist confirmed character-tag refs from stage-direction marks"
```

> No schema change is required: `block_character_refs` already keys on `(blockId, characterKey, characterId)`, and `contentJson` stores the mark. (Confirmed against `packages/db/src/blocks/types.ts` and `extractHelpers.ts`.)

---

## Phase 5 — Editor: the `characterTag` mark

### Task 5: Define and register the Tiptap mark

**Files:**
- Create: `packages/editor/src/editor/tiptap/marks/CharacterTagMark.ts`
- Create: `packages/editor/src/editor/tiptap/marks/index.ts`
- Modify: `packages/editor/src/editor/useEditorExtensions.ts`

- [ ] **Step 1: Implement the mark**

The mark renders a `<span>` whose classes match the cue-decoration output so one CSS
module styles both (Task 7). `inclusive: false` so typing at a tag boundary is plain prose.

```ts
// packages/editor/src/editor/tiptap/marks/CharacterTagMark.ts
import {
    CHARACTER_TAG_ID_ATTR,
    CHARACTER_TAG_KEY_ATTR,
    CHARACTER_TAG_MARK_NAME,
} from '@stagistic/script';
import {Mark, mergeAttributes} from '@tiptap/core';

import {
    getCharacterTagIdClassName,
    getCharacterTagKeyClassName,
} from '../../characters/characterColors';

export interface CharacterTagMarkOptions {
    /** Class applied to every tag span (shared with cue decorations). */
    tagClassName: string,
}

const resolveIdentityClassName = (characterKey: string, characterId: string | null) => {
    if (characterId) {
        return getCharacterTagIdClassName(characterId);
    }

    return characterKey ? getCharacterTagKeyClassName(characterKey) : '';
};

export const CharacterTagMark = Mark.create<CharacterTagMarkOptions>({
    name: CHARACTER_TAG_MARK_NAME,
    inclusive: false,
    excludes: '', // may coexist with bold/italic/underline

    addOptions() {
        return {tagClassName: 'characterTag'};
    },

    addAttributes() {
        return {
            [CHARACTER_TAG_KEY_ATTR]: {default: ''},
            [CHARACTER_TAG_ID_ATTR]: {default: null},
        };
    },

    parseHTML() {
        return [{tag: 'span[data-character-key]'}];
    },

    renderHTML({HTMLAttributes, mark}) {
        const characterKey = String(mark.attrs[CHARACTER_TAG_KEY_ATTR] ?? '');
        const rawId = mark.attrs[CHARACTER_TAG_ID_ATTR];
        const characterId = typeof rawId === 'string' && rawId.length > 0 ? rawId : null;
        const identityClassName = resolveIdentityClassName(characterKey, characterId);
        const className = [this.options.tagClassName, identityClassName].filter(Boolean).join(' ');
        const attributes: Record<string, string> = {
            'class': className,
            'data-character-key': characterKey,
        };

        if (characterId) {
            attributes['data-character-id'] = characterId;
        }

        return ['span', mergeAttributes(HTMLAttributes, attributes), 0];
    },
});
```

- [ ] **Step 2: Barrel export**

```ts
// packages/editor/src/editor/tiptap/marks/index.ts
export {CharacterTagMark} from './CharacterTagMark';
export type {CharacterTagMarkOptions} from './CharacterTagMark';
```

- [ ] **Step 3: Register in useEditorExtensions**

In `packages/editor/src/editor/useEditorExtensions.ts`:
- import `import {CharacterTagMark} from './tiptap/marks';`
- import the shared class: `characterTagStyles.characterTag` is already imported.
- add a memoized extension: `const characterTagMark = useMemo(() => CharacterTagMark.configure({tagClassName: characterTagStyles.characterTag}), []);`
- push `characterTagMark` into the `extensions` array (after `Underline`) and into the `useMemo` deps.

- [ ] **Step 4: Verify**

Run: `npx vp check` (lint + types + format) for the editor package.
Expected: PASS (no type errors; `@stagistic/script` exports the three constants from Task 1).

- [ ] **Step 5: Commit**

```bash
git add packages/editor/src/editor/tiptap/marks/ packages/editor/src/editor/useEditorExtensions.ts
git commit -m "feat(editor): register characterTag mark"
```

---

## Phase 6 — Editor: confirmed/unconfirmed styling + color pipeline

### Task 6: Styling (filled vs dashed) shared by mark + cue decorations

**Files:**
- Modify: `packages/editor/src/editor/tiptap/scriptBlock/CharacterTagDecorations.module.css`

- [ ] **Step 1: Read the current CSS** to learn the existing `.characterTag` rule and how `--character-tag-color` is consumed.

Run: `sed -n '1,200p' packages/editor/src/editor/tiptap/scriptBlock/CharacterTagDecorations.module.css` — but prefer the Read tool.

- [ ] **Step 2: Express confirmed/unconfirmed by `data-character-id` presence**

Both the mark (Task 5) and the cue decorations (`buildCharacterRuntime`) emit
`class="characterTag …"` and set `data-character-id` **only** when confirmed. Add/adjust:

```css
/* Tags always render uppercase (spec §8). Stage-direction blocks are
   casing:'normal', so the tag must force its own uppercasing — it is NOT
   inherited from the block (the cue block is already uppercase). */
.characterTag {
    text-transform: uppercase;
}

/* Confirmed: filled background in the character color. */
.characterTag[data-character-id] {
    background-color: var(--character-tag-color);
    border: 1px solid transparent;
}

/* Unconfirmed: no fill, dashed border in the character color. */
.characterTag:not([data-character-id]) {
    background-color: transparent;
    border: 1px dashed var(--character-tag-color);
}
```

Keep the existing color/text rules; only introduce the uppercase + fill-vs-dashed
distinction. (Verify the existing `.characterTag` rule does not already set a conflicting
`text-transform`; if it does, merge rather than duplicate.)
This unifies stage-direction tags **and** character-block cue tokens (same class), per
spec §6. Do **not** touch the sidebar.

- [ ] **Step 3: Verify**

Run: `npx vp check`. Then manually: type a cue with a confirmed and an unconfirmed
name — confirmed token is filled, unconfirmed shows a dashed border.

- [ ] **Step 4: Commit**

```bash
git add packages/editor/src/editor/tiptap/scriptBlock/CharacterTagDecorations.module.css
git commit -m "feat(editor): filled/dashed styling for confirmed/unconfirmed tags"
```

### Task 7: Feed tag marks into the color/count runtime

**Files:**
- Modify: `packages/editor/src/editor/characters/characterTokenScan.ts`
- Modify: `packages/editor/src/editor/runtime/buildCharacterRuntime.ts` (only if counts need it)

Tag marks render their own color class, but the palette CSS
(`buildCharacterTagPaletteCss`) only emits `--character-tag-color` for keys/ids present in
the runtime color state. Today `scanCharacterTokensFromDoc` visits **character blocks
only**, so a key that appears solely as a stage-direction tag would render with no color.

- [ ] **Step 1: Extend the token scan to include tag marks**

In `characterTokenScan.ts`, after visiting character blocks, also walk all blocks for
`characterTag` marks (reuse `collectCharacterTags` from `@stagistic/script`) and push an
equivalent `CharacterTokenEntry` per tag occurrence (using the marked span’s document
positions for `valueStart`/`valueEnd`, and `characterId` from the mark). This makes tag
keys/ids part of `tokenScan`, so `buildCharacterDocColorStateFromTokenScan` emits their
palette colors and `buildCharacterRuntime` counts them in `countsByKey` /
`countsByCharacterId` (used by the suggestion overlay’s live counts).

Important: the cue **decorations** built in `buildCharacterRuntime.buildCharacterDecorations`
must continue to decorate **only cue-block** token entries (tag marks already render via
the mark). Tag-derived entries should be flagged (e.g. `source: 'tag'`) and **skipped** by
`buildCharacterDecorations`, while still contributing to colors/counts. Add a `source`
field to `CharacterTokenEntry` and guard the decoration builder accordingly.

- [ ] **Step 2: Verify**

Run: `npx vp check`. Manual: tag a name that is **not** used in any cue — the pill shows a
color (not the fallback), and the character appears in the sidebar with the right count.

- [ ] **Step 3: Commit**

```bash
git add packages/editor/src/editor/characters/characterTokenScan.ts \
        packages/editor/src/editor/runtime/buildCharacterRuntime.ts
git commit -m "feat(editor): include stage-direction tags in color/count runtime"
```

---

## Phase 7 — Editor: the `@` authoring lifecycle

### Task 8: `@`-trigger composing pill with autocomplete

**Files:**
- Create: `packages/editor/src/editor/tiptap/extensions/CharacterTagInputExtension.ts`
- Modify: `packages/editor/src/editor/useEditorExtensions.ts` (register it)
- Modify: the character-suggestions overlay model to also activate for stage-direction tags
  (`packages/editor/src/editor/components/characterSuggestions/model.ts` and
  `useCharacterSuggestions.ts`).

This is the most involved task and has **no unit-test harness**; build incrementally and
verify each behavior manually with `npx vp check` between steps.

**Mechanism (decided here, resolving spec §11 open question):**
Use a **suggestion-style ProseMirror plugin** that keeps a transient `@query` while
composing, rendered as a forming pill via an inline decoration, and **commits** to a
`characterTag` mark on a terminator. This avoids fragile stored-mark bookkeeping and
reuses the existing overlay.

- [ ] **Step 1: Plugin skeleton — track the active compose region**

Create `CharacterTagInputExtension` as a Tiptap `Extension` with one `Plugin`:
- Plugin state: `{active: boolean, from: number, query: string}` (the `@` position and the
  text typed after it), updated in `apply` from the transaction + selection.
- Activation: a transaction inserts `@` while the selection is inside a `stage_direction`
  block (use `getActiveScriptBlockFromState` + `blockType === 'stage_direction'`) and the
  char before `@` is whitespace or start-of-block. Store `from = @pos`.
- Decoration: an inline `Decoration` over `[from, from+1+query.length]` with the
  `characterTag` class (no `data-character-id`) so the composing text looks like an
  unconfirmed pill.
- Deactivation: selection leaves the region, or the region no longer starts with `@`.

- [ ] **Step 2: Wire the overlay to the active region**

In the suggestions overlay model, add a branch: when the `CharacterTagInputExtension`
plugin is active, compute suggestions from **confirmed cast only** (reuse
`buildSuggestionRows` + `getPersistentColorByKey`, exactly like the cue path) filtered by
the live `query`, and position the overlay over the compose region. Keep the existing cue
path untouched; share the row-building helpers.

- [ ] **Step 3: Commit on terminator → replace `@query` with a marked span**

Add an `applyCharacterTagSuggestion(editor, name)` (new module beside the overlay model,
e.g. `characterSuggestions/applyTag.ts`) and key handling in the extension:
- **Select from overlay**, **Enter**, or **Tab**: replace the range `[from, from+1+query.length]`
  with a text node `name` carrying `characterTag` mark `{characterKey: normalizeCharacterKey(name), characterId: <id or null>}`; place the cursor after it (mark is `inclusive:false`, so further typing is plain prose). For a free-typed name with no cast match, `characterId` is `null` (unconfirmed).
- **Double space**: same commit, using the current `query` trimmed (strip the trailing
  space that triggered it), then insert a normal space after the pill.
- **Single space**: keep composing (names may contain spaces) — append to `query`, do not
  commit.

- [ ] **Step 4: Empty-prune**

If the compose region is reduced to just `@` (query empty) and the user types a
terminator or moves away, delete the stray `@`. For a **committed** tag, rely on
`inclusive:false` plus an `appendTransaction` that removes a `characterTag` mark whose
marked text became empty (so deleting the last letter drops the pill and following typing
is plain prose, per spec §5).

- [ ] **Step 5: Register + verify**

Register the extension in `useEditorExtensions.ts` (after the mark). Run `npx vp check`.
Manual matrix in a stage direction:
- `@` opens the overlay; typing filters confirmed cast.
- Selecting / Enter / Tab commits a filled pill; cursor exits; next typing is plain text.
- Free-typed unknown name + double space commits a **dashed** (unconfirmed) pill and a
  trailing space; multi-word names (single spaces) stay in the pill.
- Backspacing a committed pill to empty removes it; new typing is plain text.
- `@` then immediate terminator removes the stray `@`.

- [ ] **Step 6: Commit**

```bash
git add packages/editor/src/editor/tiptap/extensions/CharacterTagInputExtension.ts \
        packages/editor/src/editor/components/characterSuggestions/ \
        packages/editor/src/editor/useEditorExtensions.ts
git commit -m "feat(editor): @-triggered character tag authoring in stage directions"
```

---

## Phase 8 — Editor: live link/unlink/rename touch tag marks

### Task 9: Sidebar actions update tag marks in the live editor

**Files:**
- Modify: `packages/editor/src/editor/tiptap/scriptBlock/characterRefCommands.ts`
- Modify: `packages/editor/src/editor/tiptap/extensions/CharacterRefSyncExtension.ts`

The document-level ops (Phase 3) cover the stored document; the **live** editor commands
must mirror them so a sidebar confirm/unlink/rename updates open-editor tag pills
immediately. Read each file first to follow its `visitCharacterBlocks` pattern.

- [ ] **Step 1: Extend `linkCharacterRef` / `unlinkCharacterRef` / `replaceCharacterRefId`**

In `characterRefCommands.ts`, in addition to walking character blocks, walk the whole doc
for `characterTag` marks and set/clear/replace the mark’s `characterId` attr via
`tr.addMark` / `tr.removeMark` + re-add with new attrs over each marked span. Use the
ProseMirror node + mark range (iterate `doc.descendants`, find text nodes with the
`characterTag` mark, compare `characterKey` / `characterId`, and rewrite the mark on that
span). Keep behavior idempotent (no-op when already correct), matching the existing
`hasChanges` guard.

- [ ] **Step 2: Extend `renameCharacterText`**

Make the live rename also rewrite the **text** of `characterTag`-marked spans for the
renamed character (matching `runCharacterRefRenameCommand`’s approach for cue blocks),
updating the mark’s `characterKey` attr to the normalized new name.

- [ ] **Step 3: Extend `CharacterRefSyncExtension`**

`createCharacterRefSyncTransaction` currently re-derives `characterRefs` for character
blocks from `persistentCharacters`. Add a parallel pass that, for each `characterTag` mark
whose key is in `confirmedCharacterIdByKey`, ensures the mark’s `characterId` matches the
confirmed id (and is cleared when the cast no longer confirms that key). This keeps tag
confirmation state in sync when the cast changes.

- [ ] **Step 4: Verify**

Run: `npx vp check`. Manual:
- Tag an unconfirmed name in a stage direction; confirm it in the sidebar → the pill flips
  from dashed to filled live.
- Rename the character in the sidebar → the pill text updates.
- Delete/unlink → the pill returns to unconfirmed (dashed).

- [ ] **Step 5: Commit**

```bash
git add packages/editor/src/editor/tiptap/scriptBlock/characterRefCommands.ts \
        packages/editor/src/editor/tiptap/extensions/CharacterRefSyncExtension.ts
git commit -m "feat(editor): sync sidebar link/unlink/rename to live tag marks"
```

---

## Final verification

- [ ] Run the full pure-logic test suites:
  `npx vp test run packages/script` and `npx vp test run packages/db`. Expected: PASS.
- [ ] Run `npx vp check` at the repo root (lint + types + format across packages).
- [ ] Manual end-to-end in the editor (no preview tools — manual per project preference):
  author confirmed + unconfirmed tags, edit/delete pills, confirm/rename/delete in the
  sidebar, reload to confirm persistence (`contentJson` + `block_character_refs`).

## Out of scope (per spec §10) — do NOT implement here

- Plain-text Stagistic **syntax** serialization of `@`/`@"…"` (no serializer exists yet;
  lands with the future parser/serializer spec — the mark already round-trips via
  `contentJson`).
- Structural cues `@@cue` / `@@out` (separate spec).
- Passive “suggestion” highlighting of untagged cast names in prose.
- Forced lowercase / canonical-case display. Phase 1 forces uppercase via the
  `.characterTag` CSS rule (Task 6), independent of the stage-direction block’s
  `casing:'normal'`.
- Confirming a character from inside prose (confirmation stays a sidebar action).
- Any sidebar visual change (already correct).
```
