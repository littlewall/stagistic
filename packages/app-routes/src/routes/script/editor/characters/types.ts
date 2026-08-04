export type {
    CharacterGenderOption,
    ScriptCharacterRecord,
} from '@stagistic/script';
export type {EditorSidebarCharacter} from '@stagistic/ui';

export interface ScriptCharacterGroupRecord {
    id: string,
    kind: 'group',
    key: string,
    colorHex: string | null,
    memberIds: string[],
}
