import {CHARACTER_TAG_MARK_NAME} from '@stagistic/script';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import type {
    EditorState,
    Transaction,
} from '@tiptap/pm/state';

import {
    type BlockNodeType,
    getActiveScriptBlockFromState,
    isScriptBlockNodeName,
    normalizeBlockNodeType,
} from '../tiptap/scriptCore';

interface ChangedRange {
    oldFrom: number,
    oldTo: number,
    newFrom: number,
    newTo: number,
}

const isCharacterBlockType = (blockType: BlockNodeType) => {
    return blockType === 'character';
};

const isStructureBlockType = (blockType: BlockNodeType) => {
    return blockType === 'act' || blockType === 'scene';
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
    predicate: (blockType: BlockNodeType) => boolean,
) => {
    const safeRange = resolveSafeRange(doc.content.size, from, to);

    if (!safeRange) {
        return false;
    }

    let found = false;

    doc.nodesBetween(safeRange.from, safeRange.to, node => {
        if (!isScriptBlockNodeName(node.type.name)) {
            return true;
        }

        if (predicate(normalizeBlockNodeType(node.attrs.blockType))) {
            found = true;
        }

        return false;
    });

    return found;
};

const hasScriptBlockNode = (value: unknown): boolean => {
    if (!value) {
        return false;
    }

    if (Array.isArray(value)) {
        return value.some(item => hasScriptBlockNode(item));
    }

    if (typeof value !== 'object') {
        return false;
    }

    const record = value as Record<string, unknown>;

    if (isScriptBlockNodeName(record.type)) {
        return true;
    }

    return hasScriptBlockNode(record.content) || hasScriptBlockNode(record.slice);
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

        return hasScriptBlockNode(serialized.slice);
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

const rangeHasCharacterTagMark = (
    doc: ProseMirrorNode,
    from: number,
    to: number,
) => {
    const markType = doc.type.schema.marks[CHARACTER_TAG_MARK_NAME];

    if (!markType) {
        return false;
    }

    const safeRange = resolveSafeRange(doc.content.size, from, to);

    if (!safeRange) {
        return false;
    }

    return doc.rangeHasMark(safeRange.from, safeRange.to, markType);
};

/**
 * True when a transaction adds, removes, or edits a `characterTag` mark.
 * Character tags live in stage directions (not character blocks), so the
 * character-block guards miss them — the sidebar roster needs this to refresh
 * on tag commit / edit / unlink.
 */
export const transactionTouchesCharacterTags = (
    transaction: Transaction,
    oldDoc: ProseMirrorNode,
    newDoc: ProseMirrorNode,
) => {
    if (!transaction.docChanged) {
        return false;
    }

    return collectChangedRanges(transaction).some(range => {
        return rangeHasCharacterTagMark(oldDoc, range.oldFrom, range.oldTo)
            || rangeHasCharacterTagMark(newDoc, range.newFrom, range.newTo);
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

    const previousBlock = getActiveScriptBlockFromState(oldState);
    const nextBlock = getActiveScriptBlockFromState(newState);

    return Boolean(
        (previousBlock && isCharacterBlockType(previousBlock.blockType))
        || (nextBlock && isCharacterBlockType(nextBlock.blockType)),
    );
};
