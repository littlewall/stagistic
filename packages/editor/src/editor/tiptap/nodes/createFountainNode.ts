import {
    type FountainElementType,
} from '@stagistic/script';
import {mergeAttributes, Node} from '@tiptap/core';

import {
    type FountainBlockType,
    getFountainBlockClassName,
    normalizeFountainBlockType,
} from '../../blocks/fountain';
import {
    FOUNTAIN_BLOCK_DOM_ID_ATTRIBUTE,
    FOUNTAIN_BLOCK_DOM_TYPE_ATTRIBUTE,
    FOUNTAIN_BLOCK_GROUP_NAME,
} from '../fountainCore';

export interface CreateFountainNodeConfig {
    name: string,
    legacyType: FountainBlockType,
}

const resolveParsedBlockType = (element: HTMLElement, fallback: FountainElementType) => {
    const rawType = element.getAttribute(FOUNTAIN_BLOCK_DOM_TYPE_ATTRIBUTE)
        ?? element.getAttribute('data-fountain-type')
        ?? fallback;

    return normalizeFountainBlockType(rawType);
};

const resolveParsedBlockId = (element: HTMLElement) => {
    return element.getAttribute(FOUNTAIN_BLOCK_DOM_ID_ATTRIBUTE)
        ?? element.getAttribute('data-block-id')
        ?? element.getAttribute('id');
};

export const createFountainNode = ({name, legacyType}: CreateFountainNodeConfig) => {
    return Node.create({
        name,
        group: `block ${FOUNTAIN_BLOCK_GROUP_NAME}`,
        content: 'inline*',
        defining: true,
        isolating: false,
        addAttributes() {
            return {
                blockType: {
                    default: legacyType,
                    parseHTML: (element: HTMLElement) => resolveParsedBlockType(element, legacyType),
                    renderHTML: attributes => ({
                        [FOUNTAIN_BLOCK_DOM_TYPE_ATTRIBUTE]: normalizeFountainBlockType(attributes.blockType ?? legacyType),
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
                    tag: `p[${FOUNTAIN_BLOCK_DOM_TYPE_ATTRIBUTE}]`,
                    getAttrs: (element: HTMLElement) => {
                        const blockType = resolveParsedBlockType(element, legacyType);

                        return blockType === legacyType ? {} : false;
                    },
                }, {
                    tag: 'p[data-fountain-type]',
                    getAttrs: (element: HTMLElement) => {
                        const blockType = resolveParsedBlockType(element, legacyType);

                        return blockType === legacyType ? {} : false;
                    },
                },
            ];
        },
        renderHTML({node, HTMLAttributes}) {
            const blockType = normalizeFountainBlockType(node.attrs.blockType ?? legacyType);
            const resolvedAttributes = {
                class: getFountainBlockClassName(blockType),
            };

            return [
                'p',
                mergeAttributes(HTMLAttributes, resolvedAttributes),
                0,
            ];
        },
    });
};
