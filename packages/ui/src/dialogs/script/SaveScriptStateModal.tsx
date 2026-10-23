import {type FormEvent, useState} from 'react';

import {Button} from '../../atoms/Button/Button';
import type {ChangeSummaryItem} from '../../molecules/ChangeSummary/ChangeSummary';
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

export interface SaveScriptStateModalProps {
    isOpen: boolean,
    kind: ScriptStateKind,
    /** Overrides the default submit label, e.g. “Save draft and download”. */
    submitLabel?: string,
    isPending?: boolean,
    onClose: () => void,
    onSubmit: (details: ScriptStateDetails) => void | Promise<void>,
}

const COPY: Record<ScriptStateKind, {
    title: string,
    changes: ChangeSummaryItem[],
    submitLabel: string,
}> = {
    draft: {
        title: 'Save as new draft',
        changes: [
            {
                tone: 'in',
                label: 'Saved',
                text: 'The script as it is now, under the next draft number',
            },
            {
                tone: 'kept',
                label: 'Unchanged',
                text: 'The current script — you keep writing in it',
            },
        ],
        submitLabel: 'Save draft',
    },
    version: {
        title: 'Save as version',
        changes: [
            {
                tone: 'in',
                label: 'Saved',
                text: 'The script as it is now, under a name, e.g. for a festival or a tour',
            },
            {
                tone: 'kept',
                label: 'Unchanged',
                text: 'The current script — you keep writing in it',
            },
        ],
        submitLabel: 'Save version',
    },
};

export const SaveScriptStateModal = ({
    isOpen,
    kind,
    submitLabel,
    isPending = false,
    onClose,
    onSubmit,
}: SaveScriptStateModalProps) => {
    const [details, setDetails] = useState<ScriptStateDetails>({name: '', note: ''});
    const [previous, setPrevious] = useState({isOpen, kind});
    const copy = COPY[kind];
    const canSubmit = isScriptStateDetailsValid(kind, details);

    if (previous.isOpen !== isOpen || previous.kind !== kind) {
        setPrevious({isOpen, kind});

        if (isOpen) {
            setDetails({name: '', note: ''});
        }
    }

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (canSubmit && !isPending) {
            void onSubmit(details);
        }
    };

    return (
        <ModalDialog isOpen={isOpen} onClose={onClose} ariaLabel={copy.title}>
            <ModalHeader title={copy.title} changes={copy.changes} />
            <form className={styles.form} onSubmit={handleSubmit}>
                <ScriptStateDetailsFields
                    kind={kind}
                    value={details}
                    isDisabled={isPending}
                    autoFocus
                    onChange={setDetails}
                />
                <ModalActions>
                    <Button type="submit" isDisabled={!canSubmit} isPending={isPending}>
                        {submitLabel ?? copy.submitLabel}
                    </Button>
                    <Button variant="ghost" isDisabled={isPending} onPress={onClose}>
                        Cancel
                    </Button>
                </ModalActions>
            </form>
        </ModalDialog>
    );
};
