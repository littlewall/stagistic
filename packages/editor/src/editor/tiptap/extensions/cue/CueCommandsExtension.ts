import {
    CUE_ID_ATTR,
    CUE_KIND_ATTR,
    CUE_START_NODE_NAME,
    CUE_TITLE_ATTR,
    type CueMode,
} from '@stagistic/script';
import {Extension} from '@tiptap/core';
import {
    type EditorState,
    Plugin,
    TextSelection,
    type Transaction,
} from '@tiptap/pm/state';

import {IMMEDIATE_SAVE_META_KEY} from '../../../saveMeta';
import {
    isCaretBeforeTrailingCue,
    isCueAtom,
    moveCaretBeforeTrailingCue,
    moveCaretBeforeTrailingCueInPreviousBlock,
    moveCaretToNextBlockAfterTrailingCue,
} from './cueCaret';
import {
    blockHasCueAtom,
    buildDeleteCueStart,
    buildInsertCueOut,
    buildInsertCueStart,
    resolveCueTargetBlock,
} from './cueCommands';

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
                options?: {
                    cueId?: string,
                    kind?: string | null,
                    isDraft?: boolean,
                },
            ) => ReturnType,
            insertCueOut: (blockId: string | null) => ReturnType,
            deleteCueStart: (pos: number) => ReturnType,
            unassignCue: (cueId: string) => ReturnType,
            updateCueMetadata: (
                cueId: string,
                title: string,
                kind: 'song' | 'instrumental',
            ) => ReturnType,
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
            updateCueMetadata: (cueId, title, kind) => ({state, dispatch}) => {
                const pos = findCueStartPositionById(state, cueId);
                const normalizedTitle = title.trim();

                if (pos === null || !normalizedTitle) {
                    return false;
                }

                const node = state.doc.nodeAt(pos);

                if (!node || node.type.name !== CUE_START_NODE_NAME) {
                    return false;
                }

                if (dispatch) {
                    dispatch(state.tr.setNodeMarkup(pos, undefined, {
                        ...node.attrs,
                        [CUE_TITLE_ATTR]: normalizedTitle,
                        [CUE_KIND_ATTR]: kind,
                    }).setMeta(IMMEDIATE_SAVE_META_KEY, true));
                }

                return true;
            },
        };
    },

    addProseMirrorPlugins() {
        /*
         * Cue boundary: the caret never rests after a trailing cue atom, arrow
         * navigation skips the pill, and deletion only happens via its menu.
         */
        return [
            new Plugin({
                appendTransaction: (transactions, _oldState, newState) => {
                    if (!transactions.some(transaction => {
                        return transaction.selectionSet || transaction.docChanged;
                    })) {
                        return null;
                    }

                    return newState.selection.empty
                        ? moveCaretBeforeTrailingCue(newState, newState.selection.from)
                        : null;
                },
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
                        if (isCuePillTarget(event.target)) {
                            return false;
                        }

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

                        if (
                            event.key === 'ArrowLeft'
                            && !event.altKey
                            && !event.ctrlKey
                            && !event.metaKey
                            && !event.shiftKey
                        ) {
                            const tr = moveCaretBeforeTrailingCueInPreviousBlock(view.state);

                            if (tr) {
                                event.preventDefault();
                                view.dispatch(tr);

                                return true;
                            }
                        }

                        if (
                            event.key === 'ArrowRight'
                            && !event.altKey
                            && !event.ctrlKey
                            && !event.metaKey
                            && !event.shiftKey
                            && isCaretBeforeTrailingCue(view.state)
                        ) {
                            event.preventDefault();

                            const tr = moveCaretToNextBlockAfterTrailingCue(view.state);

                            if (tr) {
                                view.dispatch(tr);
                            }

                            return true;
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
