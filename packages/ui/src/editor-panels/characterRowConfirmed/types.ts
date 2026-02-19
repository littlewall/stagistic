import type {
    CharacterGenderOption,
    EditorSidebarCharacter,
} from '../types';

export type CharacterRowConfirmedProps = {
    character: EditorSidebarCharacter,
    characterIdentityKey: string,
    isExpanded: boolean,
    isDeletePending: boolean,
    isRenamePending: boolean,
    renameDraft: string,
    onToggleExpanded: (key: string) => void,
    onRenameDraftChange: (characterId: string, characterKey: string, value: string) => void,
    onCommitRenameDraft: (characterId: string, characterKey: string) => void,
    onDeleteCharacter?: (characterId: string) => void | Promise<void>,
    onRenameCharacter?: (
        characterId: string,
        previousCharacterName: string,
        nextCharacterName: string,
    ) => void | Promise<void>,
    characterGenderOptions: CharacterGenderOption[],
    onSetCharacterColor?: (characterId: string, colorHex: string | null) => void,
    onSetCharacterGender?: (characterId: string, genderKey: string | null) => void,
    onUpsertCharacterGender?: (label: string) => Promise<CharacterGenderOption | null>,
    characterColorSaturation?: number,
};

export type CharacterGenderIcon = 'male' | 'female' | 'neutral';

export type GenderListOption = CharacterGenderOption & {
    isUnspecified?: boolean,
};
