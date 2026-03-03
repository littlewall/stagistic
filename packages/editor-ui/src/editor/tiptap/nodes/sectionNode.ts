import {ELEMENT_SECTION} from '@stagistic/script-core';

import {createFountainNode} from './createFountainNode';

export const SectionNode = createFountainNode({
    name: 'section',
    legacyType: ELEMENT_SECTION,
});
