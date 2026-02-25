import {Extension} from '@tiptap/core';

import {createCharacterTagDecorationsPlugin} from '../fountainBlock/characterTagDecorations';

export const CharacterTagDecorationsExtension = Extension.create<{
    characterColorSaturation?: number,
    colorByCharacterIdRef?: {current: ReadonlyMap<string, string>},
}>({
    name: 'CharacterTagDecorations',

    addOptions() {
        return {
            characterColorSaturation: undefined,
            colorByCharacterIdRef: undefined,
        };
    },

    addProseMirrorPlugins() {
        return [
            createCharacterTagDecorationsPlugin(
                this.options.characterColorSaturation,
                this.options.colorByCharacterIdRef,
            ),
        ];
    },
});
