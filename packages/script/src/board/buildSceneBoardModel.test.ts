import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    CHARACTER_TAG_ID_ATTR,
    CHARACTER_TAG_KEY_ATTR,
    CHARACTER_TAG_MARK_NAME,
} from '../characters/characterTagMarks';
import type {ScriptDocument, ScriptNode} from '../document';
import {buildScriptBlockIndex, type ScriptBlockIndexSnapshot} from '../indexing';
import {buildScriptStructureOutline} from '../structure';
import {buildSceneBoardModel} from './buildSceneBoardModel';
import type {SceneBoardCatalog} from './types';

const NO_CATALOG: SceneBoardCatalog = {characters: [], groups: []};

const block = (
    type: string,
    id: string,
    text: string,
    attrs: Record<string, unknown> = {},
    content?: ScriptNode[],
): ScriptNode => ({
    type,
    attrs: {id, ...attrs},
    content: content ?? (text ? [{type: 'text', text}] : []),
});

const tagged = (id: string, key: string, characterId: string | null): ScriptNode => block('stageDirection', id, '', {}, [
    {
        type: 'text',
        text: key,
        marks: [
            {
                type: CHARACTER_TAG_MARK_NAME,
                attrs: {
                    [CHARACTER_TAG_KEY_ATTR]: key,
                    [CHARACTER_TAG_ID_ATTR]: characterId,
                },
            },
        ],
    },
]);

type Ref = {key: string, characterId: string | null};

/** An index with hand-set references, for block types the document index does not tag today. */
const indexOf = (rows: Array<[blockType: string, blockId: string, refs?: Ref[]]>): ScriptBlockIndexSnapshot => ({
    blocks: rows.map(([
        blockType,
        blockId,
        refs,
    ], orderNo) => ({
        blockId,
        orderNo,
        blockType,
        textContent: blockType === 'scene' ? 'Scene' : '',
        actBlockId: null,
        sceneBlockId: null,
        characterRefs: refs ?? null,
    })),
    music: [],
    orphanMusicOutBlockIds: [],
});

const levelsOf = (index: ScriptBlockIndexSnapshot, catalog: SceneBoardCatalog = CATALOG) => buildSceneBoardModel(index, catalog)
    .acts[0].scenes[0].characters.map(({entryId, level}) => `${entryId}:${level}`);

const toDocument = (content: ScriptNode[]): ScriptDocument => ({type: 'doc', content});

const buildModel = (content: ScriptNode[], catalog: SceneBoardCatalog = NO_CATALOG) => buildSceneBoardModel(
    buildScriptBlockIndex(toDocument(content)).snapshot,
    catalog,
);

const characters = (content: ScriptNode[], catalog: SceneBoardCatalog = NO_CATALOG) => buildModel(content, catalog)
    .acts.flatMap(act => act.scenes)
    .map(scene => scene.characters.map(({entryId, level}) => `${entryId}:${level}`));

const ANNA = {id: 'c-anna', key: 'ANNA'};
const BEN = {id: 'c-ben', key: 'BEN'};
const CLARA = {id: 'c-clara', key: 'CLARA'};
const CATALOG: SceneBoardCatalog = {
    characters: [
        ANNA,
        BEN,
        CLARA,
    ],
    groups: [],
};

describe('buildSceneBoardModel structure', () => {
    it('returns no acts for an empty script', () => {
        expect(buildModel([])).toEqual({acts: []});
    });

    it('puts scenes before the first act heading into a default act of their own', () => {
        const model = buildModel([
            block('scene', 's0', 'Prologue'),
            block('act', 'a1', 'ACT ONE'),
            block('scene', 's1', 'Kitchen'),
        ]);

        expect(model.acts.map(act => [
            act.actBlockId,
            act.name,
            act.scenes.map(scene => scene.headingBlockId),
        ])).toEqual([
            [
                null,
                'ACT 1',
                ['s0'],
            ],
            [
                'a1',
                'ACT ONE',
                ['s1'],
            ],
        ]);
        expect(model.acts[0].scenes[0].actBlockId).toBeNull();
        expect(model.acts[1].scenes[0].actBlockId).toBe('a1');
    });

    it('keeps an act without scenes', () => {
        const model = buildModel([
            block('act', 'a1', 'ACT ONE'),
            block('scene', 's1', 'Kitchen'),
            block('act', 'a2', 'ACT TWO'),
        ]);

        expect(model.acts.map(act => [act.name, act.scenes.length])).toEqual([['ACT ONE', 1], ['ACT TWO', 0]]);
    });

    it('keeps one empty default act for a script without acts and scenes', () => {
        const model = buildModel([block('dialogue', 'd1', 'Hello')]);

        expect(model.acts).toEqual([
            {
                actBlockId: null,
                name: 'ACT 1',
                scenes: [],
            },
        ]);
    });

    it('numbers scenes sequentially across acts and labels untitled ones', () => {
        const model = buildModel([
            block('act', 'a1', 'ACT ONE'),
            block('scene', 's1', 'Kitchen'),
            block('act', 'a2', ''),
            block('scene', 's2', ''),
            block('scene', 's3', 'Garden'),
        ]);

        expect(model.acts.map(act => act.name)).toEqual(['ACT ONE', 'ACT 2']);
        expect(model.acts.flatMap(act => act.scenes).map(scene => [scene.number, scene.title])).toEqual([
            [1, 'Kitchen'],
            [2, 'Untitled scene'],
            [3, 'Garden'],
        ]);
    });
});

describe('buildSceneBoardModel parity with buildScriptStructureOutline', () => {
    const fixtures: Record<string, ScriptNode[]> = {
        'scenes without acts': [block('scene', 's1', 'A'), block('scene', 's2', 'B')],
        'one act': [
            block('act', 'a1', 'ACT ONE'),
            block('scene', 's1', 'A'),
            block('scene', 's2', 'B'),
        ],
        'two acts': [
            block('act', 'a1', 'ACT ONE'),
            block('scene', 's1', 'A'),
            block('act', 'a2', 'ACT TWO'),
            block('scene', 's2', 'B'),
            block('scene', 's3', ''),
        ],
        'untitled act': [
            block('act', 'a1', ''),
            block('scene', 's1', 'A'),
            block('act', 'a2', '  '),
        ],
        'act without scenes': [block('act', 'a1', 'ACT ONE')],
        'content around headings': [
            block('dialogue', 'd0', 'Before'),
            block('act', 'a1', 'ACT ONE'),
            block('dialogue', 'd1', 'Hi'),
            block('scene', 's1', 'A'),
            block('dialogue', 'd2', 'Hi'),
        ],
    };

    it.each(Object.entries(fixtures))('matches act names and scenes for %s', (_name, content) => {
        const outline = buildScriptStructureOutline(content);
        const model = buildModel(content);

        expect(model.acts.map(act => act.name)).toEqual(outline.acts.map(act => act.actName));
        expect(model.acts.map(act => act.scenes.map(scene => [scene.headingBlockId, scene.title])))
            .toEqual(outline.acts.map(act => act.items.map(item => [item.blockId, item.title])));
    });
});

describe('buildSceneBoardModel characters', () => {
    it('treats a cue as present, naming several characters of one cue', () => {
        expect(characters([
            block('scene', 's1', 'A'),
            block('character', 'c1', 'ANNA / BEN'),
            block('dialogue', 'd1', 'Hi'),
        ], CATALOG)).toEqual([['c-anna:present', 'c-ben:present']]);
    });

    it('treats a tag in a stage direction as present', () => {
        expect(characters([
            block('scene', 's1', 'A'),
            tagged('t1', 'ANNA', 'c-anna'),
        ], CATALOG)).toEqual([['c-anna:present']]);
    });

    it('ignores tags outside stage directions', () => {
        const index = indexOf([
            ['scene', 's1'],
            [
                'aside',
                'a1',
                [{key: 'ANNA', characterId: 'c-anna'}],
            ],
            [
                'dialogue',
                'd1',
                [{key: 'BEN', characterId: 'c-ben'}],
            ],
            [
                'lyrics',
                'l1',
                [{key: 'CLARA', characterId: 'c-clara'}],
            ],
        ]);

        expect(levelsOf(index)).toEqual([]);
    });

    it('orders characters by their first valid evidence', () => {
        const index = indexOf([
            ['scene', 's1'],
            [
                'dialogue',
                'd1',
                [{key: 'BEN', characterId: 'c-ben'}],
            ],
            [
                'character',
                'c1',
                [{key: 'ANNA', characterId: 'c-anna'}, {key: 'BEN', characterId: 'c-ben'}],
            ],
        ]);

        expect(levelsOf(index)).toEqual(['c-anna:present', 'c-ben:present']);
    });

    it('lists a character once when both a cue and a tag name them', () => {
        expect(characters([
            block('scene', 's1', 'A'),
            block('character', 'c1', 'ANNA'),
            tagged('t1', 'ANNA', 'c-anna'),
        ], CATALOG)).toEqual([['c-anna:present']]);
    });

    it('ignores notes and blocks before the first scene', () => {
        expect(characters([
            block('character', 'c0', 'ANNA'),
            block('scene', 's1', 'A'),
            block('note', 'n1', 'ANNA enters'),
            block('act', 'a2', 'ACT TWO'),
            block('character', 'c1', 'BEN'),
            block('scene', 's2', 'B'),
        ], CATALOG)).toEqual([[], []]);
    });

    it('ignores references carried by a note', () => {
        const index = indexOf([
            ['scene', 's1'],
            [
                'note',
                'n1',
                [{key: 'ANNA', characterId: 'c-anna'}],
            ],
        ]);

        expect(levelsOf(index)).toEqual([]);
    });

    it('scopes characters to the scene and starts fresh in the next one', () => {
        expect(characters([
            block('scene', 's1', 'A'),
            block('character', 'c1', 'ANNA'),
            block('scene', 's2', 'B'),
            block('character', 'c2', 'BEN'),
        ], CATALOG)).toEqual([['c-anna:present'], ['c-ben:present']]);
    });

    it('expands a group to its members at the same level without showing the group', () => {
        const catalog: SceneBoardCatalog = {
            characters: [
                ANNA,
                BEN,
                CLARA,
            ],
            groups: [
                {
                    id: 'g-all',
                    key: 'EVERYONE',
                    memberIds: ['c-ben', 'c-anna'],
                },
            ],
        };

        expect(characters([
            block('scene', 's1', 'A'),
            block('character', 'c1', 'EVERYONE', {characterRefs: {EVERYONE: 'g-all'}}),
        ], catalog)).toEqual([['c-ben:present', 'c-anna:present']]);
    });

    it('does not repeat a group member who also has their own cue', () => {
        const catalog: SceneBoardCatalog = {
            characters: [ANNA, BEN],
            groups: [
                {
                    id: 'g-all',
                    key: 'EVERYONE',
                    memberIds: ['c-anna', 'c-ben'],
                },
            ],
        };

        expect(characters([
            block('scene', 's1', 'A'),
            block('character', 'c1', 'EVERYONE', {characterRefs: {EVERYONE: 'g-all'}}),
            block('character', 'c2', 'ANNA'),
        ], catalog)).toEqual([['c-anna:present', 'c-ben:present']]);
    });

    it('resolves a reference without an id by its key', () => {
        expect(characters([
            block('scene', 's1', 'A'),
            block('character', 'c1', 'anna'),
        ], CATALOG)).toEqual([['c-anna:present']]);
    });

    it('keeps an unconfirmed key as a neutral entry that does not repeat a confirmed one', () => {
        const model = buildModel([
            block('scene', 's1', 'A'),
            block('character', 'c1', 'DOCTOR / ANNA'),
            block('character', 'c2', 'DOCTOR'),
        ], CATALOG);

        expect(model.acts[0].scenes[0].characters).toEqual([
            {
                entryId: 'key:DOCTOR',
                characterId: null,
                key: 'DOCTOR',
                level: 'present',
                firstCue: 0,
            },
            {
                entryId: 'c-anna',
                characterId: 'c-anna',
                key: 'ANNA',
                level: 'present',
                firstCue: 0,
            },
        ]);
    });

    it('ranks first cues per scene and leaves a tag-only character without one', () => {
        const model = buildModel([
            block('scene', 's1', 'A'),
            tagged('t1', 'CLARA', 'c-clara'),
            block('character', 'c1', 'BEN'),
            block('character', 'c2', 'ANNA'),
            block('character', 'c3', 'BEN'),
            block('scene', 's2', 'B'),
            block('character', 'c4', 'ANNA'),
        ], CATALOG);

        expect(model.acts[0].scenes.map(scene => scene.characters.map(({key, firstCue}) => [key, firstCue]))).toEqual([
            [
                ['CLARA', null],
                ['BEN', 0],
                ['ANNA', 1],
            ],
            [['ANNA', 0]],
        ]);
    });

    it('falls back to the key when the referenced id left the catalog', () => {
        expect(characters([
            block('scene', 's1', 'A'),
            block('character', 'c1', 'ANNA', {characterRefs: {ANNA: 'c-gone'}}),
        ], CATALOG)).toEqual([['c-anna:present']]);
    });
});
