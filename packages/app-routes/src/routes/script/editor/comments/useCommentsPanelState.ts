import {useMemo, useState} from 'react';

import {type CommentFilter, type CommentsViewMode, DEFAULT_COMMENT_FILTER} from './types';

/*
 * Route-level so switching sidebar panels (which remounts their content) keeps
 * the view, filter and expanded group.
 */
export const useCommentsPanelState = () => {
    const [viewMode, setViewMode] = useState<CommentsViewMode>('beside');
    const [filter, setFilter] = useState<CommentFilter>(DEFAULT_COMMENT_FILTER);
    const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
    /** Threads whose underline was clicked while the panel was open; the panel activates them. */
    const [pendingActivation, setPendingActivation] = useState<readonly string[] | null>(null);

    return useMemo(
        () => ({
            viewMode,
            setViewMode,
            filter,
            setFilter,
            expandedBlockId,
            setExpandedBlockId,
            pendingActivation,
            requestActivation: setPendingActivation,
            clearPendingActivation: () => setPendingActivation(null),
        }),
        [expandedBlockId, filter, pendingActivation, viewMode],
    );
};

export type CommentsPanelState = ReturnType<typeof useCommentsPanelState>;
