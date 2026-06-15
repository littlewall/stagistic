import {
    type ScriptBlockNodeType,
} from '@stagistic/script';
import {mergeAttributes, Node} from '@tiptap/core';

import {
    type BlockNodeType,
    getBlockClassName,
    normalizeBlockNodeType,
} from '../../blocks/script';
import {
    SCRIPT_BLOCK_DOM_ID_ATTRIBUTE,
    SCRIPT_BLOCK_DOM_TYPE_ATTRIBUTE,
    SCRIPT_BLOCK_GROUP_NAME,
} from '../scriptCore';

export interface CreateScriptNodeConfig {
    name: string,
    blockType: BlockNodeType,
}

const resolveParsedBlockType = (element: HTMLElement, fallback: ScriptBlockNodeType) => {
    const rawType = element.getAttribute(SCRIPT_BLOCK_DOM_TYPE_ATTRIBUTE)
        ?? element.getAttribute('data-block-type')
        ?? fallback;

    return normalizeBlockNodeType(rawType);
};

const resolveParsedBlockId = (element: HTMLElement) => {
    return element.getAttribute(SCRIPT_BLOCK_DOM_ID_ATTRIBUTE)
        ?? element.getAttribute('data-block-id')
        ?? element.getAttribute('id');
};

export const createScriptNode = ({name, blockType: defaultBlockType}: CreateScriptNodeConfig) => {
    return Node.create({
        name,
        group: `block ${SCRIPT_BLOCK_GROUP_NAME}`,
        content: 'inline*',
        defining: true,
        isolating: false,
        addAttributes() {
            return {
                blockType: {
                    default: defaultBlockType,
                    parseHTML: (element: HTMLElement) => resolveParsedBlockType(element, defaultBlockType),
                    renderHTML: attributes => ({
                        [SCRIPT_BLOCK_DOM_TYPE_ATTRIBUTE]: normalizeBlockNodeType(attributes.blockType ?? defaultBlockType),
                    }),
                },
                id: {
                    default: null,
                    parseHTML: resolveParsedBlockId,
                    renderHTML: () => ({}),
                },
                characterRefs: {
                    default: null,
                    renderHTML: () => ({}),
                },
            };
        },
        parseHTML() {
            return [
                {
                    tag: `p[${SCRIPT_BLOCK_DOM_TYPE_ATTRIBUTE}]`,
                    getAttrs: (element: HTMLElement) => {
                        const blockType = resolveParsedBlockType(element, defaultBlockType);

                        return blockType === defaultBlockType ? {} : false;
                    },
                }, {
                    tag: 'p[data-block-type]',
                    getAttrs: (element: HTMLElement) => {
                        const blockType = resolveParsedBlockType(element, defaultBlockType);

                        return blockType === defaultBlockType ? {} : false;
                    },
                },
            ];
        },
        renderHTML({node, HTMLAttributes}) {
            const blockType = normalizeBlockNodeType(node.attrs.blockType ?? defaultBlockType);
            const resolvedAttributes = {
                class: getBlockClassName(blockType),
            };

            return [
                'p',
                mergeAttributes(HTMLAttributes, resolvedAttributes),
                0,
            ];
        },
    });
};
