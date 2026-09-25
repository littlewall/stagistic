import type {ScriptCommentMessage, ScriptCommentsState, ScriptCommentThread} from '@stagistic/app-core';
import {type CommentAnchorLocation, useEditorComments} from '@stagistic/editor';
import {IconPopover, SearchOptionsIcon, Select, SidebarMiniHeader, ToggleButtonGroup, useToastController} from '@stagistic/ui';
import {type ReactNode, useEffect, useMemo, useRef} from 'react';

import {CommentsBesideView} from './CommentsBesideView';
import {CommentsListView} from './CommentsListView';
import {CommentThreadCard} from './CommentThreadCard';
import {matchesCommentFilter} from './filterThreads';
import type {CommentStatusFilter, CommentsViewMode} from './types';
import type {CommentsPanelState} from './useCommentsPanelState';

import styles from './ScriptCommentsSidebar.module.css';

const VIEW_OPTIONS = [
    {value: 'beside', label: 'Anchored'},
    {value: 'list', label: 'List'},
] as const satisfies readonly {value: CommentsViewMode; label: string}[];

const STATUS_OPTIONS = [
    {value: 'open', label: 'Open'},
    {value: 'resolved', label: 'Resolved'},
    {value: 'all', label: 'All'},
] as const satisfies readonly {value: CommentStatusFilter; label: string}[];

const NO_ANCHORS: ReadonlyMap<string, CommentAnchorLocation> = new Map();

const groupMessagesByThread = (messages: readonly ScriptCommentMessage[]) => {
    const grouped = new Map<string, ScriptCommentMessage[]>();

    [...messages]
        .sort((left, right) => left.createdAt - right.createdAt)
        .forEach(message => grouped.set(message.threadId, [...(grouped.get(message.threadId) ?? []), message]));

    return grouped;
};

interface ScriptCommentsSidebarProps {
    header: ReactNode;
    comments: ScriptCommentsState;
    panelState: CommentsPanelState;
}

export const ScriptCommentsSidebar = ({header, comments, panelState}: ScriptCommentsSidebarProps) => {
    const editorComments = useEditorComments();
    const {addToast} = useToastController();
    const {viewMode, setViewMode, filter, setFilter, expandedBlockId, setExpandedBlockId, pendingActivation, clearPendingActivation} = panelState;
    const anchors = editorComments.state?.anchors ?? NO_ANCHORS;
    const draft = editorComments.state?.draft ?? null;
    const activeThreadId = editorComments.state?.activeThreadId ?? null;
    const hoveredThreadId = editorComments.state?.hoveredThreadId ?? null;
    const hoveredBlockId = editorComments.state?.hoveredBlockId ?? null;
    const openThreadIdsByBlockId = editorComments.state?.openThreadIdsByBlockId;
    // Hovering a card, its underline or its block's margin marker lights the card(s).
    const highlightedThreadIds = useMemo(
        () => new Set([...(hoveredThreadId ? [hoveredThreadId] : []), ...((hoveredBlockId && openThreadIdsByBlockId?.get(hoveredBlockId)) || [])]),
        [hoveredBlockId, hoveredThreadId, openThreadIdsByBlockId],
    );
    const messagesByThreadId = useMemo(() => groupMessagesByThread(comments.messages), [comments.messages]);
    const visibleThreads = useMemo(() => comments.threads.filter(thread => matchesCommentFilter(thread, filter)), [comments.threads, filter]);
    const {setActive} = editorComments;

    // A group opened for one thread folds back once the active thread leaves it.
    const previousActiveRef = useRef(activeThreadId);

    useEffect(() => {
        if (previousActiveRef.current === activeThreadId) {
            return;
        }

        previousActiveRef.current = activeThreadId;

        if (expandedBlockId && (activeThreadId === null || anchors.get(activeThreadId)?.blockId !== expandedBlockId)) {
            setExpandedBlockId(null);
        }
    }, [activeThreadId, anchors, expandedBlockId, setExpandedBlockId]);

    useEffect(() => {
        if (pendingActivation?.[0]) {
            setActive(pendingActivation[0]);
            clearPendingActivation();
        }
    }, [clearPendingActivation, pendingActivation, setActive]);

    const submitDraft = async (body: string) => {
        if (!draft) {
            return;
        }

        const threadId = comments.allocateThreadId();

        editorComments.commitDraft(threadId);

        const created = await comments.createThread({
            id: threadId,
            anchorKind: draft.kind,
            anchorBlockId: draft.kind === 'block' ? draft.blockId : null,
            quotedText: draft.quotedText,
            body,
        });

        if (!created) {
            editorComments.removeAnchor(threadId);
            addToast({title: 'Comment could not be saved', variant: 'error'});
        }
    };

    const deleteThread = async (threadId: string) => {
        editorComments.removeAnchor(threadId);

        const snapshot = await comments.deleteThread(threadId);

        if (!snapshot) {
            return;
        }

        addToast(
            {
                title: 'Comment deleted',
                action: {
                    label: 'Undo',
                    onAction: () => {
                        void comments.restoreThread(snapshot).then(() => editorComments.restoreAnchor(threadId));
                    },
                },
            },
            {timeout: 8000},
        );
    };

    const toggleResolved = (thread: ScriptCommentThread) => {
        const isResolving = thread.status !== 'resolved';

        if (isResolving && activeThreadId === thread.id) {
            editorComments.setActive(null);
        }

        void comments.setStatus(thread.id, isResolving ? 'resolved' : 'open');
    };

    const renderCard = (thread: ScriptCommentThread, {showQuote}: {showQuote: boolean}) => (
        <CommentThreadCard
            key={thread.id}
            thread={thread}
            messages={messagesByThreadId.get(thread.id) ?? []}
            isActive={activeThreadId === thread.id}
            isHighlighted={highlightedThreadIds.has(thread.id)}
            showQuote={showQuote}
            onCollapse={() => editorComments.setActive(null)}
            onActivate={() => {
                // Detached threads have nothing to scroll to but must still open for Resolve/Delete.
                if (viewMode === 'list' && anchors.has(thread.id)) {
                    editorComments.revealAnchor(thread.id);
                } else {
                    editorComments.setActive(thread.id);
                }
            }}
            onHover={isHovered => editorComments.setHovered(isHovered ? thread.id : null)}
            onSubmitDraft={() => undefined}
            onCancelDraft={() => undefined}
            onReply={body => void comments.reply(thread.id, body)}
            onEditMessage={(messageId, body) => void comments.editMessage(messageId, body)}
            onDeleteMessage={messageId => void comments.deleteMessage(messageId)}
            onToggleResolved={() => toggleResolved(thread)}
            onDeleteThread={() => void deleteThread(thread.id)}
        />
    );

    const renderDraft = (showQuote: boolean) => (
        <CommentThreadCard
            thread={null}
            messages={[]}
            draftQuote={draft?.quotedText}
            isActive
            showQuote={showQuote}
            onActivate={() => undefined}
            onCollapse={() => undefined}
            onHover={() => undefined}
            onSubmitDraft={body => void submitDraft(body)}
            onCancelDraft={editorComments.cancelDraft}
            onReply={() => undefined}
            onEditMessage={() => undefined}
            onDeleteMessage={() => undefined}
            onToggleResolved={() => undefined}
            onDeleteThread={() => undefined}
        />
    );

    const isEmpty = visibleThreads.length === 0 && !draft;

    return (
        <div className={styles.content} data-comments-panel="true">
            <SidebarMiniHeader
                navigation={header}
                controls={
                    <IconPopover aria-label="Comments view and filter" icon={<SearchOptionsIcon aria-hidden="true" />} size="xs">
                        <div className={styles.displayField}>
                            <span className={styles.displayLabel}>View</span>
                            <ToggleButtonGroup ariaLabel="Comments view" options={VIEW_OPTIONS} value={viewMode} onChange={setViewMode} />
                        </div>
                        <div className={styles.displayField}>
                            <span className={styles.displayLabel}>Status</span>
                            <Select
                                ariaLabel="Comment status"
                                variant="form"
                                size="md"
                                options={[...STATUS_OPTIONS]}
                                value={filter.status}
                                onChange={status => {
                                    const option = STATUS_OPTIONS.find(item => item.value === status);

                                    if (option) {
                                        setFilter({...filter, status: option.value});
                                    }
                                }}
                            />
                        </div>
                    </IconPopover>
                }
            />
            {isEmpty ? (
                <p className={styles.empty}>No comments. Select text and press ⌘⌥M.</p>
            ) : viewMode === 'beside' ? (
                <CommentsBesideView
                    threads={visibleThreads}
                    anchors={anchors}
                    activeThreadId={activeThreadId}
                    expandedBlockId={expandedBlockId}
                    hoveredBlockId={hoveredBlockId}
                    draft={draft}
                    onExpandBlock={setExpandedBlockId}
                    renderCard={thread => renderCard(thread, {showQuote: false})}
                    renderDraft={() => renderDraft(false)}
                />
            ) : (
                <>
                    {draft ? <div className={styles.listDraft}>{renderDraft(true)}</div> : null}
                    <CommentsListView threads={visibleThreads} anchors={anchors} renderCard={renderCard} />
                </>
            )}
        </div>
    );
};
