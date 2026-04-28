import {
    normalizeCharacterColorHex,
    normalizeCharacterKey,
} from '@stagistic/script';
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
    return useCallback((characterKey: string, colorHex?: string | null, editorCallbacks?: ConfirmEditorCallbacks) => {
        if (!currentScriptId) {
            return;
        }

        const normalizedKey = normalizeCharacterKey(characterKey);
        const normalizedColorHex = normalizeCharacterColorHex(colorHex);

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

                let resolvedCharacter = confirmedCharacter;

                if (
                    normalizedColorHex
                    && confirmedCharacter.id
                    && normalizeCharacterColorHex(confirmedCharacter.colorHex) !== normalizedColorHex
                ) {
                    try {
                        const colorUpdatedCharacter = await scriptRepository.setScriptCharacterColor(
                            currentScriptId,
                            confirmedCharacter.id,
                            normalizedColorHex,
                        );

                        if (colorUpdatedCharacter) {
                            resolvedCharacter = colorUpdatedCharacter;
                        }

                        if (!colorUpdatedCharacter) {
                            resolvedCharacter = {
                                ...confirmedCharacter,
                                colorHex: normalizedColorHex,
                            };
                        }
                    } catch (colorError) {
                        console.error('Failed to set character color during confirm', colorError);
                        resolvedCharacter = {
                            ...confirmedCharacter,
                            colorHex: normalizedColorHex,
                        };
                    }
                }

                setConfirmedCharacterRecords(previous => {
                    const next = previous
                        .filter(character => character.id !== resolvedCharacter.id && character.key !== resolvedCharacter.key);

                    next.push(resolvedCharacter);

                    return next;
                });

                editorCallbacks?.onLinkRef(normalizedKey, resolvedCharacter.id);
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
