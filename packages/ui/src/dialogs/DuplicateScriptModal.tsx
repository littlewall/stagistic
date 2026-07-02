import {
    type ChangeEvent,
    type FormEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import {Button} from '../atoms/Button';
import {Switch} from '../atoms/Switch';
import {ModalDialog} from './ModalDialog';
import styles from './DuplicateScriptModal.module.css';

export interface DuplicateScriptSubmit {
    title: string,
    copySettings: boolean,
    copyAttributes: boolean,
    openInEditor: boolean,
}

export interface DuplicateScriptModalProps {
    isOpen: boolean,
    initialTitle: string,
    isPending?: boolean,
    onClose: () => void,
    onSubmit: (values: DuplicateScriptSubmit) => void | Promise<void>,
}

export const DuplicateScriptModal = ({
    isOpen,
    initialTitle,
    isPending = false,
    onClose,
    onSubmit,
}: DuplicateScriptModalProps) => {
    const titleInputRef = useRef<HTMLInputElement | null>(null);
    const [title, setTitle] = useState(initialTitle);
    const [copySettings, setCopySettings] = useState(false);
    const [copyAttributes, setCopyAttributes] = useState(false);
    const [openInEditor, setOpenInEditor] = useState(false);
    const canSubmit = title.trim().length > 0;

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setTitle(initialTitle);
        setCopySettings(false);
        setCopyAttributes(false);
        setOpenInEditor(false);

        const focusTimer = window.setTimeout(() => {
            titleInputRef.current?.focus();
            titleInputRef.current?.select();
        }, 0);

        return () => window.clearTimeout(focusTimer);
    }, [isOpen, initialTitle]);

    const handleSubmit = useCallback((event: FormEvent) => {
        event.preventDefault();

        if (!canSubmit || isPending) {
            return;
        }

        void onSubmit({
            title,
            copySettings,
            copyAttributes,
            openInEditor,
        });
    }, [
        canSubmit,
        isPending,
        onSubmit,
        title,
        copySettings,
        copyAttributes,
        openInEditor,
    ]);
    const handleTitleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setTitle(event.target.value);
    }, []);
    const handleOpenInEditorChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setOpenInEditor(event.target.checked);
    }, []);

    return (
        <ModalDialog
            isOpen={isOpen}
            onClose={onClose}
            ariaLabel="Duplicate script"
        >
            <h2 className={styles.title}>Duplicate script</h2>
            <p className={styles.subtitle}>
                Creates a copy of this script. The script content is always copied.
            </p>
            <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="duplicate-script-title">
                        Title
                    </label>
                    <input
                        id="duplicate-script-title"
                        ref={titleInputRef}
                        className={styles.input}
                        value={title}
                        autoComplete="off"
                        disabled={isPending}
                        onChange={handleTitleChange}
                    />
                </div>
                <div className={styles.options}>
                    <Switch
                        className={styles.option}
                        isSelected={copySettings}
                        isDisabled={isPending}
                        onChange={setCopySettings}
                    >
                        <span className={styles.optionText}>
                            <span className={styles.optionLabel}>Copy settings</span>
                            <span className={styles.optionHint}>
                                Page layout, structure, styles and headers &amp; footers. Otherwise defaults are used.
                            </span>
                        </span>
                    </Switch>
                    <Switch
                        className={styles.option}
                        isSelected={copyAttributes}
                        isDisabled={isPending}
                        onChange={setCopyAttributes}
                    >
                        <span className={styles.optionText}>
                            <span className={styles.optionLabel}>Copy attributes</span>
                            <span className={styles.optionHint}>
                                Confirmed characters and their details.
                            </span>
                        </span>
                    </Switch>
                </div>
                <label className={styles.openInEditor}>
                    <input
                        type="checkbox"
                        className={styles.openInEditorCheckbox}
                        checked={openInEditor}
                        disabled={isPending}
                        onChange={handleOpenInEditorChange}
                    />
                    Open in editor after creating
                </label>
                <div className={styles.actions}>
                    <Button
                        type="submit"
                        isDisabled={!canSubmit}
                        isPending={isPending}
                    >
                        Duplicate script
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
