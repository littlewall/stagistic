import {Extension} from '@tiptap/core';

import type {PersistentCharacterRef} from '../../contracts';
import {
    createCharacterTagDecorationsPlugin,
    createCharacterTagDecorationsRefreshTransaction,
} from '../fountainBlock/characterTagDecorations';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        characterTagDecorations: {
            refreshCharacterTagDecorations: () => ReturnType,
        },
    }
}

export const CharacterTagDecorationsExtension = Extension.create<{
    characterColorSaturation?: number,
    colorByCharacterIdRef?: {current: ReadonlyMap<string, string>},
    rememberedColorByKeyRef?: {current: ReadonlyMap<string, string>},
    persistentCharactersRef?: {current: readonly PersistentCharacterRef[]},
}>({
    name: 'CharacterTagDecorations',

    addOptions() {
        return {
            characterColorSaturation: undefined,
            colorByCharacterIdRef: undefined,
            rememberedColorByKeyRef: undefined,
            persistentCharactersRef: undefined,
        };
    },

    addCommands() {
        return {
            refreshCharacterTagDecorations: () => ({state, dispatch}) => {
                if (dispatch) {
                    dispatch(createCharacterTagDecorationsRefreshTransaction(state));
                }

                return true;
            },
        };
    },

    addProseMirrorPlugins() {
        return [
            createCharacterTagDecorationsPlugin(
                this.options.characterColorSaturation,
                this.options.colorByCharacterIdRef,
                this.options.rememberedColorByKeyRef,
                this.options.persistentCharactersRef,
            ),
        ];
    },
});
