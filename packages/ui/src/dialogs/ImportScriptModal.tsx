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
    isLoading,
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
                Bring in a Stagistic file and continue working in the editor.
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
                    placeholder="Untitled script"
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
                    <Button
                        variant="ghost"
                        onPress={onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        type="submit"
                        isDisabled={!selectedFile}
                        isPending={isLoading}
                    >
                        Import script
                    </Button>
                </div>
            </form>
        </ModalDialog>
    );
};
