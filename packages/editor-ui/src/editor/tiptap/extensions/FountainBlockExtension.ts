import {
    DEFAULT_EDITOR_SETTINGS,
    ELEMENT_ACT,
    ELEMENT_ACTION,
    type StructureSettings,
} from '@stagistic/script-core';
import {mergeAttributes, Node} from '@tiptap/core';
import {
    Plugin,
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
    FOUNTAIN_BLOCK_NODE_NAME,
    getFountainBlockClassName,
    normalizeFountainBlockType,
} from '../fountainCore';

const createInputHandlersPlugin = (
    editor: Editor,
    blockShortcuts?: BlockShortcutMap,
    blockNextElements?: BlockNextElementMap,
    blockCasing?: BlockCasingMap,
) => {
    return new Plugin({
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
    colorByCharacterIdRef?: {current: ReadonlyMap<string, string>},
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
            colorByCharacterIdRef: undefined,
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
            createInputHandlersPlugin(
                editorInstance,
                this.options.blockShortcuts,
                this.options.blockNextElements,
                this.options.blockCasing,
            ),
            createStructureMarkerDecorationsPlugin({
                structureSettings: this.options.structureSettings,
            }),
            createCharacterTagDecorationsPlugin(
                this.options.characterColorSaturation,
                this.options.colorByCharacterIdRef,
            ),
        ];
    },
});

export default FountainBlockExtension;
