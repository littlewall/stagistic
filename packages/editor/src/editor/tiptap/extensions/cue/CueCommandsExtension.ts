import {
    CUE_OUT_NODE_NAME,
    CUE_START_NODE_NAME,
    type CueMode,
} from '@stagistic/script';
import {Extension} from '@tiptap/core';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import {Plugin} from '@tiptap/pm/state';

import {
    blockHasCueAtom,
    buildInsertCueOut,
    buildInsertCueStart,
    resolveCueTargetBlock,
} from './cueCommands';

const isCueAtom = (node: ProseMirrorNode | null | undefined): boolean => {
    return node?.type.name === CUE_START_NODE_NAME || node?.type.name === CUE_OUT_NODE_NAME;
};

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
         * TEMPORARY: cue creation uses the `#` compose; only the out shortcut
         * remains until the block context menu lands.
         */
        return {
            'Mod-Alt-o': ({editor}) => editor.commands.insertCueOut(null),
        };
    },

    addProseMirrorPlugins() {
        /*
         * Deletion guard: a cue atom is only removed via its pill menu, never
         * by Backspace/Delete next to it. (Deleting the whole block still
         * removes its cue — that is a deliberate action, not a single slip.)
         */
        return [
            new Plugin({
                props: {
                    handleKeyDown: (view, event) => {
                        const {selection} = view.state;

                        if (!selection.empty) {
                            return false;
                        }

                        if (event.key === 'Backspace' && isCueAtom(selection.$from.nodeBefore)) {
                            event.preventDefault();

                            return true;
                        }

                        if (event.key === 'Delete' && isCueAtom(selection.$from.nodeAfter)) {
                            event.preventDefault();

                            return true;
                        }

                        return false;
                    },
                },
            }),
        ];
    },
});
