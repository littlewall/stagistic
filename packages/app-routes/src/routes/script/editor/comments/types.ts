export type CommentsViewMode = 'beside' | 'list';
export type CommentStatusFilter = 'open' | 'resolved' | 'all';

/** Shared by both views. Phase 2 adds `query` and `sceneId`. */
export interface CommentFilter {
    status: CommentStatusFilter;
}

export const DEFAULT_COMMENT_FILTER: CommentFilter = {status: 'open'};
