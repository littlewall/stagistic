import {
    CHARACTER_TAG_ID_ATTR,
    CHARACTER_TAG_KEY_ATTR,
    CHARACTER_TAG_MARK_NAME,
} from '@stagistic/script';
import {Mark, mergeAttributes} from '@tiptap/core';

import {
    getCharacterTagIdClassName,
    getCharacterTagKeyClassName,
} from '../../characters/characterColors';

export interface CharacterTagMarkOptions {
    /** Class applied to every tag span (shared with cue decorations). */
    tagClassName: string,
}

const resolveIdentityClassName = (characterKey: string, characterId: string | null) => {
    if (characterId) {
        return getCharacterTagIdClassName(characterId);
    }

    return characterKey ? getCharacterTagKeyClassName(characterKey) : '';
};

export const CharacterTagMark = Mark.create<CharacterTagMarkOptions>({
    name: CHARACTER_TAG_MARK_NAME,
    inclusive: false,
    excludes: '',

    addOptions() {
        return {tagClassName: 'characterTag'};
    },

    addAttributes() {
        return {
            [CHARACTER_TAG_KEY_ATTR]: {
                default: '',
                parseHTML: element => element.getAttribute('data-character-key') ?? '',
                renderHTML: () => ({}),
            },
            [CHARACTER_TAG_ID_ATTR]: {
                default: null,
                parseHTML: element => element.getAttribute('data-character-id'),
                renderHTML: () => ({}),
            },
        };
    },

    parseHTML() {
        return [{tag: 'span[data-character-key]'}];
    },

    renderHTML({HTMLAttributes, mark}) {
        const characterKey = String(mark.attrs[CHARACTER_TAG_KEY_ATTR] ?? '');
        const rawId: unknown = mark.attrs[CHARACTER_TAG_ID_ATTR];
        const characterId = typeof rawId === 'string' && rawId.length > 0 ? rawId : null;
        const identityClassName = resolveIdentityClassName(characterKey, characterId);
        const className = [this.options.tagClassName, identityClassName].filter(Boolean).join(' ');
        const attributes: Record<string, string> = {
            class: className,
            'data-character-key': characterKey,
        };

        if (characterId) {
            attributes['data-character-id'] = characterId;
        }

        return [
            'span',
            mergeAttributes(HTMLAttributes, attributes),
            0,
        ];
    },
});
