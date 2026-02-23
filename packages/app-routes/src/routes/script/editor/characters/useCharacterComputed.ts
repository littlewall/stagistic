import {
    type EditorLiveCharacterSnapshot,
    getCharacterColor,
    normalizeCharacterColorHex,
} from '@stagistic/editor-ui';
import {
    DEFAULT_EDITOR_SETTINGS,
    type EditorSettings,
    ELEMENT_CHARACTER,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    normalizeCharacterKey,
} from '@stagistic/script-core';
import {
    useCallback,
    useMemo,
} from 'react';

import {
    normalizeCharacterDisplayName,
} from './index';
import type {
    EditorSidebarCharacter,
    ScriptCharacterRecord,
} from './types';

interface UseCharacterComputedArgs {
    data: {
        confirmedCharacterRecords: ScriptCharacterRecord[],
        characterSnapshot: EditorLiveCharacterSnapshot | null,
        resolvedScriptSettings: EditorSettings,
        characterColorSaturation: number,
    },
    pending: {
        confirmingCharacterKeys: string[],
        deletingCharacterIds: string[],
        renamingCharacterIds: string[],
        renamingCharacterKeys: string[],
        colorUpdatingCharacterIds: string[],
        genderUpdatingCharacterIds: string[],
    },
    options?: {
        includeSidebarLists?: boolean,
    },
}

export interface CharacterComputed {
    normalizedConfirmedCharacterRecords: ScriptCharacterRecord[],
    confirmedCharacters: EditorSidebarCharacter[],
    unconfirmedCharacters: EditorSidebarCharacter[],
    confirmedCharactersById: Map<string, ScriptCharacterRecord>,
    confirmedCharacterSet: Set<string>,
    getCharacterNameForBlockType: (name: string, blockType: unknown) => string,
    normalizeCharacterNameForInlineInput: (name: string) => string,
}

const EMPTY_SCRIPT_CHARACTER_STATS = {
    countsByKey: new Map<string, number>() as ReadonlyMap<string, number>,
    countsByCharacterId: new Map<string, number>() as ReadonlyMap<string, number>,
    unconfirmedCountsByKey: new Map<string, number>(),
} as const;

const collectStatsFromSnapshot = (
    snapshot: EditorLiveCharacterSnapshot,
    normalizedConfirmedCharacterRecords: ScriptCharacterRecord[],
) => {
    const countsByKey = snapshot.countsByKey;
    const countsByCharacterId = snapshot.countsByCharacterId;
    const unconfirmedCountsByKey = new Map<string, number>();

    countsByKey.forEach((count, key) => {
        if (count > 0) {
            unconfirmedCountsByKey.set(key, count);
        }
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

        const confirmedCount = countsByCharacterId.get(character.id) ?? 0;
        const currentUnconfirmed = unconfirmedCountsByKey.get(currentKey) ?? 0;
        const nextUnconfirmed = Math.max(0, currentUnconfirmed - confirmedCount);

        if (nextUnconfirmed <= 0) {
            unconfirmedCountsByKey.delete(currentKey);

            return;
        }

        unconfirmedCountsByKey.set(currentKey, nextUnconfirmed);
    });

    return {
        countsByKey,
        countsByCharacterId,
        unconfirmedCountsByKey,
    };
};

export const useCharacterComputed = ({
    data,
    pending,
    options,
}: UseCharacterComputedArgs): CharacterComputed => {
    const {
        confirmedCharacterRecords,
        characterSnapshot,
        resolvedScriptSettings,
        characterColorSaturation,
    } = data;
    const {
        confirmingCharacterKeys,
        deletingCharacterIds,
        renamingCharacterIds,
        renamingCharacterKeys,
        colorUpdatingCharacterIds,
        genderUpdatingCharacterIds,
    } = pending;
    const includeSidebarLists = options?.includeSidebarLists ?? true;
    const confirmingCharacterSet = useMemo(
        () => new Set(confirmingCharacterKeys),
        [confirmingCharacterKeys],
    );
    const deletingCharacterIdSet = useMemo(
        () => new Set(deletingCharacterIds),
        [deletingCharacterIds],
    );
    const renamingCharacterIdSet = useMemo(
        () => new Set(renamingCharacterIds),
        [renamingCharacterIds],
    );
    const renamingCharacterKeySet = useMemo(
        () => new Set(renamingCharacterKeys),
        [renamingCharacterKeys],
    );
    const colorUpdatingCharacterIdSet = useMemo(
        () => new Set(colorUpdatingCharacterIds),
        [colorUpdatingCharacterIds],
    );
    const genderUpdatingCharacterIdSet = useMemo(
        () => new Set(genderUpdatingCharacterIds),
        [genderUpdatingCharacterIds],
    );

    const confirmedCharactersById = useMemo(() => {
        const result = new Map<string, ScriptCharacterRecord>();

        confirmedCharacterRecords.forEach(character => {
            if (!character.id) {
                return;
            }

            result.set(character.id, character);
        });

        return result;
    }, [confirmedCharacterRecords]);

    const normalizedConfirmedCharacterRecords = useMemo(() => {
        const seen = new Set<string>();
        const normalized: ScriptCharacterRecord[] = [];

        confirmedCharacterRecords.forEach(character => {
            const key = normalizeCharacterKey(character.key);

            if (!key || seen.has(key)) {
                return;
            }

            seen.add(key);
            normalized.push({
                id: character.id,
                key,
                colorHex: character.colorHex ?? null,
                genderKey: character.genderKey ?? null,
            });
        });

        normalized.sort((a, b) => a.key.localeCompare(b.key));

        return normalized;
    }, [confirmedCharacterRecords]);

    const normalizedConfirmedCharacterKeys = useMemo(
        () => normalizedConfirmedCharacterRecords.map(character => character.key),
        [normalizedConfirmedCharacterRecords],
    );

    const scriptCharacterStats = useMemo(() => {
        if (!characterSnapshot) {
            return EMPTY_SCRIPT_CHARACTER_STATS;
        }

        return collectStatsFromSnapshot(characterSnapshot, normalizedConfirmedCharacterRecords);
    }, [characterSnapshot, normalizedConfirmedCharacterRecords]);

    const confirmedCharacterSet = useMemo(
        () => new Set(normalizedConfirmedCharacterKeys),
        [normalizedConfirmedCharacterKeys],
    );

    const confirmedCharacters = useMemo<EditorSidebarCharacter[]>(
        () => {
            if (!includeSidebarLists) {
                return [];
            }

            return normalizedConfirmedCharacterRecords.map(character => {
                const normalizedColorHex = normalizeCharacterColorHex(character.colorHex);

                return {
                    id: character.id,
                    key: character.key,
                    count: scriptCharacterStats.countsByCharacterId.get(character.id)
                        ?? scriptCharacterStats.countsByKey.get(character.key)
                        ?? 0,
                    color: normalizedColorHex ?? getCharacterColor(character.key, characterColorSaturation),
                    colorHex: normalizedColorHex ?? null,
                    genderKey: character.genderKey ?? null,
                    isConfirmed: true,
                    isDeletePending: deletingCharacterIdSet.has(character.id),
                    isRenamePending: renamingCharacterIdSet.has(character.id),
                    isColorUpdatePending: colorUpdatingCharacterIdSet.has(character.id),
                    isGenderUpdatePending: genderUpdatingCharacterIdSet.has(character.id),
                    isPending: deletingCharacterIdSet.has(character.id)
                        || renamingCharacterIdSet.has(character.id)
                        || colorUpdatingCharacterIdSet.has(character.id)
                        || genderUpdatingCharacterIdSet.has(character.id),
                };
            });
        },
        [
            characterColorSaturation,
            colorUpdatingCharacterIdSet,
            deletingCharacterIdSet,
            genderUpdatingCharacterIdSet,
            includeSidebarLists,
            normalizedConfirmedCharacterRecords,
            renamingCharacterIdSet,
            scriptCharacterStats.countsByCharacterId,
            scriptCharacterStats.countsByKey,
        ],
    );

    const unconfirmedCharacters = useMemo<EditorSidebarCharacter[]>(
        () => {
            if (!includeSidebarLists) {
                return [];
            }

            return Array.from(scriptCharacterStats.unconfirmedCountsByKey.entries())
                .filter(([key]) => !confirmedCharacterSet.has(key))
                .filter(([key]) => !renamingCharacterKeySet.has(key))
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([key, count]) => ({
                    key,
                    count,
                    color: getCharacterColor(key, characterColorSaturation),
                    isConfirmed: false,
                    isConfirmPending: confirmingCharacterSet.has(key),
                    isPending: confirmingCharacterSet.has(key),
                }));
        },
        [
            characterColorSaturation,
            confirmedCharacterSet,
            confirmingCharacterSet,
            includeSidebarLists,
            renamingCharacterKeySet,
            scriptCharacterStats.unconfirmedCountsByKey,
        ],
    );

    const getCharacterNameForBlockType = useCallback((name: string, blockType: unknown) => {
        const normalizedName = normalizeCharacterDisplayName(name);
        const isCharacterType = blockType === ELEMENT_CHARACTER || blockType === ELEMENT_DUAL_DIALOGUE_CHARACTER;

        if (!isCharacterType) {
            return normalizedName;
        }

        const casing = resolvedScriptSettings.blocks[blockType].casing
            ?? DEFAULT_EDITOR_SETTINGS.blocks[blockType].casing
            ?? 'normal';

        return casing === 'uppercase'
            ? normalizedName.toUpperCase()
            : normalizedName;
    }, [resolvedScriptSettings.blocks]);

    const normalizeCharacterNameForInlineInput = useCallback((name: string) => {
        return getCharacterNameForBlockType(name, ELEMENT_CHARACTER);
    }, [getCharacterNameForBlockType]);

    return {
        normalizedConfirmedCharacterRecords,
        confirmedCharacters,
        unconfirmedCharacters,
        confirmedCharactersById,
        confirmedCharacterSet,
        getCharacterNameForBlockType,
        normalizeCharacterNameForInlineInput,
    };
};
