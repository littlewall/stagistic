import {
    type MouseEvent as ReactMouseEvent,
    useCallback,
} from 'react';

import {ImportDropZone} from './importScript/ImportDropZone';
import type {ImportPayload} from './importScript/model';
import {useImportScriptModalState} from './importScript/useImportScriptModalState';
import styles from './ImportScriptModal.module.css';

type ImportScriptModalProps = {
    isOpen: boolean,
    onClose: () => void,
    onImport: (payload: ImportPayload) => void,
    onPickFile?: () => Promise<{fileName: string, text: string} | null>,
    preselectedFile?: {fileName: string, text: string} | null,
};

export const ImportScriptModal = ({
    isOpen,
    onClose,
    onImport,
    onPickFile,
    preselectedFile,
}: ImportScriptModalProps) => {
    const {
        inputRef,
        name,
        selectedFile,
        fileLabel,
        fileError,
        handleSubmit,
        handleNameChange,
        handleDrop,
        handleFileSelect,
        handlePickFile,
    } = useImportScriptModalState({
        isOpen,
        onClose,
        onImport,
        onPickFile,
        preselectedFile,
    });

    const handleBackdropClick = useCallback(() => {
        onClose();
    }, [onClose]);

    const handleModalClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
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
                aria-label="Import script"
                onClick={handleModalClick}
            >
                <h2 className={styles.title}>Import script</h2>
                <p className={styles.subtitle}>
                    Bring in a Fountain file and keep working where you left off.
                </p>
                <form className={styles.form} onSubmit={handleSubmit}>
                    <label className={styles.label} htmlFor="import-script-name">
                        Script name
                    </label>
                    <input
                        id="import-script-name"
                        ref={inputRef}
                        className={styles.input}
                        value={name}
                        onChange={handleNameChange}
                        placeholder="Untitled scenario"
                    />
                    <ImportDropZone
                        fileLabel={fileLabel}
                        onDrop={event => {
                            void handleDrop(event);
                        }}
                        onFileSelect={handleFileSelect}
                        onPickFile={onPickFile ? handlePickFile : undefined}
                    />
                    {fileError ? (
                        <p className={styles.error} role="alert">
                            {fileError}
                        </p>
                    ) : null}
                    <div className={styles.actions}>
                        <button
                            className={styles.ghostButton}
                            type="button"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            className={styles.primaryButton}
                            type="submit"
                            disabled={!selectedFile}
                        >
                            Import script
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
