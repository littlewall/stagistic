import {
    describe,
    expect,
    it,
} from 'vite-plus/test';
import * as Y from 'yjs';

import {META_DEDUPE_RULES} from '../engine/scriptRecords';
import {
    applyRecordChanges,
    dedupeRecords,
    diffRecords,
    projectionUpserts,
    readRecords,
    replaceRecords,
} from './recordsCodec';

const COLLECTIONS = [
    'characters',
    'scenes',
    'locations',
];

const sync = (left: Y.Doc, right: Y.Doc) => {
    Y.applyUpdate(right, Y.encodeStateAsUpdate(left, Y.encodeStateVector(right)));
    Y.applyUpdate(left, Y.encodeStateAsUpdate(right, Y.encodeStateVector(left)));
};

const seeded = (snapshot: Parameters<typeof replaceRecords>[1]) => {
    const doc = new Y.Doc();

    replaceRecords(doc, snapshot, COLLECTIONS);

    return doc;
};

const hamlet = {
    key: 'HAMLET',
    kind: 'character',
    colorHex: null,
    outline: null,
    createdAt: 1,
};

describe('records codec', () => {
    it('diffs snapshots per record', () => {
        expect(diffRecords(
            {characters: {a: hamlet, b: {key: 'OPHELIA'}}},
            {characters: {a: {...hamlet, colorHex: '#f00'}, c: {key: 'HORATIO'}}},
        )).toEqual({
            characters: {
                a: {before: hamlet, after: {...hamlet, colorHex: '#f00'}},
                b: {before: {key: 'OPHELIA'}, after: null},
                c: {before: null, after: {key: 'HORATIO'}},
            },
        });
    });

    it('merges concurrent edits of different fields of one record', () => {
        const left = seeded({characters: {a: hamlet}});
        const right = new Y.Doc();

        sync(left, right);

        applyRecordChanges(left, {characters: {a: {before: hamlet, after: {...hamlet, colorHex: '#f00'}}}});
        applyRecordChanges(right, {characters: {a: {before: hamlet, after: {...hamlet, outline: 'Prince'}}}});
        sync(left, right);

        expect(readRecords(left, COLLECTIONS)).toEqual(readRecords(right, COLLECTIONS));
        expect(readRecords(left, COLLECTIONS).characters.a).toEqual({
            ...hamlet,
            colorHex: '#f00',
            outline: 'Prince',
        });
    });

    it('does not revert a field the doc changed since the local before', () => {
        const doc = seeded({characters: {a: hamlet}});

        // Remote: color set. Local mutation computed against the stale projection only renamed.
        applyRecordChanges(doc, {characters: {a: {before: hamlet, after: {...hamlet, colorHex: '#0f0'}}}});
        applyRecordChanges(doc, {characters: {a: {before: hamlet, after: {...hamlet, key: 'HAM'}}}});

        expect(readRecords(doc, COLLECTIONS).characters.a).toEqual({
            ...hamlet,
            key: 'HAM',
            colorHex: '#0f0',
        });
    });

    it('lets a deletion win over a concurrent edit', () => {
        const left = seeded({characters: {a: hamlet}});
        const right = new Y.Doc();

        sync(left, right);
        applyRecordChanges(left, {characters: {a: {before: hamlet, after: null}}});
        applyRecordChanges(right, {characters: {a: {before: hamlet, after: {...hamlet, colorHex: '#f00'}}}});
        sync(left, right);

        expect(readRecords(left, COLLECTIONS).characters).toEqual({});
        expect(readRecords(right, COLLECTIONS).characters).toEqual({});
    });

    it('replaces content as ops, so another replica converges without duplicates', () => {
        const left = seeded({characters: {a: hamlet, b: {key: 'OPHELIA'}}});
        const right = new Y.Doc();

        sync(left, right);
        replaceRecords(left, {characters: {a: {...hamlet, colorHex: '#f00'}, c: {key: 'HORATIO'}}}, COLLECTIONS);
        sync(left, right);

        expect(Object.keys(readRecords(right, COLLECTIONS).characters).sort()).toEqual(['a', 'c']);
        expect(readRecords(right, COLLECTIONS).characters.a.colorHex).toBe('#f00');
    });

    it('lists only records changed since the last projection', () => {
        expect(projectionUpserts(
            {characters: {a: hamlet, b: {key: 'OPHELIA'}}},
            {characters: {a: hamlet, c: {key: 'HORATIO'}}},
        )).toEqual({characters: {b: null, c: {key: 'HORATIO'}}});
    });

    it('merges characters created with the same key on two replicas and remaps references', () => {
        const left = new Y.Doc();
        const right = new Y.Doc();

        applyRecordChanges(left, {characters: {
            l: {
                before: null,
                after: {
                    key: 'HAMLET',
                    kind: 'character',
                    colorHex: null,
                    createdAt: 5,
                },
            },
            g: {
                before: null,
                after: {
                    key: 'ROYALS',
                    kind: 'group',
                    memberIds: ['l'],
                    createdAt: 1,
                },
            },
        }});
        applyRecordChanges(right, {characters: {r: {
            before: null,
            after: {
                key: 'HAMLET',
                kind: 'character',
                colorHex: '#f00',
                createdAt: 3,
            },
        }}});
        sync(left, right);

        dedupeRecords(left, META_DEDUPE_RULES);
        dedupeRecords(right, META_DEDUPE_RULES);
        sync(left, right);

        const characters = readRecords(left, COLLECTIONS).characters;

        expect(readRecords(right, COLLECTIONS)).toEqual(readRecords(left, COLLECTIONS));
        expect(Object.keys(characters).sort()).toEqual(['g', 'r']);
        expect(characters.r.colorHex).toBe('#f00');
        expect(characters.g.memberIds).toEqual(['r']);
    });
});
