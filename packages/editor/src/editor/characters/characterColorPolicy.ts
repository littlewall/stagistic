import {normalizeCharacterColorHex} from '@stagistic/script';

import {
    applyCharacterColorSaturation,
    getCharacterColor,
} from './characterColors';
import type {NormalizedPersistentCharacterRef} from './persistentRefNormalization';

export const getConfirmedCharacterColor = (
    characterId: string,
    colorHex: string | null | undefined,
) => {
    const normalizedColor = normalizeCharacterColorHex(colorHex);

    if (normalizedColor) {
        return applyCharacterColorSaturation(normalizedColor);
    }

    return getCharacterColor(`character:${characterId}`);
};

export const getUnconfirmedCharacterColor = (
    characterKey: string,
) => {
    return getCharacterColor(characterKey);
};

const getDraftTokenColor = (
    blockId: string,
    tokenIndex: number,
) => {
    return getCharacterColor(`draft:${blockId}:${tokenIndex}`);
};

interface CreateCharacterColorResolversArgs {
    normalizedPersistentCharacters: readonly NormalizedPersistentCharacterRef[],
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

        return getCharacterColor(`character:${characterId}`);
    };

    const resolveRememberedColorByKey = (characterKey: string) => {
        return normalizeCharacterColorHex(rememberedColorByKey?.get(characterKey));
    };

    const resolveDraftTokenColor = (blockId: string, tokenIndex: number) => {
        return getDraftTokenColor(blockId, tokenIndex);
    };

    return {
        persistentCharacterByKey,
        resolveConfirmedColorById,
        resolveRememberedColorByKey,
        resolveDraftTokenColor,
    };
};
