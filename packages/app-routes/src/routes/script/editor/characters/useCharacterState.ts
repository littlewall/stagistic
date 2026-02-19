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

import type {
    CharacterGenderOption,
    ScriptCharacterRecord,
} from './types';
import type {ScriptRepository} from './useScriptEditorCharacters.types';

interface UseCharacterStateArgs {
    currentScriptId: string | null,
    scriptRepository: ScriptRepository,
    initialValue: ScriptDocument | null | undefined,
}

export interface CharacterState {
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
    colorUpdatingCharacterIds: string[],
    setColorUpdatingCharacterIds: Dispatch<SetStateAction<string[]>>,
    genderUpdatingCharacterIds: string[],
    setGenderUpdatingCharacterIds: Dispatch<SetStateAction<string[]>>,
    characterGenderOptions: CharacterGenderOption[],
    setCharacterGenderOptions: Dispatch<SetStateAction<CharacterGenderOption[]>>,
    isCharactersLoading: boolean,
    handleEditorValueChange: (value: ScriptDocument) => void,
}

const DEFAULT_CHARACTER_GENDER_OPTIONS: CharacterGenderOption[] = [
    {
        id: 'default:male',
        key: 'male',
        label: 'Male',
    }, {
        id: 'default:female',
        key: 'female',
        label: 'Female',
    },
];

const mergeCharacterGenderOptions = (options: CharacterGenderOption[]): CharacterGenderOption[] => {
    const byKey = new Map<string, CharacterGenderOption>();

    DEFAULT_CHARACTER_GENDER_OPTIONS.forEach(option => {
        byKey.set(option.key, option);
    });
    options.forEach(option => {
        if (!option.key || !option.label) {
            return;
        }

        byKey.set(option.key, option);
    });

    return Array.from(byKey.values())
        .sort((a, b) => a.label.localeCompare(b.label));
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
    const [colorUpdatingCharacterIds, setColorUpdatingCharacterIds] = useState<string[]>([]);
    const [genderUpdatingCharacterIds, setGenderUpdatingCharacterIds] = useState<string[]>([]);
    const [characterGenderOptions, setCharacterGenderOptions] = useState<CharacterGenderOption[]>(
        DEFAULT_CHARACTER_GENDER_OPTIONS,
    );
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
            setColorUpdatingCharacterIds([]);
            setGenderUpdatingCharacterIds([]);
            setCharacterGenderOptions(DEFAULT_CHARACTER_GENDER_OPTIONS);
            setIsCharactersLoading(false);

            return;
        }

        let isActive = true;

        setIsCharactersLoading(true);
        setConfirmingCharacterKeys([]);
        setDeletingCharacterIds([]);
        setRenamingCharacterIds([]);
        setRenamingCharacterKeys([]);
        setColorUpdatingCharacterIds([]);
        setGenderUpdatingCharacterIds([]);

        const loadCharacters = async () => {
            try {
                const listCharactersRequest = scriptRepository.listScriptCharacters(currentScriptId);
                const listGendersRequest = scriptRepository.listScriptCharacterGenders(currentScriptId);
                const [storedCharacters, storedGenderOptions] = await Promise.all([listCharactersRequest, listGendersRequest]);

                if (!isActive) {
                    return;
                }

                setConfirmedCharacterRecords(storedCharacters);
                setCharacterGenderOptions(mergeCharacterGenderOptions(storedGenderOptions));
            } catch (error) {
                if (!isActive) {
                    return;
                }

                console.error('Failed to load script characters', error);
                setConfirmedCharacterRecords([]);
                setCharacterGenderOptions(DEFAULT_CHARACTER_GENDER_OPTIONS);
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
        colorUpdatingCharacterIds,
        setColorUpdatingCharacterIds,
        genderUpdatingCharacterIds,
        setGenderUpdatingCharacterIds,
        characterGenderOptions,
        setCharacterGenderOptions,
        isCharactersLoading,
        handleEditorValueChange,
    };
};
