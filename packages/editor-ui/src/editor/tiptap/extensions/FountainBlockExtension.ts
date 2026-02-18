import {
    DEFAULT_EDITOR_SETTINGS,
    ELEMENT_ACT,
    ELEMENT_ACTION,
    type StructureSettings,
} from '@stagistic/script-core';
import {mergeAttributes, Node} from '@tiptap/core';
import {
    Plugin,
    PluginKey,
} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';

import {createCharacterTagDecorationsPlugin} from '../fountainBlock/characterTagDecorations';
import {
    type BlockCasingMap,
    type BlockNextElementMap,
    type BlockShortcutMap,
    handleKeyDown,
    handlePaste,
    handleTextInput,
} from '../fountainBlock/handlers';
import {createStructureMarkerDecorationsPlugin} from '../fountainBlock/structureMarkerDecorations';
import {
    ensureFountainBlockId,
    FOUNTAIN_BLOCK_NODE_NAME,
    getFountainBlockClassName,
    normalizeFountainBlockType,
} from '../fountainCore';

const ensureBlockIdsPlugin = (
    editor: Editor,
    blockShortcuts?: BlockShortcutMap,
    blockNextElements?: BlockNextElementMap,
    blockCasing?: BlockCasingMap,
) => {
    return new Plugin({
        key: new PluginKey('fountain-block-ids'),
        appendTransaction: (transactions, _oldState, newState) => {
            if (!transactions.some(transaction => transaction.docChanged)) {
                return null;
            }

            let tr = newState.tr;
            let changed = false;
            const seenIds = new Set<string>();

            newState.doc.descendants((node, pos) => {
                if (node.type.name !== FOUNTAIN_BLOCK_NODE_NAME) {
                    return true;
                }

                const attrs = node.attrs as Record<string, unknown>;
                let id = ensureFountainBlockId(attrs.id);
                const blockType = normalizeFountainBlockType(attrs.blockType);

                // Keep every block id unique to avoid identity collisions in structure sidebar reorder.
                while (seenIds.has(id)) {
                    id = ensureFountainBlockId(null);
                }

                seenIds.add(id);

                if (id === attrs.id && blockType === attrs.blockType) {
                    return false;
                }

                tr = tr.setNodeMarkup(pos, undefined, {
                    ...attrs,
                    id,
                    blockType,
                });
                changed = true;

                return false;
            });

            return changed ? tr : null;
        },
        props: {
            handleKeyDown: (_view, event) => handleKeyDown(editor, event, blockShortcuts, blockNextElements),
            handleTextInput: (_view, from, to, text) => handleTextInput(editor, from, to, text, blockCasing),
            handlePaste: (_view, event) => handlePaste(editor, event),
        },
    });
};

const FountainBlockExtension = Node.create<{
    blockShortcuts?: BlockShortcutMap,
    blockNextElements?: BlockNextElementMap,
    blockCasing?: BlockCasingMap,
    characterColorSaturation?: number,
    structureSettings?: Partial<StructureSettings>,
}>({
    name: FOUNTAIN_BLOCK_NODE_NAME,
    group: 'block',
    content: 'inline*',
    defining: true,
    isolating: false,
    addOptions() {
        return {
            blockShortcuts: undefined,
            blockNextElements: undefined,
            blockCasing: undefined,
            characterColorSaturation: undefined,
            structureSettings: undefined,
        };
    },
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
            characterRefs: {
                default: null,
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
        const actPrefix = (
            this.options.structureSettings?.actPrefix
                    ?? DEFAULT_EDITOR_SETTINGS.structure.actPrefix
        ).trim();

        const resolvedAttributes = {
            'data-fountain-block': 'true',
            'data-fountain-type': blockType,
            'data-block-id': attrs.id ?? undefined,
            'data-act-prefix': blockType === ELEMENT_ACT ? actPrefix : undefined,
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

        return [
            ensureBlockIdsPlugin(
                editorInstance,
                this.options.blockShortcuts,
                this.options.blockNextElements,
                this.options.blockCasing,
            ),
            createStructureMarkerDecorationsPlugin({
                structureSettings: this.options.structureSettings,
            }),
            createCharacterTagDecorationsPlugin(this.options.characterColorSaturation),
        ];
    },
});

export default FountainBlockExtension;
