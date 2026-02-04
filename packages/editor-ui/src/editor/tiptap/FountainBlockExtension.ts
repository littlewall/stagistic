import {
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_PARENTHETICAL,
} from '@stagistic/editor-core';
import {createNodeId} from '@stagistic/shared';
import {mergeAttributes, Node} from '@tiptap/core';
import type {NodeType} from '@tiptap/pm/model';
import {
    Plugin,
    PluginKey,
    TextSelection,
} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';

import {
    ensureFountainBlockId,
    FOUNTAIN_BLOCK_NODE_NAME,
    type FountainBlockType,
    getActiveFountainBlockFromState,
    getFountainBlockClassName,
    getNextTypeOnEnter,
    normalizeFountainBlockType,
} from './fountainCore';

const MAX_ACTION_INDENT = 3;

const getSelectionOffset = (editor: Editor, blockStart: number) => {
    const {from} = editor.state.selection;

    return Math.max(0, from - blockStart);
};

const isInsideParentheses = (text: string, offset: number) => {
    const before = text.slice(0, Math.max(0, offset));
    const lastOpen = before.lastIndexOf('(');
    const lastClose = before.lastIndexOf(')');

    return lastOpen > lastClose;
};

const insertParenPair = (editor: Editor, from: number, to: number) => {
    const tr = editor.state.tr.insertText('()', from, to);
    const nextSelection = from + 1;

    tr.setSelection(TextSelection.create(tr.doc, nextSelection));
    editor.view.dispatch(tr);
};

const updateBlockType = (editor: Editor, blockType: FountainBlockType, id?: string) => {
    const normalized = normalizeFountainBlockType(blockType);
    const attributes: Record<string, unknown> = {
        blockType: normalized,
    };

    if (id) {
        attributes.id = id;
    }

    return editor.commands.updateAttributes(FOUNTAIN_BLOCK_NODE_NAME, attributes);
};

const splitBlockWithType = (editor: Editor, blockType: FountainBlockType) => {
    const didSplit = editor.commands.splitBlock();

    if (!didSplit) {
        return false;
    }

    return updateBlockType(editor, blockType, createNodeId());
};

const insertActionBefore = (editor: Editor, blockPos: number, blockStart: number) => {
    const nodes = editor.schema.nodes as Record<string, NodeType>;
    const blockType = nodes[FOUNTAIN_BLOCK_NODE_NAME];

    if (!blockType) {
        return false;
    }

    const actionBlock = blockType.create({
        blockType: ELEMENT_ACTION,
        id: createNodeId(),
    });

    let tr = editor.state.tr.insert(blockPos, actionBlock);
    const mappedStart = tr.mapping.map(blockStart);

    tr = tr.setSelection(TextSelection.create(tr.doc, mappedStart));
    editor.view.dispatch(tr);

    return true;
};

const handleEnter = (editor: Editor, event: KeyboardEvent) => {
    const block = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);

    if (!block) {
        return false;
    }

    event.preventDefault();

    if (!editor.state.selection.empty) {
        editor.commands.deleteSelection();
    }

    const isCollapsed = editor.state.selection.empty;
    const isAtStart = isCollapsed && editor.state.selection.from === block.from;
    const isAtEnd = isCollapsed && editor.state.selection.from === block.to;

    if (block.blockType === ELEMENT_CHARACTER || block.blockType === ELEMENT_DUAL_DIALOGUE_CHARACTER) {
        if (event.shiftKey && !isAtStart && !isAtEnd) {
            return splitBlockWithType(editor, ELEMENT_DIALOGUE);
        }

        if (block.blockType === ELEMENT_CHARACTER && isAtStart) {
            return insertActionBefore(editor, block.pos, block.from);
        }
    }

    if (block.blockType === ELEMENT_PARENTHETICAL) {
        const nextType = isAtEnd ? getNextTypeOnEnter(block.blockType) : ELEMENT_DIALOGUE;

        return splitBlockWithType(editor, nextType);
    }

    const nextType = isAtEnd ? getNextTypeOnEnter(block.blockType) : block.blockType;

    return splitBlockWithType(editor, nextType);
};

const handleTab = (editor: Editor, event: KeyboardEvent) => {
    const block = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);

    if (!block) {
        return false;
    }

    if (block.blockType === ELEMENT_DIALOGUE) {
        event.preventDefault();

        return updateBlockType(editor, ELEMENT_PARENTHETICAL);
    }

    if (block.blockType === ELEMENT_PARENTHETICAL) {
        event.preventDefault();

        return updateBlockType(editor, ELEMENT_DIALOGUE);
    }

    if (block.blockType === ELEMENT_ACTION) {
        event.preventDefault();

        const text = block.node.textContent ?? '';
        let indentCount = 0;

        while (text.startsWith('\t', indentCount)) {
            indentCount += 1;
        }

        if (event.shiftKey) {
            if (indentCount === 0) {
                return true;
            }

            const tr = editor.state.tr.delete(block.from, block.from + 1);

            editor.view.dispatch(tr);

            return true;
        }

        if (indentCount >= MAX_ACTION_INDENT) {
            return true;
        }

        const tr = editor.state.tr.insertText('\t', block.from);

        editor.view.dispatch(tr);

        return true;
    }

    return false;
};

const handleKeyDown = (editor: Editor, event: KeyboardEvent) => {
    if (event.key === 'Enter') {
        return handleEnter(editor, event);
    }

    if (event.key === 'Tab') {
        return handleTab(editor, event);
    }

    const block = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);

    if (!block) {
        return false;
    }

    if (block.blockType === ELEMENT_PARENTHETICAL && (event.key === '(' || event.key === ')')) {
        event.preventDefault();

        return true;
    }

    if (
        (block.blockType === ELEMENT_CHARACTER || block.blockType === ELEMENT_DUAL_DIALOGUE_CHARACTER)
        && event.key === '('
    ) {
        event.preventDefault();

        insertParenPair(editor, editor.state.selection.from, editor.state.selection.to);

        return true;
    }

    return false;
};

const handleTextInput = (editor: Editor, from: number, to: number, text: string) => {
    const block = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);

    if (!block) {
        return false;
    }

    if (
        block.blockType === ELEMENT_CHARACTER
        || block.blockType === ELEMENT_DUAL_DIALOGUE_CHARACTER
    ) {
        if (text === '(') {
            insertParenPair(editor, from, to);

            return true;
        }

        const offset = getSelectionOffset(editor, block.from);
        const insideParens = isInsideParentheses(block.node.textContent ?? '', offset);

        if (!insideParens) {
            const upper = text.toUpperCase();

            if (upper !== text) {
                const tr = editor.state.tr.insertText(upper, from, to);

                editor.view.dispatch(tr);

                return true;
            }
        }
    }

    if (block.blockType === ELEMENT_PARENTHETICAL && (/[()]/).test(text)) {
        const sanitized = text.replace(/[()]/g, '');

        if (sanitized.length === 0) {
            return true;
        }

        const tr = editor.state.tr.insertText(sanitized, from, to);

        editor.view.dispatch(tr);

        return true;
    }

    return false;
};

const handlePaste = (editor: Editor, event: ClipboardEvent) => {
    const block = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);

    if (!block || block.blockType !== ELEMENT_PARENTHETICAL) {
        return false;
    }

    const text = event.clipboardData?.getData('text/plain');

    if (text === undefined) {
        return false;
    }

    event.preventDefault();

    const sanitized = text
        .replace(/\s*\n+\s*/g, ' ')
        .replace(/[()]/g, '');

    editor.commands.insertContent(sanitized);

    return true;
};

const ensureBlockIdsPlugin = (editor: Editor) => new Plugin({
    key: new PluginKey('fountain-block-ids'),
    appendTransaction: (_transactions, _oldState, newState) => {
        let tr = newState.tr;
        let changed = false;

        newState.doc.descendants((node, pos) => {
            if (node.type.name !== FOUNTAIN_BLOCK_NODE_NAME) {
                return true;
            }

            const attrs = node.attrs as Record<string, unknown>;
            const id = ensureFountainBlockId(attrs.id);

            if (id === attrs.id) {
                return true;
            }

            tr = tr.setNodeMarkup(pos, undefined, {
                ...attrs,
                id,
            });
            changed = true;

            return true;
        });

        return changed ? tr : null;
    },
    props: {
        handleKeyDown: (_view, event) => handleKeyDown(editor, event),
        handleTextInput: (_view, from, to, text) => handleTextInput(editor, from, to, text),
        handlePaste: (_view, event) => handlePaste(editor, event),
    },
});

const FountainBlockExtension = Node.create({
    name: FOUNTAIN_BLOCK_NODE_NAME,
    group: 'block',
    content: 'inline*',
    defining: true,
    isolating: false,
    addAttributes() {
        return {
            blockType: {
                default: ELEMENT_ACTION,
                parseHTML: (element: HTMLElement) => element.getAttribute('data-fountain-type') ?? ELEMENT_ACTION,
            },
            id: {
                default: null,
                parseHTML: (element: HTMLElement) => element.getAttribute('data-block-id'),
            },
        };
    },
    parseHTML() {
        return [
            {
                tag: 'p[data-fountain-type]',
            }, {
                tag: 'p[data-fountain-block]',
            },
        ];
    },
    renderHTML({HTMLAttributes}) {
        const attrs = HTMLAttributes as Record<string, unknown>;
        const blockType = normalizeFountainBlockType(attrs.blockType);

        const resolvedAttributes = {
            'data-fountain-block': 'true',
            'data-fountain-type': blockType,
            'data-block-id': attrs.id ?? undefined,
            class: getFountainBlockClassName(blockType),
        };

        return [
            'p',
            mergeAttributes(HTMLAttributes, resolvedAttributes),
            0,
        ];
    },
    addProseMirrorPlugins() {
        const editorInstance = this.editor;

        return [ensureBlockIdsPlugin(editorInstance)];
    },
});

export default FountainBlockExtension;
