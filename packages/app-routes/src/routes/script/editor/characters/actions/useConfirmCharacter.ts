import {normalizeCharacterKey} from '@stagistic/script-core';
import {useCallback} from 'react';

import type {
    CharacterActionSharedArgs, ConfirmEditorCallbacks, SetStringArrayState,
} from './types';
import {
    addPendingValue,
    removePendingValue,
} from './utils';

interface UseConfirmCharacterArgs extends CharacterActionSharedArgs {
    confirmedCharacterSet: ReadonlySet<string>,
    setConfirmingCharacterKeys: SetStringArrayState,
}

export const useConfirmCharacter = ({
    currentScriptId,
    scriptRepository,
    setConfirmedCharacterRecords,
    setConfirmingCharacterKeys,
    confirmedCharacterSet,
}: UseConfirmCharacterArgs) => {
    return useCallback((characterKey: string, editorCallbacks?: ConfirmEditorCallbacks) => {
        if (!currentScriptId) {
            return;
        }

        const normalizedKey = normalizeCharacterKey(characterKey);

        if (!normalizedKey || confirmedCharacterSet.has(normalizedKey)) {
            return;
        }

        setConfirmingCharacterKeys(previous => addPendingValue(previous, normalizedKey));

        const run = async () => {
            try {
                const confirmedCharacter = await scriptRepository.confirmScriptCharacter(currentScriptId, normalizedKey);

                if (!confirmedCharacter) {
                    return;
                }

                setConfirmedCharacterRecords(previous => {
                    const next = previous
                        .filter(character => character.id !== confirmedCharacter.id && character.key !== confirmedCharacter.key);

                    next.push(confirmedCharacter);

                    return next;
                });

                editorCallbacks?.onLinkRef(normalizedKey, confirmedCharacter.id);
            } catch (error) {
                console.error('Failed to confirm script character', error);
            } finally {
                setConfirmingCharacterKeys(previous => removePendingValue(previous, normalizedKey));
            }
        };

        void run();
    }, [
        confirmedCharacterSet,
        currentScriptId,
        scriptRepository,
        setConfirmedCharacterRecords,
        setConfirmingCharacterKeys,
    ]);
};
