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

export type SetScriptCharacterRecordsState = Dispatch<SetStateAction<ScriptCharacterRecord[]>>;
export type SetCharacterGenderOptionsState = Dispatch<SetStateAction<CharacterGenderOption[]>>;
export type SetStringArrayState = Dispatch<SetStateAction<string[]>>;

export interface ConfirmEditorCallbacks {
    onLinkRef: (characterKey: string, characterId: string) => void,
}

export interface DeleteEditorCallbacks {
    onUnlinkRef: (characterId: string) => void,
}

export interface RenameEditorCallbacks {
    onRenameText: (characterId: string, newName: string) => void,
    onReplaceId: (oldId: string, newId: string) => void,
}

export interface RenamePreviewEditorCallbacks {
    onRenameText: (characterId: string, newName: string) => void,
}

export interface CharacterActionSharedArgs {
    currentScriptId: string | null,
    scriptRepository: ScriptRepository,
    setConfirmedCharacterRecords: SetScriptCharacterRecordsState,
}

export interface CharacterActionContext {
    currentScriptId: string | null,
    scriptRepository: ScriptRepository,
    setters: CharacterDomainSetters,
}
