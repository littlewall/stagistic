import {ELEMENT_ACTION} from '@stagistic/editor-core';
import {mergeAttributes, Node} from '@tiptap/core';
import {
    Plugin,
    PluginKey,
} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';

import {
    ensureFountainBlockId,
    FOUNTAIN_BLOCK_NODE_NAME,
    getFountainBlockClassName,
    normalizeFountainBlockType,
} from './fountainCore';
import {
    handleKeyDown,
    handlePaste,
    handleTextInput,
} from './fountainBlock/handlers';

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
