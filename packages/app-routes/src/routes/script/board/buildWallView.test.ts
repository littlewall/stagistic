import type {SceneBoardModel} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {buildWallView, DEFAULT_ACT_KEY} from './buildWallView';

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
                            entryId: 'c-ben',
                            characterId: 'c-ben',
                            key: 'BEN',
                            level: 'mentioned',
                        },
                        {
                            entryId: 'c-anna',
                            characterId: 'c-anna',
                            key: 'ANNA',
                            level: 'present',
                        },
                        {
                            entryId: 'key:DOCTOR',
                            characterId: null,
                            key: 'DOCTOR',
                            level: 'present',
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

const build = (overrides: Partial<Parameters<typeof buildWallView>[0]> = {}) => buildWallView({
    model,
    characters,
    displayColorByKey: new Map([['BEN', '#2266cc']]),
    getStartPage: id => (id === 's1' ? 7 : null),
    selectedIds: new Set(),
    showMentioned: true,
    ...overrides,
});

const sceneNamed = (acts: ReturnType<typeof build>, id: string) => acts.flatMap(act => act.scenes).find(scene => scene.headingBlockId === id);

describe('buildWallView', () => {
    it('keys the default act apart from act headings and carries pages', () => {
        const acts = build();

        expect(acts.map(act => act.key)).toEqual([DEFAULT_ACT_KEY, 'a1']);
        expect(sceneNamed(acts, 's1')?.page).toBe(7);
        expect(sceneNamed(acts, 's2')?.page).toBeNull();
    });

    it('lists those on stage before those only mentioned, with confirmed colors', () => {
        const chips = sceneNamed(build(), 's1')?.chips;

        expect(chips).toEqual([
            {
                id: 'c-anna',
                name: 'ANNA',
                color: '#cc3344',
                level: 'present',
                isDimmed: false,
            },
            {
                id: 'key:DOCTOR',
                name: 'DOCTOR',
                color: null,
                level: 'present',
                isDimmed: false,
            },
            {
                id: 'c-ben',
                name: 'BEN',
                color: '#2266cc',
                level: 'mentioned',
                isDimmed: false,
            },
        ]);
    });

    it('drops mentioned characters when they are switched off', () => {
        const chips = sceneNamed(build({showMentioned: false}), 's1')?.chips;

        expect(chips?.map(chip => chip.id)).toEqual(['c-anna', 'key:DOCTOR']);
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
            ['c-ben', true],
        ]);
    });

    it('does not count a hidden mention as the selected character being in the scene', () => {
        const acts = build({selectedIds: new Set(['c-ben']), showMentioned: false});

        expect(sceneNamed(acts, 's1')?.isCollapsed).toBe(true);
        expect(sceneNamed(acts, 's2')?.isCollapsed).toBe(false);
    });
});
