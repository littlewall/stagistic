import type {SceneBoardCharacter, SceneBoardModel} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    buildWallView,
    DEFAULT_ACT_KEY,
    type WallSceneRecord,
    type WallViewInput,
} from './buildWallView';

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
                    characters: [],
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
                            entryId: 'key:DOCTOR',
                            characterId: null,
                            key: 'DOCTOR',
                            level: 'present',
                            firstCue: 0,
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
];

const baseInput: WallViewInput = {
    model,
    characters,
    displayColorByKey: new Map([['BEN', '#2266cc']]),
    getStartPage: id => (id === 's1' ? 7 : null),
    selectedIds: new Set(),
    showOnStage: true,
};

const build = (overrides: Partial<WallViewInput> = {}) => buildWallView({...baseInput, ...overrides});

const record = (headingBlockId: string, characterId: string, note: string | null): WallSceneRecord => ({
    headingBlockId,
    characterId,
    note,
});

const evidence = (id: string, key: string, firstCue: number | null): SceneBoardCharacter => ({
    entryId: id,
    characterId: id,
    key,
    level: 'present',
    firstCue,
});

const sceneModel = (sceneCharacters: SceneBoardCharacter[]): SceneBoardModel => ({
    acts: [
        {
            actBlockId: null,
            name: 'ACT 1',
            scenes: [
                {
                    headingBlockId: 'x',
                    number: 1,
                    title: 'X',
                    actBlockId: null,
                    characters: sceneCharacters,
                },
            ],
        },
    ],
});

const sceneNamed = (acts: ReturnType<typeof build>, id: string) => acts.flatMap(act => act.scenes).find(scene => scene.headingBlockId === id);

describe('buildWallView', () => {
    it('keys the default act apart from act headings and carries pages', () => {
        const acts = build();

        expect(acts.map(act => act.key)).toEqual([DEFAULT_ACT_KEY, 'a1']);
        expect(sceneNamed(acts, 's1')?.page).toBe(7);
        expect(sceneNamed(acts, 's2')?.page).toBeNull();
    });

    it('lists characters from the script with colors, an unconfirmed one neutral', () => {
        const chips = sceneNamed(build(), 's1')?.chips;

        expect(chips).toEqual([
            {
                id: 'c-anna',
                characterId: 'c-anna',
                name: 'ANNA',
                color: '#cc3344',
                source: 'script',
                note: null,
                isDimmed: false,
            },
            {
                id: 'key:DOCTOR',
                characterId: null,
                name: 'DOCTOR',
                color: null,
                source: 'script',
                note: null,
                isDimmed: false,
            },
        ]);
    });

    it('gives a confirmed character without any color the editor palette color', () => {
        const color = sceneNamed(build({displayColorByKey: new Map()}), 's2')?.chips[0]?.color;

        expect(color).toMatch(/^#[0-9A-F]{6}$/);
    });

    it('joins card records: a note on a script character, a hollow character only on the card', () => {
        const chips = sceneNamed(build({
            records: [
                record('s1', 'c-anna', 'Waits for the letter'),
                record('s1', 'c-ben', null),
            ],
        }), 's1')?.chips;

        expect(chips?.map(chip => [
            chip.id,
            chip.source,
            chip.note,
        ])).toEqual([
            [
                'c-anna',
                'script',
                'Waits for the letter',
            ],
            [
                'key:DOCTOR',
                'script',
                null,
            ],
            [
                'c-ben',
                'card',
                null,
            ],
        ]);
    });

    it('orders noted characters by first cue, a noted one without a cue last among them', () => {
        const ordered = buildWallView({
            ...baseInput,
            model: sceneModel([
                evidence('c-ben', 'BEN', 1),
                evidence('c-anna', 'ANNA', null),
                evidence('c-cy', 'CY', 0),
                evidence('c-dee', 'DEE', 2),
            ]),
            characters: [
                ...characters,
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
                {
                    id: 'c-eve',
                    key: 'EVE',
                    colorHex: null,
                },
            ],
            records: [
                record('x', 'c-eve', 'Only here'),
                record('x', 'c-anna', 'Watches'),
                record('x', 'c-ben', 'Leaves'),
                record('x', 'c-cy', 'Speaks first'),
            ],
        })[0]?.scenes[0]?.chips;

        expect(ordered?.map(chip => [chip.name, chip.note !== null])).toEqual([
            ['CY', true],
            ['BEN', true],
            ['ANNA', true],
            ['EVE', true],
            ['DEE', false],
        ]);
    });

    it('ignores records of characters that left the catalog', () => {
        const chips = sceneNamed(build({records: [record('s2', 'c-gone', 'Lost')]}), 's2')?.chips;

        expect(chips?.map(chip => chip.id)).toEqual(['c-ben']);
    });

    it('carries the outline of each scene', () => {
        const acts = build({synopsisByScene: new Map([['s1', 'They meet.']])});

        expect(sceneNamed(acts, 's1')?.synopsis).toBe('They meet.');
        expect(sceneNamed(acts, 's2')?.synopsis).toBeNull();
    });

    it('filters by a character only on the card', () => {
        const acts = build({
            records: [record('s2', 'c-anna', null)],
            selectedIds: new Set(['c-anna']),
        });

        expect(sceneNamed(acts, 's2')?.isCollapsed).toBe(false);
        expect(sceneNamed(acts, 's2')?.chips.map(chip => [chip.id, chip.isDimmed])).toEqual([
            ['c-ben', true],
            ['c-anna', false],
        ]);
    });

    it('drops characters from the cards when they are switched off, yet still filters by them', () => {
        const acts = build({
            showOnStage: false,
            selectedIds: new Set(['c-anna']),
            records: [record('s1', 'c-ben', 'Hidden')],
        });

        expect(sceneNamed(acts, 's1')?.chips.map(chip => chip.id)).toEqual([]);
        expect(sceneNamed(acts, 's1')?.isCollapsed).toBe(false);
        expect(sceneNamed(acts, 's2')?.isCollapsed).toBe(true);
    });

    it('shows every scene in full when nothing is filtered', () => {
        expect(build().flatMap(act => act.scenes).map(scene => scene.isCollapsed)).toEqual([
            false,
            false,
            false,
        ]);
    });

    it('collapses scenes without a selected character and dims the others in the rest', () => {
        const acts = build({selectedIds: new Set(['c-anna'])});

        expect(sceneNamed(acts, 's0')?.isCollapsed).toBe(true);
        expect(sceneNamed(acts, 's2')?.isCollapsed).toBe(true);
        expect(sceneNamed(acts, 's1')?.isCollapsed).toBe(false);
        expect(sceneNamed(acts, 's1')?.chips.map(chip => [chip.id, chip.isDimmed])).toEqual([
            ['c-anna', false],
            ['key:DOCTOR', true],
        ]);
    });

    it('collapses a scene without valid evidence for the selected character', () => {
        const acts = build({selectedIds: new Set(['c-ben'])});

        expect(sceneNamed(acts, 's1')?.isCollapsed).toBe(true);
        expect(sceneNamed(acts, 's2')?.isCollapsed).toBe(false);
    });
});
