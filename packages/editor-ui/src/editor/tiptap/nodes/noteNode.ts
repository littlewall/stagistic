import {ELEMENT_NOTE} from '@stagistic/script-core';

import {createFountainNode} from './createFountainNode';

export const NoteNode = createFountainNode({
    name: 'note',
    legacyType: ELEMENT_NOTE,
});
