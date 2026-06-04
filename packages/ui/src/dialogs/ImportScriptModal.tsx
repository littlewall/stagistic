import {Button} from '../atoms/Button';
import {ImportDropZone} from './importScript/ImportDropZone';
import {useImportScriptModalState} from './importScript/useImportScriptModalState';
import styles from './ImportScriptModal.module.css';
import {ModalDialog} from './ModalDialog';
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
        isProcessing,
        enableLegacyCapsLyricsHeuristic,
        handleSubmit,
        handleNameChange,
        handleEnableLegacyCapsLyricsHeuristicChange,
        handleDrop,
        handleFileSelect,
        handlePickFile,
    } = useImportScriptModalState({
        isOpen,
        onImport,
        onPickFile,
        preselectedFile,
    });

    return (
        <ModalDialog
            isOpen={isOpen}
            onClose={onClose}
            ariaLabel="Import script"
            panelClassName={styles.modal}
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
                    <Button
                        variant="ghost"
                        type="button"
                        onClick={onClose}
                        disabled={isProcessing}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        type="submit"
                        disabled={!selectedFile}
                        loading={isProcessing}
                    >
                        Import script
                    </Button>
                </div>
            </form>
        </ModalDialog>
    );
};
