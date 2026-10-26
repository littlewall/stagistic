import type {ScriptCommentMessage} from '@stagistic/app-core';
import {Button, MoreActionsMenu} from '@stagistic/ui';
import {type KeyboardEvent, useState} from 'react';

import styles from './CommentThreadCard.module.css';
import {formatCommentTime} from './formatCommentTime';

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
    label: string,
    submitLabel: string,
    placeholder?: string,
    initialValue?: string,
    autoFocus?: boolean,
    onSubmit: (body: string) => void,
    onCancel?: () => void,
}

export const Composer = ({
    label,
    submitLabel,
    placeholder,
    initialValue = '',
    autoFocus = false,
    onSubmit,
    onCancel,
}: ComposerProps) => {
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
    message: ScriptCommentMessage,
    isEditing: boolean,
    isReadOnly: boolean,
    onStartEdit: () => void,
    onStopEdit: () => void,
    onEdit: (body: string) => void,
    onDelete: () => void,
}

export const MessageBody = ({
    message,
    isEditing,
    onStopEdit,
    onEdit,
}: Pick<MessageProps, 'message' | 'isEditing' | 'onStopEdit' | 'onEdit'>) => isEditing ? (
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

export const Reply = ({
    message,
    isEditing,
    isReadOnly,
    onStartEdit,
    onStopEdit,
    onEdit,
    onDelete,
}: MessageProps) => (
    <div className={styles.reply}>
        <span className={styles.railPoint} aria-hidden="true" />
        <div className={styles.replyHead}>
            <time className={styles.time}>{formatCommentTime(message.createdAt)}</time>
            {isReadOnly ? null : (
                <MoreActionsMenu
                    aria-label="Reply actions"
                    items={[
                        {id: 'edit', label: 'Edit'},
                        {
                            id: 'delete',
                            label: 'Delete',
                            tone: 'danger',
                        },
                    ]}
                    onAction={id => (id === 'edit' ? onStartEdit() : onDelete())}
                />
            )}
        </div>
        <MessageBody message={message} isEditing={isEditing} onStopEdit={onStopEdit} onEdit={onEdit} />
    </div>
);
