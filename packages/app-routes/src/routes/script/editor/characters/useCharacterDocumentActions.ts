import {
    linkCharacterRefInScriptDocument,
    renameCharacterInScriptDocument,
    replaceCharacterRefIdInScriptDocument,
    type ScriptDocument,
    unlinkCharacterRefInScriptDocument,
} from '@stagistic/script';
import {useCallback} from 'react';

interface UseCharacterDocumentActionsArgs {
    getEditorValue: () => ScriptDocument | null,
    setEditorValue: (value: ScriptDocument | null) => void,
    setEditorOverrideValue: (value: ScriptDocument | null) => void,
    handleAutoSave: (value: ScriptDocument) => Promise<boolean>,
    getCharacterNameForBlockType: (name: string, blockType: unknown) => string,
}

export const useCharacterDocumentActions = ({
    getEditorValue,
    setEditorValue,
    setEditorOverrideValue,
    handleAutoSave,
    getCharacterNameForBlockType,
}: UseCharacterDocumentActionsArgs) => {
    const applyChange = useCallback(async (change: {
        value: ScriptDocument,
        changed: boolean,
    }) => {
        if (!change.changed) {
            return true;
        }

        setEditorValue(change.value);
        setEditorOverrideValue(change.value);

        return handleAutoSave(change.value);
    }, [
        handleAutoSave,
        setEditorOverrideValue,
        setEditorValue,
    ]);

    const linkCharacter = useCallback((key: string, id: string) => {
        const value = getEditorValue();

        return value
            ? applyChange(linkCharacterRefInScriptDocument(value, key, id))
            : Promise.resolve(false);
    }, [applyChange, getEditorValue]);
    const unlinkCharacter = useCallback((id: string) => {
        const value = getEditorValue();

        return value
            ? applyChange(unlinkCharacterRefInScriptDocument(value, id))
            : Promise.resolve(false);
    }, [applyChange, getEditorValue]);
    const renameCharacter = useCallback((
        id: string,
        previousKey: string,
        nextName: string,
        replacementId: string,
    ) => {
        const value = getEditorValue();

        if (!value) {
            return Promise.resolve(false);
        }

        const renamed = renameCharacterInScriptDocument(
            value,
            previousKey,
            nextName,
            getCharacterNameForBlockType,
            {characterId: id},
        );
        const replaced = replacementId === id
            ? renamed
            : replaceCharacterRefIdInScriptDocument(renamed.value, id, replacementId);

        return applyChange({
            value: replaced.value,
            changed: renamed.changed || replaced.changed,
        });
    }, [
        applyChange,
        getCharacterNameForBlockType,
        getEditorValue,
    ]);

    return {
        linkCharacter,
        unlinkCharacter,
        renameCharacter,
    };
};
