import {COMMENT_ANCHOR_MARK_NAME, COMMENT_THREAD_ID_ATTR} from '@stagistic/script';
import {Extension} from '@tiptap/core';
import {Plugin} from '@tiptap/pm/state';

import {
    applyMeta,
    type CommentsBaseState,
    type CommentsMeta,
    commentsPluginKey,
    createAnchorMark,
    finalize,
    getCommentsState,
    mapDraft,
    mapTombstones,
    readDraft,
    withMeta,
} from './commentsPluginState';
import {detectMergedBlocks} from './detectMergedBlocks';
import {isThreadMarked} from './isThreadMarked';
import type {
    CommentsExtensionCallbacks,
    CommentsPluginState,
    EditorCommentThreadRef,
} from './types';

export {commentsPluginKey, getCommentsState} from './commentsPluginState';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        comments: {
            setCommentThreads: (threads: readonly EditorCommentThreadRef[]) => ReturnType,
            startCommentDraft: () => ReturnType,
            cancelCommentDraft: () => ReturnType,
            commitCommentDraft: (threadId: string) => ReturnType,
            removeCommentAnchor: (threadId: string) => ReturnType,
            restoreCommentAnchor: (threadId: string) => ReturnType,
            setActiveCommentThread: (threadId: string | null) => ReturnType,
            setHoveredCommentThread: (threadId: string | null) => ReturnType,
            setHoveredCommentBlock: (blockId: string | null) => ReturnType,
            /** Asks the host to reveal the Comments panel (margin marker click). */
            requestCommentsReveal: () => ReturnType,
        },
    }
}

export interface CommentsExtensionOptions {
    /*
     * A getter, not a ref object: Tiptap's configure() deep-merges plain-object
     * options, which would copy a ref and freeze its first value.
     */
    getCallbacks: () => CommentsExtensionCallbacks,
}

export const CommentsExtension = Extension.create<CommentsExtensionOptions>({
    name: 'comments',

    addOptions() {
        return {getCallbacks: () => ({})};
    },

    addKeyboardShortcuts() {
        return {
            'Mod-Alt-m': () => this.editor.commands.startCommentDraft(),
        };
    },

    addCommands() {
        return {
            setCommentThreads:
                threads => ({tr, dispatch}) => {
                    dispatch?.(withMeta(tr, {type: 'threads', threads}));

                    return true;
                },
            startCommentDraft:
                () => ({
                    tr,
                    state,
                    dispatch,
                }) => {
                    const draft = readDraft(state);

                    if (!draft) {
                        return false;
                    }

                    dispatch?.(withMeta(tr, {type: 'draft', draft}));

                    return true;
                },
            cancelCommentDraft:
                () => ({tr, dispatch}) => {
                    dispatch?.(withMeta(tr, {type: 'draft', draft: null}));

                    return true;
                },
            commitCommentDraft:
                threadId => ({
                    tr,
                    state,
                    dispatch,
                }) => {
                    const draft = getCommentsState(state).draft;

                    if (!draft) {
                        return false;
                    }

                    if (dispatch) {
                        if (draft.kind === 'range') {
                            tr.addMark(draft.from, draft.to, createAnchorMark(state, threadId));
                        }

                        dispatch(withMeta(tr, {type: 'commit', threadId}));
                    }

                    return true;
                },
            removeCommentAnchor:
                threadId => ({
                    tr,
                    state,
                    dispatch,
                }) => {
                    const anchor = getCommentsState(state).anchors.get(threadId);

                    if (dispatch) {
                        state.doc.descendants((node, pos) => {
                            node.marks
                                .filter(mark => mark.type.name === COMMENT_ANCHOR_MARK_NAME && mark.attrs[COMMENT_THREAD_ID_ATTR] === threadId)
                                .forEach(mark => tr.removeMark(pos, pos + node.nodeSize, mark));
                        });
                        dispatch(
                            withMeta(tr, {
                                type: 'tombstone',
                                threadId,
                                tombstone: anchor?.kind === 'range' ? {from: anchor.from, to: anchor.to} : null,
                            }),
                        );
                    }

                    return true;
                },
            restoreCommentAnchor:
                threadId => ({
                    tr,
                    state,
                    dispatch,
                }) => {
                    const tombstone = getCommentsState(state).tombstones.get(threadId);

                    if (dispatch) {
                        if (tombstone && tombstone.from < tombstone.to && tombstone.to <= state.doc.content.size) {
                            tr.addMark(tombstone.from, tombstone.to, createAnchorMark(state, threadId));
                        }

                        dispatch(withMeta(tr, {
                            type: 'tombstone',
                            threadId,
                            tombstone: null,
                        }));
                    }

                    return true;
                },
            setActiveCommentThread:
                threadId => ({tr, dispatch}) => {
                    dispatch?.(withMeta(tr, {type: 'active', threadId}));

                    return true;
                },
            setHoveredCommentThread:
                threadId => ({tr, dispatch}) => {
                    dispatch?.(withMeta(tr, {type: 'hovered', threadId}));

                    return true;
                },
            setHoveredCommentBlock:
                blockId => ({tr, dispatch}) => {
                    dispatch?.(withMeta(tr, {type: 'hoveredBlock', blockId}));

                    return true;
                },
            requestCommentsReveal:
                () => ({dispatch}) => {
                    if (dispatch) {
                        this.options.getCallbacks().onRequestReveal?.();
                    }

                    return true;
                },
        };
    },

    addProseMirrorPlugins() {
        const {getCallbacks} = this.options;

        return [
            new Plugin<CommentsPluginState>({
                key: commentsPluginKey,
                state: {
                    init: (_config, state) => finalize(state.doc, {
                        threads: new Map(),
                        draft: null,
                        activeThreadId: null,
                        hoveredThreadId: null,
                        hoveredBlockId: null,
                        tombstones: new Map(),
                        mergedBlocks: [],
                    }),
                    apply: (tr, previous, oldState) => {
                        const meta = tr.getMeta(commentsPluginKey) as CommentsMeta | undefined;
                        // Plugin follow-ups (appendTransaction) belong to the same user step: keep its merges.
                        const isAppended = Boolean(tr.getMeta('appendedTransaction'));

                        if (!tr.docChanged && !meta) {
                            return isAppended || previous.mergedBlocks.length === 0 ? previous : {...previous, mergedBlocks: []};
                        }

                        const isHistory = Boolean(tr.getMeta('history$'));
                        const detectedMerges =
                            tr.docChanged && !isHistory && tr.doc.childCount < oldState.doc.childCount
                                ? detectMergedBlocks(oldState.doc, tr.doc, tr.mapping)
                                : [];
                        const mapped: CommentsBaseState = {
                            threads: previous.threads,
                            draft: mapDraft(previous.draft, tr),
                            activeThreadId: previous.activeThreadId,
                            hoveredThreadId: previous.hoveredThreadId,
                            hoveredBlockId: previous.hoveredBlockId,
                            tombstones: tr.docChanged ? mapTombstones(previous.tombstones, tr) : previous.tombstones,
                            // Only a shrinking block count can be a join; undo/redo never reports.
                            mergedBlocks: isAppended ? [...previous.mergedBlocks, ...detectedMerges] : detectedMerges,
                        };

                        return finalize(tr.doc, applyMeta(mapped, meta));
                    },
                },
                props: {
                    decorations: state => commentsPluginKey.getState(state)?.decorations,
                    handleClick: (view, pos) => {
                        const pluginState = commentsPluginKey.getState(view.state);
                        const activeAnchor = pluginState?.activeThreadId ? pluginState.anchors.get(pluginState.activeThreadId) : undefined;

                        if (activeAnchor && (pos < activeAnchor.from || pos > activeAnchor.to)) {
                            view.dispatch(withMeta(view.state.tr, {type: 'active', threadId: null}));
                        }

                        const threadIds = [...pluginState?.anchors.values() ?? []]
                            .filter(anchor => anchor.kind === 'range' && anchor.from <= pos && pos <= anchor.to)
                            .filter(anchor => isThreadMarked(pluginState?.threads.get(anchor.threadId)))
                            .map(anchor => anchor.threadId);

                        if (threadIds.length > 0) {
                            getCallbacks().onAnchorClick?.(threadIds);
                        }

                        return false;
                    },
                },
                view: () => ({
                    update: (view, previousState) => {
                        const next = commentsPluginKey.getState(view.state);
                        const previous = commentsPluginKey.getState(previousState);

                        if (next?.draft && !previous?.draft) {
                            getCallbacks().onRequestReveal?.();
                        }

                        if (next && next.mergedBlocks.length > 0 && next.mergedBlocks !== previous?.mergedBlocks) {
                            getCallbacks().onBlocksMerged?.(next.mergedBlocks);
                        }
                    },
                }),
            }),
        ];
    },
});
