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
        newState.doc.descendants((node, pos) => {
            if (node.type.name !== FOUNTAIN_BLOCK_NODE_NAME) {
                return true;
            }

            const blockType = normalizeFountainBlockType(node.attrs.blockType);

            if (!isCharacterBlockType(blockType)) {
                return false;
            }

            const text = node.textContent ?? '';
            const tokens = splitCharacterTokens(text);
            const hasEmptyToken = tokens.some(token => token.value.length === 0);

            if (!hasEmptyToken) {
                return false;
            }

            const edit = buildCharacterCleanupEdit({
                from: pos + 1,
                to: pos + node.nodeSize - 1,
                text,
            });

            if (edit) {
                edits.push(edit);
            }

            return false;
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
