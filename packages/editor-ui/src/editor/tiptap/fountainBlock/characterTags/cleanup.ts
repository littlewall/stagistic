import {splitCharacterTokens} from '@stagistic/script-core';
import {
    type EditorState,
    TextSelection,
    type Transaction,
} from '@tiptap/pm/state';

import {
    FOUNTAIN_BLOCK_NODE_NAME,
    normalizeFountainBlockType,
} from '../../fountainCore';
import {
    findCharacterBlockRangeById,
    getCharacterBlockLeftBySelection,
} from './rangeResolvers';
import {
    type CharacterBlockRange,
    type CharacterCleanupEdit,
    isCharacterBlockType,
} from './types';

const buildCharacterCleanupEdit = (range: CharacterBlockRange): CharacterCleanupEdit | null => {
    const cleaned = splitCharacterTokens(range.text)
        .map(token => token.value)
        .filter(value => value.length > 0)
        .join('+');

    if (cleaned === range.text) {
        return null;
    }

    return {
        from: range.from,
        to: range.to,
        cleaned,
    };
};

const resolveSafeRange = (maxPos: number, from: number, to: number): {from: number, to: number} | null => {
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

const collectCharacterBlockIdsInRange = (
    state: EditorState,
    from: number,
    to: number,
    blockIds: Set<string>,
) => {
    const safeRange = resolveSafeRange(state.doc.content.size, from, to);

    if (!safeRange) {
        return;
    }

    state.doc.nodesBetween(safeRange.from, safeRange.to, node => {
        if (node.type.name !== FOUNTAIN_BLOCK_NODE_NAME) {
            return true;
        }

        const blockType = normalizeFountainBlockType(node.attrs.blockType);

        if (!isCharacterBlockType(blockType)) {
            return false;
        }

        const blockId = typeof node.attrs.id === 'string' ? node.attrs.id : null;

        if (blockId) {
            blockIds.add(blockId);
        }

        return false;
    });
};

const collectCharacterBlockRangesInRange = (
    state: EditorState,
    from: number,
    to: number,
    rangesByKey: Map<string, CharacterBlockRange>,
) => {
    const safeRange = resolveSafeRange(state.doc.content.size, from, to);

    if (!safeRange) {
        return;
    }

    state.doc.nodesBetween(safeRange.from, safeRange.to, (node, pos) => {
        if (node.type.name !== FOUNTAIN_BLOCK_NODE_NAME) {
            return true;
        }

        const blockType = normalizeFountainBlockType(node.attrs.blockType);

        if (!isCharacterBlockType(blockType)) {
            return false;
        }

        const fromPos = pos + 1;
        const toPos = pos + node.nodeSize - 1;
        const blockId = typeof node.attrs.id === 'string' ? node.attrs.id : '';
        const rangeKey = blockId.length > 0 ? blockId : `${fromPos}:${toPos}`;

        rangesByKey.set(rangeKey, {
            from: fromPos,
            to: toPos,
            text: node.textContent ?? '',
        });

        return false;
    });
};

export const cleanupCharacterDelimiters = (
    transactions: readonly Transaction[],
    oldState: EditorState,
    newState: EditorState,
) => {
    const hasDeleteEvent = transactions.some(transaction => transaction.getMeta('uiEvent') === 'delete');
    const blockLeftBySelection = getCharacterBlockLeftBySelection(transactions, oldState, newState);

    if (!hasDeleteEvent && !blockLeftBySelection) {
        return null;
    }

    const edits: CharacterCleanupEdit[] = [];

    if (hasDeleteEvent) {
        const touchedOldBlockIds = new Set<string>();
        const touchedRangesByKey = new Map<string, CharacterBlockRange>();

        transactions.forEach(transaction => {
            if (!transaction.docChanged) {
                return;
            }

            transaction.mapping.maps.forEach(stepMap => {
                stepMap.forEach((oldStart, oldEnd, newStart, newEnd) => {
                    const oldFrom = Math.max(0, oldStart - 1);
                    const oldTo = Math.max(oldFrom + 1, oldEnd + 1);
                    const newFrom = Math.max(0, newStart - 1);
                    const newTo = Math.max(newFrom + 1, newEnd + 1);

                    collectCharacterBlockIdsInRange(oldState, oldFrom, oldTo, touchedOldBlockIds);
                    collectCharacterBlockRangesInRange(newState, newFrom, newTo, touchedRangesByKey);
                });
            });
        });

        touchedOldBlockIds.forEach(blockId => {
            const range = findCharacterBlockRangeById(newState, blockId);

            if (!range) {
                return;
            }

            touchedRangesByKey.set(blockId, range);
        });

        touchedRangesByKey.forEach(range => {
            const edit = buildCharacterCleanupEdit(range);

            if (!edit) {
                return;
            }

            edits.push(edit);
        });
    }

    if (blockLeftBySelection) {
        const edit = buildCharacterCleanupEdit(blockLeftBySelection);

        if (edit) {
            edits.push(edit);
        }
    }

    if (edits.length === 0) {
        return null;
    }

    let tr = newState.tr;
    const seenRanges = new Set<string>();

    edits
        .sort((a, b) => b.from - a.from)
        .forEach(edit => {
            const rangeKey = `${edit.from}:${edit.to}`;

            if (seenRanges.has(rangeKey)) {
                return;
            }

            seenRanges.add(rangeKey);
            tr = tr.insertText(edit.cleaned, edit.from, edit.to);
        });

    const mappedSelection = tr.mapping.map(newState.selection.from, -1);
    const safePosition = Math.max(1, Math.min(mappedSelection, tr.doc.content.size));

    tr = tr.setSelection(TextSelection.near(tr.doc.resolve(safePosition), -1));

    return tr;
};

export const findCharacterRangeById = findCharacterBlockRangeById;
