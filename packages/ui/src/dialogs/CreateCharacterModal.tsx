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
import {ModalActions} from './ModalActions';
import {ModalDialog} from './ModalDialog';
import {ModalHeader} from './ModalHeader';

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
    const [isTouched, setIsTouched] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setName('');
            setIsTouched(false);

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
    const isEmpty = normalizedName.length === 0;
    const isDuplicate = !isEmpty && existingKeys.has(normalizedName);
    const canSubmit = !isEmpty && !isDuplicate;
    const isErrorVisible = isDuplicate || (isTouched && isEmpty);
    const errorId = isErrorVisible ? 'create-character-error' : undefined;

    const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setName(event.target.value);
    }, []);

    const handleSubmit = useCallback((event: FormEvent) => {
        event.preventDefault();
        setIsTouched(true);

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
        >
            <ModalHeader title="Create character" />
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
                        aria-invalid={isErrorVisible}
                        onBlur={() => setIsTouched(true)}
                    />
                </div>
                {errorId ? (
                    <p id="create-character-error" className={styles.error}>
                        {isDuplicate
                            ? 'A character or group with this name already exists.'
                            : 'Name cannot be empty.'}
                    </p>
                ) : null}
                <ModalActions>
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
                </ModalActions>
            </form>
        </ModalDialog>
    );
};
