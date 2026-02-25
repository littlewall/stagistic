import {ELEMENT_LYRICS} from '@stagistic/script-core';

import {createFountainNode} from './createFountainNode';

export const LyricsNode = createFountainNode({
    name: 'lyrics',
    legacyType: ELEMENT_LYRICS,
});
