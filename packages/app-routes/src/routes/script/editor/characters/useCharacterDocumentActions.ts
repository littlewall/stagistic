import {
    linkCharacterRefInScriptDocument,
    renameCharacterInScriptDocument,
    replaceCharacterRefIdInScriptDocument,
    type ScriptDocument,
    unlinkCharacterRefInScriptDocument,
} from '@stagistic/script';
import {applyBodyChange} from '@stagistic/sync-engine';
import {useCallback} from 'react';
import type {Doc as YDoc} from 'yjs';

interface UseCharacterDocumentActionsArgs {
    getEditorValue: () => ScriptDocument | null,
    setEditorValue: (value: ScriptDocument | null) => void,
    setEditorOverrideValue: (value: ScriptDocument | null) => void,
    handleAutoSave: (value: ScriptDocument) => Promise<boolean>,
    getCharacterNameForBlockType: (name: string, blockType: unknown) => string,
    replicaBody?: YDoc | null,
}

export const useCharacterDocumentActions = ({
    getEditorValue,
    setEditorValue,
    setEditorOverrideValue,
    handleAutoSave,
    getCharacterNameForBlockType,
    replicaBody = null,
}: UseCharacterDocumentActionsArgs) => {
    const applyChange = useCallback(async (change: {
        value: ScriptDocument,
        changed: boolean,
    }) => {
        if (!change.changed) {
            return true;
        }

        if (replicaBody) {
            /*
             * Callers derive `change` synchronously from getEditorValue(), so it
             * is still the base: write only the blocks the change touched. The
             * bound editor re-renders from the Y.Doc; no remount.
             */
            const base = getEditorValue();

            if (base) {
                applyBodyChange(replicaBody, base, change.value);
            }

            setEditorValue(change.value);

            return handleAutoSave(change.value);
        }

        setEditorValue(change.value);
        setEditorOverrideValue(change.value);

        return handleAutoSave(change.value);
    }, [
        getEditorValue,
        handleAutoSave,
        replicaBody,
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
        applyDocumentChange: applyChange,
        linkCharacter,
        unlinkCharacter,
        renameCharacter,
    };
};
