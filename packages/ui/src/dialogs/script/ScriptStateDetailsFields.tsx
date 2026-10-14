import {useId} from 'react';

import {formControlStyles} from '../../molecules/forms/shared/formControlStyles';
import styles from './ScriptStateModals.module.css';

export type ScriptStateKind = 'draft' | 'version';

export interface ScriptStateDetails {
    name: string,
    note: string,
}

interface ScriptStateDetailsFieldsProps {
    kind: ScriptStateKind,
    value: ScriptStateDetails,
    isDisabled?: boolean,
    autoFocus?: boolean,
    /** Dialog fields, or the form controls of a manager panel. */
    appearance?: 'dialog' | 'panel',
    onChange: (value: ScriptStateDetails) => void,
}

export const isScriptStateDetailsValid = (kind: ScriptStateKind, value: ScriptStateDetails) => {
    return kind === 'draft' || value.name.trim().length > 0;
};

/** A draft carries an optional reason; a version needs a name and may carry a note. */
export const ScriptStateDetailsFields = ({
    kind,
    value,
    isDisabled = false,
    autoFocus = false,
    appearance = 'dialog',
    onChange,
}: ScriptStateDetailsFieldsProps) => {
    const nameId = useId();
    const noteId = useId();
    const controls = appearance === 'panel' ? formControlStyles : styles;

    return (
        <>
            {kind === 'version' ? (
                <div className={styles.field}>
                    <label className={controls.label} htmlFor={nameId}>Name</label>
                    <input
                        id={nameId}
                        className={controls.input}
                        value={value.name}
                        autoComplete="off"
                        placeholder="e.g. Edinburgh Fringe 2026"
                        autoFocus={autoFocus}
                        disabled={isDisabled}
                        onChange={event => onChange({...value, name: event.target.value})}
                    />
                </div>
            ) : null}
            <div className={styles.field}>
                <label className={controls.label} htmlFor={noteId}>{kind === 'version' ? 'Note' : 'Reason'}</label>
                <input
                    id={noteId}
                    className={controls.input}
                    value={value.note}
                    autoComplete="off"
                    placeholder={kind === 'version' ? 'Optional' : 'Optional, e.g. new final monologue'}
                    autoFocus={autoFocus && kind === 'draft'}
                    disabled={isDisabled}
                    onChange={event => onChange({...value, note: event.target.value})}
                />
            </div>
        </>
    );
};
