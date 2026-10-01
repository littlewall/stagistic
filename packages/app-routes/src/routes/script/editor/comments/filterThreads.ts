import {type CommentFilter, DEFAULT_COMMENT_FILTER} from './types';

export interface FilterableThread {
    id: string,
    status: string,
}

export const matchesCommentFilter = (thread: FilterableThread, filter: CommentFilter): boolean => {
    return filter.status === 'all' || thread.status === filter.status;
};

/** Any field off its default narrows the results; the filter trigger shows a dot. */
export const isCommentFilterActive = (filter: CommentFilter): boolean => {
    return (Object.keys(DEFAULT_COMMENT_FILTER) as (keyof CommentFilter)[]).some(key => filter[key] !== DEFAULT_COMMENT_FILTER[key]);
};
