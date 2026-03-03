import type {
    CharacterGenderOption,
    ScriptCharacterRecord,
} from '@stagistic/script-core';

export interface EditorSidebarCharacter extends Pick<ScriptCharacterRecord, 'key'>, Partial<Pick<ScriptCharacterRecord, 'id' | 'colorHex' | 'genderKey'>> {
    color: string,
    isConfirmed: boolean,
    isPending?: boolean,
    isConfirmPending?: boolean,
    isDeletePending?: boolean,
    isRenamePending?: boolean,
    isColorUpdatePending?: boolean,
    isGenderUpdatePending?: boolean,
}

export type {CharacterGenderOption};
