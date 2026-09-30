import {normalizeCharacterColorHex} from '../../../characters/characterColors';
import {getConfirmedCharacterColor, normalizePersistentCharacterRefs} from '../../../characters/colorResolver';
import type {PersistentCharacterRef} from '../types';

export const getPersistentColorByKey = (normalizedPersistentCharacters: readonly PersistentCharacterRef[], characterColorSaturation?: number) => {
    return new Map(
        normalizedPersistentCharacters.map(character => {
            return [character.key, getConfirmedCharacterColor(character.id, character.colorHex ?? null, characterColorSaturation)] as const;
        }),
    );
};

export const normalizePersistentCharacters = (persistentCharacters: readonly PersistentCharacterRef[]) => {
    return normalizePersistentCharacterRefs(persistentCharacters).map(character => ({
        id: character.id,
        key: character.key,
        colorHex: normalizeCharacterColorHex(character.colorHex) ?? null,
    }));
};
