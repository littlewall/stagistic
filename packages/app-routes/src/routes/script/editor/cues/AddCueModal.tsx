import {
    Button,
    FormSelect,
    formControlStyles,
    type FormSelectOption,
    ModalDialog,
} from '@stagistic/ui';
import {
    type ChangeEvent,
    type FormEvent,
    useCallback,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
} from 'react';

import styles from './AddCueModal.module.css';
import type {
    CreateScriptCueInput,
    ScriptCueKind,
} from './types';

const KIND_OPTIONS: FormSelectOption[] = [
    {value: 'song', label: 'Song'},
    {value: 'instrumental', label: 'Instrumental'},
];

interface AddCueModalProps {
    isOpen: boolean,
    initialTitle?: string,
    onClose: () => void,
    onCreate: (input: CreateScriptCueInput) => Promise<unknown> | unknown,
}

export const AddCueModal = ({
    isOpen,
    initialTitle = '',
    onClose,
    onCreate,
}: AddCueModalProps) => {
    const titleInputRef = useRef<HTMLInputElement | null>(null);
    const kindSelectId = useId();
    const [title, setTitle] = useState('');
    const [kind, setKind] = useState<ScriptCueKind>('song');

    useEffect(() => {
        if (!isOpen) {
            setTitle('');
            setKind('song');

            return;
        }

        setTitle(initialTitle);
        setKind('song');

        const focusTimer = window.setTimeout(() => {
            titleInputRef.current?.focus();
        }, 0);

        return () => window.clearTimeout(focusTimer);
    }, [initialTitle, isOpen]);

    const canSubmit = useMemo(() => title.trim().length > 0, [title]);

    const handleTitleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setTitle(event.target.value);
    }, []);

    const handleKindChange = useCallback((value: number | string) => {
        setKind(value === 'instrumental' ? 'instrumental' : 'song');
    }, []);

    const handleSubmit = useCallback((event: FormEvent) => {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        void (async () => {
            await onCreate({
                title,
                kind,
            });
            onClose();
        })();
    }, [
        canSubmit,
        kind,
        onClose,
        onCreate,
        title,
    ]);

    return (
        <ModalDialog
            isOpen={isOpen}
            onClose={onClose}
            ariaLabel="Add cue"
            panelClassName={styles.panel}
        >
            <h2 className={styles.title}>Add cue</h2>
            <form className={styles.form} onSubmit={handleSubmit}>
                <div className={formControlStyles.field}>
                    <label className={formControlStyles.label} htmlFor="cue-title">
                        Cue title
                    </label>
                    <input
                        id="cue-title"
                        ref={titleInputRef}
                        type="text"
                        className={formControlStyles.input}
                        value={title}
                        onChange={handleTitleChange}
                        placeholder="Opening number"
                    />
                </div>
                <div className={formControlStyles.field}>
                    <label className={formControlStyles.label} htmlFor={kindSelectId}>
                        Type
                    </label>
                    <FormSelect
                        id={kindSelectId}
                        value={kind}
                        options={KIND_OPTIONS}
                        ariaLabel="Cue type"
                        onChange={handleKindChange}
                    />
                </div>
                <div className={styles.actions}>
                    <Button
                        type="submit"
                        isDisabled={!canSubmit}
                    >
                        Add cue
                    </Button>
                    <Button
                        variant="ghost"
                        onPress={onClose}
                    >
                        Cancel
                    </Button>
                </div>
            </form>
        </ModalDialog>
    );
};
