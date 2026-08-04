import type {EditorLiveCharacterSnapshot} from '@stagistic/editor';
import {normalizeCharacterKey} from '@stagistic/script';

interface SpeakingEntityRecord {
    id: string,
    key: string,
    colorHex?: string | null,
}

export const EMPTY_UNCONFIRMED_CHARACTER_KEYS = new Set<string>();

export const normalizeSpeakingEntityRecords = <T extends SpeakingEntityRecord>(
    records: T[],
    snapshot: EditorLiveCharacterSnapshot | null,
): T[] => {
    const seen = new Set<string>();
    const normalized: T[] = [];

    records.forEach(record => {
        const liveKey = record.id
            ? snapshot?.keyByCharacterId.get(record.id)
            : null;
        const key = normalizeCharacterKey(liveKey ?? record.key);

        if (!key || seen.has(key)) {
            return;
        }

        seen.add(key);
        normalized.push({
            ...record,
            key,
            colorHex: record.colorHex ?? null,
        });
    });

    return normalized.sort((left, right) => left.key.localeCompare(right.key));
};

export const collectUnconfirmedCharacterKeysFromSnapshot = (
    snapshot: EditorLiveCharacterSnapshot,
    normalizedConfirmedCharacterRecords: SpeakingEntityRecord[],
) => {
    const unconfirmedKeys = new Set<string>();

    snapshot.countsByKey.forEach((_count, key) => {
        if (!key) {
            return;
        }

        unconfirmedKeys.add(key);
    });

    normalizedConfirmedCharacterRecords.forEach(character => {
        if (!character.id) {
            return;
        }

        const currentKey = snapshot.keyByCharacterId.get(character.id)
            ?? normalizeCharacterKey(character.key);

        if (!currentKey) {
            return;
        }

        unconfirmedKeys.delete(currentKey);
    });

    return unconfirmedKeys;
};
