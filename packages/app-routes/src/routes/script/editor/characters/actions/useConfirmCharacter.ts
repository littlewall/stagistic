import {normalizeCharacterKey} from '@stagistic/script-core';
import {useCallback} from 'react';

import {linkCharacterRefInScriptDocument} from '../index';
import type {CharacterActionSharedArgs, SetStringArrayState} from './types';
import {
    addPendingValue,
    getSourceDocument,
    removePendingValue,
} from './utils';

interface UseConfirmCharacterArgs extends CharacterActionSharedArgs {
    confirmedCharacterSet: ReadonlySet<string>,
    setConfirmingCharacterKeys: SetStringArrayState,
}

export const useConfirmCharacter = ({
    currentScriptId,
    scriptRepository,
    initialValue,
    getEditorValue,
    setEditorValue,
    setEditorOverrideValue,
    setConfirmedCharacterRecords,
    setConfirmingCharacterKeys,
    confirmedCharacterSet,
    handleAutoSave,
}: UseConfirmCharacterArgs) => {
    return useCallback((characterKey: string) => {
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

                const sourceDocument = getSourceDocument(getEditorValue(), initialValue);

                if (sourceDocument) {
                    const {
                        value: linkedDocument,
                        changed: didLinkCharacterRef,
                    } = linkCharacterRefInScriptDocument(
                        sourceDocument,
                        normalizedKey,
                        confirmedCharacter.id,
                    );

                    if (didLinkCharacterRef) {
                        setEditorOverrideValue(linkedDocument);
                        setEditorValue(linkedDocument);
                        await handleAutoSave(linkedDocument);
                    }
                }
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
        getEditorValue,
        handleAutoSave,
        initialValue,
        scriptRepository,
        setConfirmedCharacterRecords,
        setConfirmingCharacterKeys,
        setEditorOverrideValue,
        setEditorValue,
    ]);
};
