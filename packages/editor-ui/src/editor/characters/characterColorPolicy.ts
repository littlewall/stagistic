import {normalizeCharacterColorHex} from '@stagistic/script-core';

import {getCharacterColor} from '../characterColors';
import type {NormalizedPersistentCharacterRef} from './persistentRefNormalization';

export const getConfirmedCharacterColor = (
    characterId: string,
    colorHex: string | null | undefined,
    characterColorSaturation?: number,
) => {
    const normalizedColor = normalizeCharacterColorHex(colorHex);

    if (normalizedColor) {
        return normalizedColor;
    }

    return getCharacterColor(`character:${characterId}`, characterColorSaturation);
};

export const getUnconfirmedCharacterColor = (
    characterKey: string,
    characterColorSaturation?: number,
) => {
    return getCharacterColor(characterKey, characterColorSaturation);
};

const getDraftTokenColor = (
    blockId: string,
    tokenIndex: number,
    characterColorSaturation?: number,
) => {
    return getCharacterColor(`draft:${blockId}:${tokenIndex}`, characterColorSaturation);
};

interface CreateCharacterColorResolversArgs {
    normalizedPersistentCharacters: readonly NormalizedPersistentCharacterRef[],
    characterColorSaturation?: number,
    colorByCharacterId?: ReadonlyMap<string, string>,
    rememberedColorByKey?: ReadonlyMap<string, string>,
}

export interface CharacterColorResolvers {
    persistentCharacterByKey: ReadonlyMap<string, NormalizedPersistentCharacterRef>,
    resolveConfirmedColorById: (characterId: string) => string,
    resolveRememberedColorByKey: (characterKey: string) => string | null,
    resolveDraftTokenColor: (blockId: string, tokenIndex: number) => string,
}

export const createCharacterColorResolvers = ({
    normalizedPersistentCharacters,
    characterColorSaturation,
    colorByCharacterId,
    rememberedColorByKey,
}: CreateCharacterColorResolversArgs): CharacterColorResolvers => {
    const persistentCharacterByKey = new Map<string, NormalizedPersistentCharacterRef>();
    const persistentColorById = new Map<string, string>();

    normalizedPersistentCharacters.forEach(character => {
        persistentCharacterByKey.set(character.key, character);
        persistentColorById.set(
            character.id,
            getConfirmedCharacterColor(
                character.id,
                colorByCharacterId?.get(character.id) ?? character.colorHex,
                characterColorSaturation,
            ),
        );
    });

    const resolveConfirmedColorById = (characterId: string) => {
        const explicitColor = normalizeCharacterColorHex(colorByCharacterId?.get(characterId));

        if (explicitColor) {
            return explicitColor;
        }

        const persistentColor = persistentColorById.get(characterId);

        if (persistentColor) {
            return persistentColor;
        }

        return getCharacterColor(`character:${characterId}`, characterColorSaturation);
    };

    const resolveRememberedColorByKey = (characterKey: string) => {
        return normalizeCharacterColorHex(rememberedColorByKey?.get(characterKey));
    };

    const resolveDraftTokenColor = (blockId: string, tokenIndex: number) => {
        return getDraftTokenColor(blockId, tokenIndex, characterColorSaturation);
    };

    return {
        persistentCharacterByKey,
        resolveConfirmedColorById,
        resolveRememberedColorByKey,
        resolveDraftTokenColor,
    };
};
