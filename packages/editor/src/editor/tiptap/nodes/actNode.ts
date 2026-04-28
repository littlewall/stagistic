import {ELEMENT_ACT} from '@stagistic/script';

import {createFountainNode} from './createFountainNode';

export const ActNode = createFountainNode({
    name: 'act',
    legacyType: ELEMENT_ACT,
});
