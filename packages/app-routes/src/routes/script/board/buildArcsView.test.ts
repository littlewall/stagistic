import type {SceneBoardModel} from '@stagistic/script';
import type {BoardArcsArc} from '@stagistic/ui';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {type ArcsViewInput, buildArcsView} from './buildArcsView';
import {type SceneCardRecord} from './buildSceneChips';

const model: SceneBoardModel = {
    acts: [
        {
            actBlockId: null,
            name: 'ACT 1',
            scenes: [
                {
                    headingBlockId: 's0',
                    number: 1,
                    title: 'Prologue',
                    actBlockId: null,
                    characters: [
                        {
                            entryId: 'key:DOCTOR',
                            characterId: null,
                            key: 'DOCTOR',
                            level: 'present',
                            firstCue: 0,
                        },
                    ],
                },
            ],
        },
        {
            actBlockId: 'a1',
            name: 'ACT ONE',
            scenes: [
                {
                    headingBlockId: 's1',
                    number: 2,
                    title: 'Kitchen',
                    actBlockId: 'a1',
                    characters: [
                        {
                            entryId: 'c-anna',
                            characterId: 'c-anna',
                            key: 'ANNA',
                            level: 'present',
                            firstCue: 0,
                        },
                        {
                            entryId: 'c-cy',
                            characterId: 'c-cy',
                            key: 'CY',
                            level: 'present',
                            firstCue: 1,
                        },
                    ],
                },
                {
                    headingBlockId: 's2',
                    number: 3,
                    title: 'Garden',
                    actBlockId: 'a1',
                    characters: [
                        {
                            entryId: 'c-ben',
                            characterId: 'c-ben',
                            key: 'BEN',
                            level: 'present',
                            firstCue: 0,
                        },
                    ],
                },
            ],
        },
    ],
};

const characters = [
    {
        id: 'c-anna',
        key: 'ANNA',
        colorHex: '#cc3344',
    },
    {
        id: 'c-ben',
        key: 'BEN',
        colorHex: null,
    },
    {
        id: 'c-cy',
        key: 'CY',
        colorHex: null,
    },
    {
        id: 'c-dee',
        key: 'DEE',
        colorHex: null,
    },
];

const filterCharacters = [
    {
        id: 'c-anna',
        name: 'ANNA',
        color: '#cc3344',
        sceneCount: 1,
    },
    {
        id: 'c-cy',
        name: 'CY',
        color: '#ff6644',
        sceneCount: 1,
    },
    {
        id: 'c-ben',
        name: 'BEN',
        color: '#2266cc',
        sceneCount: 1,
    },
    {
        id: 'c-dee',
        name: 'DEE',
        color: '#99aa33',
        sceneCount: 0,
    },
];

const baseInput: ArcsViewInput = {
    model,
    characters,
    displayColorByKey: new Map([['BEN', '#2266cc']]),
    filterCharacters,
    selectedIds: new Set(),
    sceneNumberFormat: 'dot',
};

const build = (overrides: Partial<ArcsViewInput> = {}) => buildArcsView({...baseInput, ...overrides});

const record = (
    headingBlockId: string,
    characterId: string,
    note: string | null,
    arcValue: number | null = null,
): SceneCardRecord => ({
    headingBlockId,
    characterId,
    note,
    arcValue,
});

const arcById = (arcs: readonly BoardArcsArc[], id: string) => arcs.find(arc => arc.id === id);

describe('buildArcsView', () => {
    it('returns acts with formatted scene numbers and titles', () => {
        const {acts} = build();

        expect(acts.map(act => [
            act.key,
            act.name,
            act.scenes.map(scene => [
                scene.headingBlockId,
                scene.number,
                scene.title,
            ]),
        ])).toEqual([
            [
                '__default-act__',
                'ACT 1',
                [
                    [
                        's0',
                        '1.',
                        'Prologue',
                    ],
                ],
            ],
            [
                'a1',
                'ACT ONE',
                [
                    [
                        's1',
                        '2.',
                        'Kitchen',
                    ],
                    [
                        's2',
                        '3.',
                        'Garden',
                    ],
                ],
            ],
        ]);
    });

    it('hides the scene number when the script numbers scenes with “none”', () => {
        const {acts} = build({sceneNumberFormat: 'none'});

        expect(acts.flatMap(act => act.scenes).map(scene => scene.number)).toEqual([
            '',
            '',
            '',
        ]);
    });

    it('lists confirmed characters in Matrix row order, one arc each', () => {
        const {arcs} = build();

        expect(arcs.map(arc => [arc.id, arc.name])).toEqual([
            ['c-anna', 'ANNA'],
            ['c-cy', 'CY'],
            ['c-ben', 'BEN'],
            ['c-dee', 'DEE'],
        ]);
        expect(arcs.every(arc => (/^#[0-9A-Fa-f]{6}$/).test(arc.color))).toBe(true);
    });

    it('filters arcs by the selected characters', () => {
        const {arcs} = build({selectedIds: new Set(['c-ben', 'c-dee'])});

        expect(arcs.map(arc => arc.id)).toEqual(['c-ben', 'c-dee']);
    });

    it('keeps a character without points in the legend with no points', () => {
        const {arcs} = build({records: [record('s1', 'c-anna', null, 40)]});

        expect(arcById(arcs, 'c-dee')).toEqual(expect.objectContaining({
            id: 'c-dee',
            points: [],
        }));
        expect(arcById(arcs, 'c-ben')?.points).toEqual([]);
    });

    it('reads the stored value and note of each point', () => {
        const {arcs} = build({
            records: [
                record('s1', 'c-anna', 'Waits for the letter', 40),
                record('s2', 'c-anna', null, -20),
            ],
        });
        const anna = arcById(arcs, 'c-anna');

        expect(anna?.points.map(point => [
            point.headingBlockId,
            point.sceneIndex,
            point.value,
            point.note,
        ])).toEqual([
            [
                's1',
                1,
                40,
                'Waits for the letter',
            ],
            [
                's2',
                2,
                -20,
                null,
            ],
        ]);
    });

    it('marks evidence true where the script places the character, false otherwise', () => {
        const {arcs} = build({
            records: [
                record('s1', 'c-anna', null, 40),
                record('s2', 'c-anna', null, -20),
                record('s0', 'c-ben', null, 10),
            ],
        });

        expect(arcById(arcs, 'c-anna')?.points.map(point => point.evidence)).toEqual([true, false]);
        expect(arcById(arcs, 'c-ben')?.points.map(point => point.evidence)).toEqual([false]);
    });

    it('ignores records of characters that left the catalog', () => {
        const {arcs} = build({records: [record('s1', 'c-gone', null, 40)]});

        expect(arcs.some(arc => arc.id === 'c-gone')).toBe(false);
        expect(arcs.some(arc => arc.points.length > 0)).toBe(false);
    });

    it('skips records without a value while still using their note elsewhere', () => {
        const {arcs} = build({
            records: [
                record('s1', 'c-anna', 'Only a note', null),
                record('s2', 'c-anna', null, 15),
            ],
        });

        expect(arcById(arcs, 'c-anna')?.points).toEqual([
            {
                headingBlockId: 's2',
                sceneIndex: 2,
                value: 15,
                evidence: false,
                onCard: true,
                note: null,
            },
        ]);
    });

    it('includes records off the card as points without evidence', () => {
        const {arcs} = build({records: [{...record('s2', 'c-dee', 'ignored', 60), onCard: false}]});

        expect(arcById(arcs, 'c-dee')?.points).toEqual([
            expect.objectContaining({
                headingBlockId: 's2',
                value: 60,
                evidence: false,
                onCard: false,
            }),
        ]);
    });
});
