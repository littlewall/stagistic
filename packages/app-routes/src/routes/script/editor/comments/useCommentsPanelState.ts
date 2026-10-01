import {useMemo, useState} from 'react';

import {useSidebarPreference} from '../sidebar/useSidebarPreference';
import {
    type CommentFilter,
    type CommentsViewMode,
    DEFAULT_COMMENT_FILTER,
    parseCommentFilter,
    parseCommentsViewMode,
} from './types';

/*
 * Route-level so switching sidebar panels (which remounts their content) keeps
 * the view, filter and expanded group. The view is a habit (global); the filter
 * depends on one script's comments (per script).
 */
export const useCommentsPanelState = (scriptScope: string) => {
    const [viewMode, setViewMode] = useSidebarPreference<CommentsViewMode>({
        panelId: 'comments',
        name: 'view',
        scope: 'global',
        defaultValue: 'beside',
        parse: parseCommentsViewMode,
    });
    const [filter, setFilter] = useSidebarPreference<CommentFilter>({
        panelId: 'comments',
        name: 'filter',
        scope: {script: scriptScope},
        defaultValue: DEFAULT_COMMENT_FILTER,
        parse: parseCommentFilter,
    });
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
        [
            expandedBlockId,
            filter,
            pendingActivation,
            setFilter,
            setViewMode,
            viewMode,
        ],
    );
};

export type CommentsPanelState = ReturnType<typeof useCommentsPanelState>;
