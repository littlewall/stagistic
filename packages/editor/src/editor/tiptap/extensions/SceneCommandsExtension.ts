import {Extension} from '@tiptap/core';

import type {BlockNodeType} from '../scriptCore';

/**
 * Surfaces scene-level requests from inside the editor (block-action menu,
 * keyboard shortcuts, toolbar, Tab) to the host application. Both deleting and
 * converting a scene heading are confirmation-gated and applied by the host via
 * the {@link ../../contracts DeleteSceneRequest}/{@link ../../contracts ConvertSceneRequest}
 * structure requests — these commands only ask the host to open the confirmation
 * modal.
 */

interface SceneCommandsExtensionOptions {
    onRequestDeleteScene?: (sceneHeadingBlockId: string) => void,
    onRequestConvertScene?: (sceneHeadingBlockId: string, targetBlockType: BlockNodeType) => void,
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        sceneCommands: {
            requestDeleteScene: (sceneHeadingBlockId: string) => ReturnType,
            requestConvertScene: (sceneHeadingBlockId: string, targetBlockType: BlockNodeType) => ReturnType,
        },
    }
}

export const SceneCommandsExtension = Extension.create<SceneCommandsExtensionOptions>({
    name: 'sceneCommands',

    addOptions() {
        return {};
    },

    addCommands() {
        return {
            requestDeleteScene: sceneHeadingBlockId => () => {
                this.options.onRequestDeleteScene?.(sceneHeadingBlockId);

                return true;
            },
            requestConvertScene: (sceneHeadingBlockId, targetBlockType) => () => {
                this.options.onRequestConvertScene?.(sceneHeadingBlockId, targetBlockType);

                return true;
            },
        };
    },
});
