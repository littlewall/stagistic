import {ELEMENT_DIALOGUE, ELEMENT_PARENTHETICAL} from '@stagistic/editor-core';
import {createPlatePlugin} from 'platejs/react';

import {
    isDialogueSelection,
    setSelectionBlockType,
} from '../../fountainBlockHelpers';
import {
    createBlockKeyHandler,
    defaultEnterKeyHandler,
} from '../../keyboard/blockKeyHandlers';

import DialogueBlock from './DialogueBlock';

const onKeyDown = createBlockKeyHandler({
    blockType: ELEMENT_DIALOGUE,
    shouldHandle: isDialogueSelection,
    handlers: {
        Tab: ({editor, event}) => {
            event.preventDefault();

            const nextPath = setSelectionBlockType(editor, ELEMENT_PARENTHETICAL);

            if (nextPath) {
                const point = editor.api.start(nextPath);

                editor.tf.select(point);
            }

            return true;
        },
        Enter: defaultEnterKeyHandler(ELEMENT_DIALOGUE),
    },
});

export const dialoguePlugin = createPlatePlugin({
    key: ELEMENT_DIALOGUE,
    node: {
        isElement: true,
        type: ELEMENT_DIALOGUE,
        component: DialogueBlock,
    },
    handlers: {
        onKeyDown,
    },
});
