import {
    ELEMENT_CHARACTER,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    normalizeCharacterKey,
} from '@stagistic/editor-core';
import {getCharacterColor} from '@stagistic/editor-ui';
import {
    DEFAULT_EDITOR_SETTINGS,
    type EditorSettings,
    type ScriptDocument,
} from '@stagistic/shared';
import {
    useCallback,
    useMemo,
} from 'react';

import {
    collectScriptCharacterStats,
    normalizeCharacterDisplayName,
} from './index';
import type {
    CharacterCountItem,
    ScriptCharacterRecord,
} from './types';

type UseCharacterComputedArgs = {
    confirmedCharacterRecords: ScriptCharacterRecord[],
    confirmingCharacterKeys: string[],
    deletingCharacterIds: string[],
    renamingCharacterIds: string[],
    renamingCharacterKeys: string[],
    editorValue: ScriptDocument | null,
    initialValue: ScriptDocument | null | undefined,
    resolvedScriptSettings: EditorSettings,
};

export type CharacterComputed = {
    normalizedConfirmedCharacterRecords: ScriptCharacterRecord[],
    confirmedCharacters: CharacterCountItem[],
    unconfirmedCharacters: CharacterCountItem[],
    confirmedCharactersById: Map<string, ScriptCharacterRecord>,
    confirmedCharacterSet: Set<string>,
    getCharacterNameForBlockType: (name: string, blockType: unknown) => string,
    normalizeCharacterNameForInlineInput: (name: string) => string,
};

export const useCharacterComputed = ({
    confirmedCharacterRecords,
    confirmingCharacterKeys,
    deletingCharacterIds,
    renamingCharacterIds,
    renamingCharacterKeys,
    editorValue,
    initialValue,
    resolvedScriptSettings,
}: UseCharacterComputedArgs): CharacterComputed => {
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
            });
        });

        normalized.sort((a, b) => a.key.localeCompare(b.key));

        return normalized;
    }, [confirmedCharacterRecords]);

    const normalizedConfirmedCharacterKeys = useMemo(
        () => normalizedConfirmedCharacterRecords.map(character => character.key),
        [normalizedConfirmedCharacterRecords],
    );

    const confirmedCharacterIdSet = useMemo(
        () => new Set(normalizedConfirmedCharacterRecords.map(character => character.id)),
        [normalizedConfirmedCharacterRecords],
    );

    const scriptCharacterStats = useMemo(
        () => collectScriptCharacterStats(editorValue ?? initialValue, confirmedCharacterIdSet),
        [
            confirmedCharacterIdSet,
            editorValue,
            initialValue,
        ],
    );

    const confirmedCharacterSet = useMemo(
        () => new Set(normalizedConfirmedCharacterKeys),
        [normalizedConfirmedCharacterKeys],
    );

    const confirmedCharacters = useMemo<CharacterCountItem[]>(
        () => normalizedConfirmedCharacterRecords.map(character => ({
            id: character.id,
            key: character.key,
            count: scriptCharacterStats.confirmedCountsById.get(character.id)
                ?? scriptCharacterStats.countsByKey.get(character.key)
                ?? 0,
            color: getCharacterColor(character.key),
            isConfirmed: true,
            isDeletePending: deletingCharacterIdSet.has(character.id),
            isRenamePending: renamingCharacterIdSet.has(character.id),
            isPending: deletingCharacterIdSet.has(character.id) || renamingCharacterIdSet.has(character.id),
        })),
        [
            deletingCharacterIdSet,
            normalizedConfirmedCharacterRecords,
            renamingCharacterIdSet,
            scriptCharacterStats.confirmedCountsById,
            scriptCharacterStats.countsByKey,
        ],
    );

    const unconfirmedCharacters = useMemo<CharacterCountItem[]>(
        () => Array.from(scriptCharacterStats.unconfirmedCountsByKey.entries())
            .filter(([key]) => !confirmedCharacterSet.has(key))
            .filter(([key]) => !renamingCharacterKeySet.has(key))
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([key, count]) => ({
                key,
                count,
                color: getCharacterColor(key),
                isConfirmed: false,
                isConfirmPending: confirmingCharacterSet.has(key),
                isPending: confirmingCharacterSet.has(key),
            })),
        [
            confirmedCharacterSet,
            confirmingCharacterSet,
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
