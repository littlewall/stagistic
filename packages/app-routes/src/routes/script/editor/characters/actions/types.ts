import {type ScriptDocument} from '@stagistic/script-core';
import type {
    Dispatch,
    SetStateAction,
} from 'react';

import type {CharacterDomainSetters} from '../characterStateReducer';
import type {
    CharacterGenderOption,
    ScriptCharacterRecord,
} from '../types';
import type {ScriptRepository} from '../useScriptEditorCharacters.types';

export type SetScriptDocumentState = (value: ScriptDocument | null) => void;
export type SetScriptCharacterRecordsState = Dispatch<SetStateAction<ScriptCharacterRecord[]>>;
export type SetCharacterGenderOptionsState = Dispatch<SetStateAction<CharacterGenderOption[]>>;
export type SetStringArrayState = Dispatch<SetStateAction<string[]>>;

export interface CharacterActionSharedArgs {
    currentScriptId: string | null,
    scriptRepository: ScriptRepository,
    initialValue: ScriptDocument | null | undefined,
    getEditorValue: () => ScriptDocument | null,
    setEditorValue: SetScriptDocumentState,
    setEditorOverrideValue: SetScriptDocumentState,
    setConfirmedCharacterRecords: SetScriptCharacterRecordsState,
    handleAutoSave: (value: ScriptDocument) => Promise<boolean>,
}

export interface CharacterActionContext {
    currentScriptId: string | null,
    scriptRepository: ScriptRepository,
    initialValue: ScriptDocument | null | undefined,
    getEditorValue: () => ScriptDocument | null,
    setEditorValue: SetScriptDocumentState,
    setEditorOverrideValue: SetScriptDocumentState,
    setters: CharacterDomainSetters,
    handleAutoSave: (value: ScriptDocument) => Promise<boolean>,
}
