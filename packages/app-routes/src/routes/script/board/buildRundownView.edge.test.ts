import {
    deriveMusicTimeline,
    type IndexedScriptBlock,
    type MusicAtom,
    type SceneBoardModel,
    type ScriptBlockIndexSnapshot,
} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {buildRundownView} from './buildRundownView';

interface Spec {
    id: string,
    type: string,
    refs?: Array<{key: string, characterId: string | null}>,
    music?: MusicAtom[],
}

const song = (musicId: string, title: string): MusicAtom => ({
    role: 'start',
    musicId,
    mode: 'open',
    title,
    kind: 'song',
});

/* Like the editor index: an act heading keeps the previous scene link. */
const buildIndex = (specs: readonly Spec[]): ScriptBlockIndexSnapshot => {
    let actBlockId: string | null = null;
    let sceneBlockId: string | null = null;
    const blocks: IndexedScriptBlock[] = specs.map((spec, orderNo) => {
        if (spec.type === 'act') actBlockId = spec.id;

        if (spec.type === 'scene') sceneBlockId = spec.id;

        return {
            blockId: spec.id,
            orderNo,
            blockType: spec.type,
            textContent: '',
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
const entry = (character: typeof MARA, firstCue: number) => ({
    entryId: character.id,
    characterId: character.id,
    key: character.key,
    level: 'present' as const,
    firstCue,
});
const model: SceneBoardModel = {
    acts: [
        {
            actBlockId: 'a1',
            name: 'ACT ONE',
            scenes: [
                {
                    headingBlockId: 's1',
                    number: 1,
                    title: 'One',
                    actBlockId: 'a1',
                    characters: [entry(MARA, 0)],
                },
            ],
        },
        {
            actBlockId: 'a2',
            name: 'ACT TWO',
            scenes: [
                {
                    headingBlockId: 's2',
                    number: 2,
                    title: 'Two',
                    actBlockId: 'a2',
                    characters: [entry(ELI, 0)],
                },
            ],
        },
    ],
};

const input = (specs: Spec[], pages: Record<string, [number, number]> = {}, hidden: readonly string[] = []) => ({
    model,
    index: buildIndex(specs),
    catalog: {characters: [MARA, ELI], groups: []},
    characters: [
        {...MARA, colorHex: null},
        {...ELI, colorHex: null},
    ],
    displayColorByKey: new Map<string, string>(),
    selectedIds: new Set<string>(),
    getBlockPages: (id: string) => (pages[id] ? {
        startPage: pages[id][0],
        endPage: pages[id][1],
        startAt: pages[id][0] - 1,
        endAt: pages[id][1] - 0.2,
        isHidden: hidden.includes(id),
    } : null),
});
const cue = (id: string, character: typeof MARA) => ({
    id,
    type: 'character',
    refs: [{key: character.key, characterId: character.id}],
});

describe('buildRundownView songs: ids and act boundaries', () => {
    it('gives two songs starting in one block distinct musicIds', () => {
        const view = buildRundownView(input([
            {id: 'a1', type: 'act'},
            {id: 's1', type: 'scene'},
            {
                id: 'x',
                type: 'stageDirection',
                music: [song('m-a', 'First'), song('m-b', 'Second')],
            },
            {id: 'l', type: 'lyrics'},
        ]));
        const songs = view.acts[0].scenes[0].songs;

        expect(songs.map(entryOfSong => entryOfSong.musicId)).toEqual(['m-a', 'm-b']);
    });

    it('does not carry a cue over an act heading; the song stays under the previous scene and extends its pages', () => {
        const specs: Spec[] = [
            {id: 'a1', type: 'act'},
            {id: 's1', type: 'scene'},
            cue('c1', MARA),
            {id: 'd1', type: 'dialogue'},
            {id: 'a2', type: 'act'},
            {
                id: 'x',
                type: 'stageDirection',
                music: [song('m-a', 'Bridge')],
            },
            {id: 'l', type: 'lyrics'},
            {id: 's2', type: 'scene'},
            {id: 'd2', type: 'dialogue'},
        ];
        const view = buildRundownView(input(specs, {
            s1: [1, 1],
            d1: [1, 1],
            a2: [2, 2],
            x: [2, 2],
            l: [2, 3],
            s2: [4, 4],
            d2: [4, 4],
        }));
        const [act1, act2] = view.acts;

        expect(act1.scenes[0].songs.map(entryOfSong => entryOfSong.title)).toEqual(['Bridge']);
        expect(act1.scenes[0].songs[0].singers).toEqual([]);
        // s1 starts at 0; the song runs to 2.8.
        expect(act1.scenes[0].pageLength).toBe(3);
        expect(act1.scenes[0].songs[0].pageLength).toBe(2);
        expect(act1.pageLength).toBe(3);
        expect(act2.scenes[0].pageLength).toBe(1);
    });

    const afterActSpecs: Spec[] = [
        {id: 'a1', type: 'act'},
        {id: 's1', type: 'scene'},
        cue('c1', MARA),
        {id: 'd1', type: 'dialogue'},
        {id: 'a2', type: 'act'},
        {
            id: 'x',
            type: 'stageDirection',
            music: [song('m-a', 'Bridge')],
        },
        {id: 'l', type: 'lyrics'},
        {id: 's2', type: 'scene'},
        {id: 'd2', type: 'dialogue'},
    ];
    const afterActPages: Record<string, [number, number]> = {
        s1: [1, 1],
        d1: [1, 1],
        a2: [2, 2],
        x: [2, 2],
        l: [2, 3],
        s2: [4, 4],
        d2: [4, 4],
    };

    it('keeps a scene its own length when the filter drops a song after the act heading', () => {
        const view = buildRundownView({
            ...input(afterActSpecs, afterActPages),
            selectedIds: new Set([MARA.id]),
        });

        expect(view.acts[0].scenes[0].songs).toEqual([]);
        // Still s1 at 0 to the song's end at 2.8.
        expect(view.acts[0].scenes[0].pageLength).toBe(3);
    });

    it('has no length for a scene or song whose start or end block is hidden', () => {
        const [act1] = buildRundownView(input(afterActSpecs, afterActPages, ['d1'])).acts;

        expect(act1.scenes[0].pageLength).toBeNull();
        expect(act1.pageLength).toBeNull();
        expect(act1.scenes[0].songs[0].pageLength).toBe(2);

        const [heading] = buildRundownView(input(afterActSpecs, afterActPages, ['s1'])).acts;

        expect(heading.scenes[0].pageLength).toBeNull();
    });

    it('sums the unrounded lengths of the shown scenes for the act', () => {
        const scene = (number: number, character: typeof MARA) => ({
            headingBlockId: `s${number}`,
            number,
            title: `Scene ${number}`,
            actBlockId: 'a1',
            characters: [entry(character, 0)],
        });
        const specs: Spec[] = [
            {id: 'a1', type: 'act'},
            ...[
                1,
                2,
                3,
                4,
                5,
            ].flatMap(number => [{id: `s${number}`, type: 'scene'}, {id: `d${number}`, type: 'dialogue'}]),
        ];
        const pages: Record<string, [number, number]> = {};

        [
            1,
            2,
            3,
            4,
            5,
        ].forEach(number => {
            pages[`s${number}`] = [number, number];
            pages[`d${number}`] = [number, number];
        });

        const view = buildRundownView({
            ...input(specs, pages),
            model: {
                acts: [
                    {
                        actBlockId: 'a1',
                        name: 'ACT ONE',
                        scenes: [
                            scene(1, MARA),
                            scene(2, ELI),
                            scene(3, ELI),
                            scene(4, ELI),
                            scene(5, MARA),
                        ],
                    },
                ],
            },
            selectedIds: new Set([MARA.id]),
        });

        expect(view.acts[0].sceneCount).toBe(2);
        // Two scenes of 0.8 pages each: 1.6 rounds to 1.5 (first start to last end would read 5).
        expect(view.acts[0].pageLength).toBe(1.5);
    });
});
