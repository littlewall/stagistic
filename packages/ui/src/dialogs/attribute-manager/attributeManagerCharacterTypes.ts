export interface AttributeManagerCharacter {
    id: string,
    name: string,
    color: string | null,
    outline: string | null,
    voiceType: string | null,
    vocalRangeLow: string | null,
    vocalRangeHigh: string | null,
    groupNames?: string[],
}

export interface AttributeManagerGroup {
    id: string,
    name: string,
    color: string | null,
    memberIds: string[],
    usageCount: number,
}

export type AttributeManagerCharacterWorkspaceId = 'characters' | 'groups';
export type WorkspaceId = AttributeManagerCharacterWorkspaceId | 'cast';

export interface AttributeManagerCharactersPanelProps {
    characters: AttributeManagerCharacter[],
    groups?: AttributeManagerGroup[],
    initialSelectedCharacterId?: string | null,
    initialSelectedGroupId?: string | null,
    initialWorkspaceId?: AttributeManagerCharacterWorkspaceId,
    isLoading?: boolean,
    draftScopeKey?: string | null,
    deletingCharacterIds?: string[],
    renamingCharacterIds?: string[],
    colorUpdatingCharacterIds?: string[],
    deletingGroupIds?: string[],
    renamingGroupIds?: string[],
    colorUpdatingGroupIds?: string[],
    onSetCharacterColor?: (characterId: string, colorHex: string | null) => void | Promise<unknown>,
    onSetCharacterOutline?: (characterId: string, outline: string | null) => void,
    onSetCharacterVoiceType?: (characterId: string, voiceType: string | null) => void,
    onSetCharacterVocalRange?: (characterId: string, vocalRangeLow: string | null, vocalRangeHigh: string | null) => void,
    onDeleteCharacter?: (characterId: string) => void,
    onCreateCharacter?: (characterName: string) => void,
    onRenameCharacter?: (characterId: string, previousName: string, nextName: string) => void | Promise<unknown>,
    onCreateGroup?: (groupName: string) => {id: string} | null | Promise<{id: string} | null>,
    onRenameGroup?: (groupId: string, previousName: string, nextName: string) => void | Promise<unknown>,
    onDeleteGroup?: (groupId: string) => void | Promise<unknown>,
    onSetGroupColor?: (groupId: string, colorHex: string | null) => void | Promise<unknown>,
    onChangeGroupMemberIds?: (groupId: string, memberIds: string[]) => void | Promise<unknown>,
}
