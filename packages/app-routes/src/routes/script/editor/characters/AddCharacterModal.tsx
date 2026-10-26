import {normalizeCharacterKey} from '@stagistic/script';
import type {ModalFocusRestoreOptions} from '@stagistic/ui';
import {
    Button,
    formControlStyles,
    ModalActions,
    ModalDialog,
    ModalHeader,
} from '@stagistic/ui';
import {
    type ChangeEvent,
    type FormEvent,
    useCallback,
    useMemo,
    useRef,
    useState,
} from 'react';

import styles from './AddCharacterModal.module.css';

interface AddCharacterModalProps extends ModalFocusRestoreOptions {
    isOpen: boolean,
    occupiedCharacterKeys: ReadonlySet<string>,
    onClose: () => void,
    onCreate: (characterKey: string) => void,
}

export const AddCharacterModal = ({
    returnFocus,
    fallbackFocus,
    isOpen,
    occupiedCharacterKeys,
    onClose,
    onCreate,
}: AddCharacterModalProps) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [name, setName] = useState('');
    const [wasOpen, setWasOpen] = useState(isOpen);

    if (wasOpen !== isOpen) {
        setWasOpen(isOpen);

        if (!isOpen) {
            setName('');
        }
    }

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
            initialFocus={inputRef}
            returnFocus={returnFocus}
            fallbackFocus={fallbackFocus}
            isOpen={isOpen}
            onClose={onClose}
            ariaLabel="Add character"
        >
            <ModalHeader title="Add character" />
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
                <ModalActions>
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
                </ModalActions>
            </form>
        </ModalDialog>
    );
};
