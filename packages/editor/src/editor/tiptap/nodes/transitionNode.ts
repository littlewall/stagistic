import {ELEMENT_TRANSITION} from '@stagistic/script';

import {createFountainNode} from './createFountainNode';

export const TransitionNode = createFountainNode({
    name: 'transition',
    legacyType: ELEMENT_TRANSITION,
});
