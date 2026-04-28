import {ELEMENT_SCENE_HEADING} from '@stagistic/script';

import {createFountainNode} from './createFountainNode';

export const SceneHeadingNode = createFountainNode({
    name: 'sceneHeading',
    legacyType: ELEMENT_SCENE_HEADING,
});
