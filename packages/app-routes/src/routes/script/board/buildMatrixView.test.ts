import type {SceneBoardModel} from '@stagistic/script';
import type {BoardMatrixRow} from '@stagistic/ui';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {buildFilterCharacters} from './buildFilterCharacters';
import {buildMatrixView, type MatrixViewInput} from './buildMatrixView';
import {
    DEFAULT_ACT_KEY,
    type SceneCardRecord,
} from './buildSceneChips';

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
                        /* Arrived through a group tag: the resolver expanded it to the member. */
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

const baseInput: MatrixViewInput = {
    model,
    characters,
    displayColorByKey: new Map([['BEN', '#2266cc']]),
    getStartPage: id => (id === 's1' ? 7 : null),
    filterCharacters,
    selectedIds: new Set(),
};

const build = (overrides: Partial<MatrixViewInput> = {}) => {
    const input = {...baseInput, ...overrides};

    /*
     * For tests that don't provide filterCharacters, we need to compute them
     * Note: in real code, filterCharacters comes from the shared hook
     */
    if (!('filterCharacters' in overrides)) {
        // Recompute filterCharacters with any record overrides
        const newFilterCharacters = buildFilterCharacters(
            input.model,
            characters,
            input.displayColorByKey,
            input.records ?? [],
        );

        input.filterCharacters = newFilterCharacters;
    }

    return buildMatrixView(input);
};

const record = (headingBlockId: string, characterId: string, note: string | null): SceneCardRecord => ({
    headingBlockId,
    characterId,
    note,
});

/** Each row as name plus one cell kind per scene, in column order. */
const rowKinds = (rows: readonly BoardMatrixRow[]) => rows.map(row => [row.name, ...row.cells.map(cell => cell.kind)]);

describe('buildMatrixView', () => {
    it('builds act columns keyed like the Wall and carries each scene’s page', () => {
        const {acts} = build();

        expect(acts.map(act => [
            act.key,
            act.name,
            act.scenes.map(scene => scene.headingBlockId),
        ])).toEqual([
            [
                DEFAULT_ACT_KEY,
                'ACT 1',
                ['s0'],
            ],
            [
                'a1',
                'ACT ONE',
                ['s1', 's2'],
            ],
        ]);
        expect(acts.flatMap(act => act.scenes).map(scene => [
            scene.number,
            scene.title,
            scene.page,
        ])).toEqual([
            [
                1,
                'Prologue',
                null,
            ],
            [
                2,
                'Kitchen',
                7,
            ],
            [
                3,
                'Garden',
                null,
            ],
        ]);
    });

    it('orders rows by first appearance, zero-scene characters last, unconfirmed ones after them', () => {
        const {rows} = build();

        expect(rows.map(row => [row.id, row.characterId])).toEqual([
            ['c-anna', 'c-anna'],
            ['c-cy', 'c-cy'],
            ['c-ben', 'c-ben'],
            ['c-dee', 'c-dee'],
            ['key:DOCTOR', null],
        ]);
    });

    it('gives each row its name, color and scene count, unconfirmed ones neutral', () => {
        const {rows} = build();

        expect(rows.map(row => [
            row.name,
            row.color,
            row.sceneCount,
        ])).toEqual([
            [
                'ANNA',
                '#cc3344',
                1,
            ],
            [
                'CY',
                expect.stringMatching(/^#[0-9A-F]{6}$/),
                1,
            ],
            [
                'BEN',
                '#2266cc',
                1,
            ],
            [
                'DEE',
                expect.stringMatching(/^#[0-9A-F]{6}$/),
                0,
            ],
            [
                'DOCTOR',
                null,
                1,
            ],
        ]);
    });

    it('marks a noted cell, a script cell, a card-only cell and empty cells', () => {
        const {rows} = build({
            records: [
                record('s1', 'c-anna', 'Waits for the letter'),
                record('s2', 'c-anna', null),
            ],
        });

        expect(rowKinds(rows)).toEqual([
            [
                'ANNA',
                'empty',
                'note',
                'card',
            ],
            [
                'CY',
                'empty',
                'script',
                'empty',
            ],
            [
                'BEN',
                'empty',
                'empty',
                'script',
            ],
            [
                'DEE',
                'empty',
                'empty',
                'empty',
            ],
            [
                'DOCTOR',
                'script',
                'empty',
                'empty',
            ],
        ]);
    });

    it('counts a scene for a character that is only on the card', () => {
        const {rows} = build({records: [record('s0', 'c-dee', null)]});
        const dee = rows.find(row => row.id === 'c-dee');

        expect(dee?.sceneCount).toBe(1);
        expect(dee?.cells.map(cell => cell.kind)).toEqual([
            'card',
            'empty',
            'empty',
        ]);
    });

    it('builds a chip for every non-empty cell, in the popover’s terms', () => {
        const {rows} = build({
            records: [
                record('s1', 'c-anna', 'Waits for the letter'),
                record('s2', 'c-anna', null),
            ],
        });
        const anna = rows.find(row => row.id === 'c-anna');
        const doctor = rows.find(row => row.id === 'key:DOCTOR');

        expect(anna?.cells.map(cell => cell.chip && [
            cell.chip.id,
            cell.chip.source,
            cell.chip.note,
            cell.chip.color,
        ])).toEqual([
            null,
            [
                'c-anna',
                'script',
                'Waits for the letter',
                '#cc3344',
            ],
            [
                'c-anna',
                'card',
                null,
                '#cc3344',
            ],
        ]);
        expect(doctor?.cells.map(cell => cell.chip && [
            cell.chip.id,
            cell.chip.characterId,
            cell.chip.source,
        ])).toEqual([
            [
                'key:DOCTOR',
                null,
                'script',
            ],
            null,
            null,
        ]);
    });

    it('ignores records of characters that left the catalog', () => {
        const {rows} = build({records: [record('s1', 'c-gone', 'Lost')]});

        expect(rows.some(row => row.id === 'c-gone')).toBe(false);
        expect(rows.find(row => row.id === 'c-anna')?.cells[1]?.kind).toBe('script');
    });

    it('keeps every column but only the selected rows while filtering', () => {
        const view = build({
            records: [record('s2', 'c-anna', null)],
            selectedIds: new Set(['c-anna']),
        });

        expect(view.acts.flatMap(act => act.scenes).map(scene => scene.headingBlockId)).toEqual([
            's0',
            's1',
            's2',
        ]);
        expect(rowKinds(view.rows)).toEqual([
            [
                'ANNA',
                'empty',
                'script',
                'card',
            ],
        ]);
    });

    it('drops unconfirmed rows while filtering', () => {
        const {rows} = build({selectedIds: new Set(['c-ben'])});

        expect(rowKinds(rows)).toEqual([
            [
                'BEN',
                'empty',
                'empty',
                'script',
            ],
        ]);
    });

    it('gives member characters ● when their group has a cue covering them in a scene', () => {
        const modelWithGroup: SceneBoardModel = {
            acts: [
                {
                    actBlockId: null,
                    name: 'ACT 1',
                    scenes: [
                        {
                            headingBlockId: 's1',
                            number: 1,
                            title: 'Prologue',
                            actBlockId: null,
                            characters: [
                                /* Group tag that covers two members */
                                {
                                    entryId: 'group:FAMILY',
                                    characterId: null,
                                    key: 'FAMILY',
                                    level: 'present',
                                    firstCue: 0,
                                },
                                /* Members of the group, expanded by the resolver */
                                {
                                    entryId: 'c-anna',
                                    characterId: 'c-anna',
                                    key: 'ANNA',
                                    level: 'present',
                                    firstCue: 0,
                                },
                                {
                                    entryId: 'c-ben',
                                    characterId: 'c-ben',
                                    key: 'BEN',
                                    level: 'present',
                                    firstCue: 1,
                                },
                            ],
                        },
                    ],
                },
            ],
        };

        const input: MatrixViewInput = {
            model: modelWithGroup,
            characters,
            displayColorByKey: new Map(),
            getStartPage: () => null,
            filterCharacters,
            selectedIds: new Set(),
        };

        const {rows} = buildMatrixView(input);

        /* ANNA and BEN should both have ● in s1 because the group covers them */
        const anna = rows.find(row => row.id === 'c-anna');
        const ben = rows.find(row => row.id === 'c-ben');

        expect(anna?.cells[0]?.kind).toBe('script');
        expect(ben?.cells[0]?.kind).toBe('script');
        expect(anna?.sceneCount).toBe(1);
        expect(ben?.sceneCount).toBe(1);
    });
});
