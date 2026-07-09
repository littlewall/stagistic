import {
    normalizeCharacterKey,
} from '@stagistic/script';
import {type Node as ProseMirrorNode} from '@tiptap/pm/model';

import {isScriptBlockNodeName} from '../tiptap/scriptCore';

export type CharacterRefByKey = Record<string, string>;

export const isCharacterBlockType = (value: unknown): boolean => {
    return value === 'character';
};

export const readNormalizedRefsFromRaw = (rawRefs: unknown): CharacterRefByKey => {
    const normalized: CharacterRefByKey = {};

    if (!rawRefs || typeof rawRefs !== 'object') {
        return normalized;
    }

    Object.entries(rawRefs as Record<string, unknown>).forEach(([rawKey, rawCharacterId]) => {
        if (typeof rawCharacterId !== 'string' || rawCharacterId.length === 0) {
            return;
        }

        const normalizedKey = normalizeCharacterKey(rawKey);

        if (!normalizedKey) {
            return;
        }

        normalized[normalizedKey] = rawCharacterId;
    });

    return normalized;
};

export const readNormalizedRefsFromAttrs = (
    attrs: Record<string, unknown> | null | undefined,
): CharacterRefByKey => {
    return readNormalizedRefsFromRaw(attrs?.characterRefs);
};

export const writeRefsToNodeAttrs = (
    attrs: Record<string, unknown>,
    refsByKey: CharacterRefByKey,
): Record<string, unknown> => {
    return {
        ...attrs,
        characterRefs: Object.keys(refsByKey).length > 0 ? refsByKey : null,
    };
};

export const areCharacterRefsEqual = (
    left: CharacterRefByKey,
    right: CharacterRefByKey,
): boolean => {
    const leftEntries = Object.entries(left).sort((a, b) => a[0].localeCompare(b[0]));
    const rightEntries = Object.entries(right).sort((a, b) => a[0].localeCompare(b[0]));

    if (leftEntries.length !== rightEntries.length) {
        return false;
    }

    for (let index = 0; index < leftEntries.length; index += 1) {
        const leftEntry = leftEntries[index];
        const rightEntry = rightEntries[index];

        if (!rightEntry || leftEntry[0] !== rightEntry[0] || leftEntry[1] !== rightEntry[1]) {
            return false;
        }
    }

    return true;
};

export const isRawCharacterRefsNormalized = (rawRefs: unknown): boolean => {
    if (!rawRefs || typeof rawRefs !== 'object') {
        return false;
    }

    return Object.entries(rawRefs as Record<string, unknown>).every(([rawKey, rawCharacterId]) => {
        if (typeof rawCharacterId !== 'string' || rawCharacterId.length === 0) {
            return false;
        }

        const normalizedKey = normalizeCharacterKey(rawKey);

        return normalizedKey === rawKey;
    });
};

interface VisitCharacterBlocksArgs {
    doc: ProseMirrorNode,
    onCharacterBlock: (node: ProseMirrorNode, pos: number) => boolean | void,
}

export const visitCharacterBlocks = ({
    doc,
    onCharacterBlock,
}: VisitCharacterBlocksArgs) => {
    doc.descendants((node, pos) => {
        if (!isScriptBlockNodeName(node.type.name)) {
            return true;
        }

        if (!isCharacterBlockType(node.attrs.blockType)) {
            return false;
        }

        const result = onCharacterBlock(node, pos);

        if (typeof result === 'boolean') {
            return result;
        }

        return false;
    });
};
