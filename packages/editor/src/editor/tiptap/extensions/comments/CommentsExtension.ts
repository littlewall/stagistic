import {COMMENT_ANCHOR_MARK_NAME, COMMENT_THREAD_ID_ATTR} from '@stagistic/script';
import {Extension} from '@tiptap/core';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import {type EditorState, Plugin, PluginKey, type Transaction} from '@tiptap/pm/state';
import {Decoration, DecorationSet} from '@tiptap/pm/view';

import {getActiveScriptBlockFromState, SCRIPT_BLOCK_NODE_NAMES} from '../../scriptCore';
import {buildCommentAnchorIndex} from './buildCommentAnchorIndex';
import {detectMergedBlocks} from './detectMergedBlocks';
import type {CommentAnchorLocation, CommentDraft, CommentsExtensionCallbacks, CommentsPluginState, CommentTombstone, EditorCommentThreadRef} from './types';

import styles from './CommentsExtension.module.css';

type CommentsMeta =
    | {type: 'threads'; threads: readonly EditorCommentThreadRef[]}
    | {type: 'draft'; draft: CommentDraft | null}
    | {type: 'commit'; threadId: string}
    | {type: 'active'; threadId: string | null}
    | {type: 'hovered'; threadId: string | null}
    | {type: 'hoveredBlock'; blockId: string | null}
    | {type: 'tombstone'; threadId: string; tombstone: CommentTombstone | null};

type CommentsBaseState = Omit<CommentsPluginState, 'anchors' | 'openThreadIdsByBlockId' | 'decorations'>;

export const commentsPluginKey = new PluginKey<CommentsPluginState>('editor-comments');

const groupOpenThreadsByBlock = (anchors: ReadonlyMap<string, CommentAnchorLocation>, threads: ReadonlyMap<string, EditorCommentThreadRef>) => {
    const grouped = new Map<string, string[]>();

    [...anchors.values()]
        .filter(anchor => threads.get(anchor.threadId)?.status === 'open')
        .sort((left, right) => left.from - right.from || (left.kind === 'block' ? -1 : 1))
        .forEach(anchor => grouped.set(anchor.blockId, [...(grouped.get(anchor.blockId) ?? []), anchor.threadId]));

    return grouped;
};

/** Tints the whole block whose content starts at `contentFrom`; hover uses a lighter tint. */
const blockHighlight = (doc: ProseMirrorNode, contentFrom: number, tone: 'active' | 'hovered' = 'active') => {
    const $pos = doc.resolve(contentFrom);

    if ($pos.depth === 0) {
        return null;
    }

    const blockPos = $pos.before($pos.depth);

    return Decoration.node(blockPos, blockPos + $pos.parent.nodeSize, {
        class: tone === 'active' ? styles.blockActive : styles.blockHovered,
        'data-comment-block-active': tone === 'active' ? 'true' : undefined,
        'data-comment-block-hovered': tone === 'hovered' ? 'true' : undefined,
    });
};

const anchorClass = (tone: 'active' | 'hovered' | null) => {
    if (tone === 'active') {
        return `${styles.anchor} ${styles.anchorActive}`;
    }

    return tone === 'hovered' ? `${styles.anchor} ${styles.anchorHovered}` : styles.anchor;
};

type DecorationInput = CommentsBaseState & {
    anchors: ReadonlyMap<string, CommentAnchorLocation>;
    openThreadIdsByBlockId: ReadonlyMap<string, readonly string[]>;
};

const buildDecorations = (doc: ProseMirrorNode, state: DecorationInput) => {
    // Active/hovered threads tint what they belong to: the underlined text for range
    // anchors, the whole block for block anchors. The margin marker marks both.
    const decorations: Decoration[] = [];
    // Hover is a lighter tint than the active thread, which wins when both apply.
    const hovered = new Set([
        ...(state.hoveredThreadId ? [state.hoveredThreadId] : []),
        ...(state.hoveredBlockId ? (state.openThreadIdsByBlockId.get(state.hoveredBlockId) ?? []) : []),
    ]);
    const toneOf = (threadId: string) => (threadId === state.activeThreadId ? 'active' : hovered.has(threadId) ? 'hovered' : null);

    [...hovered, ...(state.activeThreadId ? [state.activeThreadId] : [])].forEach(threadId => {
        const anchor = state.anchors.get(threadId);
        const tone = toneOf(threadId);

        if (tone && anchor?.kind === 'block' && state.threads.get(threadId)?.status === 'open') {
            const decoration = blockHighlight(doc, anchor.from, tone);

            if (decoration) {
                decorations.push(decoration);
            }
        }
    });

    doc.descendants((node, pos) => {
        if (!node.isText) {
            return true;
        }

        node.marks.forEach(mark => {
            const threadId = String(mark.attrs[COMMENT_THREAD_ID_ATTR] ?? '');

            if (mark.type.name !== COMMENT_ANCHOR_MARK_NAME || state.threads.get(threadId)?.status !== 'open') {
                return;
            }

            decorations.push(
                Decoration.inline(pos, pos + node.nodeSize, {
                    class: anchorClass(toneOf(threadId)),
                    'data-comment-anchor': threadId,
                }),
            );
        });

        return false;
    });

    if (state.draft?.kind === 'range') {
        decorations.push(Decoration.inline(state.draft.from, state.draft.to, {class: styles.draft}));
    }

    if (state.draft?.kind === 'block') {
        const decoration = blockHighlight(doc, state.draft.from);

        if (decoration) {
            decorations.push(decoration);
        }
    }

    return DecorationSet.create(doc, decorations);
};

const finalize = (doc: ProseMirrorNode, base: CommentsBaseState): CommentsPluginState => {
    const anchors = buildCommentAnchorIndex(doc, base.threads);
    const openThreadIdsByBlockId = groupOpenThreadsByBlock(anchors, base.threads);

    return {
        ...base,
        anchors,
        openThreadIdsByBlockId,
        decorations: buildDecorations(doc, {...base, anchors, openThreadIdsByBlockId}),
    };
};

const mapDraft = (draft: CommentDraft | null, tr: Transaction): CommentDraft | null => {
    if (!draft || !tr.docChanged) {
        return draft;
    }

    const from = tr.mapping.map(draft.from, 1);
    const to = tr.mapping.map(draft.to, -1);

    if (draft.kind === 'range' && from >= to) {
        return null;
    }

    return {...draft, from, to};
};

const mapTombstones = (tombstones: ReadonlyMap<string, CommentTombstone>, tr: Transaction) => {
    const mapped = new Map<string, CommentTombstone>();

    tombstones.forEach((tombstone, threadId) => {
        mapped.set(threadId, {from: tr.mapping.map(tombstone.from, 1), to: tr.mapping.map(tombstone.to, -1)});
    });

    return mapped;
};

const readDraft = (state: EditorState): CommentDraft | null => {
    const {selection, doc} = state;
    const block = getActiveScriptBlockFromState(state, SCRIPT_BLOCK_NODE_NAMES);

    if (!block) {
        return null;
    }

    if (!selection.empty) {
        return {
            kind: 'range',
            blockId: block.id,
            from: selection.from,
            to: selection.to,
            quotedText: doc.textBetween(selection.from, selection.to, ' '),
        };
    }

    return {kind: 'block', blockId: block.id, from: block.from, to: block.to, quotedText: block.node.textContent};
};

const applyMeta = (base: CommentsBaseState, meta: CommentsMeta | undefined): CommentsBaseState => {
    switch (meta?.type) {
        case 'threads':
            return {...base, threads: new Map(meta.threads.map(thread => [thread.id, thread]))};
        case 'draft':
            return {...base, draft: meta.draft, activeThreadId: meta.draft ? null : base.activeThreadId};
        case 'commit':
            return {...base, draft: null, activeThreadId: meta.threadId};
        case 'active':
            return {...base, activeThreadId: meta.threadId};
        case 'hovered':
            return {...base, hoveredThreadId: meta.threadId};
        case 'hoveredBlock':
            return {...base, hoveredBlockId: meta.blockId};
        case 'tombstone': {
            const tombstones = new Map(base.tombstones);

            if (meta.tombstone) {
                tombstones.set(meta.threadId, meta.tombstone);
            } else {
                tombstones.delete(meta.threadId);
            }

            return {...base, tombstones};
        }
        default:
            return base;
    }
};

const createAnchorMark = (state: EditorState, threadId: string) => {
    return state.schema.marks[COMMENT_ANCHOR_MARK_NAME].create({[COMMENT_THREAD_ID_ATTR]: threadId});
};

const withMeta = (tr: Transaction, meta: CommentsMeta) => tr.setMeta(commentsPluginKey, meta).setMeta('addToHistory', false);

export const getCommentsState = (state: EditorState): CommentsPluginState => {
    const value = commentsPluginKey.getState(state);

    if (!value) {
        throw new Error('CommentsExtension is not registered');
    }

    return value;
};

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        comments: {
            setCommentThreads: (threads: readonly EditorCommentThreadRef[]) => ReturnType;
            startCommentDraft: () => ReturnType;
            cancelCommentDraft: () => ReturnType;
            commitCommentDraft: (threadId: string) => ReturnType;
            removeCommentAnchor: (threadId: string) => ReturnType;
            restoreCommentAnchor: (threadId: string) => ReturnType;
            setActiveCommentThread: (threadId: string | null) => ReturnType;
            setHoveredCommentThread: (threadId: string | null) => ReturnType;
            setHoveredCommentBlock: (blockId: string | null) => ReturnType;
            /** Asks the host to reveal the Comments panel (margin marker click). */
            requestCommentsReveal: () => ReturnType;
        };
    }
}

export interface CommentsExtensionOptions {
    /*
     * A getter, not a ref object: Tiptap's configure() deep-merges plain-object
     * options, which would copy a ref and freeze its first value.
     */
    getCallbacks: () => CommentsExtensionCallbacks;
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
                threads =>
                ({tr, dispatch}) => {
                    dispatch?.(withMeta(tr, {type: 'threads', threads}));

                    return true;
                },
            startCommentDraft:
                () =>
                ({tr, state, dispatch}) => {
                    const draft = readDraft(state);

                    if (!draft) {
                        return false;
                    }

                    dispatch?.(withMeta(tr, {type: 'draft', draft}));

                    return true;
                },
            cancelCommentDraft:
                () =>
                ({tr, dispatch}) => {
                    dispatch?.(withMeta(tr, {type: 'draft', draft: null}));

                    return true;
                },
            commitCommentDraft:
                threadId =>
                ({tr, state, dispatch}) => {
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
                threadId =>
                ({tr, state, dispatch}) => {
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
                threadId =>
                ({tr, state, dispatch}) => {
                    const tombstone = getCommentsState(state).tombstones.get(threadId);

                    if (dispatch) {
                        if (tombstone && tombstone.from < tombstone.to && tombstone.to <= state.doc.content.size) {
                            tr.addMark(tombstone.from, tombstone.to, createAnchorMark(state, threadId));
                        }

                        dispatch(withMeta(tr, {type: 'tombstone', threadId, tombstone: null}));
                    }

                    return true;
                },
            setActiveCommentThread:
                threadId =>
                ({tr, dispatch}) => {
                    dispatch?.(withMeta(tr, {type: 'active', threadId}));

                    return true;
                },
            setHoveredCommentThread:
                threadId =>
                ({tr, dispatch}) => {
                    dispatch?.(withMeta(tr, {type: 'hovered', threadId}));

                    return true;
                },
            setHoveredCommentBlock:
                blockId =>
                ({tr, dispatch}) => {
                    dispatch?.(withMeta(tr, {type: 'hoveredBlock', blockId}));

                    return true;
                },
            requestCommentsReveal:
                () =>
                ({dispatch}) => {
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
                    init: (_config, state) =>
                        finalize(state.doc, {
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
                        const threadIds = [...(pluginState?.anchors.values() ?? [])]
                            .filter(anchor => anchor.kind === 'range' && anchor.from <= pos && pos <= anchor.to)
                            .filter(anchor => pluginState?.threads.get(anchor.threadId)?.status === 'open')
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
