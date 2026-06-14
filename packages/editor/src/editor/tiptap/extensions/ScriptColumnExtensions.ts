import {mergeAttributes, Node} from '@tiptap/core';

import columnStyles from '../../blocks/layout/ColumnGroup.module.css';
import {
    SCRIPT_BLOCK_GROUP_NAME,
    COLUMN_GROUP_NODE_NAME,
    COLUMN_NODE_NAME,
} from '../scriptCore';

export const ScriptColumnGroupExtension = Node.create({
    name: COLUMN_GROUP_NODE_NAME,
    group: 'block',
    content: `${COLUMN_NODE_NAME}{1,}`,
    isolating: true,
    parseHTML() {
        return [
            {
                tag: 'div[data-fountain-column-group]',
            },
        ];
    },
    renderHTML({HTMLAttributes}) {
        return [
            'div',
            mergeAttributes(HTMLAttributes, {
                'data-fountain-column-group': 'true',
                class: columnStyles.columnGroup,
            }),
            0,
        ];
    },
});

export const ScriptColumnExtension = Node.create({
    name: COLUMN_NODE_NAME,
    content: `${SCRIPT_BLOCK_GROUP_NAME}+`,
    defining: true,
    parseHTML() {
        return [
            {
                tag: 'div[data-fountain-column]',
            },
        ];
    },
    addAttributes() {
        return {
            width: {
                default: null,
                parseHTML: (element: HTMLElement) => element.getAttribute('data-column-width'),
            },
        };
    },
    renderHTML({HTMLAttributes}) {
        const attrs = HTMLAttributes as Record<string, unknown>;
        const width = typeof attrs.width === 'string' ? attrs.width : undefined;

        return [
            'div',
            mergeAttributes(HTMLAttributes, {
                'data-fountain-column': 'true',
                'data-column-width': width ?? undefined,
                class: columnStyles.columnItem,
                style: width ? `width:${width}` : undefined,
            }),
            0,
        ];
    },
});
