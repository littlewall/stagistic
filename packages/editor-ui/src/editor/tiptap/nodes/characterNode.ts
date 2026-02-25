import {ELEMENT_CHARACTER} from '@stagistic/script-core';

import {createFountainNode} from './createFountainNode';

export const CharacterNode = createFountainNode({
    name: 'character',
    legacyType: ELEMENT_CHARACTER,
});
