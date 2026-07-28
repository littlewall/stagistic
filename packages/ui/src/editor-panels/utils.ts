import type {EditorSidebarCharacter} from './types';

export const getCharacterIdentityKey = (character: EditorSidebarCharacter) => {
    return character.id && character.id.length > 0
        ? `id:${character.id}`
        : `key:${character.key}`;
};
