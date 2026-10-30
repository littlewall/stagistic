import type {SceneBoardModel, ScriptCharacterRecord} from '@stagistic/script';
import type {BoardFilterCharacter} from '@stagistic/ui';

import {resolveCharacterColor} from './buildWallView';

/*
 * Characters the filter offers: every confirmed character, in order of first appearance in
 * the script, with the number of scenes they appear in. Those without a scene come last.
 */
export const buildFilterCharacters = (
    model: SceneBoardModel,
    characters: readonly ScriptCharacterRecord[],
    displayColorByKey: ReadonlyMap<string, string>,
): BoardFilterCharacter[] => {
    const sceneCountById = new Map<string, number>();

    model.acts.forEach(act => act.scenes.forEach(scene => scene.characters.forEach(character => {
        if (character.characterId) {
            sceneCountById.set(character.characterId, (sceneCountById.get(character.characterId) ?? 0) + 1);
        }
    })));

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
