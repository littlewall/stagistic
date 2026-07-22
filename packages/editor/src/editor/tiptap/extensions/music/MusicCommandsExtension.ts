import {
    MUSIC_ID_ATTR,
    MUSIC_KIND_ATTR,
    MUSIC_OUT_NODE_NAME,
    MUSIC_START_NODE_NAME,
    MUSIC_TITLE_ATTR,
    type MusicMode,
} from '@stagistic/script';
import {Extension} from '@tiptap/core';
import {
    type EditorState,
    Plugin,
    TextSelection,
    type Transaction,
} from '@tiptap/pm/state';

import {buildIndexSnapshotFromPmDoc} from '../../../runtime/buildIndexSnapshotFromPmDoc';
import {IMMEDIATE_SAVE_META_KEY} from '../../../saveMeta';
import {
    isCaretBeforeTrailingMusic,
    isMusicAtom,
    moveCaretBeforeTrailingMusic,
    moveCaretBeforeTrailingMusicInPreviousBlock,
    moveCaretToNextBlockAfterTrailingMusic,
} from './musicCaret';
import {
    blockHasMusicStart,
    buildDeleteMusicStart,
    buildInsertMusicStart,
    buildUpdateMusicMode,
    focusMusicTitle,
    resolveMusicTargetBlock,
    resolveScriptTargetBlock,
} from './musicCommands';
import {
    buildMoveOrphanMusicOut,
    buildRemoveMusicOutAtBlock,
    buildSetMusicOutAtBlock,
    findMusicAtomRange,
    resolveMusicOutCandidate,
} from './musicOutCommands';

const isMusicPillTarget = (target: EventTarget | null) => {
    return target instanceof Element && target.closest('[data-music-pill]') !== null;
};

const resolveTrailingMusicClickPosition = (
    state: EditorState,
    event: MouseEvent,
): number | null => {
    const target = event.target;
    const blockElement = target instanceof Element
        ? target.closest<HTMLElement>('[data-id]')
        : null;
    const musicPill = blockElement?.querySelector<HTMLElement>('[data-music-pill]');

    if (!blockElement || !musicPill) {
        return null;
    }

    const musicRect = musicPill.getBoundingClientRect();
    const isAfterMusic = event.clientX > musicRect.right
        && event.clientY >= musicRect.top
        && event.clientY <= musicRect.bottom;

    if (!isAfterMusic) {
        return null;
    }

    return resolveScriptTargetBlock(state, blockElement.dataset.id)?.to ?? null;
};

type PositionRange = {
    from: number,
    to: number,
};

const getMusicAtomRangesInSelection = (state: EditorState) => {
    const {from, to} = state.selection;
    const ranges: PositionRange[] = [];

    state.doc.nodesBetween(from, to, (node, pos) => {
        if (!isMusicAtom(node)) {
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

const getDeleteRangesAroundMusicAtoms = (
    selectionRange: PositionRange,
    musicRanges: PositionRange[],
): PositionRange[] => {
    const ranges: PositionRange[] = [];
    let cursor = selectionRange.from;

    musicRanges.forEach(musicRange => {
        const gapTo = Math.min(musicRange.from, selectionRange.to);

        if (gapTo > cursor) {
            ranges.push({from: cursor, to: gapTo});
        }

        cursor = Math.max(cursor, Math.min(musicRange.to, selectionRange.to));
    });

    if (selectionRange.to > cursor) {
        ranges.push({from: cursor, to: selectionRange.to});
    }

    return ranges;
};

const buildDeleteSelectionPreservingMusicAtoms = (state: EditorState): Transaction | null => {
    const {selection} = state;

    if (selection.empty) {
        return null;
    }

    const musicRanges = getMusicAtomRangesInSelection(state);

    if (musicRanges.length === 0) {
        return null;
    }

    const deleteRanges = getDeleteRangesAroundMusicAtoms(
        {from: selection.from, to: selection.to},
        musicRanges,
    );
    const tr = state.tr;

    deleteRanges.slice().reverse().forEach(range => {
        tr.delete(range.from, range.to);
    });

    const selectionPos = Math.min(
        tr.mapping.map(musicRanges[0].to, 1),
        tr.doc.content.size,
    );

    return tr
        .setSelection(TextSelection.near(tr.doc.resolve(selectionPos), 1))
        .scrollIntoView();
};

const findMusicStartPositionById = (state: EditorState, musicId: string): number | null => {
    let position: number | null = null;

    state.doc.descendants((node, pos) => {
        if (position !== null) {
            return false;
        }

        if (node.type.name === MUSIC_START_NODE_NAME && node.attrs[MUSIC_ID_ATTR] === musicId) {
            position = pos;

            return false;
        }

        return true;
    });

    return position;
};

interface MusicCommandsExtensionOptions {
    onMusicUnassigned?: (musicId: string) => void,
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        music: {
            insertMusicStart: (
                blockId: string | null,
                title: string,
                mode?: MusicMode,
                options?: {
                    musicId?: string,
                    kind?: string | null,
                    isDraft?: boolean,
                },
            ) => ReturnType,
            insertMusicOut: (blockId: string | null) => ReturnType,
            insertMusicDraft: (blockId: string | null) => ReturnType,
            setMusicOutAtBlock: (blockId: string | null) => ReturnType,
            removeMusicOutAtBlock: (blockId: string) => ReturnType,
            moveOrphanMusicOut: (sourceBlockId: string, targetBlockId: string) => ReturnType,
            deleteMusicStart: (pos: number) => ReturnType,
            updateMusicMode: (pos: number, mode: MusicMode) => ReturnType,
            unassignMusic: (musicId: string) => ReturnType,
            updateMusicMetadata: (
                musicId: string,
                title: string,
                kind: 'song' | 'instrumental',
            ) => ReturnType,
        },
    }
}

export const MusicCommandsExtension = Extension.create<MusicCommandsExtensionOptions>({
    name: 'musicCommands',

    addOptions() {
        return {};
    },

    addCommands() {
        return {
            insertMusicStart: (blockId, title, mode = 'open', options) => ({state, dispatch}) => {
                const block = resolveMusicTargetBlock(state, blockId);

                if (!block || blockHasMusicStart(block)) {
                    return false;
                }

                if (dispatch) {
                    dispatch(buildInsertMusicStart(state, block, title, mode, options));
                }

                return true;
            },
            insertMusicDraft: blockId => ({state, dispatch}) => {
                const block = resolveMusicTargetBlock(state, blockId);

                if (!block || blockHasMusicStart(block)) {
                    return false;
                }

                if (dispatch) {
                    dispatch(buildInsertMusicStart(state, block, '', 'open', {isDraft: true}));
                    focusMusicTitle(this.editor.view.dom, block.id);
                }

                return true;
            },
            insertMusicOut: blockId => ({commands}) => commands.setMusicOutAtBlock(blockId),
            setMusicOutAtBlock: blockId => ({state, dispatch}) => {
                const block = resolveScriptTargetBlock(state, blockId);

                if (!block) {
                    return false;
                }

                if (findMusicAtomRange(block, MUSIC_OUT_NODE_NAME)) {
                    return true;
                }

                const snapshot = buildIndexSnapshotFromPmDoc(state.doc);

                if (!resolveMusicOutCandidate(snapshot, block.id)) {
                    return false;
                }

                const tr = buildSetMusicOutAtBlock(state, block.id);

                if (dispatch && tr) {
                    dispatch(tr);
                }

                return true;
            },
            removeMusicOutAtBlock: blockId => ({state, dispatch}) => {
                const tr = buildRemoveMusicOutAtBlock(state, blockId);

                if (!tr) {
                    return false;
                }

                dispatch?.(tr);

                return true;
            },
            moveOrphanMusicOut: (sourceBlockId, targetBlockId) => ({state, dispatch}) => {
                const transaction = buildMoveOrphanMusicOut(
                    state,
                    sourceBlockId,
                    targetBlockId,
                );

                if (!transaction) {
                    return false;
                }

                dispatch?.(transaction);

                return true;
            },
            deleteMusicStart: pos => ({state, dispatch}) => {
                const node = state.doc.nodeAt(pos);

                if (!node || node.type.name !== MUSIC_START_NODE_NAME) {
                    return false;
                }

                if (dispatch) {
                    dispatch(buildDeleteMusicStart(state, pos, node));

                    const musicId = String(node.attrs[MUSIC_ID_ATTR] ?? '');

                    if (musicId) {
                        this.options.onMusicUnassigned?.(musicId);
                    }
                }

                return true;
            },
            updateMusicMode: (pos, mode) => ({state, dispatch}) => {
                const node = state.doc.nodeAt(pos);

                if (!node || node.type.name !== MUSIC_START_NODE_NAME) {
                    return false;
                }

                dispatch?.(buildUpdateMusicMode(state, pos, node, mode));

                return true;
            },
            unassignMusic: musicId => ({state, dispatch}) => {
                const pos = findMusicStartPositionById(state, musicId);

                if (pos === null) {
                    return false;
                }

                const node = state.doc.nodeAt(pos);

                if (!node || node.type.name !== MUSIC_START_NODE_NAME) {
                    return false;
                }

                if (dispatch) {
                    dispatch(buildDeleteMusicStart(state, pos, node));
                    this.options.onMusicUnassigned?.(musicId);
                }

                return true;
            },
            updateMusicMetadata: (musicId, title, kind) => ({state, dispatch}) => {
                const pos = findMusicStartPositionById(state, musicId);
                const normalizedTitle = title.trim();

                if (pos === null || !normalizedTitle) {
                    return false;
                }

                const node = state.doc.nodeAt(pos);

                if (!node || node.type.name !== MUSIC_START_NODE_NAME) {
                    return false;
                }

                if (dispatch) {
                    dispatch(state.tr.setNodeMarkup(pos, undefined, {
                        ...node.attrs,
                        [MUSIC_TITLE_ATTR]: normalizedTitle,
                        [MUSIC_KIND_ATTR]: kind,
                    }).setMeta(IMMEDIATE_SAVE_META_KEY, true));
                }

                return true;
            },
        };
    },

    addProseMirrorPlugins() {
        /*
         * Music boundary: the caret never rests after a trailing music atom, arrow
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
                        ? moveCaretBeforeTrailingMusic(newState, newState.selection.from)
                        : null;
                },
                props: {
                    handleDOMEvents: {
                        mousedown: (view, event) => {
                            if (event.button !== 0 || isMusicPillTarget(event.target)) {
                                return false;
                            }

                            const clickPosition = resolveTrailingMusicClickPosition(view.state, event);
                            const tr = clickPosition !== null
                                ? moveCaretBeforeTrailingMusic(view.state, clickPosition)
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
                        if (isMusicPillTarget(event.target)) {
                            return false;
                        }

                        const {selection} = view.state;

                        if (
                            event.key.toLocaleLowerCase() === 'o'
                            && event.shiftKey
                            && (event.metaKey || event.ctrlKey)
                            && !event.altKey
                            && !event.isComposing
                        ) {
                            const block = resolveScriptTargetBlock(view.state);

                            if (!block) {
                                return false;
                            }

                            const hasOut = findMusicAtomRange(block, MUSIC_OUT_NODE_NAME) !== null;
                            const snapshot = buildIndexSnapshotFromPmDoc(view.state.doc);

                            if (!hasOut && !resolveMusicOutCandidate(snapshot, block.id)) {
                                return false;
                            }

                            event.preventDefault();

                            const tr = hasOut ? null : buildSetMusicOutAtBlock(view.state, block.id);

                            if (tr) {
                                view.dispatch(tr);
                            }

                            return true;
                        }

                        if ((event.key === 'Backspace' || event.key === 'Delete') && !selection.empty) {
                            const tr = buildDeleteSelectionPreservingMusicAtoms(view.state);

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
                            const tr = moveCaretBeforeTrailingMusicInPreviousBlock(view.state);

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
                            && isCaretBeforeTrailingMusic(view.state)
                        ) {
                            event.preventDefault();

                            const tr = moveCaretToNextBlockAfterTrailingMusic(view.state);

                            if (tr) {
                                view.dispatch(tr);
                            }

                            return true;
                        }

                        if (event.key === 'Backspace' && isMusicAtom(selection.$from.nodeBefore)) {
                            event.preventDefault();

                            return true;
                        }

                        if (event.key === 'Delete' && isMusicAtom(selection.$from.nodeAfter)) {
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
