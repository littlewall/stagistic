import {
    type EditorValueChangeMeta,
} from '@stagistic/editor-ui';
import {
    type ScriptDocument,
} from '@stagistic/script-core';
import {
    type Dispatch,
    type SetStateAction,
    useCallback,
    useEffect,
    useMemo,
    useReducer,
    useState,
} from 'react';

import {
    type CharacterDomainSetters,
    type CharacterDomainState,
    characterStateReducer,
    createCharacterDomainSetters,
    replaceCharacterDomainState,
} from './characterStateReducer';
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

export interface CharacterEditorState {
    editorValue: ScriptDocument | null,
    sidebarValue: ScriptDocument | null,
    setEditorValue: Dispatch<SetStateAction<ScriptDocument | null>>,
    editorOverrideValue: ScriptDocument | null,
    setEditorOverrideValue: Dispatch<SetStateAction<ScriptDocument | null>>,
    handleEditorValueChange: (value: ScriptDocument, meta?: EditorValueChangeMeta) => void,
}

export interface CharacterCollectionsState {
    confirmedCharacterRecords: ScriptCharacterRecord[],
    characterGenderOptions: CharacterGenderOption[],
    isCharactersLoading: boolean,
}

export interface CharacterPendingState {
    confirmingCharacterKeys: string[],
    deletingCharacterIds: string[],
    renamingCharacterIds: string[],
    renamingCharacterKeys: string[],
    colorUpdatingCharacterIds: string[],
    genderUpdatingCharacterIds: string[],
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

const createInitialCharacterDomainState = (): CharacterDomainState => {
    return {
        confirmedCharacterRecords: [],
        confirmingCharacterKeys: [],
        deletingCharacterIds: [],
        renamingCharacterIds: [],
        renamingCharacterKeys: [],
        colorUpdatingCharacterIds: [],
        genderUpdatingCharacterIds: [],
        characterGenderOptions: DEFAULT_CHARACTER_GENDER_OPTIONS,
        isCharactersLoading: false,
    };
};

export interface CharacterState {
    editor: CharacterEditorState,
    characters: CharacterCollectionsState,
    pending: CharacterPendingState,
    setters: CharacterDomainSetters,
}

export const useCharacterState = ({
    currentScriptId,
    scriptRepository,
    initialValue,
}: UseCharacterStateArgs): CharacterState => {
    const [editorValue, setEditorValue] = useState<ScriptDocument | null>(null);
    const [sidebarValue, setSidebarValue] = useState<ScriptDocument | null>(null);
    const [editorOverrideValue, setEditorOverrideValue] = useState<ScriptDocument | null>(null);
    const [characterDomainState, dispatchCharacterDomainState] = useReducer(
        characterStateReducer,
        undefined,
        createInitialCharacterDomainState,
    );
    const setters = useMemo(
        () => createCharacterDomainSetters(dispatchCharacterDomainState),
        [],
    );
    const {
        confirmedCharacterRecords,
        confirmingCharacterKeys,
        deletingCharacterIds,
        renamingCharacterIds,
        renamingCharacterKeys,
        colorUpdatingCharacterIds,
        genderUpdatingCharacterIds,
        characterGenderOptions,
        isCharactersLoading,
    } = characterDomainState;

    useEffect(() => {
        setEditorValue(initialValue ?? null);
        setSidebarValue(initialValue ?? null);
        setEditorOverrideValue(null);
    }, [currentScriptId, initialValue]);

    useEffect(() => {
        if (!currentScriptId) {
            replaceCharacterDomainState(dispatchCharacterDomainState, createInitialCharacterDomainState());

            return;
        }

        let isActive = true;

        replaceCharacterDomainState(dispatchCharacterDomainState, {
            ...createInitialCharacterDomainState(),
            isCharactersLoading: true,
        });

        const loadCharacters = async () => {
            try {
                const listCharactersRequest = scriptRepository.listScriptCharacters(currentScriptId);
                const listGendersRequest = scriptRepository.listScriptCharacterGenders(currentScriptId);
                const [storedCharacters, storedGenderOptions] = await Promise.all([listCharactersRequest, listGendersRequest]);

                if (!isActive) {
                    return;
                }

                setters.setConfirmedCharacterRecords(storedCharacters);
                setters.setCharacterGenderOptions(mergeCharacterGenderOptions(storedGenderOptions));
            } catch (error) {
                if (!isActive) {
                    return;
                }

                console.error('Failed to load script characters', error);
                setters.setConfirmedCharacterRecords([]);
                setters.setCharacterGenderOptions(DEFAULT_CHARACTER_GENDER_OPTIONS);
            } finally {
                if (isActive) {
                    setters.setIsCharactersLoading(false);
                }
            }
        };

        void loadCharacters();

        return () => {
            isActive = false;
        };
    }, [
        currentScriptId,
        scriptRepository,
        setters,
    ]);

    const handleEditorValueChange = useCallback((value: ScriptDocument) => {
        setEditorValue(value);
        setSidebarValue(value);
    }, []);

    return {
        editor: {
            editorValue,
            sidebarValue,
            setEditorValue,
            editorOverrideValue,
            setEditorOverrideValue,
            handleEditorValueChange,
        },
        characters: {
            confirmedCharacterRecords,
            characterGenderOptions,
            isCharactersLoading,
        },
        pending: {
            confirmingCharacterKeys,
            deletingCharacterIds,
            renamingCharacterIds,
            renamingCharacterKeys,
            colorUpdatingCharacterIds,
            genderUpdatingCharacterIds,
        },
        setters,
    };
};
