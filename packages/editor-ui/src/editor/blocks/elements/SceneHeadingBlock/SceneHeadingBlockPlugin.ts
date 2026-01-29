import { createPlatePlugin } from 'platejs/react';
import { ELEMENT_SCENE_HEADING } from '@stagistic/editor-core';
import SceneHeadingBlock from './SceneHeadingBlock';
import {
  createBlockKeyHandler,
  defaultEnterKeyHandler,
} from '../../keyboard/blockKeyHandlers';

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
