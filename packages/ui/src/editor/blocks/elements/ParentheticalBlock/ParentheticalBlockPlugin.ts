import {
    ELEMENT_DIALOGUE,
    ELEMENT_PARENTHETICAL,
} from '@stagistic/editor-core';
import {createPlatePlugin} from 'platejs/react';
import {
    Path, Point, Range,
} from 'slate';

import {
    getEnterNextType,
    isParentheticalSelection,
    setSelectionBlockType,
} from '../../fountainBlockHelpers';
import ParentheticalBlock from './ParentheticalBlock';

export const parentheticalPlugin = createPlatePlugin({
    key: ELEMENT_PARENTHETICAL,
    node: {
        isElement: true,
        type: ELEMENT_PARENTHETICAL,
        component: ParentheticalBlock,
    },
    handlers: {
        onBeforeInput: ({editor, event}) => {
            if (!isParentheticalSelection(editor)) {
                return undefined;
            }

            const data = event.data;

            if (!data || (!data.includes('(') && !data.includes(')'))) {
                return undefined;
            }

            event.preventDefault();

            const sanitized = data.replace(/[()]/g, '');

            if (sanitized.length > 0) {
                editor.tf.insertText(sanitized);
            }

            return true;
        },
        onKeyDown: ({editor, event}) => {
            if (event.key === 'Tab' && isParentheticalSelection(editor)) {
                event.preventDefault();

                const nextPath = setSelectionBlockType(editor, ELEMENT_DIALOGUE);

                if (nextPath) {
                    const point = editor.api.start(nextPath);

                    editor.tf.select(point);
                }

                return true;
            }

            if (
                isParentheticalSelection(editor) &&
        (event.key === '(' || event.key === ')')
            ) {
                event.preventDefault();

                return true;
            }

            if (event.key === 'Enter' && isParentheticalSelection(editor)) {
                event.preventDefault();
                if (editor.selection && !Range.isCollapsed(editor.selection)) {
                    editor.tf.delete();
                }

                const entry = editor.api.above({
                    block: true,
                    match: node => typeof node === 'object' &&
            node !== null &&
            'type' in node &&
            node.type === ELEMENT_PARENTHETICAL,
                });

                if (!entry) {
                    return true;
                }

                const [, path] = entry;
                const selection = editor.selection;
                const end = editor.api.end(path);
                const isAtEnd =
          selection && Range.isCollapsed(selection)
              ? Point.equals(selection.anchor, end)
              : false;
                const nextType = isAtEnd
                    ? getEnterNextType(editor, ELEMENT_PARENTHETICAL)
                    : ELEMENT_DIALOGUE;
                const nextPath = Path.next(path);
                const nextNode = editor.api.node(nextPath);
                const hasEmptyNextBlock =
          Boolean(nextNode) &&
          editor.api.isEmpty(nextPath, {block: true});

                if (hasEmptyNextBlock) {
                    const point = editor.api.start(nextPath);

                    editor.tf.select(point);

                    return true;
                }

                editor.tf.insertNodes(
                    {
                        type: nextType,
                        children: [{text: ''}],
                    },
                    {at: nextPath},
                );

                const point = editor.api.start(nextPath);

                editor.tf.select(point);

                return true;
            }

            return undefined;
        },
        onPaste: ({editor, event}) => {
            if (!isParentheticalSelection(editor)) {
                return undefined;
            }

            const text = event.clipboardData?.getData('text/plain');

            if (text === undefined) {
                return undefined;
            }

            event.preventDefault();

            const sanitized = text
                .replace(/\s*\n+\s*/g, ' ')
                .replace(/[()]/g, '');

            editor.tf.insertText(sanitized);

            return true;
        },
    },
});
