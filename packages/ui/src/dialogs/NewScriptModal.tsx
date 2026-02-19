import {
    type ChangeEvent,
    type FormEvent,
    type MouseEvent as ReactMouseEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

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

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const handleSubmit = useCallback((event: FormEvent) => {
        event.preventDefault();
        onCreate(name);
        setName('');
    }, [name, onCreate]);
    const handleBackdropClick = useCallback(() => {
        onClose();
    }, [onClose]);
    const handleModalClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
    }, []);
    const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setName(event.target.value);
    }, []);

    if (!isOpen) {
        return null;
    }

    return (
        <div
            className={styles.backdrop}
            role="presentation"
            onClick={handleBackdropClick}
        >
            <div
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-label="Create new script"
                onClick={handleModalClick}
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
                        <button
                            className={styles.ghostButton}
                            type="button"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button className={styles.primaryButton} type="submit">
                            Create script
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
