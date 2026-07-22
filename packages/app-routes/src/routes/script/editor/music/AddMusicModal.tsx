import {
    Button,
    formControlStyles,
    FormSelect,
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

import styles from './AddMusicModal.module.css';
import type {
    CreateScriptMusicInput,
    ScriptMusicKind,
} from './types';

const KIND_OPTIONS: FormSelectOption[] = [{value: 'song', label: 'Song'}, {value: 'instrumental', label: 'Instrumental'}];

interface AddMusicModalProps {
    isOpen: boolean,
    initialTitle?: string,
    onCancel: () => void,
    onClose: () => void,
    onCreate: (input: CreateScriptMusicInput) => unknown,
}

export const AddMusicModal = ({
    isOpen,
    initialTitle = '',
    onCancel,
    onClose,
    onCreate,
}: AddMusicModalProps) => {
    const titleInputRef = useRef<HTMLInputElement | null>(null);
    const kindSelectId = useId();
    const [title, setTitle] = useState('');
    const [kind, setKind] = useState<ScriptMusicKind>('song');

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
            onClose={onCancel}
            ariaLabel="Add music"
            panelClassName={styles.panel}
        >
            <h2 className={styles.title}>Add music</h2>
            <form className={styles.form} onSubmit={handleSubmit}>
                <div className={formControlStyles.field}>
                    <label className={formControlStyles.label} htmlFor="music-title">
                        Music title
                    </label>
                    <input
                        id="music-title"
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
                        ariaLabel="Music type"
                        onChange={handleKindChange}
                    />
                </div>
                <div className={styles.actions}>
                    <Button
                        type="submit"
                        isDisabled={!canSubmit}
                    >
                        Add music
                    </Button>
                    <Button
                        variant="ghost"
                        onPress={onCancel}
                    >
                        Cancel
                    </Button>
                </div>
            </form>
        </ModalDialog>
    );
};
