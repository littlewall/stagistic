import type {useScriptCharacterCatalog} from '@stagistic/app-core';
import {
    normalizeCharacterColorHex,
    normalizeCharacterKey,
} from '@stagistic/script';
import {useCallback} from 'react';

import type {
    ConfirmEditorCallbacks,
    DeleteEditorCallbacks,
    RenameEditorCallbacks,
} from './actions/types';
import {normalizeCharacterDisplayName} from './index';
import type {ScriptCharacterGroupRecord} from './types';
import type {useCharacterDocumentActions} from './useCharacterDocumentActions';

type CharacterCatalog = ReturnType<typeof useScriptCharacterCatalog>;
type CharacterDocumentActions = ReturnType<typeof useCharacterDocumentActions>;

interface UseCharacterGroupActionsArgs {
    catalog: CharacterCatalog,
    documentActions: CharacterDocumentActions,
    confirmedSpeakingEntitySet: ReadonlySet<string>,
    confirmedGroupsById: ReadonlyMap<string, ScriptCharacterGroupRecord>,
}

export interface CharacterGroupActions {
    handleCreateGroup: (
        groupKey: string,
        editorCallbacks?: ConfirmEditorCallbacks,
    ) => Promise<ScriptCharacterGroupRecord | null>,
    handleDeleteGroup: (
        groupId: string,
        editorCallbacks?: DeleteEditorCallbacks,
    ) => Promise<void>,
    handleRenameGroup: (
        groupId: string,
        previousGroupName: string,
        nextGroupName: string,
        editorCallbacks?: RenameEditorCallbacks,
    ) => Promise<ScriptCharacterGroupRecord | null>,
    handleSetGroupColor: (groupId: string, colorHex: string | null) => Promise<void>,
    handleReplaceGroupMembers: (groupId: string, memberIds: string[]) => Promise<void>,
}

export const useCharacterGroupActions = ({
    catalog,
    documentActions,
    confirmedSpeakingEntitySet,
    confirmedGroupsById,
}: UseCharacterGroupActionsArgs): CharacterGroupActions => {
    const handleCreateGroup = useCallback((
        groupKey: string,
        editorCallbacks?: ConfirmEditorCallbacks,
    ) => {
        const normalizedKey = normalizeCharacterKey(groupKey);

        if (!normalizedKey || confirmedSpeakingEntitySet.has(normalizedKey)) {
            return Promise.resolve(null);
        }

        return catalog.createGroup(normalizedKey).then(async group => {
            if (!group) {
                return null;
            }

            if (editorCallbacks) {
                editorCallbacks.onLinkRef(normalizedKey, group.id);
            } else {
                await documentActions.linkCharacter(normalizedKey, group.id);
            }

            return group;
        }).catch(() => null);
    }, [
        catalog,
        confirmedSpeakingEntitySet,
        documentActions,
    ]);

    const handleDeleteGroup = useCallback((
        groupId: string,
        editorCallbacks?: DeleteEditorCallbacks,
    ) => {
        if (!confirmedGroupsById.has(groupId)) {
            return Promise.resolve();
        }

        return catalog.deleteGroup(groupId).then(async () => {
            if (editorCallbacks) {
                editorCallbacks.onUnlinkRef(groupId);

                return;
            }

            await documentActions.unlinkCharacter(groupId);
        }).catch(() => undefined);
    }, [
        catalog,
        confirmedGroupsById,
        documentActions,
    ]);

    const handleRenameGroup = useCallback((
        groupId: string,
        _previousGroupName: string,
        nextGroupName: string,
        editorCallbacks?: RenameEditorCallbacks,
    ) => {
        const original = confirmedGroupsById.get(groupId);
        const nextName = normalizeCharacterDisplayName(nextGroupName);
        const nextKey = normalizeCharacterKey(nextName);

        if (!original || !nextKey) {
            return Promise.resolve(null);
        }

        editorCallbacks?.onRenameText(groupId, nextName);

        return catalog.renameGroup(groupId, nextKey).then(async renamed => {
            if (!renamed) {
                editorCallbacks?.onRenameText(groupId, original.key);

                return null;
            }

            if (editorCallbacks) {
                return renamed;
            }

            await documentActions.renameCharacter(
                groupId,
                original.key,
                nextName,
                groupId,
            );

            return renamed;
        }).catch(error => {
            editorCallbacks?.onRenameText(groupId, original.key);
            throw error;
        });
    }, [
        catalog,
        confirmedGroupsById,
        documentActions,
    ]);

    const handleSetGroupColor = useCallback((groupId: string, colorHex: string | null) => {
        return catalog.setGroupColor(groupId, normalizeCharacterColorHex(colorHex))
            .then(() => undefined);
    }, [catalog]);
    const handleReplaceGroupMembers = useCallback((groupId: string, memberIds: string[]) => {
        return catalog.replaceGroupMembers(groupId, memberIds).then(() => undefined);
    }, [catalog]);

    return {
        handleCreateGroup,
        handleDeleteGroup,
        handleRenameGroup,
        handleSetGroupColor,
        handleReplaceGroupMembers,
    };
};
