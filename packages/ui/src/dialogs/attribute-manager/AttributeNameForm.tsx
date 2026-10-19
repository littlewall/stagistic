import type {FormEvent} from 'react';

import {formControlStyles} from '../../molecules/forms/shared/formControlStyles';
import styles from './AttributeManagerCharactersPanel.module.css';

interface AttributeNameFormProps {
    fieldId: string,
    name: string,
    isBusy: boolean,
    isDisabled: boolean,
    isInvalid: boolean,
    isDuplicate: boolean,
    errorId?: string,
    onSubmit: (event: FormEvent) => void,
    onChange: (name: string) => void,
    onCommit: () => void,
    onReset: () => void,
}

export const AttributeNameForm = ({
    fieldId,
    name,
    isBusy,
    isDisabled,
    isInvalid,
    isDuplicate,
    errorId,
    onSubmit,
    onChange,
    onCommit,
    onReset,
}: AttributeNameFormProps) => (
    <form
        className={styles.nameForm}
        onSubmit={onSubmit}
        aria-busy={isBusy}
    >
        <label
            className={formControlStyles.label}
            htmlFor={fieldId}
        >
            Name
        </label>
        <input
            id={fieldId}
            type="text"
            className={formControlStyles.input}
            value={name}
            disabled={isDisabled}
            aria-describedby={errorId}
            aria-invalid={isInvalid}
            onChange={event => onChange(event.target.value)}
            onBlur={onCommit}
            onKeyDown={event => {
                if (event.key === 'Escape') {
                    onReset();
                }
            }}
        />
        {isInvalid ? (
            <p
                id={errorId}
                className={styles.error}
            >
                {isDuplicate ? 'A character or group with this name already exists.' : 'Name cannot be empty.'}
            </p>
        ) : null}
    </form>
);
