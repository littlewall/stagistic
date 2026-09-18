import {
    type DerivedMusic,
    type IndexedScriptBlock,
    normalizeCharacterKey,
} from '@stagistic/script';

import type {
    ExportCharacter,
    ExportCharacterGroup,
} from '../../scriptData';

export interface MusicSingerInput {
    blocks: IndexedScriptBlock[],
    characters: ExportCharacter[],
    groups: ExportCharacterGroup[],
}

interface SingerAccumulator {
    id: string,
    displayName: string,
    memberIds: string[] | null,
    count: number,
    firstOrder: number,
}

const toDisplayName = (key: string) => key
    .toLowerCase()
    .replace(/(^|\s)\S/gu, match => match.toUpperCase());

/**
 * Cue keys in effect at each block position: the nearest preceding character
 * block, cleared at every act and scene boundary so a cue never leaks into the
 * next scene.
 */
const buildCueKeysByPosition = (blocks: IndexedScriptBlock[]): string[][] => {
    let current: string[] = [];

    return blocks.map(block => {
        if (block.blockType === 'act' || block.blockType === 'scene') {
            current = [];
        } else if (block.blockType === 'character') {
            current = (block.characterRefs ?? [])
                .map(ref => normalizeCharacterKey(ref.key))
                .filter(key => key.length > 0);
        }

        return current;
    });
};

export const collectMusicSingers = (
    music: DerivedMusic,
    {
        blocks,
        characters,
        groups,
    }: MusicSingerInput,
): string[] => {
    const startIndex = blocks.findIndex(block => block.blockId === music.startBlockId);
    const endIndex = blocks.findIndex(block => block.blockId === music.effectiveEndBlockId);

    if (startIndex < 0 || endIndex < startIndex) {
        return [];
    }

    const cueKeys = buildCueKeysByPosition(blocks);
    const groupByKey = new Map(groups.map(group => [normalizeCharacterKey(group.key), group]));
    const characterByKey = new Map(characters.map(character => [normalizeCharacterKey(character.key), character]));
    const singers = new Map<string, SingerAccumulator>();

    for (let index = startIndex; index <= endIndex; index += 1) {
        if (blocks[index].blockType !== 'lyrics') {
            continue;
        }

        cueKeys[index].forEach(key => {
            const existing = singers.get(key);

            if (existing) {
                existing.count += 1;

                return;
            }

            const group = groupByKey.get(key);
            const character = characterByKey.get(key);

            singers.set(key, {
                id: group?.id ?? character?.id ?? `unconfirmed:${key}`,
                displayName: character?.displayName ?? toDisplayName(key),
                memberIds: group ? group.memberIds : null,
                count: 1,
                firstOrder: index,
            });
        });
    }

    const individualIds = new Set(
        [...singers.values()]
            .filter(singer => singer.memberIds === null)
            .map(singer => singer.id),
    );

    return [...singers.values()]
        .filter(singer => !(
            singer.memberIds !== null
            && singer.memberIds.length > 0
            && singer.memberIds.every(id => individualIds.has(id))
        ))
        .sort((left, right) => right.count - left.count
            || left.firstOrder - right.firstOrder
            || left.displayName.localeCompare(right.displayName))
        .map(singer => singer.displayName);
};
