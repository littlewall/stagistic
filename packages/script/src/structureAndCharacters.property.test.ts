import {
    arbitraryScriptDocument,
    type NormalizedScriptNode,
    normalizeScriptDocument,
    oracleParameters,
} from '@stagistic/test-oracles';
import * as fc from 'fast-check';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    collectScriptCharacterStats,
    renameCharacterInScriptDocument,
} from './characters';
import type {ScriptDocument, ScriptNode} from './document';
import {buildScriptBlockIndex} from './indexing';
import {buildScriptStructureOutline} from './structure';

/*
 * Oracles for structure and character derivations (docs/adr/0001-property-oracles-fixed-seed.md).
 * Rules, stated independently of the implementation:
 * 1. the block index lists the blocks in document order; each block belongs to exactly one scene (the
 *    nearest scene above it, or none before the first scene) and one act; the outline lists every scene
 *    once, in document order, under the act above it;
 * 2. character statistics add up: each occurrence is counted once as confirmed or unconfirmed, the cue
 *    part and the tag part are additive, and the tag part equals the tags the document carries;
 * 3. renaming A to a new name B and back restores the document (except the casing the rename writes),
 *    leaves every other character's count alone, and leaves blocks that never mention A untouched.
 */

const blocksOf = (document: ScriptDocument) => document.content;
const typeOf = (node: ScriptNode) => node.type;
const idOf = (node: ScriptNode) => String(node.attrs?.id);

describe('block index and outline oracle', () => {
    it('lists blocks in order, each in exactly one scene and act', () => {
        fc.assert(
            fc.property(arbitraryScriptDocument, document => {
                const {snapshot, blockCount} = buildScriptBlockIndex(document);
                const nodes = blocksOf(document);

                expect(blockCount).toBe(nodes.length);
                expect(snapshot.blocks.map(entry => entry.blockId)).toEqual(nodes.map(idOf));
                expect(snapshot.blocks.map(entry => entry.orderNo)).toEqual(nodes.map((_node, index) => index));
                expect(snapshot.blocks.map(entry => entry.blockType)).toEqual(nodes.map(typeOf));

                let scene: string | null = null;
                let act: string | null = null;

                nodes.forEach((node, index) => {
                    if (typeOf(node) === 'scene') {
                        scene = idOf(node);
                    }

                    if (typeOf(node) === 'act') {
                        act = idOf(node);
                    }

                    expect(snapshot.blocks[index].sceneBlockId).toBe(scene);
                    expect(snapshot.blocks[index].actBlockId).toBe(act);
                });
            }),
            oracleParameters(),
        );
    });

    it('lists every scene once, in order, under the act above it', () => {
        fc.assert(
            fc.property(arbitraryScriptDocument, document => {
                const {acts} = buildScriptStructureOutline(document.content);
                const nodes = blocksOf(document);
                const sceneIds = nodes.filter(node => typeOf(node) === 'scene').map(idOf);

                /* One primary group, first; every act after it opens its own group. */
                expect(acts.filter(group => group.primary)).toHaveLength(acts.length > 0 ? 1 : 0);
                expect(acts.length === 0 || acts[0].primary).toBe(true);
                expect(acts.flatMap(group => group.items.map(item => item.blockId))).toEqual(sceneIds);

                let act: string | null = null;
                const actOfScene = new Map<string, string | null>();

                nodes.forEach(node => {
                    if (typeOf(node) === 'act') {
                        act = idOf(node);
                    }

                    if (typeOf(node) === 'scene') {
                        actOfScene.set(idOf(node), act);
                    }
                });

                acts.forEach(group => group.items.forEach(item => {
                    const expectedAct = actOfScene.get(item.blockId);

                    /* Scenes above the first act sit in the primary group. */
                    expect(expectedAct === null ? group.primary : group.actId === expectedAct).toBe(true);
                }));
            }),
            oracleParameters(),
        );
    });
});

type Counts = ReadonlyMap<string, number>;

const totalOf = (counts: Counts) => [...counts.values()].reduce((total, value) => total + value, 0);
const isCue = (node: ScriptNode) => typeOf(node) === 'character';
const withBlocks = (document: ScriptDocument, keep: (node: ScriptNode) => boolean): ScriptDocument => ({
    ...document,
    content: blocksOf(document).filter(keep),
});
const addCounts = (left: Counts, right: Counts) => {
    const sumByKey = new Map(left);

    right.forEach((value, key) => sumByKey.set(key, (sumByKey.get(key) ?? 0) + value));

    return sumByKey;
};
const tagged = (name: string, characterId: string | null): ScriptNode => ({
    type: 'text',
    text: name,
    marks: [{type: 'characterTag', attrs: {characterKey: name.toUpperCase(), characterId}}],
});
const arbitraryConfirmedIds = fc.subarray([
    'character-1',
    'character-2',
    'character-ref',
    'character-9',
]);

/*
 * Independent tag walk: a tag is a run of consecutive text children carrying a `characterTag` mark with the
 * same `characterId`; its key is the run text, whitespace-collapsed and upper-cased (generated names have no
 * parenthetical suffix, so the production key rule needs no copy here).
 */
const tagsOfBlock = (block: ScriptNode) => {
    const runs: {text: string, characterId: string | null}[] = [];
    let open = false;

    for (const child of block.content ?? []) {
        const mark = child.marks?.find(candidate => candidate.type === 'characterTag');

        if (!mark || typeof child.text !== 'string') {
            open = false;
            continue;
        }

        const rawId = mark.attrs?.characterId;
        const characterId = typeof rawId === 'string' && rawId ? rawId : null;
        const last = runs.at(-1);

        if (open && last && last.characterId === characterId) {
            last.text += child.text;
        } else {
            runs.push({text: child.text, characterId});
        }

        open = true;
    }

    return runs
        .map(run => ({
            key: run.text.replace(/\u200b/gu, '').trim().replace(/\s+/gu, ' ')
                .toUpperCase(),
            characterId: run.characterId,
        }))
        .filter(tag => tag.key);
};

describe('character statistics oracle', () => {
    it('counts every occurrence once, as confirmed or unconfirmed', () => {
        fc.assert(
            fc.property(arbitraryScriptDocument, arbitraryConfirmedIds, (document, confirmed) => {
                const stats = collectScriptCharacterStats(document, new Set(confirmed));

                expect(totalOf(stats.confirmedCountsById) + totalOf(stats.unconfirmedCountsByKey)).toBe(totalOf(stats.countsByKey));
                stats.confirmedCountsById.forEach((_count, id) => expect(confirmed).toContain(id));

                const none = collectScriptCharacterStats(document, new Set());

                expect(none.confirmedCountsById.size).toBe(0);
                expect(none.unconfirmedCountsByKey).toEqual(none.countsByKey);
                expect(none.countsByKey).toEqual(stats.countsByKey);
            }),
            oracleParameters(),
        );
    });

    it('adds the cue part and the tag part, and the tag part equals the tags in the document', () => {
        fc.assert(
            fc.property(arbitraryScriptDocument, arbitraryConfirmedIds, (document, confirmed) => {
                const ids = new Set(confirmed);
                const whole = collectScriptCharacterStats(document, ids);
                const cues = collectScriptCharacterStats(withBlocks(document, isCue), ids);
                const tags = collectScriptCharacterStats(withBlocks(document, node => !isCue(node)), ids);

                expect(addCounts(cues.countsByKey, tags.countsByKey)).toEqual(whole.countsByKey);
                expect(addCounts(cues.unconfirmedCountsByKey, tags.unconfirmedCountsByKey)).toEqual(whole.unconfirmedCountsByKey);
                expect(addCounts(cues.confirmedCountsById, tags.confirmedCountsById)).toEqual(whole.confirmedCountsById);

                const expectedByKey = new Map<string, number>();
                const expectedConfirmed = new Map<string, number>();

                blocksOf(document).filter(node => !isCue(node)).forEach(node => tagsOfBlock(node).forEach(tag => {
                    expectedByKey.set(tag.key, (expectedByKey.get(tag.key) ?? 0) + 1);

                    if (tag.characterId && ids.has(tag.characterId)) {
                        expectedConfirmed.set(tag.characterId, (expectedConfirmed.get(tag.characterId) ?? 0) + 1);
                    }
                }));
                expect(tags.countsByKey).toEqual(expectedByKey);
                expect(tags.confirmedCountsById).toEqual(expectedConfirmed);
            }),
            oracleParameters(),
        );
    });
});

/* Rename writes the new name's casing, so compare cue names and tag texts case-insensitively. */
const foldNameCase = (node: NormalizedScriptNode, inCue: boolean): NormalizedScriptNode => ({
    ...node,
    ...typeof node.text === 'string' && (inCue || node.marks?.some(mark => mark.type === 'characterTag'))
        ? {text: node.text.toUpperCase()}
        : {},
    ...node.content ? {content: node.content.map(child => foldNameCase(child, inCue))} : {},
});
const foldDocument = (document: ScriptDocument) => normalizeScriptDocument(document).content.map(node => foldNameCase(node, node.type === 'character'));

const NEW_NAME = 'ZZ NEWNAME';
const identityName = (name: string) => name;
const rename = (document: ScriptDocument, from: string, to: string) => renameCharacterInScriptDocument(document, from, to, identityName).value;

describe('character statistics examples', () => {
    it('counts each tag occurrence, also when the same name repeats in one block and across blocks', () => {
        const document: ScriptDocument = {
            type: 'doc',
            content: [
                {
                    type: 'stageDirection',
                    attrs: {id: 'block-1'},
                    content: [
                        tagged('Anna', 'character-1'),
                        {type: 'text', text: ' and '},
                        tagged('Anna', 'character-1'),
                    ],
                },
                {
                    type: 'stageDirection',
                    attrs: {id: 'block-2'},
                    content: [tagged('anna', null)],
                },
            ],
        };
        const stats = collectScriptCharacterStats(document, new Set(['character-1']));

        expect(stats.countsByKey.get('ANNA')).toBe(3);
        expect(stats.confirmedCountsById.get('character-1')).toBe(2);
        expect(stats.unconfirmedCountsByKey.get('ANNA')).toBe(1);
    });
});

describe('character rename oracle', () => {
    const arbitraryRename = fc.tuple(arbitraryScriptDocument, fc.nat()).map(([document, pick]) => {
        const keys = [...collectScriptCharacterStats(document, new Set()).countsByKey.keys()].toSorted();

        return {document, key: keys.length > 0 ? keys[pick % keys.length] : null};
    });

    it('renames A to a new B and back to the original document, leaving the others alone', () => {
        fc.assert(
            fc.property(arbitraryRename, ({document, key}) => {
                fc.pre(key !== null && key !== NEW_NAME);

                const before = collectScriptCharacterStats(document, new Set()).countsByKey;
                const renamed = rename(document, key, NEW_NAME);
                const after = collectScriptCharacterStats(renamed, new Set()).countsByKey;

                /* A became B; every other character keeps its count; B had none before. */
                expect(after.get(key)).toBeUndefined();
                expect(after.get(NEW_NAME)).toBe(before.get(key));
                before.forEach((count, other) => {
                    if (other !== key) {
                        expect(after.get(other)).toBe(count);
                    }
                });
                expect(after.size).toBe(before.size);

                /* Blocks that never mention A are the very same nodes. */
                blocksOf(document).forEach((node, index) => {
                    const mentions = collectScriptCharacterStats({...document, content: [node]}, new Set()).countsByKey.has(key);

                    if (!mentions) {
                        expect(renamed.content[index]).toEqual(node);
                    }
                });

                expect(foldDocument(rename(renamed, NEW_NAME, key))).toEqual(foldDocument(document));
            }),
            oracleParameters(),
        );
    });

    /* F5: rename writes the canonical `/` between cue names. */
    it('keeps the `/` delimiter of a multi-name cue when renaming there and back', () => {
        const document: ScriptDocument = {
            type: 'doc',
            content: [
                {
                    type: 'scene',
                    attrs: {id: 'block-1'},
                    content: [{type: 'text', text: 'a'}],
                },
                {
                    type: 'character',
                    attrs: {id: 'block-2'},
                    content: [{type: 'text', text: 'ANNA/BOB'}],
                },
            ],
        };

        expect(foldDocument(rename(rename(document, 'ANNA', NEW_NAME), NEW_NAME, 'ANNA'))).toEqual(foldDocument(document));
    });
});
