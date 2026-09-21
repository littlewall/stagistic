import {useEffect, useState} from 'react';

import {Button} from '../atoms/Button';
import {Notice} from '../feedback/Notice';
import {TextInput} from '../molecules/forms/TextInput';
import {ToggleButtonGroup} from '../molecules/ToggleButtonGroup';
import {ImportDropZone} from './importScript/ImportDropZone';
import {useImportScriptModalState} from './importScript/useImportScriptModalState';
import {ModalActions} from './ModalActions';
import {ModalDialog} from './ModalDialog';
import {ModalHeader} from './ModalHeader';
import type {ImportScriptModalProps} from './types';
import {TypeToConfirmField} from './TypeToConfirmAction';

import styles from './ImportScriptModal.module.css';

const REPLACE_SCRIPT_CONFIRM_PHRASE = 'replace me';

export const ImportScriptModal = ({
    isOpen,
    onClose,
    onImportStagistic,
    onImportStepkgAsNew,
    onReplaceWithStepkg,
    onDownloadStepkgBackup,
    onPeekStepkg,
    onPickFile,
    preselectedFile,
    isLoading,
    isDownloadingBackup,
}: ImportScriptModalProps) => {
    const {
        inputRef,
        name,
        selectedFile,
        fileLabel,
        fileError,
        isPeeking,
        stepkgPeek,
        importChoice,
        showNameField,
        showChoiceToggle,
        showReplacePanel,
        canSubmitNew,
        handleSubmit,
        handleNameChange,
        handleDrop,
        handleFileSelect,
        handlePickFile,
        handleChoiceChange,
        handleReplaceConfirm,
        handleDownloadBackup,
    } = useImportScriptModalState({
        isOpen,
        onImportStagistic,
        onImportStepkgAsNew,
        onReplaceWithStepkg,
        onDownloadStepkgBackup,
        onPeekStepkg,
        onPickFile,
        preselectedFile,
    });

    const existingTitle = stepkgPeek?.ok ? stepkgPeek.existingLocalTitle : null;
    const existingScriptId = stepkgPeek?.ok ? stepkgPeek.scriptId : null;
    const [replaceConfirmText, setReplaceConfirmText] = useState('');
    const canSubmitReplace = replaceConfirmText.trim() === REPLACE_SCRIPT_CONFIRM_PHRASE && !isLoading;

    useEffect(() => {
        setReplaceConfirmText('');
    }, [existingScriptId, isOpen, showReplacePanel]);

    return (
        <ModalDialog isOpen={isOpen} onClose={onClose} ariaLabel="Import script">
            <ModalHeader title="Import script" description="Bring in a .stagistic or .stepkg file and continue working in the editor." />
            <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.content}>
                    <ImportDropZone
                        fileLabel={fileLabel}
                        hint={selectedFile ? '(Drop or choose another file.)' : 'Drop a .stagistic or .stepkg file here, or click to browse.'}
                        isFileSelected={Boolean(selectedFile)}
                        acceptedExtensions={['.stagistic', '.stepkg']}
                        onDrop={event => {
                            void handleDrop(event);
                        }}
                        onFileSelect={handleFileSelect}
                        onPickFile={onPickFile ? handlePickFile : undefined}
                    />
                    {isPeeking ? <p className={styles.hint}>Reading package…</p> : null}
                    {fileError ? (
                        <p className={styles.error} role="alert">
                            {fileError}
                        </p>
                    ) : null}
                    {showChoiceToggle ? (
                        <ToggleButtonGroup
                            ariaLabel="Import mode"
                            options={[
                                {value: 'new', label: 'Import as new copy'},
                                {value: 'replace', label: `Replace existing "${existingTitle}"`},
                            ]}
                            value={importChoice}
                            onChange={handleChoiceChange}
                        />
                    ) : null}
                    {showNameField ? (
                        <TextInput
                            id="import-script-name"
                            ref={inputRef}
                            label="Script name"
                            className={styles.nameField}
                            size="sm"
                            value={name}
                            onChange={handleNameChange}
                            placeholder="Untitled script"
                        />
                    ) : null}
                    {showReplacePanel ? (
                        <div className={styles.replacePanel}>
                            <Notice variant="warning" appearance="tinted">
                                <div className={styles.replaceNoticeContent}>
                                    <span>
                                        Replacing will overwrite &quot;{existingTitle}&quot; with this package. Local changes made since the last export will be
                                        lost. We recommend downloading a backup first.
                                    </span>
                                    <Button
                                        variant="secondary"
                                        type="button"
                                        isPending={isDownloadingBackup}
                                        onPress={() => {
                                            void handleDownloadBackup();
                                        }}
                                    >
                                        Download backup
                                    </Button>
                                </div>
                            </Notice>
                            <TypeToConfirmField
                                phrase={REPLACE_SCRIPT_CONFIRM_PHRASE}
                                value={replaceConfirmText}
                                isPending={isLoading}
                                onChange={setReplaceConfirmText}
                            />
                        </div>
                    ) : null}
                </div>
                <ModalActions spacing="lg">
                    {showReplacePanel ? (
                        <Button
                            variant="danger"
                            type="button"
                            isDisabled={!canSubmitReplace}
                            isPending={isLoading}
                            onPress={() => {
                                void handleReplaceConfirm();
                            }}
                        >
                            Replace script
                        </Button>
                    ) : (
                        <Button variant="primary" type="submit" isDisabled={!canSubmitNew} isPending={isLoading}>
                            Import script
                        </Button>
                    )}
                    <Button variant="ghost" onPress={onClose}>
                        Cancel
                    </Button>
                </ModalActions>
            </form>
        </ModalDialog>
    );
};
