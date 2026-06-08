import {
    type ChangeEvent,
    type FormEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import {Button} from '../atoms/Button';
import {ModalDialog} from './ModalDialog';
import styles from './NewScriptModal.module.css';
import type {NewScriptModalProps} from './types';

export const NewScriptModal = ({
    isOpen,
    onClose,
    onCreate,
}: NewScriptModalProps) => {
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

    const handleSubmit = useCallback((event: FormEvent) => {
        event.preventDefault();
        onCreate(name);
        setName('');
    }, [name, onCreate]);
    const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setName(event.target.value);
    }, []);

    return (
        <ModalDialog
            isOpen={isOpen}
            onClose={onClose}
            ariaLabel="Create new script"
        >
            <h2 className={styles.title}>Create new script</h2>
            <p className={styles.subtitle}>
                Give your new scenario a working title. You can change it later.
            </p>
            <form className={styles.form} onSubmit={handleSubmit}>
                <label className={styles.label} htmlFor="script-name">
                    Script name
                </label>
                <input
                    id="script-name"
                    ref={inputRef}
                    className={styles.input}
                    value={name}
                    onChange={handleNameChange}
                    placeholder="Untitled scenario"
                />
                <div className={styles.actions}>
                    <Button
                        variant="ghost"
                        onPress={onClose}
                    >
                        Cancel
                    </Button>
                    <Button type="submit">
                        Create script
                    </Button>
                </div>
            </form>
        </ModalDialog>
    );
};
