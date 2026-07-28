import {Extension} from '@tiptap/core';

import {
    characterTagComposeKey,
    getCharacterTagComposeFromState,
} from './characterTagInput/composeState';
import {createCharacterTagComposePlugin} from './characterTagInput/plugin';
import {buildCommitTransaction} from './characterTagInput/transactions';
import type {
    CharacterTagComposeState,
    CharacterTagInputExtensionOptions,
    CommitCharacterTagPayload,
} from './characterTagInput/types';

export {
    characterTagComposeKey,
    type CharacterTagComposeState,
    getCharacterTagComposeFromState,
};

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        characterTagInput: {
            commitCharacterTag: (payload?: CommitCharacterTagPayload) => ReturnType,
        },
    }
}

export const CharacterTagInputExtension = Extension.create<CharacterTagInputExtensionOptions>({
    name: 'CharacterTagInput',
    priority: 1000,

    addOptions() {
        return {
            persistentCharactersRef: undefined,
        };
    },

    addCommands() {
        return {
            commitCharacterTag: payload => ({state, dispatch}) => {
                const tr = buildCommitTransaction(
                    state,
                    this.options.persistentCharactersRef?.current ?? [],
                    payload,
                );

                if (!tr) {
                    return false;
                }

                if (dispatch) {
                    dispatch(tr);
                }

                return true;
            },
        };
    },

    addProseMirrorPlugins() {
        return [createCharacterTagComposePlugin(this.editor, this.options)];
    },
});
