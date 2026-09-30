import {
    type FormEvent, useCallback, useEffect, useRef, useState,
} from 'react';

import type {UseImportScriptModalStateArgs} from './types';
import {useImportFileSelection} from './useImportFileSelection';

export const useImportScriptModalState = ({
    isOpen,
    onImportStagistic,
    onImportStepkgAsNew,
    onReplaceWithStepkg,
    onDownloadStepkgBackup,
    onPeekStepkg,
    onPickFile,
    preselectedFile,
}: UseImportScriptModalStateArgs) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const {
        name,
        selectedFile,
        fileLabel,
        fileError,
        setFileError,
        isPeeking,
        stepkgPeek,
        importChoice,
        handleNameChange,
        handleDrop,
        handleFileSelect,
        handlePickFile,
        handleChoiceChange,
    } = useImportFileSelection({
        isOpen, onPeekStepkg, onPickFile, preselectedFile,
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setIsProcessing(false);
            setIsDownloadingBackup(false);

            return;
        }

        const focusTimer = window.setTimeout(() => {
            inputRef.current?.focus();
        }, 0);

        return () => window.clearTimeout(focusTimer);
    }, [isOpen]);

    const showNameField =
        selectedFile?.kind === 'stagistic' ||
        (selectedFile?.kind === 'stepkg' && stepkgPeek?.ok === true && (stepkgPeek.existingLocalTitle === null || importChoice === 'new'));
    const showChoiceToggle = selectedFile?.kind === 'stepkg' && stepkgPeek?.ok === true && stepkgPeek.existingLocalTitle !== null;
    const showReplacePanel = showChoiceToggle && importChoice === 'replace';
    const canSubmitNew =
        !isProcessing &&
        !isPeeking &&
        ((selectedFile?.kind === 'stagistic' && Boolean(selectedFile.text || selectedFile.file)) ||
            (selectedFile?.kind === 'stepkg' && Boolean(selectedFile.bytes) && stepkgPeek?.ok === true && !showReplacePanel));

    const handleSubmit = useCallback(
        async (event: FormEvent) => {
            event.preventDefault();

            if (!selectedFile || isProcessing) {
                return;
            }

            if (selectedFile.kind === 'stepkg' && showReplacePanel) {
                return;
            }

            if (selectedFile.kind === 'stagistic') {
                const fileText = selectedFile.text ?? (selectedFile.file ? await selectedFile.file.text() : null);

                if (!fileText) {
                    setFileError('Please drop a .stagistic file first.');

                    return;
                }

                setFileError(null);
                setIsProcessing(true);

                try {
                    await onImportStagistic({
                        name, fileName: selectedFile.name, text: fileText,
                    });
                } finally {
                    setIsProcessing(false);
                }

                return;
            }

            if (!selectedFile.bytes) {
                setFileError('Please drop a .stepkg file first.');

                return;
            }

            setFileError(null);
            setIsProcessing(true);

            try {
                await onImportStepkgAsNew({
                    fileName: selectedFile.name, bytes: selectedFile.bytes, title: name,
                });
            } finally {
                setIsProcessing(false);
            }
        },
        [
            isProcessing,
            name,
            onImportStagistic,
            onImportStepkgAsNew,
            selectedFile,
            showReplacePanel,
        ],
    );

    const handleReplaceConfirm = useCallback(async () => {
        if (!selectedFile || selectedFile.kind !== 'stepkg' || !selectedFile.bytes || isProcessing) {
            return;
        }

        setIsProcessing(true);

        try {
            await onReplaceWithStepkg({fileName: selectedFile.name, bytes: selectedFile.bytes});
        } finally {
            setIsProcessing(false);
        }
    }, [
        isProcessing,
        onReplaceWithStepkg,
        selectedFile,
    ]);

    const handleDownloadBackup = useCallback(async () => {
        if (!stepkgPeek?.ok || isDownloadingBackup) {
            return;
        }

        setIsDownloadingBackup(true);

        try {
            await onDownloadStepkgBackup(stepkgPeek.scriptId);
        } finally {
            setIsDownloadingBackup(false);
        }
    }, [
        isDownloadingBackup,
        onDownloadStepkgBackup,
        stepkgPeek,
    ]);

    return {
        inputRef,
        name,
        selectedFile,
        fileLabel,
        fileError,
        isPeeking,
        stepkgPeek,
        importChoice,
        isProcessing,
        isDownloadingBackup,
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
    };
};
