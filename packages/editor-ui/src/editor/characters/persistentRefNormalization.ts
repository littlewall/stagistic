import {
    normalizeCharacterColorHex,
    normalizeCharacterKey,
} from '@stagistic/script-core';

import type {PersistentCharacterRef} from '../contracts';

export interface NormalizedPersistentCharacterRef {
    id: string,
    key: string,
    colorHex: string | null,
}

export const normalizePersistentCharacterRefs = (
    persistentCharacters: readonly PersistentCharacterRef[],
): NormalizedPersistentCharacterRef[] => {
    const seenIds = new Set<string>();
    const seenKeys = new Set<string>();
    const normalized: NormalizedPersistentCharacterRef[] = [];

    persistentCharacters.forEach(character => {
        const key = normalizeCharacterKey(character.key);
        const rawId = typeof character.id === 'string'
            ? character.id.trim()
            : '';
        const id = rawId.length > 0
            ? rawId
            : key;

        if (!id || !key || seenIds.has(id) || seenKeys.has(key)) {
            return;
        }

        seenIds.add(id);
        seenKeys.add(key);
        normalized.push({
            id,
            key,
            colorHex: normalizeCharacterColorHex(character.colorHex) ?? null,
        });
    });

    return normalized;
};
