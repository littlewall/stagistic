import {normalizeCharacterKey} from '@stagistic/script';
import {
    type ChangeEvent,
    type FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {Button} from '../atoms/Button';
import {formControlStyles} from '../molecules/forms/formControlStyles';
import styles from './CreateCharacterModal.module.css';
import {ModalDialog} from './ModalDialog';

export interface CreateCharacterModalProps {
    isOpen: boolean,
    existingCharacterNames?: readonly string[],
    onClose: () => void,
    onCreate: (characterName: string) => void,
}

export const CreateCharacterModal = ({
    isOpen,
    existingCharacterNames = [],
    onClose,
    onCreate,
}: CreateCharacterModalProps) => {
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

    const existingKeys = useMemo(
        () => new Set(existingCharacterNames.map(characterName => normalizeCharacterKey(characterName))),
        [existingCharacterNames],
    );
    const normalizedName = useMemo(() => normalizeCharacterKey(name), [name]);
    const isDuplicate = normalizedName.length > 0 && existingKeys.has(normalizedName);
    const canSubmit = normalizedName.length > 0 && !isDuplicate;
    const errorId = isDuplicate ? 'create-character-error' : undefined;

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
            ariaLabel="Create character"
            panelClassName={styles.panel}
        >
            <h2 className={styles.title}>Create character</h2>
            <form className={styles.form} onSubmit={handleSubmit}>
                <div className={formControlStyles.field}>
                    <label className={formControlStyles.label} htmlFor="create-character-name">
                        Character name
                    </label>
                    <input
                        id="create-character-name"
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
                    <p id="create-character-error" className={styles.error}>
                        A confirmed character with this name already exists.
                    </p>
                ) : null}
                <div className={styles.actions}>
                    <Button
                        type="submit"
                        isDisabled={!canSubmit}
                    >
                        Create character
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
