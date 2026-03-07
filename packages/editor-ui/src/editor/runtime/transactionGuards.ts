import {
    ELEMENT_ACT,
    ELEMENT_CHARACTER,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_SCENE_HEADING,
} from '@stagistic/script-core';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import type {
    EditorState,
    Transaction,
} from '@tiptap/pm/state';

import {
    type FountainBlockType,
    getActiveFountainBlockFromState,
    isFountainBlockNodeName,
    normalizeFountainBlockType,
} from '../tiptap/fountainCore';

interface ChangedRange {
    oldFrom: number,
    oldTo: number,
    newFrom: number,
    newTo: number,
}

const isCharacterBlockType = (blockType: FountainBlockType) => {
    return blockType === ELEMENT_CHARACTER || blockType === ELEMENT_DUAL_DIALOGUE_CHARACTER;
};

const isStructureBlockType = (blockType: FountainBlockType) => {
    return blockType === ELEMENT_ACT || blockType === ELEMENT_SCENE_HEADING;
};

const resolveSafeRange = (maxPos: number, from: number, to: number) => {
    const clampedFrom = Math.max(0, Math.min(from, maxPos));
    const clampedTo = Math.max(0, Math.min(to, maxPos));
    let safeFrom = Math.min(clampedFrom, clampedTo);
    let safeTo = Math.max(clampedFrom, clampedTo);

    if (safeFrom === safeTo && safeTo < maxPos) {
        safeTo += 1;
    }

    if (safeFrom === safeTo && safeFrom > 0) {
        safeFrom -= 1;
    }

    if (safeFrom === safeTo) {
        return null;
    }

    return {
        from: safeFrom,
        to: safeTo,
    };
};

export const collectChangedRanges = (transaction: Transaction): ChangedRange[] => {
    const ranges: ChangedRange[] = [];

    transaction.mapping.maps.forEach(stepMap => {
        stepMap.forEach((oldStart, oldEnd, newStart, newEnd) => {
            ranges.push({
                oldFrom: Math.max(0, oldStart - 1),
                oldTo: Math.max(oldEnd + 1, oldStart + 1),
                newFrom: Math.max(0, newStart - 1),
                newTo: Math.max(newEnd + 1, newStart + 1),
            });
        });
    });

    return ranges;
};

const hasMatchingBlocksInRange = (
    doc: ProseMirrorNode,
    from: number,
    to: number,
    predicate: (blockType: FountainBlockType) => boolean,
) => {
    const safeRange = resolveSafeRange(doc.content.size, from, to);

    if (!safeRange) {
        return false;
    }

    let found = false;

    doc.nodesBetween(safeRange.from, safeRange.to, node => {
        if (!isFountainBlockNodeName(node.type.name)) {
            return true;
        }

        if (predicate(normalizeFountainBlockType(node.attrs.blockType))) {
            found = true;
        }

        return false;
    });

    return found;
};

const hasFountainBlockNode = (value: unknown): boolean => {
    if (!value) {
        return false;
    }

    if (Array.isArray(value)) {
        return value.some(item => hasFountainBlockNode(item));
    }

    if (typeof value !== 'object') {
        return false;
    }

    const record = value as Record<string, unknown>;

    if (isFountainBlockNodeName(record.type)) {
        return true;
    }

    return hasFountainBlockNode(record.content) || hasFountainBlockNode(record.slice);
};

export const transactionMayAffectBlockStructure = (transaction: Transaction) => {
    if (!transaction.docChanged) {
        return false;
    }

    return transaction.steps.some(step => {
        const serialized = step.toJSON() as Record<string, unknown>;
        const stepType = typeof serialized.stepType === 'string' ? serialized.stepType : null;

        if (stepType !== 'replace' && stepType !== 'replaceAround') {
            return false;
        }

        return hasFountainBlockNode(serialized.slice);
    });
};

export const transactionTouchesCharacterBlocks = (
    transaction: Transaction,
    oldDoc: ProseMirrorNode,
    newDoc: ProseMirrorNode,
) => {
    if (!transaction.docChanged) {
        return false;
    }

    return collectChangedRanges(transaction).some(range => {
        return hasMatchingBlocksInRange(oldDoc, range.oldFrom, range.oldTo, isCharacterBlockType)
            || hasMatchingBlocksInRange(newDoc, range.newFrom, range.newTo, isCharacterBlockType);
    });
};

export const transactionTouchesStructureBlocks = (
    transaction: Transaction,
    oldDoc: ProseMirrorNode,
    newDoc: ProseMirrorNode,
) => {
    if (!transaction.docChanged) {
        return false;
    }

    if (transactionMayAffectBlockStructure(transaction)) {
        return true;
    }

    return collectChangedRanges(transaction).some(range => {
        return hasMatchingBlocksInRange(oldDoc, range.oldFrom, range.oldTo, isStructureBlockType)
            || hasMatchingBlocksInRange(newDoc, range.newFrom, range.newTo, isStructureBlockType);
    });
};

export const selectionTouchesCharacterBlock = (
    oldState: EditorState,
    newState: EditorState,
    transaction: Transaction,
) => {
    if (!transaction.selectionSet) {
        return false;
    }

    const previousBlock = getActiveFountainBlockFromState(oldState);
    const nextBlock = getActiveFountainBlockFromState(newState);

    return Boolean(
        (previousBlock && isCharacterBlockType(previousBlock.blockType))
        || (nextBlock && isCharacterBlockType(nextBlock.blockType)),
    );
};
