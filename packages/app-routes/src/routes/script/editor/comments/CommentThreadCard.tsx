import type {ScriptCommentMessage, ScriptCommentThread} from '@stagistic/app-core';
import {Button, MoreActionsMenu} from '@stagistic/ui';
import {type KeyboardEvent, type Ref, useState} from 'react';

import styles from './CommentThreadCard.module.css';

export interface CommentThreadCardProps {
    /** null renders the unsaved draft composer. */
    thread: ScriptCommentThread | null;
    messages: readonly ScriptCommentMessage[];
    draftQuote?: string;
    isActive: boolean;
    /** The List view shows the anchored text; the Beside view sits next to it instead. */
    showQuote: boolean;
    onActivate: () => void;
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
    initialValue?: string;
    autoFocus?: boolean;
    onSubmit: (body: string) => void;
    onCancel?: () => void;
}

const Composer = ({label, submitLabel, initialValue = '', autoFocus = false, onSubmit, onCancel}: ComposerProps) => {
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
                value={value}
                rows={2}
                autoFocus={autoFocus}
                onChange={event => setValue(event.target.value)}
                onKeyDown={event => handleComposerKeyDown(event, submit, onCancel)}
            />
            <div className={styles.composerActions}>
                {onCancel ? (
                    <Button variant="ghost" size="sm" onPress={onCancel}>
                        Cancel
                    </Button>
                ) : null}
                <Button variant="primary" size="sm" isDisabled={!value.trim()} onPress={submit}>
                    {submitLabel}
                </Button>
            </div>
        </div>
    );
};

interface MessageProps {
    message: ScriptCommentMessage;
    isRoot: boolean;
    isEditing: boolean;
    onStartEdit: () => void;
    onStopEdit: () => void;
    onEdit: (body: string) => void;
    onDelete: () => void;
}

const Message = ({message, isRoot, isEditing, onStartEdit, onStopEdit, onEdit, onDelete}: MessageProps) => {
    if (isEditing) {
        return (
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
        );
    }

    return (
        <div className={styles.message}>
            <p className={styles.body}>
                {message.body}
                {message.editedAt !== null ? <span className={styles.edited}> edited</span> : null}
            </p>
            {isRoot ? null : (
                <MoreActionsMenu
                    aria-label="Reply actions"
                    items={[
                        {id: 'edit', label: 'Edit'},
                        {id: 'delete', label: 'Delete', tone: 'danger'},
                    ]}
                    onAction={id => (id === 'edit' ? onStartEdit() : onDelete())}
                />
            )}
        </div>
    );
};

export const CommentThreadCard = ({
    thread,
    messages,
    draftQuote,
    isActive,
    showQuote,
    onActivate,
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
                {showQuote && quote ? <blockquote className={styles.quote}>{quote}</blockquote> : null}
                <Composer label="Comment" submitLabel="Comment" autoFocus onSubmit={onSubmitDraft} onCancel={onCancelDraft} />
            </article>
        );
    }

    return (
        <article
            ref={measureRef}
            className={classNames(styles.card, isActive && styles.active, isResolved && styles.resolved)}
            aria-label="Comment"
            data-thread-id={thread.id}
            onMouseEnter={() => onHover(true)}
            onMouseLeave={() => onHover(false)}
            onClick={isActive ? undefined : onActivate}
        >
            {showQuote && quote ? <blockquote className={styles.quote}>{quote}</blockquote> : null}
            {isActive ? (
                <>
                    <header className={styles.header}>
                        <Button variant="ghost" size="sm" onPress={onToggleResolved}>
                            {isResolved ? 'Reopen' : 'Resolve'}
                        </Button>
                        <MoreActionsMenu
                            aria-label="More actions"
                            items={[
                                {id: 'edit', label: 'Edit'},
                                {id: 'delete', label: 'Delete', tone: 'danger'},
                            ]}
                            onAction={id => (id === 'edit' && root ? setEditingMessageId(root.id) : onDeleteThread())}
                        />
                    </header>
                    {messages.map((message, index) => (
                        <Message
                            key={message.id}
                            message={message}
                            isRoot={index === 0}
                            isEditing={editingMessageId === message.id}
                            onStartEdit={() => setEditingMessageId(message.id)}
                            onStopEdit={() => setEditingMessageId(null)}
                            onEdit={body => onEditMessage(message.id, body)}
                            onDelete={() => onDeleteMessage(message.id)}
                        />
                    ))}
                    {isResolved ? null : <Composer label="Reply" submitLabel="Reply" onSubmit={onReply} />}
                </>
            ) : (
                <>
                    <p className={classNames(styles.body, styles.clamped)}>{root?.body ?? ''}</p>
                    {replies.length > 0 ? <p className={styles.meta}>{replies.length === 1 ? '1 reply' : `${replies.length} replies`}</p> : null}
                </>
            )}
        </article>
    );
};
