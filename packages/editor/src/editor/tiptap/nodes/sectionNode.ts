import {ELEMENT_SECTION} from '@stagistic/script';

import {createFountainNode} from './createFountainNode';

export const SectionNode = createFountainNode({
    name: 'section',
    legacyType: ELEMENT_SECTION,
});
