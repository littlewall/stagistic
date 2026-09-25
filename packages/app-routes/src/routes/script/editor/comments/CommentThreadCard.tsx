import type {ScriptCommentMessage, ScriptCommentThread} from '@stagistic/app-core';
import {Button, MoreActionsMenu} from '@stagistic/ui';
import {type KeyboardEvent, type Ref, useState} from 'react';

import {formatCommentTime} from './formatCommentTime';

import styles from './CommentThreadCard.module.css';

export interface CommentThreadCardProps {
    /** null renders the unsaved draft composer. */
    thread: ScriptCommentThread | null;
    messages: readonly ScriptCommentMessage[];
    draftQuote?: string;
    isActive: boolean;
    /** Lit from the editor: its underline, block or margin marker is hovered. */
    isHighlighted?: boolean;
    /** The List view shows the anchored text; the Anchored view sits next to it instead. */
    showQuote: boolean;
    onActivate: () => void;
    onCollapse: () => void;
    onHover: (isHovered: boolean) => void;
    onSubmitDraft: (body: string) => void;
    onCancelDraft: () => void;
    onReply: (body: string) => void;
    onEditMessage: (messageId: string, body: string) => void;
    onDeleteMessage: (messageId: string) => void;
    onToggleResolved: () => void;
    onDeleteThread: () => void;
    measureRef?: Ref<HTMLElement>;
}

const classNames = (...names: Array<string | false | undefined>) => names.filter(Boolean).join(' ');

const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>, submit: () => void, cancel?: () => void) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        submit();
    }

    if (event.key === 'Escape' && cancel) {
        event.preventDefault();
        cancel();
    }
};

interface ComposerProps {
    label: string;
    submitLabel: string;
    placeholder?: string;
    initialValue?: string;
    autoFocus?: boolean;
    onSubmit: (body: string) => void;
    onCancel?: () => void;
}

const Composer = ({label, submitLabel, placeholder, initialValue = '', autoFocus = false, onSubmit, onCancel}: ComposerProps) => {
    const [value, setValue] = useState(initialValue);
    const submit = () => {
        if (value.trim()) {
            onSubmit(value);
            setValue('');
        }
    };

    return (
        <div className={styles.composer}>
            <textarea
                className={styles.textarea}
                aria-label={label}
                placeholder={placeholder}
                value={value}
                rows={2}
                autoFocus={autoFocus}
                onChange={event => setValue(event.target.value)}
                onKeyDown={event => handleComposerKeyDown(event, submit, onCancel)}
            />
            <div className={styles.composerActions}>
                <div className={styles.composerButtons}>
                    <Button variant="primary" size="xs" isDisabled={!value.trim()} onPress={submit}>
                        {submitLabel}
                    </Button>
                    {onCancel ? (
                        <Button variant="ghost" size="xs" onPress={onCancel}>
                            Cancel
                        </Button>
                    ) : null}
                </div>
                <span className={styles.hint}>⌘ Enter</span>
            </div>
        </div>
    );
};

interface MessageProps {
    message: ScriptCommentMessage;
    isEditing: boolean;
    onStartEdit: () => void;
    onStopEdit: () => void;
    onEdit: (body: string) => void;
    onDelete: () => void;
}

const MessageBody = ({message, isEditing, onStopEdit, onEdit}: Pick<MessageProps, 'message' | 'isEditing' | 'onStopEdit' | 'onEdit'>) =>
    isEditing ? (
        <Composer
            label="Edit comment"
            submitLabel="Save"
            initialValue={message.body}
            autoFocus
            onSubmit={body => {
                onEdit(body);
                onStopEdit();
            }}
            onCancel={onStopEdit}
        />
    ) : (
        <p className={styles.body}>
            {message.body}
            {message.editedAt !== null ? <span className={styles.edited}> · edited</span> : null}
        </p>
    );

const Reply = ({message, isEditing, onStartEdit, onStopEdit, onEdit, onDelete}: MessageProps) => (
    <div className={styles.reply}>
        <span className={styles.railPoint} aria-hidden="true" />
        <div className={styles.replyHead}>
            <time className={styles.time}>{formatCommentTime(message.createdAt)}</time>
            <MoreActionsMenu
                aria-label="Reply actions"
                items={[
                    {id: 'edit', label: 'Edit'},
                    {id: 'delete', label: 'Delete', tone: 'danger'},
                ]}
                onAction={id => (id === 'edit' ? onStartEdit() : onDelete())}
            />
        </div>
        <MessageBody message={message} isEditing={isEditing} onStopEdit={onStopEdit} onEdit={onEdit} />
    </div>
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
    measureRef,
}: CommentThreadCardProps) => {
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const quote = thread?.quotedText ?? draftQuote ?? '';
    const [root, ...replies] = messages;
    const isResolved = thread?.status === 'resolved';

    if (!thread) {
        return (
            <article ref={measureRef} className={classNames(styles.card, styles.active)} aria-label="New comment" data-comment-draft="true">
                <div className={styles.content}>
                    {showQuote && quote ? <blockquote className={styles.quote}>{quote}</blockquote> : null}
                    <Composer label="Comment" submitLabel="Comment" autoFocus onSubmit={onSubmitDraft} onCancel={onCancelDraft} />
                </div>
            </article>
        );
    }

    const time = root ? formatCommentTime(root.createdAt) : '';
    const replyCount = replies.length === 1 ? '1 reply' : `${replies.length} replies`;

    return (
        <article
            ref={measureRef}
            className={classNames(styles.card, isActive && styles.active, isHighlighted && styles.highlighted, isResolved && styles.resolved)}
            aria-label="Comment"
            data-thread-id={thread.id}
            data-highlighted={isHighlighted ? 'true' : undefined}
            onMouseEnter={() => onHover(true)}
            onMouseLeave={() => onHover(false)}
        >
            {isActive ? (
                <>
                    <header className={styles.header}>
                        {/* The whole tinted header collapses the card; the menu sits above this layer. */}
                        <button className={styles.collapseButton} type="button" aria-label="Collapse comment" aria-expanded onClick={onCollapse} />
                        <span className={styles.label}>{isResolved ? 'Resolved' : 'Comment'}</span>
                        <span className={styles.headerMeta}>
                            <time className={styles.time}>{time}</time>
                            <MoreActionsMenu
                                aria-label="More actions"
                                items={[
                                    {id: 'edit', label: 'Edit'},
                                    {id: 'status', label: isResolved ? 'Reopen' : 'Resolve'},
                                    {id: 'delete', label: 'Delete', tone: 'danger'},
                                ]}
                                onAction={id => {
                                    if (id === 'edit') {
                                        if (root) {
                                            setEditingMessageId(root.id);
                                        }

                                        return;
                                    }

                                    if (id === 'status') {
                                        onToggleResolved();

                                        return;
                                    }

                                    onDeleteThread();
                                }}
                            />
                        </span>
                    </header>
                    <div className={styles.content}>
                        {showQuote && quote ? <blockquote className={styles.quote}>{quote}</blockquote> : null}
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
                                        onStartEdit={() => setEditingMessageId(message.id)}
                                        onStopEdit={() => setEditingMessageId(null)}
                                        onEdit={body => onEditMessage(message.id, body)}
                                        onDelete={() => onDeleteMessage(message.id)}
                                    />
                                ))}
                            </div>
                        ) : null}
                        {isResolved ? null : (
                            <div className={styles.replyComposer}>
                                <Composer label="Reply" submitLabel="Reply" placeholder="Write a reply…" onSubmit={onReply} />
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <button className={styles.summary} type="button" aria-expanded={false} onClick={onActivate}>
                    <span className={styles.summaryHead}>
                        <span className={styles.label}>{isResolved ? 'Resolved' : 'Comment'}</span>
                        <time className={styles.time}>{time}</time>
                    </span>
                    {showQuote && quote ? <span className={styles.quote}>{quote}</span> : null}
                    <span className={classNames(styles.body, styles.clamped)}>{root?.body ?? ''}</span>
                    {replies.length > 0 ? <span className={styles.meta}>{replyCount}</span> : null}
                </button>
            )}
        </article>
    );
};
