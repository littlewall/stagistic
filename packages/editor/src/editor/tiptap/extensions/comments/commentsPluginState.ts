import {COMMENT_ANCHOR_MARK_NAME, COMMENT_THREAD_ID_ATTR} from '@stagistic/script';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import {
    type EditorState, PluginKey, type Transaction,
} from '@tiptap/pm/state';

import {getActiveScriptBlockFromState, SCRIPT_BLOCK_NODE_NAMES} from '../../scriptCore';
import {buildCommentAnchorIndex} from './buildCommentAnchorIndex';
import {buildDecorations} from './commentDecorations';
import type {
    CommentAnchorLocation, CommentDraft, CommentsPluginState, CommentTombstone, EditorCommentThreadRef,
} from './types';

export type CommentsMeta =
    | {type: 'threads', threads: readonly EditorCommentThreadRef[]}
    | {type: 'draft', draft: CommentDraft | null}
    | {type: 'commit', threadId: string}
    | {type: 'active', threadId: string | null}
    | {type: 'hovered', threadId: string | null}
    | {type: 'hoveredBlock', blockId: string | null}
    | {
        type: 'tombstone', threadId: string, tombstone: CommentTombstone | null,
    };

export type CommentsBaseState = Omit<CommentsPluginState, 'anchors' | 'openThreadIdsByBlockId' | 'decorations'>;

export const commentsPluginKey = new PluginKey<CommentsPluginState>('editor-comments');

const groupOpenThreadsByBlock = (anchors: ReadonlyMap<string, CommentAnchorLocation>, threads: ReadonlyMap<string, EditorCommentThreadRef>) => {
    const grouped = new Map<string, string[]>();

    [...anchors.values()]
        .filter(anchor => threads.get(anchor.threadId)?.status === 'open')
        .sort((left, right) => left.from - right.from || (left.kind === 'block' ? -1 : 1))
        .forEach(anchor => grouped.set(anchor.blockId, [...grouped.get(anchor.blockId) ?? [], anchor.threadId]));

    return grouped;
};

export const finalize = (doc: ProseMirrorNode, base: CommentsBaseState): CommentsPluginState => {
    const anchors = buildCommentAnchorIndex(doc, base.threads);
    const openThreadIdsByBlockId = groupOpenThreadsByBlock(anchors, base.threads);

    return {
        ...base,
        anchors,
        openThreadIdsByBlockId,
        decorations: buildDecorations(doc, {
            ...base, anchors, openThreadIdsByBlockId,
        }),
    };
};

export const mapDraft = (draft: CommentDraft | null, tr: Transaction): CommentDraft | null => {
    if (!draft || !tr.docChanged) {
        return draft;
    }

    const from = tr.mapping.map(draft.from, 1);
    const to = tr.mapping.map(draft.to, -1);

    if (draft.kind === 'range' && from >= to) {
        return null;
    }

    return {
        ...draft, from, to,
    };
};

export const mapTombstones = (tombstones: ReadonlyMap<string, CommentTombstone>, tr: Transaction) => {
    const mapped = new Map<string, CommentTombstone>();

    tombstones.forEach((tombstone, threadId) => {
        mapped.set(threadId, {from: tr.mapping.map(tombstone.from, 1), to: tr.mapping.map(tombstone.to, -1)});
    });

    return mapped;
};

export const readDraft = (state: EditorState): CommentDraft | null => {
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

    return {
        kind: 'block', blockId: block.id, from: block.from, to: block.to, quotedText: block.node.textContent,
    };
};

export const applyMeta = (base: CommentsBaseState, meta: CommentsMeta | undefined): CommentsBaseState => {
    switch (meta?.type) {
        case 'threads':
            return {...base, threads: new Map(meta.threads.map(thread => [thread.id, thread]))};
        case 'draft':
            return {
                ...base, draft: meta.draft, activeThreadId: meta.draft ? null : base.activeThreadId,
            };
        case 'commit':
            return {
                ...base, draft: null, activeThreadId: meta.threadId,
            };
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

export const createAnchorMark = (state: EditorState, threadId: string) => {
    return state.schema.marks[COMMENT_ANCHOR_MARK_NAME].create({[COMMENT_THREAD_ID_ATTR]: threadId});
};

export const withMeta = (tr: Transaction, meta: CommentsMeta) => tr.setMeta(commentsPluginKey, meta).setMeta('addToHistory', false);

export const getCommentsState = (state: EditorState): CommentsPluginState => {
    const value = commentsPluginKey.getState(state);

    if (!value) {
        throw new Error('CommentsExtension is not registered');
    }

    return value;
};
