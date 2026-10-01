export type CommentsViewMode = 'beside' | 'list';
export type CommentStatusFilter = 'open' | 'resolved' | 'all';

/** Shared by both views. Phase 2 adds `query` and `sceneId`. */
export interface CommentFilter {
    status: CommentStatusFilter,
}

export const DEFAULT_COMMENT_FILTER: CommentFilter = {status: 'all'};

const VIEW_MODES: readonly CommentsViewMode[] = ['beside', 'list'];
const STATUS_FILTERS: readonly CommentStatusFilter[] = [
    'open',
    'resolved',
    'all',
];

export const parseCommentsViewMode = (value: unknown): CommentsViewMode | undefined => {
    return VIEW_MODES.find(mode => mode === value);
};

/** Stored filters keep valid fields and default the rest, so adding a field never drops a saved one. */
export const parseCommentFilter = (value: unknown): CommentFilter | undefined => {
    if (!value || typeof value !== 'object') {
        return undefined;
    }

    const stored = value as Record<string, unknown>;

    return {status: STATUS_FILTERS.find(status => status === stored.status) ?? DEFAULT_COMMENT_FILTER.status};
};
