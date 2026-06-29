import {Extension} from '@tiptap/core';

import {cueNumberingPlugin} from './cueNumbering/plugin';

export const CueNumberingExtension = Extension.create({
    name: 'cueNumbering',

    addProseMirrorPlugins() {
        return [cueNumberingPlugin()];
    },
});
