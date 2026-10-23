import {
    type FormEvent,
    useId,
    useState,
} from 'react';

import {Button} from '../../atoms/Button/Button';
import {ModalActions} from '../modal/ModalActions';
import {ModalDialog} from '../modal/ModalDialog';
import {ModalHeader} from '../modal/ModalHeader';
import styles from './ScriptStateModals.module.css';

export type RestoreScriptStateMode = 'restore' | 'restore-as-new';

export interface RestoreScriptStateModalProps {
    isOpen: boolean,
    mode: RestoreScriptStateMode,
    /** “Draft #3” or the version name. */
    stateLabel: string,
    /** Suggested title of a script created from the state. */
    initialTitle: string,
    isPending?: boolean,
    onClose: () => void,
    onRestore: () => void | Promise<void>,
    onRestoreAsNew: (title: string) => void | Promise<void>,
}

export const RestoreScriptStateModal = ({
    isOpen,
    mode,
    stateLabel,
    initialTitle,
    isPending = false,
    onClose,
    onRestore,
    onRestoreAsNew,
}: RestoreScriptStateModalProps) => {
    const titleId = useId();
    const [title, setTitle] = useState(initialTitle);
    const [previous, setPrevious] = useState({isOpen, initialTitle});
    const canSubmit = mode === 'restore' || title.trim().length > 0;

    if (previous.isOpen !== isOpen || previous.initialTitle !== initialTitle) {
        setPrevious({isOpen, initialTitle});

        if (isOpen) {
            setTitle(initialTitle);
        }
    }

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!canSubmit || isPending) {
            return;
        }

        void (mode === 'restore' ? onRestore() : onRestoreAsNew(title.trim()));
    };

    const header = mode === 'restore'
        ? (
            <ModalHeader
                title={`Restore ${stateLabel}?`}
                description={`The script returns to ${stateLabel}.`}
                changes={[
                    {
                        tone: 'in',
                        label: 'Restored',
                        text: 'Text, acts and scenes, characters and music',
                    },
                    {
                        tone: 'kept',
                        label: 'Kept',
                        text: 'Title, settings, title page, other drafts and versions',
                    },
                    {
                        tone: 'kept',
                        label: 'Saved first',
                        text: 'The current state, as a new draft — nothing is lost',
                    },
                    {
                        tone: 'out',
                        label: 'Dropped',
                        text: 'Comments on text that is not in the restored script',
                    },
                ]}
            />
        )
        : (
            <ModalHeader
                title={`Restore ${stateLabel} as a new script`}
                description="Creates a separate script from this state."
                changes={[
                    {
                        tone: 'in',
                        label: 'Copied',
                        text: `Everything in ${stateLabel}, including its settings and title page`,
                    },
                    {
                        tone: 'kept',
                        label: 'Unchanged',
                        text: 'The current script',
                    },
                ]}
            />
        );

    return (
        <ModalDialog
            isOpen={isOpen}
            onClose={() => {
                if (!isPending) {
                    onClose();
                }
            }}
            ariaLabel={mode === 'restore' ? `Restore ${stateLabel}` : `Restore ${stateLabel} as a new script`}
        >
            {header}
            <form className={styles.form} onSubmit={handleSubmit}>
                {mode === 'restore-as-new' ? (
                    <div className={styles.field}>
                        <label className={styles.label} htmlFor={titleId}>Title</label>
                        <input
                            id={titleId}
                            className={styles.input}
                            value={title}
                            autoComplete="off"
                            autoFocus
                            disabled={isPending}
                            onChange={event => setTitle(event.target.value)}
                        />
                    </div>
                ) : null}
                <ModalActions>
                    <Button type="submit" isDisabled={!canSubmit} isPending={isPending}>
                        {mode === 'restore' ? 'Restore' : 'Create script'}
                    </Button>
                    <Button variant="ghost" isDisabled={isPending} onPress={onClose}>
                        Cancel
                    </Button>
                </ModalActions>
            </form>
        </ModalDialog>
    );
};
