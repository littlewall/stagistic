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
import styles from './CreatePlaceModal.module.css';
import {ModalActions} from './ModalActions';
import {ModalDialog} from './ModalDialog';
import {ModalHeader} from './ModalHeader';

export interface CreatePlaceModalProps {
    isOpen: boolean,
    existingPlaceNames?: readonly string[],
    onClose: () => void,
    onCreate: (placeName: string) => void | Promise<void>,
}

const normalizePlaceName = (name: string) => name.trim().toLocaleLowerCase();

export const CreatePlaceModal = ({
    isOpen,
    existingPlaceNames = [],
    onClose,
    onCreate,
}: CreatePlaceModalProps) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [name, setName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const existingNames = useMemo(
        () => new Set(existingPlaceNames.map(normalizePlaceName)),
        [existingPlaceNames],
    );
    const trimmedName = name.trim();
    const isDuplicate = trimmedName.length > 0 && existingNames.has(normalizePlaceName(trimmedName));
    const canSubmit = trimmedName.length > 0 && !isDuplicate && !isCreating;
    const errorId = isDuplicate ? 'create-place-error' : undefined;

    useEffect(() => {
        if (!isOpen) {
            setName('');
            setIsCreating(false);

            return;
        }

        const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);

        return () => window.clearTimeout(focusTimer);
    }, [isOpen]);

    const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setName(event.target.value);
    }, []);

    const handleSubmit = useCallback(async (event: FormEvent) => {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        setIsCreating(true);

        try {
            await onCreate(trimmedName);
            setName('');
            onClose();
        } finally {
            setIsCreating(false);
        }
    }, [
        canSubmit,
        onClose,
        onCreate,
        trimmedName,
    ]);

    return (
        <ModalDialog
            isOpen={isOpen}
            onClose={onClose}
            ariaLabel="Create place"
        >
            <ModalHeader title="Create place" />
            <form className={styles.form} onSubmit={event => void handleSubmit(event)}>
                <div className={formControlStyles.field}>
                    <label className={formControlStyles.label} htmlFor="create-place-name">
                        Name
                    </label>
                    <input
                        id="create-place-name"
                        ref={inputRef}
                        type="text"
                        className={formControlStyles.input}
                        value={name}
                        onChange={handleNameChange}
                        placeholder="Place name"
                        aria-describedby={errorId}
                        aria-invalid={isDuplicate}
                    />
                </div>
                {isDuplicate ? (
                    <p id="create-place-error" className={styles.error}>
                        A place with this name already exists.
                    </p>
                ) : null}
                <ModalActions>
                    <Button
                        type="submit"
                        isDisabled={!canSubmit}
                        isPending={isCreating}
                    >
                        Create place
                    </Button>
                    <Button
                        variant="ghost"
                        isDisabled={isCreating}
                        onPress={onClose}
                    >
                        Cancel
                    </Button>
                </ModalActions>
            </form>
        </ModalDialog>
    );
};
