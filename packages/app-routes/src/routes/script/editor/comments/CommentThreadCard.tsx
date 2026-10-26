import type {ScriptCommentMessage, ScriptCommentThread} from '@stagistic/app-core';
import {MoreActionsMenu} from '@stagistic/ui';
import {
    type Ref,
    useRef,
    useState,
} from 'react';

import styles from './CommentThreadCard.module.css';
import {
    Composer,
    MessageBody,
    Reply,
} from './CommentThreadMessages';
import {formatCommentTime} from './formatCommentTime';

export interface CommentThreadCardProps {
    /** null renders the unsaved draft composer. */
    thread: ScriptCommentThread | null,
    messages: readonly ScriptCommentMessage[],
    draftQuote?: string,
    isActive: boolean,
    /** Lit from the editor: its underline, block or margin marker is hovered. */
    isHighlighted?: boolean,
    /** The List view shows the anchored text; the Anchored view sits next to it instead. */
    showQuote: boolean,
    onActivate: () => void,
    onCollapse: () => void,
    onHover: (isHovered: boolean) => void,
    onSubmitDraft: (body: string) => void,
    onCancelDraft: () => void,
    onReply: (body: string) => void,
    onEditMessage: (messageId: string, body: string) => void,
    onDeleteMessage: (messageId: string) => void,
    onToggleResolved: () => void,
    onDeleteThread: () => void,
    /** A saved draft or version: comments can be read but not changed. */
    isReadOnly?: boolean,
    measureRef?: Ref<HTMLElement>,
}

const classNames = (...names: Array<string | false | undefined>) => names.filter(Boolean).join(' ');

const CommentSummary = ({
    isResolved,
    time,
    quote,
    showQuote,
    root,
    replies,
    onActivate,
}: {
    isResolved: boolean,
    time: string,
    quote: string,
    showQuote: boolean,
    root: ScriptCommentMessage | undefined,
    replies: number,
    onActivate: () => void,
}) => {
    const replyCount = replies === 1 ? '1 reply' : `${replies} replies`;

    return (
        <button className={styles.summary} type="button" aria-expanded={false} onClick={onActivate}>
            <span className={styles.summaryHead}>
                <span className={styles.label}>{isResolved ? 'Resolved' : 'Comment'}</span>
                <time className={styles.time}>{time}</time>
            </span>
            {showQuote && quote ? <span className={styles.quote}>{quote}</span> : null}
            <span className={classNames(styles.body, styles.clamped)}>{root?.body ?? ''}</span>
            {replies > 0 ? <span className={styles.meta}>{replyCount}</span> : null}
        </button>
    );
};

const cardClassName = (active: boolean, highlighted: boolean, resolved: boolean) => classNames(
    styles.card,
    active && styles.active,
    highlighted && styles.highlighted,
    resolved && styles.resolved,
);

const ThreadQuote = ({quote, showQuote}: {quote: string, showQuote: boolean}) => (
    showQuote && quote ? <blockquote className={styles.quote}>{quote}</blockquote> : null
);

const ThreadActionsMenu = ({
    isResolved,
    onEdit,
    onToggleResolved,
    onDeleteThread,
}: {
    isResolved: boolean,
    onEdit: () => void,
    onToggleResolved: () => void,
    onDeleteThread: () => void,
}) => (
    <MoreActionsMenu
        aria-label="More actions"
        items={[
            {id: 'edit', label: 'Edit'},
            {id: 'status', label: isResolved ? 'Reopen' : 'Resolve'},
            {
                id: 'delete',
                label: 'Delete',
                tone: 'danger',
            },
        ]}
        onAction={id => {
            if (id === 'edit') {
                onEdit();

                return;
            }

            if (id === 'status') {
                onToggleResolved();

                return;
            }

            onDeleteThread();
        }}
    />
);

export const CommentThreadCard = ({
    thread,
    messages,
    draftQuote,
    isActive,
    isHighlighted = false,
    showQuote,
    onActivate,
    onCollapse,
    onHover,
    onSubmitDraft,
    onCancelDraft,
    onReply,
    onEditMessage,
    onDeleteMessage,
    onToggleResolved,
    onDeleteThread,
    isReadOnly = false,
    measureRef,
}: CommentThreadCardProps) => {
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const isHoveredRef = useRef(false);
    const quote = thread?.quotedText ?? draftQuote ?? '';
    const [root, ...replies] = messages;
    const isResolved = thread?.status === 'resolved';

    if (!thread) {
        return (
            <article ref={measureRef} className={classNames(styles.card, styles.active)} aria-label="New comment" data-comment-draft="true">
                <div className={styles.content}>
                    <ThreadQuote quote={quote} showQuote={showQuote} />
                    <Composer label="Comment" submitLabel="Comment" autoFocus onSubmit={onSubmitDraft} onCancel={onCancelDraft} />
                </div>
            </article>
        );
    }

    const time = root ? formatCommentTime(root.createdAt) : '';

    return (
        <article
            ref={measureRef}
            className={cardClassName(isActive, isHighlighted, isResolved)}
            aria-label="Comment"
            data-thread-id={thread.id}
            data-highlighted={isHighlighted ? 'true' : undefined}
            // Movement, not mere entry: a closing menu or a card shifting under a still pointer must not light it.
            onPointerMove={() => {
                if (!isHoveredRef.current) {
                    isHoveredRef.current = true;
                    onHover(true);
                }
            }}
            onPointerLeave={() => {
                if (isHoveredRef.current) {
                    isHoveredRef.current = false;
                    onHover(false);
                }
            }}
        >
            {isActive ? (
                <>
                    <header className={styles.header}>
                        {/* The whole tinted header collapses the card; the menu sits above this layer. */}
                        <button className={styles.collapseButton} type="button" aria-label="Collapse comment" aria-expanded onClick={onCollapse} />
                        <span className={styles.label}>{isResolved ? 'Resolved' : 'Comment'}</span>
                        <span className={styles.headerMeta}>
                            <time className={styles.time}>{time}</time>
                            {isReadOnly ? null : (
                                <ThreadActionsMenu
                                    isResolved={isResolved}
                                    onEdit={() => {
                                        if (root) {
                                            setEditingMessageId(root.id);
                                        }
                                    }}
                                    onToggleResolved={onToggleResolved}
                                    onDeleteThread={onDeleteThread}
                                />
                            )}
                        </span>
                    </header>
                    <div className={styles.content}>
                        <ThreadQuote quote={quote} showQuote={showQuote} />
                        {root ? (
                            <MessageBody
                                message={root}
                                isEditing={editingMessageId === root.id}
                                onStopEdit={() => setEditingMessageId(null)}
                                onEdit={body => onEditMessage(root.id, body)}
                            />
                        ) : null}
                        {replies.length > 0 ? (
                            <div className={styles.replies}>
                                {replies.map(message => (
                                    <Reply
                                        key={message.id}
                                        message={message}
                                        isEditing={editingMessageId === message.id}
                                        isReadOnly={isReadOnly}
                                        onStartEdit={() => setEditingMessageId(message.id)}
                                        onStopEdit={() => setEditingMessageId(null)}
                                        onEdit={body => onEditMessage(message.id, body)}
                                        onDelete={() => onDeleteMessage(message.id)}
                                    />
                                ))}
                            </div>
                        ) : null}
                        {isResolved || isReadOnly ? null : (
                            <div className={styles.replyComposer}>
                                <Composer label="Reply" submitLabel="Reply" placeholder="Write a reply…" onSubmit={onReply} />
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <CommentSummary
                    isResolved={isResolved}
                    time={time}
                    quote={quote}
                    showQuote={showQuote}
                    root={root}
                    replies={replies.length}
                    onActivate={onActivate}
                />
            )}
        </article>
    );
};
