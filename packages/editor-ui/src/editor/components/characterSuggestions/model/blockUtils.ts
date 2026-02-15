import {
    ELEMENT_CHARACTER,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    extractCharacterKeys,
    normalizeCharacterKey,
} from '@stagistic/script-core';
import type {Editor as TiptapEditor} from '@tiptap/react';

import {
    FOUNTAIN_BLOCK_NODE_NAME,
    type FountainBlockType,
    normalizeFountainBlockType,
} from '../../../tiptap/fountainCore';
import type {PersistentCharacterRef} from '../types';

export const isCharacterBlockType = (value: FountainBlockType) => {
    return value === ELEMENT_CHARACTER || value === ELEMENT_DUAL_DIALOGUE_CHARACTER;
};

export const collectCharacterCounts = (
    editor: TiptapEditor,
    persistentCharacters: readonly PersistentCharacterRef[],
) => {
    const counts = new Map<string, number>();

    persistentCharacters.forEach(character => {
        const key = normalizeCharacterKey(character.key);

        if (key.length > 0 && !counts.has(key)) {
            counts.set(key, 0);
        }
    });

    editor.state.doc.descendants(node => {
        if (node.type.name !== FOUNTAIN_BLOCK_NODE_NAME) {
            return true;
        }

        const blockType = normalizeFountainBlockType(node.attrs.blockType);

        if (!isCharacterBlockType(blockType)) {
            return false;
        }

        extractCharacterKeys(node.textContent ?? '').forEach(key => {
            counts.set(key, (counts.get(key) ?? 0) + 1);
        });

        return false;
    });

    return counts;
};
