import {ELEMENT_LYRICS} from '@stagistic/editor-core';
import {createPlatePlugin} from 'platejs/react';

import LyricsBlock from './LyricsBlock';

export const lyricsPlugin = createPlatePlugin({
    key: ELEMENT_LYRICS,
    node: {
        isElement: true,
        type: ELEMENT_LYRICS,
        component: LyricsBlock,
    },
});
