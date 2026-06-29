import {
    CUE_OUT_NODE_NAME,
    CUE_START_NODE_NAME,
    type CueMode,
} from '@stagistic/script';
import {Extension} from '@tiptap/core';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import type {EditorState, Transaction} from '@tiptap/pm/state';
import {Plugin, TextSelection} from '@tiptap/pm/state';

import {
    blockHasCueAtom,
    buildInsertCueOut,
    buildInsertCueStart,
    resolveCueTargetBlock,
} from './cueCommands';

const isCueAtom = (node: ProseMirrorNode | null | undefined): boolean => {
    return node?.type.name === CUE_START_NODE_NAME || node?.type.name === CUE_OUT_NODE_NAME;
};

type PositionRange = {
    from: number,
    to: number,
};

const getCueAtomRangesInSelection = (state: EditorState) => {
    const {from, to} = state.selection;
    const ranges: PositionRange[] = [];

    state.doc.nodesBetween(from, to, (node, pos) => {
        if (!isCueAtom(node)) {
            return true;
        }

        ranges.push({
            from: pos,
            to: pos + node.nodeSize,
        });

        return false;
    });

    return ranges;
};

const getDeleteRangesAroundCueAtoms = (
    selectionRange: PositionRange,
    cueRanges: PositionRange[],
): PositionRange[] => {
    const ranges: PositionRange[] = [];
    let cursor = selectionRange.from;

    cueRanges.forEach(cueRange => {
        const gapTo = Math.min(cueRange.from, selectionRange.to);

        if (gapTo > cursor) {
            ranges.push({from: cursor, to: gapTo});
        }

        cursor = Math.max(cursor, Math.min(cueRange.to, selectionRange.to));
    });

    if (selectionRange.to > cursor) {
        ranges.push({from: cursor, to: selectionRange.to});
    }

    return ranges;
};

const buildDeleteSelectionPreservingCueAtoms = (state: EditorState): Transaction | null => {
    const {selection} = state;

    if (selection.empty) {
        return null;
    }

    const cueRanges = getCueAtomRangesInSelection(state);

    if (cueRanges.length === 0) {
        return null;
    }

    const deleteRanges = getDeleteRangesAroundCueAtoms(
        {from: selection.from, to: selection.to},
        cueRanges,
    );
    const tr = state.tr;

    deleteRanges.slice().reverse().forEach(range => {
        tr.delete(range.from, range.to);
    });

    const selectionPos = Math.min(
        tr.mapping.map(cueRanges[0].to, 1),
        tr.doc.content.size,
    );

    return tr
        .setSelection(TextSelection.near(tr.doc.resolve(selectionPos), 1))
        .scrollIntoView();
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

    addProseMirrorPlugins() {
        /*
         * Deletion guard: a cue atom is only removed via its pill menu, never
         * by Backspace/Delete next to it or inside a selected range.
         */
        return [
            new Plugin({
                props: {
                    handleKeyDown: (view, event) => {
                        const {selection} = view.state;

                        if ((event.key === 'Backspace' || event.key === 'Delete') && !selection.empty) {
                            const tr = buildDeleteSelectionPreservingCueAtoms(view.state);

                            if (!tr) {
                                return false;
                            }

                            event.preventDefault();
                            view.dispatch(tr);

                            return true;
                        }

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
