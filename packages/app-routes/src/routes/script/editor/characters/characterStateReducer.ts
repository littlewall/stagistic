import type {
    Dispatch,
    SetStateAction,
} from 'react';

import type {
    CharacterGenderOption,
    ScriptCharacterRecord,
} from './types';

export interface CharacterDomainState {
    confirmedCharacterRecords: ScriptCharacterRecord[],
    confirmingCharacterKeys: string[],
    deletingCharacterIds: string[],
    renamingCharacterIds: string[],
    renamingCharacterKeys: string[],
    colorUpdatingCharacterIds: string[],
    genderUpdatingCharacterIds: string[],
    characterGenderOptions: CharacterGenderOption[],
    isCharactersLoading: boolean,
}

interface ReplaceCharacterDomainStateAction {
    type: 'replaceCharacterDomainState',
    state: CharacterDomainState,
}

interface SetConfirmedCharacterRecordsAction {
    type: 'setConfirmedCharacterRecords',
    updater: SetStateAction<ScriptCharacterRecord[]>,
}

interface SetConfirmingCharacterKeysAction {
    type: 'setConfirmingCharacterKeys',
    updater: SetStateAction<string[]>,
}

interface SetDeletingCharacterIdsAction {
    type: 'setDeletingCharacterIds',
    updater: SetStateAction<string[]>,
}

interface SetRenamingCharacterIdsAction {
    type: 'setRenamingCharacterIds',
    updater: SetStateAction<string[]>,
}

interface SetRenamingCharacterKeysAction {
    type: 'setRenamingCharacterKeys',
    updater: SetStateAction<string[]>,
}

interface SetColorUpdatingCharacterIdsAction {
    type: 'setColorUpdatingCharacterIds',
    updater: SetStateAction<string[]>,
}

interface SetGenderUpdatingCharacterIdsAction {
    type: 'setGenderUpdatingCharacterIds',
    updater: SetStateAction<string[]>,
}

interface SetCharacterGenderOptionsAction {
    type: 'setCharacterGenderOptions',
    updater: SetStateAction<CharacterGenderOption[]>,
}

interface SetIsCharactersLoadingAction {
    type: 'setIsCharactersLoading',
    updater: SetStateAction<boolean>,
}

type CharacterDomainAction =
    | ReplaceCharacterDomainStateAction
    | SetConfirmedCharacterRecordsAction
    | SetConfirmingCharacterKeysAction
    | SetDeletingCharacterIdsAction
    | SetRenamingCharacterIdsAction
    | SetRenamingCharacterKeysAction
    | SetColorUpdatingCharacterIdsAction
    | SetGenderUpdatingCharacterIdsAction
    | SetCharacterGenderOptionsAction
    | SetIsCharactersLoadingAction;

const resolveUpdater = <T>(previous: T, updater: SetStateAction<T>) => {
    if (typeof updater === 'function') {
        return (updater as (current: T) => T)(previous);
    }

    return updater;
};

export const characterStateReducer = (
    state: CharacterDomainState,
    action: CharacterDomainAction,
): CharacterDomainState => {
    if (action.type === 'replaceCharacterDomainState') {
        return action.state;
    }

    if (action.type === 'setConfirmedCharacterRecords') {
        return {
            ...state,
            confirmedCharacterRecords: resolveUpdater(state.confirmedCharacterRecords, action.updater),
        };
    }

    if (action.type === 'setConfirmingCharacterKeys') {
        return {
            ...state,
            confirmingCharacterKeys: resolveUpdater(state.confirmingCharacterKeys, action.updater),
        };
    }

    if (action.type === 'setDeletingCharacterIds') {
        return {
            ...state,
            deletingCharacterIds: resolveUpdater(state.deletingCharacterIds, action.updater),
        };
    }

    if (action.type === 'setRenamingCharacterIds') {
        return {
            ...state,
            renamingCharacterIds: resolveUpdater(state.renamingCharacterIds, action.updater),
        };
    }

    if (action.type === 'setRenamingCharacterKeys') {
        return {
            ...state,
            renamingCharacterKeys: resolveUpdater(state.renamingCharacterKeys, action.updater),
        };
    }

    if (action.type === 'setColorUpdatingCharacterIds') {
        return {
            ...state,
            colorUpdatingCharacterIds: resolveUpdater(state.colorUpdatingCharacterIds, action.updater),
        };
    }

    if (action.type === 'setGenderUpdatingCharacterIds') {
        return {
            ...state,
            genderUpdatingCharacterIds: resolveUpdater(state.genderUpdatingCharacterIds, action.updater),
        };
    }

    if (action.type === 'setCharacterGenderOptions') {
        return {
            ...state,
            characterGenderOptions: resolveUpdater(state.characterGenderOptions, action.updater),
        };
    }

    return {
        ...state,
        isCharactersLoading: resolveUpdater(state.isCharactersLoading, action.updater),
    };
};

const dispatchSetter = <T>(dispatch: Dispatch<CharacterDomainAction>, type: CharacterDomainAction['type']) => {
    return (updater: SetStateAction<T>) => {
        dispatch({type, updater} as CharacterDomainAction);
    };
};

export interface CharacterDomainSetters {
    setConfirmedCharacterRecords: (updater: SetStateAction<ScriptCharacterRecord[]>) => void,
    setConfirmingCharacterKeys: (updater: SetStateAction<string[]>) => void,
    setDeletingCharacterIds: (updater: SetStateAction<string[]>) => void,
    setRenamingCharacterIds: (updater: SetStateAction<string[]>) => void,
    setRenamingCharacterKeys: (updater: SetStateAction<string[]>) => void,
    setColorUpdatingCharacterIds: (updater: SetStateAction<string[]>) => void,
    setGenderUpdatingCharacterIds: (updater: SetStateAction<string[]>) => void,
    setCharacterGenderOptions: (updater: SetStateAction<CharacterGenderOption[]>) => void,
    setIsCharactersLoading: (updater: SetStateAction<boolean>) => void,
}

export const createCharacterDomainSetters = (
    dispatch: Dispatch<CharacterDomainAction>,
): CharacterDomainSetters => {
    return {
        setConfirmedCharacterRecords: dispatchSetter(dispatch, 'setConfirmedCharacterRecords'),
        setConfirmingCharacterKeys: dispatchSetter(dispatch, 'setConfirmingCharacterKeys'),
        setDeletingCharacterIds: dispatchSetter(dispatch, 'setDeletingCharacterIds'),
        setRenamingCharacterIds: dispatchSetter(dispatch, 'setRenamingCharacterIds'),
        setRenamingCharacterKeys: dispatchSetter(dispatch, 'setRenamingCharacterKeys'),
        setColorUpdatingCharacterIds: dispatchSetter(dispatch, 'setColorUpdatingCharacterIds'),
        setGenderUpdatingCharacterIds: dispatchSetter(dispatch, 'setGenderUpdatingCharacterIds'),
        setCharacterGenderOptions: dispatchSetter(dispatch, 'setCharacterGenderOptions'),
        setIsCharactersLoading: dispatchSetter(dispatch, 'setIsCharactersLoading'),
    };
};

export const replaceCharacterDomainState = (
    dispatch: Dispatch<CharacterDomainAction>,
    state: CharacterDomainState,
) => {
    dispatch({
        type: 'replaceCharacterDomainState',
        state,
    });
};
