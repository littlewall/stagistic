import {
    type MouseEvent as ReactMouseEvent,
    useCallback,
} from 'react';

import {ImportDropZone} from './importScript/ImportDropZone';
import {useImportScriptModalState} from './importScript/useImportScriptModalState';
import styles from './ImportScriptModal.module.css';
import type {ImportScriptModalProps} from './types';

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
        enableLegacyCapsLyricsHeuristic,
        handleSubmit,
        handleNameChange,
        handleEnableLegacyCapsLyricsHeuristicChange,
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
                    <label className={styles.optionRow}>
                        <input
                            className={styles.checkbox}
                            type="checkbox"
                            checked={enableLegacyCapsLyricsHeuristic}
                            onChange={handleEnableLegacyCapsLyricsHeuristicChange}
                        />
                        <span className={styles.optionText}>
                            Legacy: convert ALL CAPS lines after character to lyrics
                        </span>
                    </label>
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
