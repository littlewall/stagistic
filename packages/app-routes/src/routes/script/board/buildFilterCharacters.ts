import type {SceneBoardModel, ScriptCharacterRecord} from '@stagistic/script';
import type {BoardFilterCharacter} from '@stagistic/ui';

import {resolveCharacterColor, type WallSceneRecord} from './buildWallView';

/*
 * Characters the filter offers: every confirmed character, in order of first appearance on
 * the cards (the script first, then card records), with the number of scenes they are on.
 * Those without a scene come last.
 */
export const buildFilterCharacters = (
    model: SceneBoardModel,
    characters: readonly ScriptCharacterRecord[],
    displayColorByKey: ReadonlyMap<string, string>,
    records: readonly WallSceneRecord[] = [],
): BoardFilterCharacter[] => {
    const sceneCountById = new Map<string, number>();

    model.acts.forEach(act => act.scenes.forEach(scene => {
        const ids = new Set([
            ...scene.characters.flatMap(character => (character.characterId ? [character.characterId] : [])),
            ...records.filter(record => record.headingBlockId === scene.headingBlockId).map(record => record.characterId),
        ]);

        ids.forEach(id => sceneCountById.set(id, (sceneCountById.get(id) ?? 0) + 1));
    }));

    const appearing = [...sceneCountById.keys()].flatMap(id => characters.filter(character => character.id === id));
    const absent = characters
        .filter(character => !sceneCountById.has(character.id))
        .toSorted((left, right) => left.key.localeCompare(right.key));

    return [...appearing, ...absent].map(character => ({
        id: character.id,
        name: character.key,
        color: resolveCharacterColor(character, displayColorByKey),
        sceneCount: sceneCountById.get(character.id) ?? 0,
    }));
};
