import {
    Path,
} from 'platejs';
import type {PlateEditor} from 'platejs/react';

import {
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_PARENTHETICAL,
    type FountainElementType,
} from '../types';

export const isParentheticalSelection = (editor: PlateEditor) => Boolean(
    editor.api.above({
        block: true,
        match: node => typeof node === 'object' &&
        node !== null &&
        'type' in node &&
        node.type === ELEMENT_PARENTHETICAL,
    }),
);

export const isCharacterSelection = (editor: PlateEditor) => Boolean(
    editor.api.above({
        block: true,
        match: node => typeof node === 'object' &&
        node !== null &&
        'type' in node &&
        node.type === ELEMENT_CHARACTER,
    }),
);

export const isDualCharacterSelection = (editor: PlateEditor) => Boolean(
    editor.api.above({
        block: true,
        match: node => typeof node === 'object' &&
        node !== null &&
        'type' in node &&
        node.type === ELEMENT_DUAL_DIALOGUE_CHARACTER,
    }),
);

export const isDialogueSelection = (editor: PlateEditor) => Boolean(
    editor.api.above({
        block: true,
        match: node => typeof node === 'object' &&
        node !== null &&
        'type' in node &&
        node.type === ELEMENT_DIALOGUE,
    }),
);

export const isDualDialogueSelection = (editor: PlateEditor) => Boolean(
    editor.api.above({
        block: true,
        match: node => typeof node === 'object' &&
        node !== null &&
        'type' in node &&
        node.type === ELEMENT_DUAL_DIALOGUE,
    }),
);

export const setSelectionBlockType = (
    editor: PlateEditor,
    type: FountainElementType,
): undefined | Path => {
    const blockEntry = editor.api.block({at: editor.selection ?? undefined});

    if (!blockEntry) {
        return undefined;
    }

    editor.tf.setNodes({type}, {at: blockEntry[1]});

    return blockEntry[1];
};
