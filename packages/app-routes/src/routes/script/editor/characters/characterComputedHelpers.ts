import type {EditorLiveCharacterSnapshot} from '@stagistic/editor';
import {normalizeCharacterKey} from '@stagistic/script';

import type {ScriptCharacterRecord} from './types';

export const EMPTY_UNCONFIRMED_CHARACTER_KEYS = new Set<string>();

export const collectUnconfirmedCharacterKeysFromSnapshot = (
    snapshot: EditorLiveCharacterSnapshot,
    normalizedConfirmedCharacterRecords: ScriptCharacterRecord[],
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

        /*
         * Use the key currently shown in the editor (via refs) if available.
         * During preview rename, this will be the new name rather than the stale DB key.
         */
        const currentKey = snapshot.keyByCharacterId.get(character.id)
            ?? normalizeCharacterKey(character.key);

        if (!currentKey) {
            return;
        }

        unconfirmedKeys.delete(currentKey);
    });

    return unconfirmedKeys;
};
