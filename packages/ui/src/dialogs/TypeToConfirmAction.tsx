import {type ReactNode, useCallback, useState} from 'react';

import {Button} from '../atoms/Button';
import {TextInput} from '../molecules/forms/TextInput';

import styles from './TypeToConfirmAction.module.css';

export interface TypeToConfirmFieldProps {
    phrase: string;
    value: string;
    inputAriaLabel?: string;
    isPending?: boolean;
    onChange: (value: string) => void;
}

export const TypeToConfirmField = ({phrase, value, inputAriaLabel, isPending = false, onChange}: TypeToConfirmFieldProps) => (
    <TextInput
        label={
            <span className={styles.confirmLabel}>
                Type <code className={styles.confirmPhrase}>{phrase}</code> to confirm
            </span>
        }
        type="text"
        size="sm"
        className={styles.confirmField}
        inputClassName={styles.confirmInput}
        value={value}
        autoComplete="off"
        spellCheck={false}
        placeholder={phrase}
        disabled={isPending}
        aria-label={inputAriaLabel}
        onChange={event => onChange(event.target.value)}
    />
);

export interface TypeToConfirmActionProps {
    phrase: string;
    confirmLabel: ReactNode;
    inputAriaLabel?: string;
    isPending?: boolean;
    secondaryAction?: ReactNode;
    onConfirm: () => void | Promise<void>;
}

export const TypeToConfirmAction = ({phrase, confirmLabel, inputAriaLabel, isPending = false, secondaryAction, onConfirm}: TypeToConfirmActionProps) => {
    const [confirmText, setConfirmText] = useState('');
    const isUnlocked = confirmText.trim() === phrase;

    const handleConfirm = useCallback(() => {
        if (!isUnlocked || isPending) {
            return;
        }

        void onConfirm();
    }, [isUnlocked, isPending, onConfirm]);

    return (
        <div className={styles.stack}>
            <TypeToConfirmField phrase={phrase} value={confirmText} inputAriaLabel={inputAriaLabel} isPending={isPending} onChange={setConfirmText} />
            <div className={styles.actions}>
                <Button variant="danger" isDisabled={!isUnlocked} isPending={isPending} onPress={handleConfirm}>
                    {confirmLabel}
                </Button>
                {secondaryAction}
            </div>
        </div>
    );
};
