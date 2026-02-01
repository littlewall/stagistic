import {ELEMENT_DUAL_DIALOGUE, ELEMENT_PARENTHETICAL} from '@stagistic/editor-core';
import {createPlatePlugin} from 'platejs/react';

import {
    isDualDialogueSelection,
    setSelectionBlockType,
} from '../../fountainBlockHelpers';

import DualDialogueBlock from './DualDialogueBlock';

export const dualDialoguePlugin = createPlatePlugin({
    key: ELEMENT_DUAL_DIALOGUE,
    node: {
        isElement: true,
        type: ELEMENT_DUAL_DIALOGUE,
        component: DualDialogueBlock,
    },
    handlers: {
        onKeyDown: ({editor, event}) => {
            if (event.key === 'Tab' && isDualDialogueSelection(editor)) {
                event.preventDefault();

                const nextPath = setSelectionBlockType(editor, ELEMENT_PARENTHETICAL);

                if (nextPath) {
                    const point = editor.api.start(nextPath);

                    editor.tf.select(point);
                }

                return true;
            }

            return undefined;
        },
    },
});
