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
