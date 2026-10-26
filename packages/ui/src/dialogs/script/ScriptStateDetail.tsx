import {type FormEvent, useState} from 'react';

import {Button} from '../../atoms/Button/Button';
import {
    isScriptStateDetailsValid,
    type ScriptStateDetails,
    ScriptStateDetailsFields,
    type ScriptStateKind,
} from './ScriptStateDetailsFields';
import type {ScriptStateRecord, ScriptStateUpdate} from './ScriptStatesModal';
import styles from './ScriptStatesModal.module.css';

interface ScriptStateDetailProps {
    state: ScriptStateRecord,
    /** The state is already on screen, so Open has nothing to do. */
    isShown: boolean,
    isPending: boolean,
    onUpdate: (update: ScriptStateUpdate) => void | Promise<void>,
    onOpen: () => void,
    onRestore: (returnFocus?: HTMLElement | null) => void,
    onRestoreAsNew: (returnFocus?: HTMLElement | null) => void,
}

const toDetails = (state: ScriptStateRecord): ScriptStateDetails => ({name: state.name ?? '', note: state.note ?? ''});

/** Editable name and note of one stored state, and what can be done with it. */
export const ScriptStateDetail = ({
    state,
    isShown,
    isPending,
    onUpdate,
    onOpen,
    onRestore,
    onRestoreAsNew,
}: ScriptStateDetailProps) => {
    const [kind, setKind] = useState<ScriptStateKind>(state.kind);
    const [details, setDetails] = useState<ScriptStateDetails>(() => toDetails(state));
    const isMarkingAsVersion = state.kind === 'draft' && kind === 'version';
    const saved = toDetails(state);
    const isDirty = isMarkingAsVersion || details.name !== saved.name || details.note !== saved.note;
    const canSubmit = isDirty && isScriptStateDetailsValid(kind, details);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();

        if (!canSubmit || isPending) {
            return;
        }

        await onUpdate({kind, ...details});
    };

    return (
        <div className={styles.detail}>
            <form className={styles.form} onSubmit={event => void handleSubmit(event)}>
                {isMarkingAsVersion ? <p className={styles.hint}>Name the version. It keeps its draft number as its origin.</p> : null}
                <ScriptStateDetailsFields
                    kind={kind}
                    value={details}
                    isDisabled={isPending}
                    autoFocus={isMarkingAsVersion}
                    appearance="panel"
                    onChange={setDetails}
                />
                <div className={styles.formActions}>
                    <Button type="submit" size="sm" isDisabled={!canSubmit} isPending={isPending}>
                        {isMarkingAsVersion ? 'Mark as version' : 'Save changes'}
                    </Button>
                    {isDirty ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            isDisabled={isPending}
                            onPress={() => {
                                setKind(state.kind);
                                setDetails(saved);
                            }}
                        >
                            Cancel
                        </Button>
                    ) : null}
                </div>
            </form>
            <section className={styles.actions} aria-label={`${state.label} actions`}>
                <Button variant="secondary" size="sm" isDisabled={isShown || isPending} onPress={onOpen}>
                    {isShown ? 'On screen' : 'Open'}
                </Button>
                <Button variant="ghost" size="sm" isDisabled={isPending} onPress={event => onRestore(event.target as HTMLElement)}>
                    Restore
                </Button>
                <Button variant="ghost" size="sm" isDisabled={isPending} onPress={event => onRestoreAsNew(event.target as HTMLElement)}>
                    Restore as new script
                </Button>
                {state.kind === 'draft' && !isMarkingAsVersion ? (
                    <Button variant="ghost" size="sm" isDisabled={isPending} onPress={() => setKind('version')}>
                        Mark as version
                    </Button>
                ) : null}
            </section>
        </div>
    );
};
