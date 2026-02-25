import {ELEMENT_DIALOGUE} from '@stagistic/script-core';

import {createFountainNode} from './createFountainNode';

export const DialogueNode = createFountainNode({
    name: 'dialogue',
    legacyType: ELEMENT_DIALOGUE,
});
