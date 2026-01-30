import { createPlatePlugin } from 'platejs/react';
import { ELEMENT_ACTION } from '@stagistic/editor-core';
import ActionBlock from './ActionBlock';
import {
  createLeadingIndentKeyHandler,
  createBlockKeyHandler,
  defaultEnterKeyHandler,
} from '../../keyboard/blockKeyHandlers';

const onKeyDown = createBlockKeyHandler({
  blockType: ELEMENT_ACTION,
  handlers: {
    Tab: createLeadingIndentKeyHandler(3, '\t'),
    Enter: defaultEnterKeyHandler(ELEMENT_ACTION),
  },
});

export const actionPlugin = createPlatePlugin({
  key: ELEMENT_ACTION,
  node: {
    isElement: true,
    type: ELEMENT_ACTION,
    component: ActionBlock,
  },
  handlers: {
    onKeyDown,
  },
});
