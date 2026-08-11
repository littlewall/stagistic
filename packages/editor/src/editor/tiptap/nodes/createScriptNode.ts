import {
    BLOCK_ITEMS,
    type ScriptBlockNodeType,
} from '@stagistic/script';
import {mergeAttributes, Node} from '@tiptap/core';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';

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

const BLOCK_ROLE_DESCRIPTION_BY_TYPE = Object.fromEntries(
    BLOCK_ITEMS.map(item => [item.nodeType, item.label]),
) as Record<ScriptBlockNodeType, string>;

const getBlockRoleDescription = (blockType: BlockNodeType) => {
    return BLOCK_ROLE_DESCRIPTION_BY_TYPE[blockType];
};

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

const createStableScriptNodeView = (
    initialNode: ProseMirrorNode,
    defaultBlockType: ScriptBlockNodeType,
    HTMLAttributes: Record<string, unknown>,
) => {
    const dom = document.createElement('p');
    let currentNode = initialNode;
    const renderedBlockType = normalizeBlockNodeType(
        initialNode.attrs.blockType ?? defaultBlockType,
    );

    const attributes = mergeAttributes(HTMLAttributes, {
        class: getBlockClassName(renderedBlockType),
        [SCRIPT_BLOCK_DOM_TYPE_ATTRIBUTE]: renderedBlockType,
        'aria-roledescription': getBlockRoleDescription(renderedBlockType),
    }) as Record<string, unknown>;

    Object.entries(attributes).forEach(([attribute, value]) => {
        if (value !== null && value !== undefined && value !== false) {
            dom.setAttribute(attribute, String(value));
        }
    });

    const syncBlockId = (node: ProseMirrorNode) => {
        const attrs = node.attrs as Record<string, unknown>;
        const blockId = attrs.id;

        if (typeof blockId === 'string' && blockId.length > 0) {
            dom.setAttribute(SCRIPT_BLOCK_DOM_ID_ATTRIBUTE, blockId);
        } else {
            dom.removeAttribute(SCRIPT_BLOCK_DOM_ID_ATTRIBUTE);
        }
    };

    syncBlockId(initialNode);

    return {
        dom,
        contentDOM: dom,
        update: (nextNode: ProseMirrorNode) => {
            const nextBlockType = normalizeBlockNodeType(
                nextNode.attrs.blockType ?? defaultBlockType,
            );

            if (nextNode.type !== currentNode.type || nextBlockType !== renderedBlockType) {
                return false;
            }

            currentNode = nextNode;
            syncBlockId(nextNode);

            return true;
        },
    };
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
        addNodeView() {
            return ({node, HTMLAttributes}) => createStableScriptNodeView(
                node,
                defaultBlockType,
                HTMLAttributes,
            );
        },
        renderHTML({node, HTMLAttributes}) {
            const blockType = normalizeBlockNodeType(node.attrs.blockType ?? defaultBlockType);
            const resolvedAttributes = {
                class: getBlockClassName(blockType),
                'aria-roledescription': getBlockRoleDescription(blockType),
            };

            return [
                'p',
                mergeAttributes(HTMLAttributes, resolvedAttributes),
                0,
            ];
        },
    });
};
