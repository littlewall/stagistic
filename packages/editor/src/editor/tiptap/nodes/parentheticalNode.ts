import {ELEMENT_PARENTHETICAL} from '@stagistic/script';

import {createFountainNode} from './createFountainNode';

export const ParentheticalNode = createFountainNode({
    name: 'parenthetical',
    legacyType: ELEMENT_PARENTHETICAL,
});
