import type {
    ExportInitialCharacter,
    ExportInitialPlace,
} from '@stagistic/export';
import {
    normalizeCharacterKey,
    type ScriptBlockIndexSnapshot,
} from '@stagistic/script';

export type ExportCatalogEntity = {
    id: string,
    kind: 'character',
    key: string,
    outline?: string | null,
} | {
    id: string,
    kind: 'group',
    key: string,
    memberIds: string[],
};

const toDisplayName = (key: string) => key
    .toLowerCase()
    .replace(/(^|\s)\S/gu, match => match.toUpperCase());

const cleanOutline = (outline: string | null | undefined): string | null => {
    const value = outline?.trim() ?? '';

    return value.length > 0 ? value : null;
};

const collectCharacters = (
    snapshot: ScriptBlockIndexSnapshot,
    catalogEntities: ExportCatalogEntity[],
): ExportInitialCharacter[] => {
    const firstOrderById = new Map<string, number>();
    const firstOrderByKey = new Map<string, number>();

    [...snapshot.blocks]
        .sort((left, right) => left.orderNo - right.orderNo)
        .forEach(block => {
            block.characterRefs?.forEach(ref => {
                const key = normalizeCharacterKey(ref.key);

                if (!firstOrderByKey.has(key)) {
                    firstOrderByKey.set(key, block.orderNo);
                }

                if (ref.characterId && !firstOrderById.has(ref.characterId)) {
                    firstOrderById.set(ref.characterId, block.orderNo);
                }
            });
        });

    return catalogEntities
        .filter((entity): entity is Extract<ExportCatalogEntity, {kind: 'character'}> => entity.kind === 'character')
        .map(character => {
            const key = normalizeCharacterKey(character.key);

            return {
                id: character.id,
                displayName: toDisplayName(key),
                outline: cleanOutline(character.outline),
                firstAppearanceOrder: firstOrderById.get(character.id)
                    ?? firstOrderByKey.get(key)
                    ?? null,
            };
        });
};

const collectPlaces = (
    snapshot: ScriptBlockIndexSnapshot,
    places: Array<{id: string, name: string}>,
    scenePlaceIds: Record<string, string[]>,
): ExportInitialPlace[] => {
    const firstOrderByPlaceId = new Map<string, number>();

    [...snapshot.blocks]
        .filter(block => block.blockType === 'scene')
        .sort((left, right) => left.orderNo - right.orderNo)
        .forEach(scene => {
            (scenePlaceIds[scene.blockId] ?? []).forEach(placeId => {
                if (!firstOrderByPlaceId.has(placeId)) {
                    firstOrderByPlaceId.set(placeId, scene.orderNo);
                }
            });
        });

    return places
        .flatMap(place => {
            const firstAppearanceOrder = firstOrderByPlaceId.get(place.id);

            return firstAppearanceOrder === undefined
                ? []
                : [
                    {
                        id: place.id,
                        name: place.name,
                        firstAppearanceOrder,
                    },
                ];
        })
        .sort((left, right) => left.firstAppearanceOrder - right.firstAppearanceOrder
            || left.name.localeCompare(right.name));
};

export const collectInitialPageData = (
    snapshot: ScriptBlockIndexSnapshot,
    catalogEntities: ExportCatalogEntity[],
    places: Array<{id: string, name: string}>,
    scenePlaceIds: Record<string, string[]>,
): {
    initialCharacters: ExportInitialCharacter[],
    initialPlaces: ExportInitialPlace[],
} => ({
    initialCharacters: collectCharacters(snapshot, catalogEntities),
    initialPlaces: collectPlaces(snapshot, places, scenePlaceIds),
});
