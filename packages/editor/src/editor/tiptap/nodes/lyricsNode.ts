import {ELEMENT_LYRICS} from '@stagistic/script';

import {createFountainNode} from './createFountainNode';

export const LyricsNode = createFountainNode({
    name: 'lyrics',
    legacyType: ELEMENT_LYRICS,
});
