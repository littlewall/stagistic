import {
    type ScriptDocument,
} from '@stagistic/script-core';
import {
    type Dispatch,
    type SetStateAction,
    useCallback,
    useEffect,
    useState,
} from 'react';

import type {ScriptCharacterRecord} from './types';
import type {ScriptRepository} from './useScriptEditorCharacters.types';

type UseCharacterStateArgs = {
    currentScriptId: string | null,
    scriptRepository: ScriptRepository,
    initialValue: ScriptDocument | null | undefined,
};

export type CharacterState = {
    editorValue: ScriptDocument | null,
    setEditorValue: Dispatch<SetStateAction<ScriptDocument | null>>,
    editorOverrideValue: ScriptDocument | null,
    setEditorOverrideValue: Dispatch<SetStateAction<ScriptDocument | null>>,
    confirmedCharacterRecords: ScriptCharacterRecord[],
    setConfirmedCharacterRecords: Dispatch<SetStateAction<ScriptCharacterRecord[]>>,
    confirmingCharacterKeys: string[],
    setConfirmingCharacterKeys: Dispatch<SetStateAction<string[]>>,
    deletingCharacterIds: string[],
    setDeletingCharacterIds: Dispatch<SetStateAction<string[]>>,
    renamingCharacterIds: string[],
    setRenamingCharacterIds: Dispatch<SetStateAction<string[]>>,
    renamingCharacterKeys: string[],
    setRenamingCharacterKeys: Dispatch<SetStateAction<string[]>>,
    isCharactersLoading: boolean,
    handleEditorValueChange: (value: ScriptDocument) => void,
};

export const useCharacterState = ({
    currentScriptId,
    scriptRepository,
    initialValue,
}: UseCharacterStateArgs): CharacterState => {
    const [editorValue, setEditorValue] = useState<ScriptDocument | null>(null);
    const [editorOverrideValue, setEditorOverrideValue] = useState<ScriptDocument | null>(null);
    const [confirmedCharacterRecords, setConfirmedCharacterRecords] = useState<ScriptCharacterRecord[]>([]);
    const [confirmingCharacterKeys, setConfirmingCharacterKeys] = useState<string[]>([]);
    const [deletingCharacterIds, setDeletingCharacterIds] = useState<string[]>([]);
    const [renamingCharacterIds, setRenamingCharacterIds] = useState<string[]>([]);
    const [renamingCharacterKeys, setRenamingCharacterKeys] = useState<string[]>([]);
    const [isCharactersLoading, setIsCharactersLoading] = useState(false);

    useEffect(() => {
        setEditorValue(initialValue ?? null);
        setEditorOverrideValue(null);
    }, [currentScriptId, initialValue]);

    useEffect(() => {
        if (!currentScriptId) {
            setConfirmedCharacterRecords([]);
            setConfirmingCharacterKeys([]);
            setDeletingCharacterIds([]);
            setRenamingCharacterIds([]);
            setRenamingCharacterKeys([]);
            setIsCharactersLoading(false);

            return;
        }

        let isActive = true;

        setIsCharactersLoading(true);
        setConfirmingCharacterKeys([]);
        setDeletingCharacterIds([]);
        setRenamingCharacterIds([]);
        setRenamingCharacterKeys([]);

        const loadCharacters = async () => {
            try {
                const storedCharacters = await scriptRepository.listScriptCharacters(currentScriptId);

                if (!isActive) {
                    return;
                }

                setConfirmedCharacterRecords(storedCharacters);
            } catch (error) {
                if (!isActive) {
                    return;
                }

                console.error('Failed to load script characters', error);
                setConfirmedCharacterRecords([]);
            } finally {
                if (isActive) {
                    setIsCharactersLoading(false);
                }
            }
        };

        void loadCharacters();

        return () => {
            isActive = false;
        };
    }, [currentScriptId, scriptRepository]);

    const handleEditorValueChange = useCallback((value: ScriptDocument) => {
        setEditorValue(value);
    }, []);

    return {
        editorValue,
        setEditorValue,
        editorOverrideValue,
        setEditorOverrideValue,
        confirmedCharacterRecords,
        setConfirmedCharacterRecords,
        confirmingCharacterKeys,
        setConfirmingCharacterKeys,
        deletingCharacterIds,
        setDeletingCharacterIds,
        renamingCharacterIds,
        setRenamingCharacterIds,
        renamingCharacterKeys,
        setRenamingCharacterKeys,
        isCharactersLoading,
        handleEditorValueChange,
    };
};
