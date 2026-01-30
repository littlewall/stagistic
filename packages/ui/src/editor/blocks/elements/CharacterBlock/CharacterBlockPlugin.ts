import {
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
} from '@stagistic/editor-core';
import {createPlatePlugin} from 'platejs/react';
import {
    Path, Point, Range,
} from 'slate';

import {
    getElementText,
    getEnterNextType,
    isCharacterSelection,
    setSelectionBlockType,
} from '../../fountainBlockHelpers';
import CharacterBlock from './CharacterBlock';

export const characterPlugin = createPlatePlugin({
    key: ELEMENT_CHARACTER,
    node: {
        isElement: true,
        type: ELEMENT_CHARACTER,
        component: CharacterBlock,
    },
    handlers: {
        onBeforeInput: ({editor, event}) => {
            if (!isCharacterSelection(editor)) {
                return undefined;
            }

            const data = event.data;

            if (!data) {
                return undefined;
            }

            const selection = editor.selection;
            const blockEntry = editor.api.block({at: selection ?? undefined});

            if (!selection || !blockEntry) {
                return undefined;
            }

            const [blockNode] = blockEntry;
            const text = getElementText(blockNode);
            const offset = selection.anchor.offset;
            const before = text.slice(0, offset);
            const lastOpen = before.lastIndexOf('(');
            const lastClose = before.lastIndexOf(')');
            const insideParens = lastOpen > lastClose;

            if (data === '(') {
                event.preventDefault();
                if (!Range.isCollapsed(selection)) {
                    editor.tf.delete();
                }

                editor.tf.insertText('()');
                editor.tf.move({
                    reverse: true, distance: 1, unit: 'character',
                });

                return true;
            }

            if (!insideParens) {
                event.preventDefault();
                if (!Range.isCollapsed(selection)) {
                    editor.tf.delete();
                }

                editor.tf.insertText(data.toUpperCase());

                return true;
            }

            return undefined;
        },
        onKeyDown: ({editor, event}) => {
            if (event.key === '(' && isCharacterSelection(editor)) {
                event.preventDefault();
                if (editor.selection && !Range.isCollapsed(editor.selection)) {
                    editor.tf.delete();
                }

                editor.tf.insertText('()');
                editor.tf.move({
                    reverse: true, distance: 1, unit: 'character',
                });

                return true;
            }

            if (event.key === 'Enter' && isCharacterSelection(editor)) {
                event.preventDefault();

                const selection = editor.selection;
                const blockEntry = editor.api.block({at: selection ?? undefined});

                if (!selection || !blockEntry) {
                    return true;
                }

                const [blockNode, path] = blockEntry;
                const text = getElementText(blockNode);
                let insideParens = false;
                let shouldStripLeadingParenFromNext = false;
                let splitBefore = text;
                let splitAfter = '';

                if (Range.isCollapsed(selection)) {
                    const offset = selection.anchor.offset;
                    const before = text.slice(0, offset);
                    const after = text.slice(offset);
                    const lastOpen = before.lastIndexOf('(');
                    const lastClose = before.lastIndexOf(')');

                    insideParens = lastOpen > lastClose;
                    splitBefore = before;
                    splitAfter = after;
                }

                const start = editor.api.start(path);
                const end = editor.api.end(path);
                const isCollapsed = Range.isCollapsed(selection);
                const isAtStart = isCollapsed && Point.equals(selection.anchor, start);
                const isAtEnd = isCollapsed && Point.equals(selection.anchor, end);

                if (!isCollapsed) {
                    editor.tf.delete();
                }

                if (insideParens && !event.shiftKey && !isAtStart && !isAtEnd) {
                    const firstText = `${splitBefore})`;
                    const secondText = splitAfter
                        .replace(/^[\s)]*/, '')
                        .replace(/[()]*\s*$/, '')
                        .toUpperCase();

                    editor.tf.replaceNodes(
                        {...blockNode, children: [{text: firstText}]},
                        {at: path},
                    );

                    const nextPath = Path.next(path);

                    editor.tf.insertNodes(
                        {
                            type: ELEMENT_CHARACTER,
                            children: [{text: secondText}],
                        },
                        {at: nextPath},
                    );

                    const point = editor.api.start(nextPath);

                    editor.tf.select(point);

                    return true;
                }

                if (insideParens && !event.shiftKey) {
                    const fullText = `${splitBefore})${splitAfter}`;

                    editor.tf.replaceNodes(
                        {...blockNode, children: [{text: fullText}]},
                        {at: path},
                    );
                    shouldStripLeadingParenFromNext = true;
                }

                if (event.shiftKey && !isAtStart && !isAtEnd) {
                    editor.tf.insertBreak();

                    const nextPath = setSelectionBlockType(editor, ELEMENT_DIALOGUE);

                    if (nextPath) {
                        const point = editor.api.start(nextPath);

                        editor.tf.select(point);
                    }

                    return true;
                }

                if (isAtStart) {
                    editor.tf.insertNodes(
                        {type: ELEMENT_ACTION, children: [{text: ''}]},
                        {at: path},
                    );

                    const point = editor.api.start(path);

                    editor.tf.select(point);

                    return true;
                }

                editor.tf.insertBreak();

                if (isAtEnd) {
                    const nextType = getEnterNextType(editor, ELEMENT_CHARACTER);
                    const nextPath = setSelectionBlockType(editor, nextType);

                    if (nextPath) {
                        const point = editor.api.start(nextPath);

                        editor.tf.select(point);
                    }

                    return true;
                }

                const nextPath = setSelectionBlockType(editor, ELEMENT_CHARACTER);

                if (nextPath) {
                    if (shouldStripLeadingParenFromNext) {
                        const nextEntry = editor.api.node(nextPath);

                        if (nextEntry) {
                            const [nextNode] = nextEntry;
                            const nextText = getElementText(nextNode);
                            const stripped = nextText.replace(/^[\s)]*/, '');

                            if (stripped !== nextText) {
                                editor.tf.replaceNodes(
                                    {...nextNode, children: [{text: stripped}]},
                                    {at: nextPath},
                                );
                            }
                        }
                    }

                    const point = editor.api.start(nextPath);

                    editor.tf.select(point);
                }

                return true;
            }

            return undefined;
        },
    },
});
