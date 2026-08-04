import {normalizeCharacterKey} from '@stagistic/script';
import {
    Button,
    formControlStyles,
    ModalDialog,
} from '@stagistic/ui';
import {
    type ChangeEvent,
    type FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import styles from './AddCharacterModal.module.css';

interface AddCharacterModalProps {
    isOpen: boolean,
    occupiedCharacterKeys: ReadonlySet<string>,
    onClose: () => void,
    onCreate: (characterKey: string) => void,
}

export const AddCharacterModal = ({
    isOpen,
    occupiedCharacterKeys,
    onClose,
    onCreate,
}: AddCharacterModalProps) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [name, setName] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setName('');

            return;
        }

        const focusTimer = window.setTimeout(() => {
            inputRef.current?.focus();
        }, 0);

        return () => window.clearTimeout(focusTimer);
    }, [isOpen]);

    const normalizedName = useMemo(() => normalizeCharacterKey(name), [name]);
    const isDuplicate = normalizedName.length > 0 && occupiedCharacterKeys.has(normalizedName);
    const canSubmit = normalizedName.length > 0 && !isDuplicate;
    const errorId = isDuplicate ? 'add-character-error' : undefined;

    const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setName(event.target.value);
    }, []);

    const handleSubmit = useCallback((event: FormEvent) => {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        onCreate(normalizedName);
        onClose();
    }, [
        canSubmit,
        normalizedName,
        onClose,
        onCreate,
    ]);

    return (
        <ModalDialog
            isOpen={isOpen}
            onClose={onClose}
            ariaLabel="Add character"
            panelClassName={styles.panel}
        >
            <h2 className={styles.title}>Add character</h2>
            <form className={styles.form} onSubmit={handleSubmit}>
                <div className={formControlStyles.field}>
                    <label className={formControlStyles.label} htmlFor="character-name">
                        Character name
                    </label>
                    <input
                        id="character-name"
                        ref={inputRef}
                        type="text"
                        className={formControlStyles.input}
                        value={name}
                        onChange={handleNameChange}
                        placeholder="Character name"
                        aria-describedby={errorId}
                        aria-invalid={isDuplicate}
                    />
                </div>
                {isDuplicate ? (
                    <p id="add-character-error" className={styles.error}>
                        A character or group with this name already exists.
                    </p>
                ) : null}
                <div className={styles.actions}>
                    <Button
                        type="submit"
                        isDisabled={!canSubmit}
                    >
                        Add character
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
