import { createPlatePlugin } from 'platejs/react';
import { ELEMENT_TRANSITION } from '@stagistic/editor-core';
import TransitionBlock from './TransitionBlock';
import {
  createBlockKeyHandler,
  defaultEnterKeyHandler,
} from '../../keyboard/blockKeyHandlers';

const onKeyDown = createBlockKeyHandler({
  blockType: ELEMENT_TRANSITION,
  handlers: {
    Enter: defaultEnterKeyHandler(ELEMENT_TRANSITION),
  },
});

export const transitionPlugin = createPlatePlugin({
  key: ELEMENT_TRANSITION,
  node: {
    isElement: true,
    type: ELEMENT_TRANSITION,
    component: TransitionBlock,
  },
  handlers: {
    onKeyDown,
  },
});
