import {
    type ReactNode,
    useCallback,
    useId,
    useState,
} from 'react';

import {Button} from '../atoms/Button';
import {Input} from '../atoms/Input';
import styles from './DeleteScriptConfirm.module.css';

export const DELETE_SCRIPT_CONFIRM_PHRASE = 'delete me';

export interface DeleteScriptConfirmProps {
    scriptTitle?: string,
    isDeleting?: boolean,
    confirmLabel?: ReactNode,
    secondaryAction?: ReactNode,
    onConfirm: () => void | Promise<void>,
}

export const DeleteScriptConfirm = ({
    scriptTitle,
    isDeleting = false,
    confirmLabel = 'Delete script',
    secondaryAction,
    onConfirm,
}: DeleteScriptConfirmProps) => {
    const inputId = useId();
    const [confirmText, setConfirmText] = useState('');
    const isUnlocked = confirmText.trim() === DELETE_SCRIPT_CONFIRM_PHRASE;

    const handleConfirm = useCallback(() => {
        if (!isUnlocked || isDeleting) {
            return;
        }

        void onConfirm();
    }, [isUnlocked, isDeleting, onConfirm]);

    return (
        <div className={styles.stack}>
            <label className={styles.confirmField} htmlFor={inputId}>
                <span className={styles.confirmLabel}>
                    Type{' '}
                    <code className={styles.confirmPhrase}>{DELETE_SCRIPT_CONFIRM_PHRASE}</code>
                    {' '}to confirm
                </span>
                <Input
                    id={inputId}
                    type="text"
                    className={styles.confirmInput}
                    value={confirmText}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={DELETE_SCRIPT_CONFIRM_PHRASE}
                    disabled={isDeleting}
                    aria-label={scriptTitle ? `Type ${DELETE_SCRIPT_CONFIRM_PHRASE} to delete ${scriptTitle}` : undefined}
                    onChange={event => setConfirmText(event.target.value)}
                />
            </label>
            <div className={styles.actions}>
                <Button
                    variant="danger"
                    isDisabled={!isUnlocked}
                    isPending={isDeleting}
                    onPress={handleConfirm}
                >
                    {confirmLabel}
                </Button>
                {secondaryAction}
            </div>
        </div>
    );
};
