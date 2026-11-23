import {isScriptBlockNodeType, type ScriptNode} from '@stagistic/script';
import * as fc from 'fast-check';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    arbitraryCorruptedBytes,
    arbitraryHostileBytes,
    arbitraryHostileText,
} from './hostileArbitraries';
import {normalizeScriptDocument} from './normalizeScriptDocument';
import {oracleParameters} from './runConfig';
import {arbitraryScriptDocument} from './scriptDocumentArbitrary';
import {arbitraryTitlePage} from './titlePageArbitrary';

const INLINE_NODE_TYPES = new Set([
    'text',
    'musicStart',
    'musicOut',
]);
const MARK_TYPES = new Set([
    'bold',
    'italic',
    'underline',
    'characterTag',
]);
const MUSIC_MODES = new Set(['open', 'hit']);

const collect = (nodes: ScriptNode[], visit: (node: ScriptNode) => void) => nodes.forEach(visit);

describe('arbitraryScriptDocument', () => {
    it('generates schema-valid documents', () => {
        fc.assert(
            fc.property(arbitraryScriptDocument, document => {
                const ids = document.content.map(node => node.attrs?.id);

                expect(document.type).toBe('doc');
                expect(['act', 'scene']).toContain(document.content[0].type);
                expect(new Set(ids).size).toBe(ids.length);
                expect(ids.every(id => typeof id === 'string' && id.length > 0)).toBe(true);
                expect(document.content.every(node => isScriptBlockNodeType(node.type))).toBe(true);

                const musicIds: unknown[] = [];

                document.content.forEach(block => {
                    collect(block.content ?? [], node => {
                        expect(INLINE_NODE_TYPES.has(node.type ?? '')).toBe(true);

                        if (node.type === 'text') {
                            expect(typeof node.text === 'string' && node.text.length > 0).toBe(true);
                            expect((node.marks ?? []).every(mark => MARK_TYPES.has(mark.type))).toBe(true);
                        }

                        if (node.type === 'musicStart') {
                            musicIds.push(node.attrs?.musicId);
                            expect(MUSIC_MODES.has(node.attrs?.mode as string)).toBe(true);
                            expect(typeof node.attrs?.title).toBe('string');
                        }
                    });
                });
                expect(new Set(musicIds).size).toBe(musicIds.length);
            }),
            oracleParameters(),
        );
    });

    it('covers every generated block type, mark and music node', () => {
        const seen = new Set<string>();

        fc.assert(
            fc.property(arbitraryScriptDocument, document => {
                document.content.forEach(block => {
                    seen.add(`block:${block.type}`);
                    (block.content ?? []).forEach(node => {
                        seen.add(`inline:${node.type}`);
                        (node.marks ?? []).forEach(mark => seen.add(`mark:${mark.type}`));
                    });
                });
            }),
            {...oracleParameters(), numRuns: 300},
        );

        [
            'block:scene',
            'block:act',
            'block:stageDirection',
            'block:character',
            'block:aside',
            'block:dialogue',
            'block:lyrics',
            'block:note',
            'inline:musicStart',
            'inline:musicOut',
            'mark:bold',
            'mark:italic',
            'mark:underline',
            'mark:characterTag',
        ].forEach(key => expect(seen.has(key), key).toBe(true));
    });

    it('shrinks a failing document to a minimal counterexample', () => {
        const result = fc.check(
            fc.property(arbitraryScriptDocument, document => document.content.length < 3),
            {seed: 1, numRuns: 200},
        );

        expect(result.failed).toBe(true);
        expect(result.counterexample?.[0].content).toHaveLength(3);
    });
});

describe('arbitraryTitlePage', () => {
    it('generates only the settings the file carries', () => {
        fc.assert(
            fc.property(arbitraryTitlePage, titlePage => {
                const keys = Object.keys(titlePage);

                expect(keys.every(key => [
                    'subtitle',
                    'credits',
                    'source',
                    'draftDateMode',
                    'draftDate',
                    'contact',
                    'copyright',
                ].includes(key))).toBe(true);
            }),
            oracleParameters(),
        );
    });
});

describe('hostile arbitraries', () => {
    it('generates strings and bytes, and corrupts valid bytes into different ones', () => {
        const valid = new Uint8Array([
            1,
            2,
            3,
            4,
            5,
            6,
        ]);

        fc.assert(
            fc.property(arbitraryHostileText, arbitraryHostileBytes, (text, bytes) => {
                expect(typeof text).toBe('string');
                expect(bytes).toBeInstanceOf(Uint8Array);
            }),
            oracleParameters(),
        );
        fc.assert(
            fc.property(arbitraryCorruptedBytes(valid), bytes => bytes instanceof Uint8Array),
            oracleParameters(),
        );
    });
});

describe('normalizeScriptDocument', () => {
    it('ignores block ids and merges adjacent text with equal marks', () => {
        const left = normalizeScriptDocument({
            type: 'doc',
            content: [
                {
                    type: 'scene',
                    attrs: {id: 'a'},
                    content: [{type: 'text', text: 'Hel'}, {type: 'text', text: 'lo'}],
                },
            ],
        });
        const right = normalizeScriptDocument({
            type: 'doc',
            attrs: {settings: {}},
            content: [
                {
                    type: 'scene',
                    attrs: {id: 'b'},
                    content: [{type: 'text', text: 'Hello'}],
                },
            ],
        });

        expect(left).toEqual(right);
    });

    it('ignores derived attrs (music id, tag key and roster id, character refs) but compares the rest', () => {
        const tagged = (characterId: string | null, key: string) => normalizeScriptDocument({
            type: 'doc',
            content: [
                {
                    type: 'stageDirection',
                    attrs: {id: 'x', characterRefs: {A: 'c'}},
                    content: [
                        {
                            type: 'text',
                            text: 'Anna',
                            marks: [{type: 'characterTag', attrs: {characterKey: key, characterId}}],
                        },
                        {
                            type: 'musicStart',
                            attrs: {
                                musicId: key,
                                mode: 'open',
                                title: 'Song',
                                kind: null,
                            },
                        },
                    ],
                },
            ],
        });

        expect(tagged('c1', 'ANNA')).toEqual(tagged(null, 'OTHER'));
        expect(normalizeScriptDocument({
            type: 'doc',
            content: [
                {
                    type: 'musicStart',
                    attrs: {
                        musicId: 'a',
                        mode: 'open',
                        title: 'A',
                    },
                },
            ],
        })).not.toEqual(normalizeScriptDocument({
            type: 'doc',
            content: [
                {
                    type: 'musicStart',
                    attrs: {
                        musicId: 'a',
                        mode: 'hit',
                        title: 'A',
                    },
                },
            ],
        }));
    });

    it('keeps text with different marks apart and compares other attrs', () => {
        const plain = normalizeScriptDocument({type: 'doc', content: [{type: 'dialogue', content: [{type: 'text', text: 'a'}]}]});
        const bold = normalizeScriptDocument({
            type: 'doc',
            content: [
                {
                    type: 'dialogue',
                    content: [
                        {
                            type: 'text',
                            text: 'a',
                            marks: [{type: 'bold'}],
                        },
                    ],
                },
            ],
        });

        expect(plain).not.toEqual(bold);
    });
});
