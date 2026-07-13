import {
    CUE_ID_ATTR,
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
    buildDeleteCueStart,
    buildInsertCueOut,
    buildInsertCueStart,
    resolveCueTargetBlock,
} from './cueCommands';

const isCueAtom = (node: ProseMirrorNode | null | undefined): boolean => {
    return node?.type.name === CUE_START_NODE_NAME || node?.type.name === CUE_OUT_NODE_NAME;
};

const isCuePillTarget = (target: EventTarget | null) => {
    return target instanceof Element && target.closest('[data-cue-pill]') !== null;
};

const resolveTrailingCueClickPosition = (
    state: EditorState,
    event: MouseEvent,
): number | null => {
    const target = event.target;
    const blockElement = target instanceof Element
        ? target.closest<HTMLElement>('[data-id]')
        : null;
    const cuePill = blockElement?.querySelector<HTMLElement>('[data-cue-pill]');

    if (!blockElement || !cuePill) {
        return null;
    }

    const cueRect = cuePill.getBoundingClientRect();
    const isAfterCue = event.clientX > cueRect.right
        && event.clientY >= cueRect.top
        && event.clientY <= cueRect.bottom;

    if (!isAfterCue) {
        return null;
    }

    return resolveCueTargetBlock(state, blockElement.dataset.id)?.to ?? null;
};

const moveCaretBeforeTrailingCue = (state: EditorState, pos: number): Transaction | null => {
    const resolvedPos = state.doc.resolve(pos);
    const cue = resolvedPos.nodeBefore;

    if (!cue || !isCueAtom(cue) || resolvedPos.parentOffset !== resolvedPos.parent.content.size) {
        return null;
    }

    const cuePos = pos - cue.nodeSize;

    return state.tr
        .setSelection(TextSelection.near(state.doc.resolve(cuePos), -1))
        .scrollIntoView();
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

const findCueStartPositionById = (state: EditorState, cueId: string): number | null => {
    let position: number | null = null;

    state.doc.descendants((node, pos) => {
        if (position !== null) {
            return false;
        }

        if (node.type.name === CUE_START_NODE_NAME && node.attrs[CUE_ID_ATTR] === cueId) {
            position = pos;

            return false;
        }

        return true;
    });

    return position;
};

interface CueCommandsExtensionOptions {
    onCueUnassigned?: (cueId: string) => void,
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        cue: {
            insertCueStart: (
                blockId: string | null,
                title: string,
                mode?: CueMode,
                options?: {cueId?: string, kind?: string | null, isDraft?: boolean},
            ) => ReturnType,
            insertCueOut: (blockId: string | null) => ReturnType,
            deleteCueStart: (pos: number) => ReturnType,
            unassignCue: (cueId: string) => ReturnType,
        },
    }
}

export const CueCommandsExtension = Extension.create<CueCommandsExtensionOptions>({
    name: 'cueCommands',

    addOptions() {
        return {};
    },

    addCommands() {
        return {
            insertCueStart: (blockId, title, mode = 'open', options) => ({state, dispatch}) => {
                const block = resolveCueTargetBlock(state, blockId);

                if (!block || blockHasCueAtom(block)) {
                    return false;
                }

                if (dispatch) {
                    dispatch(buildInsertCueStart(state, block, title, mode, options));
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
            deleteCueStart: pos => ({state, dispatch}) => {
                const node = state.doc.nodeAt(pos);

                if (!node || node.type.name !== CUE_START_NODE_NAME) {
                    return false;
                }

                if (dispatch) {
                    dispatch(buildDeleteCueStart(state, pos, node));
                    const cueId = String(node.attrs[CUE_ID_ATTR] ?? '');

                    if (cueId) {
                        this.options.onCueUnassigned?.(cueId);
                    }
                }

                return true;
            },
            unassignCue: cueId => ({state, dispatch}) => {
                const pos = findCueStartPositionById(state, cueId);

                if (pos === null) {
                    return false;
                }

                const node = state.doc.nodeAt(pos);

                if (!node || node.type.name !== CUE_START_NODE_NAME) {
                    return false;
                }

                if (dispatch) {
                    dispatch(buildDeleteCueStart(state, pos, node));
                    this.options.onCueUnassigned?.(cueId);
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
                    handleDOMEvents: {
                        mousedown: (view, event) => {
                            if (event.button !== 0 || isCuePillTarget(event.target)) {
                                return false;
                            }

                            const clickPosition = resolveTrailingCueClickPosition(view.state, event);
                            const tr = clickPosition !== null
                                ? moveCaretBeforeTrailingCue(view.state, clickPosition)
                                : null;

                            if (!tr) {
                                return false;
                            }

                            event.preventDefault();
                            view.dispatch(tr);
                            view.focus();

                            return true;
                        },
                    },
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
