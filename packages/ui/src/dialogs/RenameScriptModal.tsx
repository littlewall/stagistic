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
import styles from './RenameScriptModal.module.css';

export interface RenameScriptSubmit {
    title: string,
    subtitle: string,
}

export interface RenameScriptModalProps {
    isOpen: boolean,
    initialTitle: string,
    initialSubtitle: string,
    isPending?: boolean,
    onClose: () => void,
    onSubmit: (values: RenameScriptSubmit) => void | Promise<void>,
}

export const RenameScriptModal = ({
    isOpen,
    initialTitle,
    initialSubtitle,
    isPending = false,
    onClose,
    onSubmit,
}: RenameScriptModalProps) => {
    const titleInputRef = useRef<HTMLInputElement | null>(null);
    const [title, setTitle] = useState(initialTitle);
    const [subtitle, setSubtitle] = useState(initialSubtitle);
    const canSubmit = title.trim().length > 0;

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setTitle(initialTitle);
        setSubtitle(initialSubtitle);

        const focusTimer = window.setTimeout(() => {
            titleInputRef.current?.focus();
            titleInputRef.current?.select();
        }, 0);

        return () => window.clearTimeout(focusTimer);
    }, [
        isOpen,
        initialTitle,
        initialSubtitle,
    ]);

    const handleSubmit = useCallback((event: FormEvent) => {
        event.preventDefault();

        if (!canSubmit || isPending) {
            return;
        }

        void onSubmit({title, subtitle});
    }, [
        canSubmit,
        isPending,
        onSubmit,
        title,
        subtitle,
    ]);
    const handleTitleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setTitle(event.target.value);
    }, []);
    const handleSubtitleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setSubtitle(event.target.value);
    }, []);

    return (
        <ModalDialog
            isOpen={isOpen}
            onClose={onClose}
            ariaLabel="Rename script"
        >
            <h2 className={styles.title}>Rename script</h2>
            <p className={styles.subtitle}>
                Update the title and subtitle for this script.
            </p>
            <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="rename-script-title">
                        Title
                    </label>
                    <input
                        id="rename-script-title"
                        ref={titleInputRef}
                        className={styles.input}
                        value={title}
                        autoComplete="off"
                        disabled={isPending}
                        onChange={handleTitleChange}
                    />
                </div>
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="rename-script-subtitle">
                        Subtitle
                    </label>
                    <input
                        id="rename-script-subtitle"
                        className={styles.input}
                        value={subtitle}
                        autoComplete="off"
                        placeholder="Optional"
                        disabled={isPending}
                        onChange={handleSubtitleChange}
                    />
                </div>
                <div className={styles.actions}>
                    <Button
                        type="submit"
                        isDisabled={!canSubmit}
                        isPending={isPending}
                    >
                        Save changes
                    </Button>
                    <Button
                        variant="ghost"
                        isDisabled={isPending}
                        onPress={onClose}
                    >
                        Cancel
                    </Button>
                </div>
            </form>
        </ModalDialog>
    );
};
