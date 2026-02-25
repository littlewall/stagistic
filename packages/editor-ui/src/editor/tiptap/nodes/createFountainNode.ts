import {
    DEFAULT_EDITOR_SETTINGS,
    ELEMENT_ACT,
    type FountainElementType,
} from '@stagistic/script-core';
import {mergeAttributes, Node} from '@tiptap/core';

import {
    type FountainBlockType,
    getFountainBlockClassName,
    normalizeFountainBlockType,
} from '../../blocks/fountain';
import {FOUNTAIN_BLOCK_GROUP_NAME} from '../fountainCore';

export interface CreateFountainNodeConfig {
    name: string,
    legacyType: FountainBlockType,
}

const resolveParsedBlockType = (element: HTMLElement, fallback: FountainElementType) => {
    const rawType = element.getAttribute('data-fountain-type') ?? fallback;

    return normalizeFountainBlockType(rawType);
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
                    getAttrs: (element: HTMLElement) => {
                        const blockType = resolveParsedBlockType(element, legacyType);

                        return blockType === legacyType ? {} : false;
                    },
                }, {
                    tag: 'p[data-fountain-block]',
                    getAttrs: (element: HTMLElement) => {
                        const blockType = resolveParsedBlockType(element, legacyType);

                        return blockType === legacyType ? {} : false;
                    },
                },
            ];
        },
        renderHTML({HTMLAttributes}) {
            const attrs = HTMLAttributes as Record<string, unknown>;
            const blockType = normalizeFountainBlockType(attrs.blockType ?? legacyType);
            const actPrefix =
                DEFAULT_EDITOR_SETTINGS.structure.actPrefix
                    .trim();

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
    });
};
