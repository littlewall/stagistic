import {
    ELEMENT_CHARACTER,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    extractCharacterKeys,
    FOUNTAIN_BLOCK_NODE_NAME,
    normalizeCharacterKey,
} from '@stagistic/script-core';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';

import type {EditorLiveCharacterSnapshot} from '../contracts';

const EMPTY_CHARACTERS: EditorLiveCharacterSnapshot = {
    countsByKey: new Map<string, number>(),
    countsByCharacterId: new Map<string, number>(),
    keyByCharacterId: new Map<string, string>(),
};

const isCharacterBlockType = (blockType: string) => {
    return blockType === ELEMENT_CHARACTER || blockType === ELEMENT_DUAL_DIALOGUE_CHARACTER;
};

/**
 * Scans a ProseMirror document directly for character blocks
 * and builds a character snapshot with occurrence counts.
 *
 * This is intentionally independent of any ProseMirror plugin state
 * to avoid plugin initialization ordering issues.
 */
export const buildCharacterSnapshotFromDoc = (doc: ProseMirrorNode): EditorLiveCharacterSnapshot => {
    const countsByKey = new Map<string, number>();
    const countsByCharacterId = new Map<string, number>();
    const keyByCharacterId = new Map<string, string>();

    doc.descendants(node => {
        if (node.type.name !== FOUNTAIN_BLOCK_NODE_NAME) {
            return true;
        }

        const attrs = node.attrs as Record<string, unknown>;
        const blockType = typeof attrs.blockType === 'string'
            ? attrs.blockType
            : '';

        if (!isCharacterBlockType(blockType)) {
            return false;
        }

        const textContent = node.textContent.trim();

        if (!textContent) {
            return false;
        }

        const refsByKey = new Map<string, string>();
        const rawRefs = attrs.characterRefs;

        if (rawRefs && typeof rawRefs === 'object') {
            Object.entries(rawRefs as Record<string, unknown>).forEach(([rawKey, rawCharacterId]) => {
                const key = normalizeCharacterKey(rawKey);

                if (!key || typeof rawCharacterId !== 'string' || !rawCharacterId) {
                    return;
                }

                refsByKey.set(key, rawCharacterId);
            });
        }

        extractCharacterKeys(textContent).forEach(key => {
            countsByKey.set(key, (countsByKey.get(key) ?? 0) + 1);

            const characterId = refsByKey.get(key);

            if (characterId) {
                countsByCharacterId.set(characterId, (countsByCharacterId.get(characterId) ?? 0) + 1);
                keyByCharacterId.set(characterId, key);
            }
        });

        return false;
    });

    if (countsByKey.size === 0 && countsByCharacterId.size === 0) {
        return EMPTY_CHARACTERS;
    }

    return {
        countsByKey,
        countsByCharacterId,
        keyByCharacterId,
    };
};
