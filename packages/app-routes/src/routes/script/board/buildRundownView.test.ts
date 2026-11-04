import {
    deriveMusicTimeline,
    type IndexedScriptBlock,
    type MusicAtom,
    type ScriptBlockIndexSnapshot,
} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    buildRundownView,
    roundPageLength,
    type RundownViewInput,
} from './buildRundownView';

interface BlockSpec {
    id: string,
    type: string,
    text?: string,
    refs?: Array<{key: string, characterId: string | null}>,
    music?: MusicAtom[],
}

const start = (musicId: string, title: string, extra: {mode?: 'open' | 'hit', kind?: string | null} = {}): MusicAtom => ({
    role: 'start',
    musicId,
    mode: extra.mode ?? 'open',
    title,
    kind: extra.kind ?? 'song',
});

const OUT: MusicAtom = {role: 'out'};

/* Builds the index the way the editor does: blocks with scene links, music from the timeline. */
const buildIndex = (specs: readonly BlockSpec[]): ScriptBlockIndexSnapshot => {
    let actBlockId: string | null = null;
    let sceneBlockId: string | null = null;
    const blocks: IndexedScriptBlock[] = specs.map((spec, orderNo) => {
        if (spec.type === 'act') {
            actBlockId = spec.id;
            sceneBlockId = null;
        } else if (spec.type === 'scene') {
            sceneBlockId = spec.id;
        }

        return {
            blockId: spec.id,
            orderNo,
            blockType: spec.type,
            textContent: spec.text ?? '',
            actBlockId,
            sceneBlockId,
            characterRefs: spec.refs ?? null,
        };
    });
    const timeline = deriveMusicTimeline(specs.map(spec => ({
        blockId: spec.id,
        blockType: spec.type,
        musicAtoms: spec.music ?? [],
    })));

    return {
        blocks,
        music: timeline.music,
        orphanMusicOutBlockIds: timeline.orphanOutBlockIds,
    };
};

const MARA = {id: 'c-mara', key: 'MARA'};
const ELI = {id: 'c-eli', key: 'ELI'};
const ROOK = {id: 'c-rook', key: 'ROOK'};
const CHOIR = {
    id: 'g-choir',
    key: 'CHOIR',
    memberIds: ['c-mara', 'c-eli'],
};
const EMPTY = {
    id: 'g-empty',
    key: 'EMPTY',
    memberIds: [],
};

const character = (id: string, characters: Array<{key: string, characterId: string | null}>): BlockSpec => ({
    id,
    type: 'character',
    text: characters.map(entry => entry.key).join(' / '),
    refs: characters,
});
const lyrics = (id: string): BlockSpec => ({
    id,
    type: 'lyrics',
    text: 'la',
});
const ref = (entry: {id: string, key: string}) => ({key: entry.key, characterId: entry.id});

const SCRIPT: BlockSpec[] = [
    {
        id: 'p0',
        type: 'stageDirection',
        text: 'Dark.',
        music: [start('m0', 'Overture', {kind: 'instrumental'})],
    },
    {
        id: 'a1',
        type: 'act',
        text: 'ACT ONE',
    },
    {
        id: 's1',
        type: 'scene',
        text: 'The Lighthouse',
    },
    character('c1', [ref(MARA), ref(ELI)]),
    {
        id: 'd1',
        type: 'dialogue',
        text: 'Hello.',
        music: [start('m1', 'Small Light')],
    },
    lyrics('l1'),
    character('c2', [ref(ELI)]),
    lyrics('l2'),
    {
        id: 'x1',
        type: 'stageDirection',
        text: 'Thunder.',
        music: [start('m2', 'Storm', {kind: 'instrumental'})],
    },
    lyrics('l3'),
    {
        id: 's2',
        type: 'scene',
        text: 'The Harbour',
    },
    character('c3', [ref(ROOK)]),
    {
        id: 'd2',
        type: 'dialogue',
        text: 'Ahoy.',
    },
    {
        id: 'a2',
        type: 'act',
        text: 'ACT TWO',
    },
    {
        id: 's3',
        type: 'scene',
        text: 'The Hill',
    },
    character('c4', [ref(CHOIR)]),
    {
        id: 'd3',
        type: 'dialogue',
        text: 'Sing.',
        music: [start('m3', 'Hit It', {mode: 'hit'})],
    },
];

const baseInput = (overrides: Partial<RundownViewInput> = {}): RundownViewInput => ({
    model: {acts: []},
    index: buildIndex(SCRIPT),
    catalog: {
        characters: [
            MARA,
            ELI,
            ROOK,
        ],
        groups: [CHOIR, EMPTY],
    },
    characters: [
        {
            ...MARA,
            colorHex: '#cc3344',
        },
        {
            ...ELI,
            colorHex: '#2266cc',
        },
        {
            ...ROOK,
            colorHex: null,
        },
    ],
    displayColorByKey: new Map(),
    selectedIds: new Set(),
    ...overrides,
});

const withModel = (overrides: Partial<RundownViewInput> = {}): RundownViewInput => {
    const input = baseInput(overrides);

    return {
        ...input,
        model: overrides.model ?? {
            acts: [
                {
                    actBlockId: 'a1',
                    name: 'ACT ONE',
                    scenes: [
                        {
                            headingBlockId: 's1',
                            number: 1,
                            title: 'The Lighthouse',
                            actBlockId: 'a1',
                            characters: [
                                {
                                    entryId: MARA.id,
                                    characterId: MARA.id,
                                    key: 'MARA',
                                    level: 'present',
                                    firstCue: 0,
                                },
                                {
                                    entryId: ELI.id,
                                    characterId: ELI.id,
                                    key: 'ELI',
                                    level: 'present',
                                    firstCue: 1,
                                },
                            ],
                        },
                        {
                            headingBlockId: 's2',
                            number: 2,
                            title: 'The Harbour',
                            actBlockId: 'a1',
                            characters: [
                                {
                                    entryId: ROOK.id,
                                    characterId: ROOK.id,
                                    key: 'ROOK',
                                    level: 'present',
                                    firstCue: 0,
                                },
                            ],
                        },
                    ],
                },
                {
                    actBlockId: 'a2',
                    name: 'ACT TWO',
                    scenes: [
                        {
                            headingBlockId: 's3',
                            number: 3,
                            title: 'The Hill',
                            actBlockId: 'a2',
                            characters: [
                                {
                                    entryId: MARA.id,
                                    characterId: MARA.id,
                                    key: 'MARA',
                                    level: 'present',
                                    firstCue: 0,
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    };
};

const singersOf = (view: ReturnType<typeof buildRundownView>, startBlockId: string) => {
    const song = [...view.preSceneSongs, ...view.acts.flatMap(act => act.scenes.flatMap(scene => scene.songs))]
        .find(entry => entry.startBlockId === startBlockId);

    return song?.singers.map(singer => singer.name);
};

describe('buildRundownView', () => {
    it('groups scenes by act with summaries and keeps scenes without music', () => {
        const view = buildRundownView(withModel());

        expect(view.acts.map(act => [
            act.name,
            act.sceneCount,
            act.songCount,
        ])).toEqual([
            [
                'ACT ONE',
                2,
                2,
            ],
            [
                'ACT TWO',
                1,
                1,
            ],
        ]);
        expect(view.acts[0].scenes.map(scene => [
            scene.headingBlockId,
            scene.number,
            scene.title,
            scene.songs.length,
        ])).toEqual([
            [
                's1',
                1,
                'The Lighthouse',
                2,
            ],
            [
                's2',
                2,
                'The Harbour',
                0,
            ],
        ]);
    });

    it('lists scene characters like a Wall card, grey when unconfirmed', () => {
        const input = withModel();
        const view = buildRundownView({
            ...input,
            model: {
                acts: [
                    {
                        ...input.model.acts[0],
                        scenes: [
                            {
                                ...input.model.acts[0].scenes[0],
                                characters: [
                                    ...input.model.acts[0].scenes[0].characters,
                                    {
                                        entryId: 'key:DOCTOR',
                                        characterId: null,
                                        key: 'DOCTOR',
                                        level: 'present',
                                        firstCue: 2,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        });
        const chips = view.acts[0].scenes[0].chips;

        expect(chips.map(chip => [chip.name, chip.color])).toEqual([
            ['MARA', '#cc3344'],
            ['ELI', '#2266cc'],
            ['DOCTOR', null],
        ]);
    });

    it('puts music before the first scene on top as song 0', () => {
        const view = buildRundownView(withModel());

        expect(view.preSceneSongs.map(song => [
            song.label,
            song.title,
            song.kind,
            song.singers,
        ])).toEqual([
            [
                '0)',
                'Overture',
                'instrumental',
                [],
            ],
        ]);
    });

    it('labels songs in script order and tags instrumental, hit and song', () => {
        const view = buildRundownView(withModel());
        const [first, second] = view.acts[0].scenes[0].songs;

        expect([
            first.label,
            first.title,
            first.kind,
            first.startBlockId,
        ]).toEqual([
            '1.A)',
            'Small Light',
            'song',
            'd1',
        ]);
        expect([
            second.label,
            second.title,
            second.kind,
        ]).toEqual([
            '1.B)',
            'Storm',
            'instrumental',
        ]);
        expect(view.acts[1].scenes[0].songs[0]).toMatchObject({label: '3)', kind: 'hit'});
    });

    it('takes the singer from a cue before the music start and orders by first lyrics', () => {
        const view = buildRundownView(withModel());

        /* MARA / ELI cue stands before the start; l1 is theirs, l2 (ELI cue) follows. */
        expect(singersOf(view, 'd1')).toEqual(['MARA', 'ELI']);
    });

    it('ignores cues outside the range and gives an instrumental without lyrics no singers', () => {
        const view = buildRundownView(withModel());

        /* Storm starts after c2 (ELI) but its lyrics l3 are ELI's: range ends with the scene. */
        expect(singersOf(view, 'x1')).toEqual(['ELI']);
        expect(singersOf(view, 'p0')).toEqual([]);
    });

    it('does not take a cue after the end of the song', () => {
        const index = buildIndex([
            {
                id: 's1',
                type: 'scene',
                text: 'A',
            },
            character('c1', [ref(MARA)]),
            {
                id: 'd1',
                type: 'dialogue',
                music: [start('m1', 'One')],
            },
            lyrics('l1'),
            {
                id: 'o1',
                type: 'dialogue',
                music: [OUT],
            },
            character('c2', [ref(ELI)]),
            lyrics('l2'),
        ]);
        const view = buildRundownView(withModel({index}));

        expect(singersOf(view, 'd1')).toEqual(['MARA']);
    });

    it('expands a group to its members, never shows the group and skips an empty group', () => {
        const index = buildIndex([
            {
                id: 's1',
                type: 'scene',
                text: 'A',
            },
            character('c1', [ref(CHOIR), ref(MARA)]),
            {
                id: 'd1',
                type: 'dialogue',
                music: [start('m1', 'One')],
            },
            lyrics('l1'),
            character('c2', [ref(EMPTY)]),
            lyrics('l2'),
        ]);
        const view = buildRundownView(withModel({index}));

        expect(singersOf(view, 'd1')).toEqual(['MARA', 'ELI']);
    });

    it('filters scenes, songs, the pre-scene song and summaries by the selected characters', () => {
        const view = buildRundownView(withModel({selectedIds: new Set([ELI.id])}));

        expect(view.preSceneSongs).toEqual([]);
        expect(view.acts.map(act => [
            act.name,
            act.sceneCount,
            act.songCount,
        ])).toEqual([
            [
                'ACT ONE',
                1,
                2,
            ],
        ]);
        expect(view.acts[0].scenes.map(scene => scene.headingBlockId)).toEqual(['s1']);
    });

    it('keeps only songs a selected character sings', () => {
        const view = buildRundownView(withModel({selectedIds: new Set([MARA.id])}));

        expect(view.acts[0].scenes[0].songs.map(song => song.title)).toEqual(['Small Light']);
        expect(view.acts.map(act => [act.sceneCount, act.songCount])).toEqual([[1, 1], [1, 0]]);
    });

    it('returns nothing when no scene matches', () => {
        const view = buildRundownView(withModel({selectedIds: new Set(['c-unknown'])}));

        expect(view.acts).toEqual([]);
        expect(view.preSceneSongs).toEqual([]);
    });

    describe('pages', () => {
        const PAGES: Record<string, [number, number]> = {
            s1: [1, 1],
            d1: [1, 2],
            l1: [2, 2],
            x1: [3, 3],
            l3: [3, 4],
            s2: [4, 4],
            d2: [4, 4],
            a2: [5, 5],
            s3: [5, 5],
            d3: [5, 6],
        };
        // A block starts at the top of its first page and ends 0.8 of the way down its last.
        const getBlockPages = (id: string) => (PAGES[id] ? {
            startPage: PAGES[id][0],
            endPage: PAGES[id][1],
            startAt: PAGES[id][0] - 1,
            endAt: PAGES[id][1] - 0.2,
            isHidden: false,
        } : null);

        it('measures a scene to the last block before the next heading, a song to its end block, in rounded pages', () => {
            const [act1, act2] = buildRundownView(withModel({getBlockPages})).acts;

            // s1 starts at 0, l3 ends at 3.8.
            expect(act1.scenes[0].pageLength).toBe(4);
            // s2 starts at 3, d2 ends at 3.8.
            expect(act1.scenes[1].pageLength).toBe(1);
            // d1 starts at 0, x1 ends at 2.8.
            expect(act1.scenes[0].songs[0].pageLength).toBe(3);
            // The act adds its scenes: 3.8 + 0.8 = 4.6.
            expect(act1.pageLength).toBe(4.5);
            // s3 starts at 4, d3 ends at 5.8.
            expect(act2.scenes[0].pageLength).toBe(2);
        });

        it('is null when pages are unknown', () => {
            const [act1] = buildRundownView(withModel()).acts;

            expect(act1.pageLength).toBeNull();
            expect(act1.scenes[0].pageLength).toBeNull();
            expect(act1.scenes[0].songs[0].pageLength).toBeNull();
        });

        it('measures the act over the shown scenes only', () => {
            const view = buildRundownView(withModel({getBlockPages, selectedIds: new Set([ROOK.id])}));

            expect(view.acts).toHaveLength(1);
            // s2 starts at 3, d2 ends at 3.8.
            expect(view.acts[0].pageLength).toBe(1);
        });
    });
});

describe('roundPageLength', () => {
    it.each([
        [0.1, 0.5],
        [0.74, 0.5],
        [0.75, 1],
        [1.3, 1.5],
        [2, 2],
        [0, 0.5],
    ])('rounds %s pages to %s', (length, expected) => {
        expect(roundPageLength(length)).toBe(expected);
    });
});
