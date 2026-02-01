import type {PlateEditor} from 'platejs/react';

import {
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_PARENTHETICAL,
    ELEMENT_SCENE_HEADING,
    ELEMENT_TRANSITION,
    type FountainElementType,
} from '../types';
import type {EnterNextTypeMap} from './types';

export const DEFAULT_ENTER_NEXT_TYPE: EnterNextTypeMap = {
    [ELEMENT_SCENE_HEADING]: ELEMENT_ACTION,
    [ELEMENT_ACTION]: ELEMENT_ACTION,
    [ELEMENT_CHARACTER]: ELEMENT_DIALOGUE,
    [ELEMENT_DUAL_DIALOGUE_CHARACTER]: ELEMENT_DIALOGUE,
    [ELEMENT_PARENTHETICAL]: ELEMENT_DIALOGUE,
    [ELEMENT_DIALOGUE]: ELEMENT_CHARACTER,
    [ELEMENT_TRANSITION]: ELEMENT_SCENE_HEADING,
};

export const getEnterNextType = (
    editor: PlateEditor,
    type: FountainElementType,
) => {
    const custom =
    (editor as unknown as {fountainEnterNextType?: EnterNextTypeMap})
        .fountainEnterNextType;

    return custom?.[type] ?? DEFAULT_ENTER_NEXT_TYPE[type] ?? type;
};
