import type {DecorationSet} from '@tiptap/pm/view';

export type EditorCommentAnchorKind = 'range' | 'block';
export type EditorCommentThreadStatus = 'open' | 'resolved';

/** Host-provided thread facts the editor needs; content stays in the host. */
export interface EditorCommentThreadRef {
    id: string,
    status: EditorCommentThreadStatus,
    anchorKind: EditorCommentAnchorKind,
    anchorBlockId: string | null,
    /** Host filter hides it: no underline or margin marker unless active. */
    isFilteredOut?: boolean,
}

export interface CommentAnchorLocation {
    threadId: string,
    kind: EditorCommentAnchorKind,
    blockId: string,
    /** Document position of the anchor start (block content start for block anchors). */
    from: number,
    to: number,
    /** Index of the anchor's first block in document order; used for sorting. */
    blockIndex: number,
    sceneBlockId: string | null,
    /** 1-based scene ordinal, as the editor numbers scenes; null before the first scene. */
    sceneNumber: number | null,
    sceneTitle: string,
}

export interface CommentDraft {
    kind: EditorCommentAnchorKind,
    blockId: string,
    from: number,
    to: number,
    quotedText: string,
}

export interface CommentBlockMerge {
    fromBlockId: string,
    toBlockId: string,
}

export interface CommentTombstone {
    from: number,
    to: number,
}

export interface CommentsPluginState {
    threads: ReadonlyMap<string, EditorCommentThreadRef>,
    anchors: ReadonlyMap<string, CommentAnchorLocation>,
    /** Marked (open, not filtered out) threads grouped by the block their anchor starts in, in document order. */
    openThreadIdsByBlockId: ReadonlyMap<string, readonly string[]>,
    draft: CommentDraft | null,
    activeThreadId: string | null,
    hoveredThreadId: string | null,
    /** Block whose margin marker is hovered; lights all of its marked threads. */
    hoveredBlockId: string | null,
    tombstones: ReadonlyMap<string, CommentTombstone>,
    mergedBlocks: readonly CommentBlockMerge[],
    decorations: DecorationSet,
}

export interface CommentsExtensionCallbacks {
    /** Draft started or marker clicked: host should reveal the Comments panel. */
    onRequestReveal?: () => void,
    /** Whether the Comments panel is visible; a marker click only closes a thread the panel shows. */
    isPanelOpen?: () => boolean,
    /** Underline clicked; host highlights only if the panel is already open. */
    onAnchorClick?: (threadIds: readonly string[]) => void,
    onBlocksMerged?: (merges: readonly CommentBlockMerge[]) => void,
}
