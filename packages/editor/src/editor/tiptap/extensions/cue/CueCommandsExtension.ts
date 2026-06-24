import type {CueMode} from '@stagistic/script';
import {Extension} from '@tiptap/core';

import {
    blockHasCueAtom,
    buildInsertCueOut,
    buildInsertCueStart,
    resolveCueTargetBlock,
} from './cueCommands';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        cue: {
            insertCueStart: (blockId: string | null, title: string, mode?: CueMode) => ReturnType,
            insertCueOut: (blockId: string | null) => ReturnType,
        },
    }
}

export const CueCommandsExtension = Extension.create({
    name: 'cueCommands',

    addCommands() {
        return {
            insertCueStart: (blockId, title, mode = 'open') => ({state, dispatch}) => {
                const block = resolveCueTargetBlock(state, blockId);

                if (!block || blockHasCueAtom(block)) {
                    return false;
                }

                if (dispatch) {
                    dispatch(buildInsertCueStart(state, block, title, mode));
                }

                return true;
            },
            insertCueOut: blockId => ({state, dispatch}) => {
                const block = resolveCueTargetBlock(state, blockId);

                if (!block || blockHasCueAtom(block)) {
                    return false;
                }

                if (dispatch) {
                    dispatch(buildInsertCueOut(state, block));
                }

                return true;
            },
        };
    },

    addKeyboardShortcuts() {
        /*
         * TEMPORARY (Batch A manual verification only): the real entry points
         * are the @@ compose and the block context menu (later batches). Remove
         * these shortcuts once those land.
         */
        return {
            'Mod-Alt-c': ({editor}) => editor.commands.insertCueStart(null, 'Test cue', 'open'),
            'Mod-Alt-o': ({editor}) => editor.commands.insertCueOut(null),
        };
    },
});
