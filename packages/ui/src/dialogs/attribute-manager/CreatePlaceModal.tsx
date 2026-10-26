import {
    type ChangeEvent,
    type FormEvent,
    useCallback,
    useMemo,
    useRef,
    useState,
} from 'react';

import {Button} from '../../atoms/Button/Button';
import {formControlStyles} from '../../molecules/forms/shared/formControlStyles';
import {ModalActions} from '../modal/ModalActions';
import {ModalDialog} from '../modal/ModalDialog';
import type {ModalFocusRestoreOptions} from '../modal/modalFocusTypes';
import {ModalHeader} from '../modal/ModalHeader';
import styles from './CreatePlaceModal.module.css';

export interface CreatePlaceModalProps extends ModalFocusRestoreOptions {
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
    returnFocus,
    fallbackFocus,
}: CreatePlaceModalProps) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [name, setName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const existingNames = useMemo(() => new Set(existingPlaceNames.map(normalizePlaceName)), [existingPlaceNames]);
    const trimmedName = name.trim();
    const isDuplicate = trimmedName.length > 0 && existingNames.has(normalizePlaceName(trimmedName));
    const canSubmit = trimmedName.length > 0 && !isDuplicate && !isCreating;
    const errorId = isDuplicate ? 'create-place-error' : undefined;

    const [wasOpen, setWasOpen] = useState(isOpen);

    if (wasOpen !== isOpen) {
        setWasOpen(isOpen);

        if (!isOpen) {
            setName('');
            setIsCreating(false);
        }
    }

    const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setName(event.target.value);
    }, []);

    const handleSubmit = async (event: FormEvent) => {
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
    };

    return (
        <ModalDialog
            isOpen={isOpen}
            onClose={onClose}
            ariaLabel="Create place"
            initialFocus={inputRef}
            returnFocus={returnFocus}
            fallbackFocus={fallbackFocus}
        >
            <ModalHeader title="Create place" />
            <form
                className={styles.form}
                onSubmit={event => void handleSubmit(event)}
            >
                <div className={formControlStyles.field}>
                    <label
                        className={formControlStyles.label}
                        htmlFor="create-place-name"
                    >
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
                    <p
                        id="create-place-error"
                        className={styles.error}
                    >
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
