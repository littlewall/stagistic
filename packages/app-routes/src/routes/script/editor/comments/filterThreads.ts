import type {CommentFilter} from './types';

export interface FilterableThread {
    id: string;
    status: string;
}

export const matchesCommentFilter = (thread: FilterableThread, filter: CommentFilter): boolean => {
    return filter.status === 'all' || thread.status === filter.status;
};
