import type {CharacterCountItem as EditorSidebarCharacter} from '@stagistic/script-core';

export const isInlineInteractiveTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    return Boolean(target.closest('button, input, textarea, [contenteditable="true"]'));
};

export const getRenameDraftKey = (characterId: string | undefined, characterKey: string) => {
    return characterId && characterId.length > 0
        ? `id:${characterId}`
        : `key:${characterKey}`;
};

export const getCharacterIdentityKey = (character: EditorSidebarCharacter) => {
    return character.id && character.id.length > 0
        ? `id:${character.id}`
        : `key:${character.key}`;
};
