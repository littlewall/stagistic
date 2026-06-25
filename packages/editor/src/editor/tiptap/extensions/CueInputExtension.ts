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
 * Cue title compose. Higher priority than CharacterTagInputExtension (1000)
 * so a second `@` is intercepted before the character-tag compose consumes it.
 */
export const CueInputExtension = Extension.create({
    name: 'cueInput',
    priority: 1100,

    addProseMirrorPlugins() {
        return [createCueComposePlugin()];
    },
});
