import {Extension} from '@tiptap/core';

import {musicNumberingPlugin} from './musicNumbering/plugin';

export const MusicNumberingExtension = Extension.create({
    name: 'musicNumbering',

    addProseMirrorPlugins() {
        return [musicNumberingPlugin()];
    },
});
