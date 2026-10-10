import {
    type FormEvent,
    useEffect,
    useState,
} from 'react';

import {Button} from '../../atoms/Button/Button';
import {ModalActions} from '../modal/ModalActions';
import {ModalDialog} from '../modal/ModalDialog';
import {ModalHeader} from '../modal/ModalHeader';
import {
    isScriptStateDetailsValid,
    type ScriptStateDetails,
    ScriptStateDetailsFields,
    type ScriptStateKind,
} from './ScriptStateDetailsFields';
import styles from './ScriptStateModals.module.css';

export interface ManagedScriptState {
    id: string,
    kind: ScriptStateKind,
    /** “Draft 3” or the version name. */
    label: string,
    /** Date and reason or note, preformatted. */
    detail: string,
    name: string | null,
    note: string | null,
}

export interface ManageScriptStatesModalProps {
    isOpen: boolean,
    states: readonly ManagedScriptState[],
    isPending?: boolean,
    onClose: () => void,
    onUpdate: (stateId: string, update: {
        kind: ScriptStateKind,
        name: string,
        note: string,
    }) => void | Promise<void>,
    onDelete: (stateId: string) => void | Promise<void>,
}

type Editing = {
    stateId: string,
    kind: ScriptStateKind,
    details: ScriptStateDetails,
} | null;

/**
 * Renames, marks a draft as a version, or deletes stored drafts and versions.
 * Editing and delete confirmation happen in place: this modal never stacks
 * another dialog or popover on top of itself.
 */
export const ManageScriptStatesModal = ({
    isOpen,
    states,
    isPending = false,
    onClose,
    onUpdate,
    onDelete,
}: ManageScriptStatesModalProps) => {
    const [editing, setEditing] = useState<Editing>(null);
    const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
    const editedState = editing ? states.find(state => state.id === editing.stateId) ?? null : null;

    useEffect(() => {
        if (!isOpen) {
            setEditing(null);
            setConfirmingDeleteId(null);
        }
    }, [isOpen]);

    const startEditing = (state: ManagedScriptState, kind: ScriptStateKind) => {
        setConfirmingDeleteId(null);
        setEditing({
            stateId: state.id,
            kind,
            details: {name: state.name ?? '', note: state.note ?? ''},
        });
    };

    const handleEditSubmit = async (event: FormEvent) => {
        event.preventDefault();

        if (!editing || !isScriptStateDetailsValid(editing.kind, editing.details) || isPending) {
            return;
        }

        await onUpdate(editing.stateId, {
            kind: editing.kind,
            name: editing.details.name,
            note: editing.details.note,
        });
        setEditing(null);
    };

    return (
        <ModalDialog isOpen={isOpen} onClose={onClose} ariaLabel="Manage drafts and versions">
            <ModalHeader
                title="Drafts and versions"
                description="Stored states of this script. They never change; only their names and notes can."
            />
            {editing && editedState ? (
                <form className={styles.form} onSubmit={event => void handleEditSubmit(event)}>
                    <p className={styles.editingLabel}>
                        {editing.kind === 'version' && editedState.kind === 'draft' ? `Mark ${editedState.label} as a version` : `Edit ${editedState.label}`}
                    </p>
                    <ScriptStateDetailsFields
                        kind={editing.kind}
                        value={editing.details}
                        isDisabled={isPending}
                        autoFocus
                        onChange={details => setEditing({...editing, details})}
                    />
                    <ModalActions>
                        <Button
                            type="submit"
                            isDisabled={!isScriptStateDetailsValid(editing.kind, editing.details)}
                            isPending={isPending}
                        >
                            {editing.kind === 'version' && editedState.kind === 'draft' ? 'Mark as version' : 'Save changes'}
                        </Button>
                        <Button variant="ghost" isDisabled={isPending} onPress={() => setEditing(null)}>
                            Back
                        </Button>
                    </ModalActions>
                </form>
            ) : (
                <>
                    {states.length === 0 ? <p className={styles.empty}>No drafts or versions yet.</p> : (
                        <ul className={styles.stateList}>
                            {states.map(state => (
                                <li key={state.id} className={styles.stateRow}>
                                    <div className={styles.stateText}>
                                        <span className={styles.stateLabel}>{state.label}</span>
                                        <span className={styles.stateDetail}>{state.detail}</span>
                                    </div>
                                    {confirmingDeleteId === state.id ? (
                                        <div className={styles.stateActions} role="group" aria-label={`Delete ${state.label}?`}>
                                            <span className={styles.confirmText}>Delete permanently?</span>
                                            <Button
                                                variant="danger"
                                                size="xs"
                                                isPending={isPending}
                                                onPress={() => void Promise.resolve(onDelete(state.id)).then(() => setConfirmingDeleteId(null))}
                                            >
                                                Delete
                                            </Button>
                                            <Button variant="ghost" size="xs" isDisabled={isPending} onPress={() => setConfirmingDeleteId(null)}>
                                                Cancel
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className={styles.stateActions}>
                                            <Button variant="ghost" size="xs" isDisabled={isPending} onPress={() => startEditing(state, state.kind)}>
                                                Edit
                                            </Button>
                                            {state.kind === 'draft' ? (
                                                <Button variant="ghost" size="xs" isDisabled={isPending} onPress={() => startEditing(state, 'version')}>
                                                    Mark as version
                                                </Button>
                                            ) : null}
                                            <Button
                                                variant="ghost"
                                                size="xs"
                                                isDisabled={isPending}
                                                aria-label={`Delete ${state.label}`}
                                                onPress={() => setConfirmingDeleteId(state.id)}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                    <ModalActions>
                        <Button variant="ghost" onPress={onClose}>
                            Close
                        </Button>
                    </ModalActions>
                </>
            )}
        </ModalDialog>
    );
};
