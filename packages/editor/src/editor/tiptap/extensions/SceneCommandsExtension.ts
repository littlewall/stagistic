import {Extension} from '@tiptap/core';

/**
 * Surfaces scene-level requests from inside the editor (block-action menu) to the
 * host application. The delete itself is confirmation-gated and applied by the
 * host via the {@link ../../contracts DeleteSceneRequest} structure request — this
 * command only asks the host to open the confirmation modal.
 */

interface SceneCommandsExtensionOptions {
    onRequestDeleteScene?: (sceneHeadingBlockId: string) => void,
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        sceneCommands: {
            requestDeleteScene: (sceneHeadingBlockId: string) => ReturnType,
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
        };
    },
});
