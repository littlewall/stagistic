import {
    ELEMENT_CHARACTER,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    normalizeCharacterKey,
    splitCharacterTokens,
} from '@stagistic/editor-core';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import {
    type EditorState,
    Plugin,
    PluginKey,
    TextSelection,
    type Transaction,
} from '@tiptap/pm/state';
import {
    Decoration,
    DecorationSet,
} from '@tiptap/pm/view';

import {getCharacterColor} from '../../characterColors';
import {
    FOUNTAIN_BLOCK_NODE_NAME,
    type FountainBlockType,
    getActiveFountainBlockFromState,
    normalizeFountainBlockType,
} from '../fountainCore';
import styles from './CharacterTagDecorations.module.css';

const characterTagDecorationsKey = new PluginKey('fountain-character-tag-decorations');

const isCharacterBlockType = (value: FountainBlockType) => {
    return value === ELEMENT_CHARACTER || value === ELEMENT_DUAL_DIALOGUE_CHARACTER;
};

type CharacterBlockRange = {
    from: number,
    to: number,
    text: string,
};

type CharacterCleanupEdit = {
    from: number,
    to: number,
    cleaned: string,
};

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

const findCharacterBlockRangeById = (
    state: EditorState,
    blockId: string,
): CharacterBlockRange | null => {
    let found: CharacterBlockRange | null = null;

    state.doc.descendants((node, pos) => {
        if (node.type.name !== FOUNTAIN_BLOCK_NODE_NAME) {
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

const findCharacterBlockRangeAtPosition = (
    state: EditorState,
    position: number,
): CharacterBlockRange | null => {
    const safePosition = Math.max(1, Math.min(position, state.doc.content.size));
    const $position = state.doc.resolve(safePosition);

    for (let depth = $position.depth; depth > 0; depth -= 1) {
        const node = $position.node(depth);

        if (node.type.name !== FOUNTAIN_BLOCK_NODE_NAME) {
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

const getCharacterBlockLeftBySelection = (
    transactions: readonly Transaction[],
    oldState: EditorState,
    newState: EditorState,
): CharacterBlockRange | null => {
    const hasSelectionSet = transactions.some(transaction => transaction.selectionSet);

    if (!hasSelectionSet) {
        return null;
    }

    const previousBlock = getActiveFountainBlockFromState(oldState, FOUNTAIN_BLOCK_NODE_NAME);

    if (!previousBlock || !isCharacterBlockType(previousBlock.blockType)) {
        return null;
    }

    const nextBlock = getActiveFountainBlockFromState(newState, FOUNTAIN_BLOCK_NODE_NAME);

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

const buildDecorations = (doc: ProseMirrorNode) => {
    const decorations: Decoration[] = [];

    doc.descendants((node, pos) => {
        if (node.type.name !== FOUNTAIN_BLOCK_NODE_NAME) {
            return true;
        }

        const blockType = normalizeFountainBlockType(node.attrs.blockType);

        if (!isCharacterBlockType(blockType)) {
            return false;
        }

        const text = node.textContent ?? '';
        const blockStart = pos + 1;
        const tokens = splitCharacterTokens(text);

        tokens.forEach((token, index) => {
            if (token.valueStart < token.valueEnd) {
                const key = normalizeCharacterKey(token.value);
                const color = getCharacterColor(key);
                const decorationEnd = Math.max(token.valueEnd, token.end);

                decorations.push(Decoration.inline(
                    blockStart + token.valueStart,
                    blockStart + decorationEnd,
                    {
                        class: styles.characterTag,
                        style: `--character-tag-color: ${color};`,
                    },
                ));
            }

            if (index === tokens.length - 1) {
                return;
            }

            const plusOffset = token.end;

            if (plusOffset < 0 || plusOffset >= text.length || text[plusOffset] !== '+') {
                return;
            }

            decorations.push(Decoration.inline(
                blockStart + plusOffset,
                blockStart + plusOffset + 1,
                {
                    class: styles.characterSeparator,
                },
            ));
        });

        return false;
    });

    return DecorationSet.create(doc, decorations);
};

const cleanupCharacterDelimiters = (
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

export const createCharacterTagDecorationsPlugin = () => new Plugin({
    key: characterTagDecorationsKey,
    appendTransaction: (transactions, oldState, newState) => cleanupCharacterDelimiters(transactions, oldState, newState),
    props: {
        decorations: state => buildDecorations(state.doc),
    },
});
