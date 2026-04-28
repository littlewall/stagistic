import {ELEMENT_ACTION} from '@stagistic/script';

import {createFountainNode} from './createFountainNode';

export const ActionNode = createFountainNode({
    name: 'action',
    legacyType: ELEMENT_ACTION,
});
