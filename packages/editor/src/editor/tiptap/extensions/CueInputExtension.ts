import {Extension} from '@tiptap/core';

import {
    cueComposeKey,
    type CueComposeState,
    getCueComposeFromState,
} from './cueInput/composeState';
import {createCueComposePlugin} from './cueInput/plugin';

export {
    cueComposeKey,
    type CueComposeState,
    getCueComposeFromState,
};

/**
 * Cue title compose, triggered by a single `#` inside a stage direction
 * (see cueInput/constants.ts for why `#` rather than `@@`). Priority 1100 so
 * its Enter/Escape handlers run before the block-split Enter handler while a
 * title is being composed.
 */
export const CueInputExtension = Extension.create({
    name: 'cueInput',
    priority: 1100,

    addProseMirrorPlugins() {
        return [createCueComposePlugin()];
    },
});
