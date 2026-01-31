import {type FormEvent, useEffect, useRef, useState} from 'react';

import styles from './NewScriptModal.module.css';

type NewScriptModalProps = {
    isOpen: boolean,
    onClose: () => void,
    onCreate: (name: string) => void,
};

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

    if (!isOpen) {
        return null;
    }

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        onCreate(name);
        setName('');
    };

    return (
        <div className={styles.backdrop} role="presentation" onClick={onClose}>
            <div
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-label="Create new script"
                onClick={event => event.stopPropagation()}
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
                        onChange={event => setName(event.target.value)}
                        placeholder="Untitled scenario"
                    />
                    <div className={styles.actions}>
                        <button className={styles.ghostButton} type="button" onClick={onClose}>
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
