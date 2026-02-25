import {ELEMENT_TRANSITION} from '@stagistic/script-core';

import {createFountainNode} from './createFountainNode';

export const TransitionNode = createFountainNode({
    name: 'transition',
    legacyType: ELEMENT_TRANSITION,
});
