import {
    type EditorState,
    type Transaction,
} from '@tiptap/pm/state';

import {
    getActiveFountainBlockFromState,
    isFountainBlockNodeName,
    normalizeFountainBlockType,
} from '../../fountainCore';
import {
    type CharacterBlockRange,
    isCharacterBlockType,
} from './types';

export const findCharacterBlockRangeById = (
    state: EditorState,
    blockId: string,
): CharacterBlockRange | null => {
    let found: CharacterBlockRange | null = null;

    state.doc.descendants((node, pos) => {
        if (!isFountainBlockNodeName(node.type.name)) {
            return true;
        }

        if (node.attrs.id !== blockId) {
            return false;
        }

        const blockType = normalizeFountainBlockType(node.attrs.blockType);

        if (!isCharacterBlockType(blockType)) {
            return false;
        }

        found = {
            from: pos + 1,
            to: pos + node.nodeSize - 1,
            text: node.textContent ?? '',
        };

        return false;
    });

    return found;
};

export const findCharacterBlockRangeAtPosition = (
    state: EditorState,
    position: number,
): CharacterBlockRange | null => {
    const safePosition = Math.max(1, Math.min(position, state.doc.content.size));
    const $position = state.doc.resolve(safePosition);

    for (let depth = $position.depth; depth > 0; depth -= 1) {
        const node = $position.node(depth);

        if (!isFountainBlockNodeName(node.type.name)) {
            continue;
        }

        const blockType = normalizeFountainBlockType(node.attrs.blockType);

        if (!isCharacterBlockType(blockType)) {
            return null;
        }

        const blockPos = $position.before(depth);

        return {
            from: blockPos + 1,
            to: blockPos + node.nodeSize - 1,
            text: node.textContent ?? '',
        };
    }

    return null;
};

export const getCharacterBlockLeftBySelection = (
    transactions: readonly Transaction[],
    oldState: EditorState,
    newState: EditorState,
): CharacterBlockRange | null => {
    const hasSelectionSet = transactions.some(transaction => transaction.selectionSet);

    if (!hasSelectionSet) {
        return null;
    }

    const previousBlock = getActiveFountainBlockFromState(oldState);

    if (!previousBlock || !isCharacterBlockType(previousBlock.blockType)) {
        return null;
    }

    const nextBlock = getActiveFountainBlockFromState(newState);

    if (nextBlock?.id === previousBlock.id) {
        return null;
    }

    const byId = findCharacterBlockRangeById(newState, previousBlock.id);

    if (byId) {
        return byId;
    }

    let mappedFrom = previousBlock.from;

    transactions.forEach(transaction => {
        mappedFrom = transaction.mapping.map(mappedFrom, -1);
    });

    return findCharacterBlockRangeAtPosition(newState, mappedFrom);
};
