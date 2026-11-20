import {type BlockPages} from '@stagistic/editor';
import {
    createBoardCharacterResolver,
    type DerivedMusic,
    formatMusicNumber,
    type SceneBoardCatalog,
    type SceneBoardModel,
    type ScriptBlockIndexSnapshot,
    type ScriptCharacterRecord,
} from '@stagistic/script';
import type {
    BoardCharacterChip,
    BoardRundownAct,
    BoardRundownSong,
} from '@stagistic/ui';

import {buildCharacterChip, type SceneCardRecord} from './buildSceneChips';
import {buildWallView} from './buildWallView';

export interface RundownViewInput {
    model: SceneBoardModel,
    index: ScriptBlockIndexSnapshot,
    /** Confirmed characters and groups: groups in a cue expand to their members. */
    catalog: SceneBoardCatalog,
    characters: readonly ScriptCharacterRecord[],
    displayColorByKey: ReadonlyMap<string, string>,
    /** Card records (already limited to those on the card) in the order they were added. */
    records?: readonly SceneCardRecord[],
    /** Filtered characters; empty filters nothing. */
    selectedIds: ReadonlySet<string>,
    /** Where a block starts and ends (page floats) and whether it is hidden; null while unknown. */
    getBlockPages?: (blockId: string) => BlockPages | null,
}

export interface RundownView {
    /** Songs before the first scene, shown above the first act. */
    preSceneSongs: BoardRundownSong[],
    acts: BoardRundownAct[],
}

const toKind = (music: DerivedMusic): BoardRundownSong['kind'] => {
    if (music.mode === 'hit') return 'hit';

    return music.kind === 'instrumental' ? 'instrumental' : 'song';
};

/* The cue each block belongs to: the nearest preceding character block of the same scene. */
const buildSpeakerRefs = (index: ScriptBlockIndexSnapshot) => {
    const speakers = new Map<string, NonNullable<ScriptBlockIndexSnapshot['blocks'][number]['characterRefs']>>();
    let current: NonNullable<ScriptBlockIndexSnapshot['blocks'][number]['characterRefs']> | null = null;
    let sceneBlockId: string | null | undefined;

    index.blocks.forEach(block => {
        if (block.sceneBlockId !== sceneBlockId) {
            sceneBlockId = block.sceneBlockId;
            current = null;
        }

        if (block.blockType === 'act') current = null;

        if (block.blockType === 'character') current = block.characterRefs;

        if (block.blockType === 'lyrics' && current) speakers.set(block.blockId, current);
    });

    return speakers;
};

/* The last block of each scene: the one before the next scene or act heading, or the last of the document. */
const buildSceneEnds = (index: ScriptBlockIndexSnapshot) => {
    const ends = new Map<string, string>();
    let sceneId: string | null = null;

    index.blocks.forEach(block => {
        if (block.blockType === 'scene' || block.blockType === 'act') {
            sceneId = block.blockType === 'scene' ? block.blockId : null;
        }

        if (sceneId) ends.set(sceneId, block.blockId);
    });

    return ends;
};

/** A length in pages, rounded to the nearest half page and never below half a page. */
export const roundPageLength = (length: number): number => Math.max(0.5, Math.round(length * 2) / 2);

/* Where a stretch of blocks starts and ends, as page floats. */
interface Span {
    startAt: number,
    endAt: number,
}

/* Start of the first block to end of the last; null when either is unknown or hidden (no height, so no length). */
const spanBetween = (from: BlockPages | null, to: BlockPages | null): Span | null => (
    from && to && !from.isHidden && !to.isHidden
        ? {startAt: from.startAt, endAt: to.endAt}
        : null
);

/* A scene reaches the end of the last song it holds: a song after an act heading stays with the scene before it. */
const withSongEnds = (span: Span | null, songSpans: readonly (Span | null)[]): Span | null => {
    if (!span) return null;

    return {
        startAt: span.startAt,
        endAt: Math.max(span.endAt, ...songSpans.map(item => item?.endAt ?? 0)),
    };
};

const lengthOf = (span: Span | null): number | null => (span ? span.endAt - span.startAt : null);

const toLength = (span: Span | null): number | null => {
    const length = lengthOf(span);

    return length === null ? null : roundPageLength(length);
};

/*
 * Shapes the model for the Rundown: acts, their scenes (characters as on the Wall card) and
 * the songs in each scene. A song's singers are the characters cued for its lyrics, by first
 * lyrics. A filter keeps scenes with a selected character and, under them, the songs one sings.
 */
export const buildRundownView = ({
    model,
    index,
    catalog,
    characters,
    displayColorByKey,
    records = [],
    selectedIds,
    getBlockPages = () => null,
}: RundownViewInput): RundownView => {
    const resolve = createBoardCharacterResolver(catalog);
    const recordById = new Map(characters.map(character => [character.id, character]));
    const speakers = buildSpeakerRefs(index);
    const positionById = new Map(index.blocks.map((block, position) => [block.blockId, position]));
    const isFiltering = selectedIds.size > 0;

    const singersOf = (music: DerivedMusic): BoardCharacterChip[] => {
        const from = positionById.get(music.startBlockId) ?? 0;
        const to = positionById.get(music.effectiveEndBlockId) ?? -1;
        const seen = new Set<string>();
        const singers: BoardCharacterChip[] = [];

        index.blocks.slice(from, to + 1).forEach(block => (speakers.get(block.blockId) ?? [])
            .flatMap(cue => resolve(cue))
            .forEach(entry => {
                if (seen.has(entry.entryId)) return;

                seen.add(entry.entryId);
                singers.push(buildCharacterChip({
                    id: entry.entryId,
                    characterId: entry.characterId,
                    key: entry.key,
                    record: entry.characterId ? recordById.get(entry.characterId) : undefined,
                    note: null,
                    source: 'script',
                }, displayColorByKey));
            }));

        return singers;
    };

    const sceneEnds = buildSceneEnds(index);
    const songsByScene = new Map<number, BoardRundownSong[]>();
    /* Every song's span by scene, whatever the filter: a scene's own length does not depend on it. */
    const songSpansByScene = new Map<number, Array<Span | null>>();

    index.music.forEach(music => {
        const span = spanBetween(getBlockPages(music.startBlockId), getBlockPages(music.effectiveEndBlockId));
        const song: BoardRundownSong = {
            musicId: music.musicId,
            startBlockId: music.startBlockId,
            label: formatMusicNumber(music),
            title: music.title,
            kind: toKind(music),
            singers: singersOf(music),
            pageLength: toLength(span),
        };

        songSpansByScene.set(music.sceneNumber, [...songSpansByScene.get(music.sceneNumber) ?? [], span]);

        if (isFiltering && !song.singers.some(singer => singer.characterId !== null && selectedIds.has(singer.characterId))) return;

        songsByScene.set(music.sceneNumber, [...songsByScene.get(music.sceneNumber) ?? [], song]);
    });

    /* The Wall builds the card's characters; the Rundown asks it rather than choosing again. */
    const wallActs = buildWallView({
        model,
        characters,
        displayColorByKey,
        getStartPage: () => null,
        records,
        selectedIds,
        showOnStage: true,
    });

    return {
        preSceneSongs: songsByScene.get(0) ?? [],
        acts: wallActs.flatMap(act => {
            const scenes = act.scenes
                .filter(scene => !scene.isCollapsed)
                .map(scene => {
                    const songs = songsByScene.get(scene.number) ?? [];
                    const sceneEnd = sceneEnds.get(scene.headingBlockId) ?? scene.headingBlockId;

                    const span = withSongEnds(
                        spanBetween(getBlockPages(scene.headingBlockId), getBlockPages(sceneEnd)),
                        songSpansByScene.get(scene.number) ?? [],
                    );

                    return {
                        length: lengthOf(span),
                        headingBlockId: scene.headingBlockId,
                        number: scene.number,
                        title: scene.title,
                        /* The filter marks who is on stage; the Rundown lists everyone, as it does singers. */
                        chips: scene.chips.map(chip => ({...chip, isDimmed: false})),
                        pageLength: toLength(span),
                        songs,
                    };
                });

            if (scenes.length === 0) return [];

            /* The shown scenes' own lengths, added before rounding: it matches "N scenes" under a filter. */
            const lengths = scenes.map(scene => scene.length);
            const actLength = lengths.some(length => length === null)
                ? null
                : roundPageLength(lengths.reduce<number>((total, length) => total + (length ?? 0), 0));

            return [
                {
                    key: act.key,
                    name: act.name,
                    sceneCount: scenes.length,
                    songCount: scenes.reduce((total, scene) => total + scene.songs.length, 0),
                    pageLength: actLength,
                    scenes: scenes.map(({length: _length, ...scene}) => scene),
                },
            ];
        }),
    };
};
