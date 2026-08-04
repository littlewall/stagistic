import {
    type EditorLiveCharacterSnapshot,
    getCharacterColor,
    getConfirmedCharacterColor,
} from '@stagistic/editor';
import {
    DEFAULT_EDITOR_SETTINGS,
    type EditorSettings,
    normalizeCharacterColorHex,
} from '@stagistic/script';
import {
    useCallback,
    useMemo,
} from 'react';

import {
    collectUnconfirmedCharacterKeysFromSnapshot,
    EMPTY_UNCONFIRMED_CHARACTER_KEYS,
    normalizeSpeakingEntityRecords,
} from './characterComputedHelpers';
import {
    normalizeCharacterDisplayName,
} from './index';
import type {
    EditorSidebarCharacter,
    ScriptCharacterGroupRecord,
    ScriptCharacterRecord,
} from './types';

interface UseCharacterComputedArgs {
    data: {
        confirmedCharacterRecords: ScriptCharacterRecord[],
        confirmedGroupRecords: ScriptCharacterGroupRecord[],
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
    normalizedConfirmedGroupRecords: ScriptCharacterGroupRecord[],
    normalizedSpeakingEntityRecords: ScriptCharacterRecord[],
    confirmedCharacters: EditorSidebarCharacter[],
    unconfirmedCharacters: EditorSidebarCharacter[],
    confirmedCharactersById: Map<string, ScriptCharacterRecord>,
    confirmedGroupsById: Map<string, ScriptCharacterGroupRecord>,
    confirmedCharacterSet: Set<string>,
    confirmedSpeakingEntitySet: Set<string>,
    getCharacterNameForBlockType: (name: string, blockType: unknown) => string,
    normalizeCharacterNameForInlineInput: (name: string) => string,
}

export const useCharacterComputed = ({
    data,
    pending,
    options,
}: UseCharacterComputedArgs): CharacterComputed => {
    const {
        confirmedCharacterRecords,
        confirmedGroupRecords,
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

    const confirmedGroupsById = useMemo(
        () => new Map(confirmedGroupRecords.map(group => [group.id, group])),
        [confirmedGroupRecords],
    );
    const normalizedConfirmedCharacterRecords = useMemo(
        () => normalizeSpeakingEntityRecords(confirmedCharacterRecords, characterSnapshot),
        [characterSnapshot, confirmedCharacterRecords],
    );
    const normalizedConfirmedGroupRecords = useMemo(
        () => normalizeSpeakingEntityRecords(confirmedGroupRecords, characterSnapshot),
        [characterSnapshot, confirmedGroupRecords],
    );
    const normalizedSpeakingEntityRecords = useMemo(
        () => [
            ...normalizedConfirmedCharacterRecords,
            ...normalizedConfirmedGroupRecords,
        ].sort((left, right) => left.key.localeCompare(right.key)),
        [normalizedConfirmedCharacterRecords, normalizedConfirmedGroupRecords],
    );

    const normalizedConfirmedCharacterKeys = useMemo(
        () => normalizedConfirmedCharacterRecords.map(character => character.key),
        [normalizedConfirmedCharacterRecords],
    );

    const unconfirmedCharacterKeys = useMemo(() => {
        if (!characterSnapshot) {
            return EMPTY_UNCONFIRMED_CHARACTER_KEYS;
        }

        return collectUnconfirmedCharacterKeysFromSnapshot(
            characterSnapshot,
            normalizedSpeakingEntityRecords,
        );
    }, [characterSnapshot, normalizedSpeakingEntityRecords]);

    const confirmedCharacterSet = useMemo(
        () => new Set(normalizedConfirmedCharacterKeys),
        [normalizedConfirmedCharacterKeys],
    );
    const confirmedSpeakingEntitySet = useMemo(
        () => new Set(normalizedSpeakingEntityRecords.map(entity => entity.key)),
        [normalizedSpeakingEntityRecords],
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
                    color: getConfirmedCharacterColor(
                        character.id,
                        normalizedColorHex,
                        characterColorSaturation,
                    ),
                    colorHex: normalizedColorHex ?? null,
                    genderKey: character.genderKey ?? null,
                    outline: character.outline ?? null,
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
        ],
    );

    const unconfirmedCharacters = useMemo<EditorSidebarCharacter[]>(
        () => {
            if (!includeSidebarLists) {
                return [];
            }

            return Array.from(unconfirmedCharacterKeys.values())
                .filter(key => !confirmedCharacterSet.has(key))
                .filter(key => !renamingCharacterKeySet.has(key))
                .sort((a, b) => a.localeCompare(b))
                .map(key => ({
                    key,
                    color: characterSnapshot?.displayColorByKey.get(key)
                        ?? getCharacterColor(key, characterColorSaturation),
                    isConfirmed: false,
                    isConfirmPending: confirmingCharacterSet.has(key),
                    isPending: confirmingCharacterSet.has(key),
                }));
        },
        [
            characterSnapshot?.displayColorByKey,
            characterColorSaturation,
            confirmedCharacterSet,
            confirmingCharacterSet,
            includeSidebarLists,
            renamingCharacterKeySet,
            unconfirmedCharacterKeys,
        ],
    );

    const getCharacterNameForBlockType = useCallback((name: string, blockType: unknown) => {
        const normalizedName = normalizeCharacterDisplayName(name);
        const isCharacterType = blockType === 'character';

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
        return getCharacterNameForBlockType(name, 'character');
    }, [getCharacterNameForBlockType]);

    return {
        normalizedConfirmedCharacterRecords,
        normalizedConfirmedGroupRecords,
        normalizedSpeakingEntityRecords,
        confirmedCharacters,
        unconfirmedCharacters,
        confirmedCharactersById,
        confirmedGroupsById,
        confirmedCharacterSet,
        confirmedSpeakingEntitySet,
        getCharacterNameForBlockType,
        normalizeCharacterNameForInlineInput,
    };
};
