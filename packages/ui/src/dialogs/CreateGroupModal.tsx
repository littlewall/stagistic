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

export interface CreateGroupModalProps {
    isOpen: boolean,
    existingEntityNames: readonly string[],
    onClose: () => void,
    onCreate: (groupName: string) => void | Promise<unknown>,
}

export const CreateGroupModal = ({
    isOpen,
    existingEntityNames,
    onClose,
    onCreate,
}: CreateGroupModalProps) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [name, setName] = useState('');
    const [isTouched, setIsTouched] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setName('');
            setIsTouched(false);
            setIsSubmitting(false);

            return;
        }

        const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);

        return () => window.clearTimeout(focusTimer);
    }, [isOpen]);

    const existingKeys = useMemo(
        () => new Set(existingEntityNames.map(entityName => normalizeCharacterKey(entityName))),
        [existingEntityNames],
    );
    const normalizedName = useMemo(() => normalizeCharacterKey(name), [name]);
    const isEmpty = normalizedName.length === 0;
    const isDuplicate = !isEmpty && existingKeys.has(normalizedName);
    const isInvalid = isEmpty || isDuplicate;
    const isErrorVisible = !isSubmitting && (isDuplicate || (isTouched && isEmpty));
    const errorId = isErrorVisible ? 'create-group-error' : undefined;

    const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setName(event.target.value);
    }, []);
    const handleSubmit = useCallback(async (event: FormEvent) => {
        event.preventDefault();
        setIsTouched(true);

        if (isInvalid || isSubmitting) {
            return;
        }

        setIsSubmitting(true);
        try {
            await onCreate(normalizedName);
        } catch {
            // The catalog exposes persistence errors; keep the modal usable.
        } finally {
            setIsSubmitting(false);
        }
    }, [
        isInvalid,
        isSubmitting,
        normalizedName,
        onCreate,
    ]);

    return (
        <ModalDialog
            isOpen={isOpen}
            onClose={onClose}
            ariaLabel="Create group"
        >
            <ModalHeader title="Create group" />
            <form
                className={styles.form}
                onSubmit={event => void handleSubmit(event)}
                aria-busy={isSubmitting}
            >
                <div className={formControlStyles.field}>
                    <label className={formControlStyles.label} htmlFor="create-group-name">
                        Group name
                    </label>
                    <input
                        id="create-group-name"
                        ref={inputRef}
                        type="text"
                        className={formControlStyles.input}
                        value={name}
                        placeholder="Group name"
                        aria-describedby={errorId}
                        aria-invalid={isErrorVisible}
                        onChange={handleNameChange}
                        onBlur={() => setIsTouched(true)}
                    />
                </div>
                {errorId ? (
                    <p id={errorId} className={styles.error}>
                        {isDuplicate
                            ? 'A character or group with this name already exists.'
                            : 'Name cannot be empty.'}
                    </p>
                ) : null}
                <ModalActions>
                    <Button type="submit" isDisabled={isInvalid || isSubmitting}>
                        Create group
                    </Button>
                    <Button variant="ghost" onPress={onClose}>Cancel</Button>
                </ModalActions>
            </form>
        </ModalDialog>
    );
};
