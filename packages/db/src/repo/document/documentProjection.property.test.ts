import type {ScriptDocument, ScriptNode} from '@stagistic/script';
import {
    arbitraryScriptDocument,
    normalizeScriptDocument,
    oracleParameters,
} from '@stagistic/test-oracles';
import * as fc from 'fast-check';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {InMemoryFileStorage} from '../../storage/fileStorage';
import {createTestDb} from '../../testing/createTestDb';
import {createLocalPgliteRepository} from '../createLocalPgliteRepository';

/*
 * Oracle for the document projection, through the public ScriptRepository seam
 * (docs/testing-oracles.md): a document saved with `saveLatest` loads back unchanged, also after
 * a sequence of edits that exercise delta writes (same ids with new content or type, inserts,
 * deletes, reorders). The expected value is the saved document itself, compared through
 * `normalizeScriptDocument` (keeping `characterRefs`, music ids and tag character ids) plus the block-id order, which the projection must keep.
 *
 * One PGlite database serves all runs of the file (creating one costs ~0.7 s). Block ids are
 * global row keys, so every run prefixes its ids and writes its own script.
 */

const parameters = oracleParameters('pglite');
const TIMEOUT_MS = 600_000;

type Repository = ReturnType<typeof createLocalPgliteRepository>;

let repository: Repository;
let close: () => Promise<void>;
let runCounter = 0;

beforeAll(async () => {
    const {db, client} = await createTestDb();

    repository = createLocalPgliteRepository({
        getLocalDb: () => Promise.resolve(db),
        syncToFs: () => Promise.resolve(),
        fileStorage: new InMemoryFileStorage(),
    });
    close = () => client.close();
});

afterAll(async () => {
    await close();
});

const blockIds = (document: ScriptDocument) => document.content.map(node => String(node.attrs?.id));

/*
 * Block ids, music ids and character ids are global row keys, so a run scopes all of them. A cue's
 * `characterRefs` entry KEY becomes its own roster character `<prefix>ref-KEY`; tag `characterId`s are
 * prefixed. `blockIdFor` lets an edit pick fresh block ids while the links stay scoped.
 */
const scopeNode = (node: ScriptNode, prefix: string): ScriptNode => {
    const refs = node.attrs?.characterRefs as Record<string, string> | undefined;
    const attrs = {
        ...node.attrs,
        ...typeof node.attrs?.musicId === 'string' ? {musicId: `${prefix}${node.attrs.musicId}`} : {},
        ...refs ? {characterRefs: Object.fromEntries(Object.keys(refs).map(key => [key, `${prefix}ref-${key}`]))} : {},
    };
    const marks = node.marks?.map(mark => (typeof mark.attrs?.characterId === 'string'
        ? {...mark, attrs: {...mark.attrs, characterId: `${prefix}${mark.attrs.characterId}`}}
        : mark));

    return {
        ...node,
        ...node.attrs ? {attrs} : {},
        ...marks ? {marks} : {},
        ...node.content ? {content: node.content.map(child => scopeNode(child, prefix))} : {},
    };
};

const withPrefix = (document: ScriptDocument, prefix: string): ScriptDocument => ({
    ...document,
    content: document.content.map(node => {
        const scoped = scopeNode(node, prefix);

        return {...scoped, attrs: {...scoped.attrs, id: `${prefix}${String(node.attrs?.id)}`}};
    }),
});

/* Confirms the roster characters the document's cues refer to; refs to unknown characters are not stored. */
const seedCharacters = async (scriptId: string, document: ScriptDocument) => {
    const seeded = new Set<string>();

    for (const node of document.content) {
        for (const [key, id] of Object.entries((node.attrs?.characterRefs ?? {}) as Record<string, string>)) {
            if (!seeded.has(id)) {
                seeded.add(id);
                await repository.confirmScriptCharacterWithId(scriptId, {id, key});
            }
        }
    }
};

/* The document as the store must return it before any character is confirmed: refs are dropped. */
const withoutRefs = (document: ScriptDocument): ScriptDocument => ({
    ...document,
    content: document.content.map(node => {
        const {characterRefs: _refs, ...attrs} = node.attrs ?? {};

        return {...node, attrs};
    }),
});

/*
 * A later edit is either a fresh document (keeping the block ids, taking new ones or mixing both) or
 * a small change of the current document: bold one block's text (same text, other marks), move a block,
 * drop a block or retype a block. Small changes are what delta writes and order keys exist for.
 */
type Edit =
    | {
        kind: 'fresh',
        document: ScriptDocument,
        idMode: 'kept' | 'fresh' | 'mixed',
    }
    | {
        kind: 'bold' | 'move' | 'drop' | 'retype',
        index: number,
        target: number,
    };

const arbitraryEdit: fc.Arbitrary<Edit> = fc.oneof(
    fc.record({
        kind: fc.constant('fresh' as const),
        document: arbitraryScriptDocument,
        idMode: fc.constantFrom('kept' as const, 'fresh' as const, 'mixed' as const),
    }),
    fc.record({
        kind: fc.constantFrom('bold' as const, 'move' as const, 'drop' as const, 'retype' as const),
        index: fc.nat({max: 30}),
        target: fc.nat({max: 30}),
    }),
    fc.record({
        kind: fc.constantFrom('bold' as const, 'move' as const),
        index: fc.nat({max: 30}),
        target: fc.nat({max: 30}),
    }),
);

const applyEdit = (current: ScriptDocument, edit: Edit, prefix: string, step: number): ScriptDocument => {
    if (edit.kind === 'fresh') {
        return {
            ...edit.document,
            content: edit.document.content.map((node, index) => {
                const fresh = edit.idMode === 'fresh' || (edit.idMode === 'mixed' && index % 2 === 1);
                const scoped = scopeNode(node, prefix);
                const id = `${prefix}${fresh ? `edit-${step}-` : ''}${String(node.attrs?.id)}`;

                return {...scoped, attrs: {...scoped.attrs, id}};
            }),
        };
    }

    const blocks = [...current.content];
    const index = edit.index % blocks.length;

    if (edit.kind === 'bold') {
        blocks[index] = {
            ...blocks[index],
            content: (blocks[index].content ?? []).map(part => (part.type === 'text' ? {...part, marks: [{type: 'bold'}]} : part)),
        };
    } else if (edit.kind === 'move') {
        const [moved] = blocks.splice(index, 1);

        blocks.splice(edit.target % (blocks.length + 1), 0, moved);
    } else if (edit.kind === 'drop' && blocks.length > 1) {
        blocks.splice(index, 1);
    } else if (edit.kind === 'retype') {
        blocks[index] = {...blocks[index], type: blocks[index].type === 'note' ? 'stageDirection' : 'note'};
    }

    return {...current, content: blocks};
};

const nextPrefix = () => `run-${runCounter += 1}-`;

const expectLoaded = async (scriptId: string, expected: ScriptDocument) => {
    const loaded = await repository.loadLatest(scriptId);

    expect(loaded).not.toBeNull();

    if (loaded) {
        expect(normalizeScriptDocument(loaded, {keepLinks: true})).toEqual(normalizeScriptDocument(expected, {keepLinks: true}));
        expect(blockIds(loaded)).toEqual(blockIds(expected));
    }
};

describe('document projection round trip', () => {
    it('loadLatest returns the document created with createScript', async () => {
        await fc.assert(
            fc.asyncProperty(arbitraryScriptDocument, async document => {
                const scoped = withPrefix(document, nextPrefix());
                const scriptId = await repository.createScript('Play', scoped);

                // No roster character exists yet, so cue refs are not stored; everything else is.
                await expectLoaded(scriptId, withoutRefs(scoped));
            }),
            parameters,
        );
    }, TIMEOUT_MS);

    it('loadLatest returns the document written with saveLatest', async () => {
        await fc.assert(
            fc.asyncProperty(arbitraryScriptDocument, arbitraryScriptDocument, async (initial, document) => {
                const prefix = nextPrefix();
                const scriptId = await repository.createScript('Play', withPrefix(initial, prefix));
                const scoped = applyEdit(withPrefix(initial, prefix), {
                    kind: 'fresh',
                    document,
                    idMode: 'mixed',
                }, prefix, 1);

                await seedCharacters(scriptId, scoped);
                await repository.saveLatest(scriptId, scoped);
                await expectLoaded(scriptId, scoped);
            }),
            parameters,
        );
    }, TIMEOUT_MS);

    it('loadLatest equals the last document after a sequence of edits, at every step', async () => {
        await fc.assert(
            fc.asyncProperty(arbitraryScriptDocument, fc.array(arbitraryEdit, {minLength: 1, maxLength: 6}), async (initial, edits) => {
                const prefix = nextPrefix();
                let current = withPrefix(initial, prefix);
                const scriptId = await repository.createScript('Play', current);

                for (const [index, edit] of edits.entries()) {
                    current = applyEdit(current, edit, prefix, index + 1);
                    await seedCharacters(scriptId, current);
                    await repository.saveLatest(scriptId, current);
                    await expectLoaded(scriptId, current);
                }
            }),
            parameters,
        );
    }, TIMEOUT_MS);
});
