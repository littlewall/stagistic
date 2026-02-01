import {ELEMENT_SCENE_HEADING} from '@stagistic/editor-core';
import {createPlatePlugin} from 'platejs/react';

import {
    createBlockKeyHandler,
    defaultEnterKeyHandler,
} from '../../keyboard/blockKeyHandlers';
import SceneHeadingBlock from './SceneHeadingBlock';

const onKeyDown = createBlockKeyHandler({
    blockType: ELEMENT_SCENE_HEADING,
    handlers: {
        Enter: defaultEnterKeyHandler(ELEMENT_SCENE_HEADING),
    },
});

export const sceneHeadingPlugin = createPlatePlugin({
    key: ELEMENT_SCENE_HEADING,
    node: {
        isElement: true,
        type: ELEMENT_SCENE_HEADING,
        component: SceneHeadingBlock,
    },
    handlers: {
        onKeyDown,
    },
});
