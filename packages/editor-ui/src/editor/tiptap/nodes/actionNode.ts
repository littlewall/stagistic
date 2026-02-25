import {ELEMENT_ACTION} from '@stagistic/script-core';

import {createFountainNode} from './createFountainNode';

export const ActionNode = createFountainNode({
    name: 'action',
    legacyType: ELEMENT_ACTION,
});
