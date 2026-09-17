import type {
    ExportInitialCharacter,
    ExportInitialPlace,
    ExportInitialVocalRange,
} from '@stagistic/export';
import {
    normalizeCharacterKey,
    parsePitch,
    type ScriptBlockIndexSnapshot,
} from '@stagistic/script';

export type ExportCatalogEntity = {
    id: string,
    kind: 'character',
    key: string,
    outline?: string | null,
    voiceType?: string | null,
    vocalRangeLow?: string | null,
    vocalRangeHigh?: string | null,
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

const buildFirstAppearanceOrders = (snapshot: ScriptBlockIndexSnapshot) => {
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

    return {firstOrderById, firstOrderByKey};
};

const firstAppearanceOrderOf = (
    character: Extract<ExportCatalogEntity, {kind: 'character'}>,
    firstAppearanceOrders: ReturnType<typeof buildFirstAppearanceOrders>,
): number | null => firstAppearanceOrders.firstOrderById.get(character.id)
    ?? firstAppearanceOrders.firstOrderByKey.get(normalizeCharacterKey(character.key))
    ?? null;

const collectCharacters = (
    catalogEntities: ExportCatalogEntity[],
    firstAppearanceOrders: ReturnType<typeof buildFirstAppearanceOrders>,
): ExportInitialCharacter[] => catalogEntities
    .filter((entity): entity is Extract<ExportCatalogEntity, {kind: 'character'}> => entity.kind === 'character')
    .map(character => ({
        id: character.id,
        displayName: toDisplayName(normalizeCharacterKey(character.key)),
        outline: cleanOutline(character.outline),
        firstAppearanceOrder: firstAppearanceOrderOf(character, firstAppearanceOrders),
    }));

const collectVocalRanges = (
    catalogEntities: ExportCatalogEntity[],
    firstAppearanceOrders: ReturnType<typeof buildFirstAppearanceOrders>,
): ExportInitialVocalRange[] => catalogEntities
    .filter((entity): entity is Extract<ExportCatalogEntity, {kind: 'character'}> => entity.kind === 'character')
    .flatMap(character => {
        const low = character.vocalRangeLow ?? null;
        const high = character.vocalRangeHigh ?? null;

        if (!low || !high || !parsePitch(low) || !parsePitch(high)) {
            return [];
        }

        return [
            {
                id: character.id,
                displayName: toDisplayName(normalizeCharacterKey(character.key)),
                voiceType: character.voiceType ?? null,
                low,
                high,
                firstAppearanceOrder: firstAppearanceOrderOf(character, firstAppearanceOrders),
            },
        ];
    });

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
    initialVocalRanges: ExportInitialVocalRange[],
} => {
    const firstAppearanceOrders = buildFirstAppearanceOrders(snapshot);

    return {
        initialCharacters: collectCharacters(catalogEntities, firstAppearanceOrders),
        initialPlaces: collectPlaces(snapshot, places, scenePlaceIds),
        initialVocalRanges: collectVocalRanges(catalogEntities, firstAppearanceOrders),
    };
};
