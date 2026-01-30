import { createPlatePlugin } from 'platejs/react';
import { ELEMENT_CENTERED } from '@stagistic/editor-core';
import CenteredBlock from './CenteredBlock';

export const centeredPlugin = createPlatePlugin({
  key: ELEMENT_CENTERED,
  node: {
    isElement: true,
    type: ELEMENT_CENTERED,
    component: CenteredBlock,
  },
});
