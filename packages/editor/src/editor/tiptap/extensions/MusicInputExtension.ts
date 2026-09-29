import {Extension} from '@tiptap/core';

import {getMusicComposeFromState} from './musicInput/composeState';
import {createMusicComposePlugin, type MusicComposePluginOptions} from './musicInput/plugin';

export {getMusicComposeFromState};

/**
 * Music title compose, triggered by a single `#` inside a stage direction
 * (see musicInput/constants.ts for why `#` rather than `@@`). Priority 1100 so
 * its Enter/Escape handlers run before the block-split Enter handler while a
 * title is being composed.
 */
export const MusicInputExtension = Extension.create<MusicComposePluginOptions>({
    name: 'musicInput',
    priority: 1100,

    addOptions() {
        return {};
    },

    addProseMirrorPlugins() {
        return [createMusicComposePlugin(this.options)];
    },
});
