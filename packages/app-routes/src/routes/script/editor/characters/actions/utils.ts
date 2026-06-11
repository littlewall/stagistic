import {type ScriptDocument} from '@stagistic/script';

import type {ScriptCharacterRecord} from '../types';
import type {ScriptRepository} from '../useScriptEditorCharacters.types';
import type {SetScriptCharacterRecordsState, SetStringArrayState} from './types';

interface CharacterFieldUpdateArgs {
    characterId: string,
    currentScriptId: string,
    scriptRepository: ScriptRepository,
    setConfirmedCharacterRecords: SetScriptCharacterRecordsState,
    setPendingIds: SetStringArrayState,
    apiCall: () => Promise<ScriptCharacterRecord | null | undefined>,
    errorLabel: string,
}

export const runCharacterFieldUpdate = async ({
    characterId,
    currentScriptId,
    scriptRepository,
    setConfirmedCharacterRecords,
    setPendingIds,
    apiCall,
    errorLabel,
}: CharacterFieldUpdateArgs): Promise<void> => {
    setPendingIds(previous => addPendingValue(previous, characterId));

    try {
        const updatedCharacter = await apiCall();

        if (!updatedCharacter) {
            const storedCharacters = await scriptRepository.listScriptCharacters(currentScriptId);

            setConfirmedCharacterRecords(storedCharacters);

            return;
        }

        setConfirmedCharacterRecords(previous => {
            const next = previous
                .filter(character => character.id !== characterId && character.id !== updatedCharacter.id);

            next.push(updatedCharacter);

            return next;
        });
    } catch (error) {
        console.error(errorLabel, error);

        try {
            const storedCharacters = await scriptRepository.listScriptCharacters(currentScriptId);

            setConfirmedCharacterRecords(storedCharacters);
        } catch (refreshError) {
            console.error(`Failed to refresh characters after ${errorLabel}`, refreshError);
        }
    } finally {
        setPendingIds(previous => removePendingValue(previous, characterId));
    }
};

export const addPendingValue = (values: string[], value: string) => {
    if (values.includes(value)) {
        return values;
    }

    return [...values, value];
};

export const removePendingValue = (values: string[], value: string) => {
    return values.filter(current => current !== value);
};

export const getSourceDocument = (
    editorValue: ScriptDocument | null,
    initialValue: ScriptDocument | null | undefined,
) => {
    return editorValue ?? initialValue;
};
