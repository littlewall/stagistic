import {ELEMENT_SCENE_HEADING} from '@stagistic/script-core';

import {createFountainNode} from './createFountainNode';

export const SceneHeadingNode = createFountainNode({
    name: 'sceneHeading',
    legacyType: ELEMENT_SCENE_HEADING,
});
