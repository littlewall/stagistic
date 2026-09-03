import {Button} from '../atoms/Button';
import {ImportDropZone} from './importScript/ImportDropZone';
import {useImportScriptModalState} from './importScript/useImportScriptModalState';
import styles from './ImportScriptModal.module.css';
import {ModalActions} from './ModalActions';
import {ModalDialog} from './ModalDialog';
import {ModalHeader} from './ModalHeader';
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
        >
            <ModalHeader
                title="Import script"
                description="Bring in a Stagistic file and continue working in the editor."
            />
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
                <ModalActions>
                    <Button
                        variant="primary"
                        type="submit"
                        isDisabled={!selectedFile}
                        isPending={isLoading}
                    >
                        Import script
                    </Button>
                    <Button
                        variant="ghost"
                        onPress={onClose}
                    >
                        Cancel
                    </Button>
                </ModalActions>
            </form>
        </ModalDialog>
    );
};
